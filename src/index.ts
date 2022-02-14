import http from "http";
import express from "express";
import { Request, Response } from "express";
import { applyMiddleware, applyRoutes, exponentialBackoff, Route } from "./utils";
import * as middleware from "./middleware";
import axios from "axios";
import { assertType } from "typescript-is";
import moment from "moment";

import {
  CryptoPrice,
  CurrentPrice,
  priceHistoryBaseCurrencyTo,
  priceHistoryNotQueriedCurrenciesTo,
  PriceHistory,
  priceHistoryKeys,
  supportedCurrenciesFrom,
  supportedCurrenciesTo,
  SupportedCurrencyFrom,
  SupportedCurrencyTo,
  PriceHistoryCryptoCompareEntry,
  PriceHistoryEntry
} from "./types/types";

// populated by ConfigWebpackPlugin
declare const CONFIG: ConfigType;

const dailyHistoryLimit = 2000; // defined by CryptoCompare
const hourlyHistoryLimit = moment.duration(1, 'week').asHours();

const initEmptyHistory = ():PriceHistory => Object.create(
  Object.fromEntries(priceHistoryKeys.map(from => [
    from,
    Object.fromEntries(supportedCurrenciesTo.map(to => [
      to,
      []
    ]))
  ]))
);

// Server cache
let currentPrice: CurrentPrice | undefined;
const historyDailyAll: PriceHistory = initEmptyHistory()
const historyHourlyWeek: PriceHistory = initEmptyHistory(); 

/**
 * HTTP API interface
 */

const router = express();

const middlewares = [middleware.handleCors
  , middleware.handleBodyRequestParsing
  , middleware.handleCompression
];

applyMiddleware(middlewares, router);

const extractCryptoPrice = (fatObject: CryptoPrice): CryptoPrice => {
  return {
    FROMSYMBOL: fatObject.FROMSYMBOL,
    PRICE: fatObject.PRICE,
    LASTUPDATE: fatObject.LASTUPDATE,
    CHANGEPCT24HOUR: fatObject.CHANGEPCT24HOUR
  }
}

const getExternalPrice = (): Promise<any> => {
  const baseUrl = CONFIG.priceAPI.url;
  const froms = supportedCurrenciesFrom.join(',');
  const tos = supportedCurrenciesTo.join(',');
  const getPriceMultiFull = baseUrl + `/data/pricemultifull?fsyms=${froms}&tsyms=${tos}&api_key=${CONFIG.priceAPI.key}`;
  
  return axios.get(getPriceMultiFull)
    .then(resp => {
      if (resp.status === 404) {
        throw "Problem with the external API server. Not found."
      }
      else if (resp.status === 500) {
        throw "Problem with the external API server. Server error."
      }
      else if (resp.status === 400) {
        throw "Problem with the external API server. Request issue."
      }
      else if (resp.data["RAW"] == null) {
        console.log("resp.data: ", resp.data)
        throw "Problem with the external API server. RAW response missing." 
      }
      else {
        try {
          const respValidated = assertType<CurrentPrice>(resp.data["RAW"]);
          const respFiltered = Object.fromEntries(supportedCurrenciesFrom.map(from => [
            from,
            Object.fromEntries(supportedCurrenciesTo.map(to => [
              to,
              extractCryptoPrice(respValidated[from][to])
            ]))
          ]))
          return respFiltered;
        } catch (e) {
          throw "Error while parsing response " + e;
        }
      }
    })
}

const updatePrice = async (): Promise<void> => {
  try {
    const price = await getExternalPrice();
    currentPrice = price;
  } catch (e) {
    console.error("Error updating price: ", e);
  }
}

const extractPriceHistoryEntry = (fatObject: PriceHistoryCryptoCompareEntry): PriceHistoryEntry => ({
  time: fatObject.time,
  price: fatObject.open,
})

const calculateMissingHistoryEntry = (
  from_base: PriceHistoryEntry,
  to_base: PriceHistoryEntry): PriceHistoryEntry => {
    if (from_base.time !== to_base.time) {
      throw new Error("Timestamp mismatch!")
    }
    return {
      time: from_base.time,
      // Not too complicated, but just in case here is the reasoning:
      // 1f = f_b * 1b;   1t = t_b * 1b;   1f = f_t * 1t
      // We want f_t:
      // f_t = 1f/1t = (f_b * 1b)/(t_b * 1b) = f_b/t_b
      // careful if (t_b === 0), but that means the market crashed, so we can crash too
      price: from_base.price / to_base.price
    }
};

const updateHistory = async (cache: PriceHistory, endpoint: string, limit: number) => {
  const baseUrl = CONFIG.priceAPI.url;
  const newCache = initEmptyHistory();
  for (const from of priceHistoryKeys) {
    newCache[from][priceHistoryBaseCurrencyTo] = await axios.get(baseUrl + endpoint, {
      params: {
        fsym: from,
        tsym: priceHistoryBaseCurrencyTo,
        limit: limit,
        api_key: CONFIG.priceAPI.key,
      },
    }).then(resp => {
      if (resp.status === 200) {
        const data = resp.data.Data.Data;
        const entry = assertType<Array<PriceHistoryCryptoCompareEntry>>(data)
        return entry.map(extractPriceHistoryEntry);
      }
      throw resp.data.Message;
    });
  };

  // calculate missing values
  for (const from of priceHistoryKeys) {
    for (const to of priceHistoryNotQueriedCurrenciesTo) {
      newCache[from][to] = newCache[from][priceHistoryBaseCurrencyTo].map((from_base, i) => {
        const to_base = newCache[to][priceHistoryBaseCurrencyTo][i];
        return calculateMissingHistoryEntry(from_base, to_base);
      })
    }
  }

  // replace cache
  for (const from of priceHistoryKeys) {
    cache[from] = newCache[from];
  }
}

const updateDaily = () => exponentialBackoff(
  () => updateHistory(historyDailyAll, '/data/v2/histoday', dailyHistoryLimit),
  CONFIG.APIGenerated.refreshInterval
);
const updateHourly = () => exponentialBackoff(
  () => updateHistory(historyHourlyWeek, '/data/v2/histohour', hourlyHistoryLimit),
  CONFIG.APIGenerated.refreshInterval
);

const getPriceEndpoint = async (req: Request, res: Response) => {
  if (req.body == null) {
    res.status(400).send("Did not specify \"body\"!");
    return;
  }
  // also accept unsupported currencies, just return null
  const currFrom = assertType<string[]>(req.body.from);
  const currTo = assertType<SupportedCurrencyTo>(req.body.to);
  if (currFrom.length === 0) {
    res.status(400).send("Did not specify \"from\" currencies!");
    return;
  }
  if (currTo == null) {
    res.status(400).send("Did not specify \"to\" currency!");
    return;
  }
  // fetch price if necessary
  if (currentPrice == null) {
    await updatePrice();
  }

  const result = Object.fromEntries(
    currFrom.map(from => [
      from,
      {
        ...currentPrice?.[from as SupportedCurrencyFrom]?.[currTo],
        historyHourly: historyHourlyWeek[from as SupportedCurrencyFrom]?.[currTo],
        historyDaily: historyDailyAll[from as SupportedCurrencyFrom]?.[currTo],
      }
    ])
  )
  res.send(result)
}

const routes: Route[] = [
  { path: "/v1/getPrice"
  , method: "post"
  , handler: getPriceEndpoint
  },
];

applyRoutes(routes, router);
router.use(middleware.logErrors);
router.use(middleware.errorHandler);

const server = http.createServer(router);
const port: number = CONFIG.APIGenerated.port;

server.listen(port, () =>
  console.log(`listening on ${port}...`)
);

console.log("Starting interval");

/**
 * Daemon
 */

new Promise(async resolve => {
  await updatePrice();
  setInterval(async () => {
    await updatePrice();
  }, CONFIG.APIGenerated.refreshInterval)

  updateDaily();
  setTimeout(() => {
    setInterval(async () => {
      updateDaily();
    }, moment.duration(1, 'day').asMilliseconds())
  },
  // CryptoCompare updates history at gmt midnight. Add 5 mins, just in case.
  moment().utc().endOf('day').add(5, 'minutes').diff(moment().utc(), 'milliseconds'));

  updateHourly();
  setTimeout(() => {
    setInterval(async () => {
      updateHourly();
    }, moment.duration(1, 'hour').asMilliseconds())
  },
  // CryptoCompare *probably* updates history at the end of hour. Docs don't mention it,
  // but that's where the timestamps are. Add 1 min, just in case.
  moment().endOf('hour').add(1, 'minute').diff(moment(), 'milliseconds'));
});
