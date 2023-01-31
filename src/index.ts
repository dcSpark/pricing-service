import http from "http";
import express from "express";
import { Request, Response } from "express";
import { applyMiddleware, applyRoutes, exponentialBackoff, Route } from "./utils";
import * as middleware from "./middleware";
import { assertType } from "typescript-is";
import moment from "moment";
import {
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
  PriceHistoryEntry,
  CryptoCompareCurrentPriceEntry,
  CurrentPriceEntry
} from "./types/types";
import BigNumber from "bignumber.js";
// do not use directly, use `axios`
import axiosRaw, { AxiosRequestConfig } from "axios";

// populated by ConfigWebpackPlugin
declare const CONFIG: ConfigType;

/**
 * Wrapper for axios that logs results. Extend as needed.
 */
class axios {
  static async get(url: string, config?: AxiosRequestConfig) {
    const result = await axiosRaw.get(url, config)
    console.log(`GET(${result.status}): ${url}`)
    return result
  }
}

const safeNumberPrecision = 15;
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

const extractCryptoPrice = (fatObject: CryptoCompareCurrentPriceEntry): CurrentPriceEntry => {
  return {
    // We use number.toString() as input to BigNumber, because BigNumber will throw if the number is not safe
    // (has >15 significant digits). We assume these are safe, because they come directly from CryptoCompare 
    price: new BigNumber(fatObject.PRICE.toString()),
    lastUpdate: fatObject.LASTUPDATE,
    changePercent24h: new BigNumber(fatObject.CHANGEPCT24HOUR.toString()),
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
          const respValidated = assertType<
            Record<SupportedCurrencyFrom, 
              Record<SupportedCurrencyTo, CryptoCompareCurrentPriceEntry
            >>>(resp.data["RAW"]);
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
  // We use number.toString() as input to BigNumber, because BigNumber will throw if the number is not safe
  // (has >15 significant digits). We assume these are safe, because they come directly from CryptoCompare 
  price: new BigNumber(fatObject.open.toString()),
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
      price: from_base.price.div(to_base.price)
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

const historyEntryToResult: (entry: PriceHistoryEntry) => ({time: number, price: string}) = ({time, price}) => ({
  time,
  price: price.toPrecision(safeNumberPrecision)
})

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
    currFrom.map(from => {
      const entry = currentPrice?.[from as SupportedCurrencyFrom]?.[currTo];
      return [
      from,
      {
        lastUpdate: entry?.lastUpdate,
        changePercent24h: entry?.changePercent24h.toPrecision(safeNumberPrecision),
        price: entry?.price.toPrecision(safeNumberPrecision),
        historyHourly: historyHourlyWeek[from as SupportedCurrencyFrom]?.[currTo].map(historyEntryToResult),
        historyDaily: historyDailyAll[from as SupportedCurrencyFrom]?.[currTo].map(historyEntryToResult),
        }
    ]})
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
