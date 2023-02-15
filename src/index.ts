import http from "http";
import express from "express";
import { Request, Response } from "express";
import {
  applyMiddleware,
  applyRoutes,
  exponentialBackoff,
  Route,
} from "./utils";
import * as middleware from "./middleware";
import { assertType } from "typescript-is";
import moment from "moment";
import {
  CurrentPrice,
  priceHistoryBaseCurrencyTo,
  priceHistoryNotQueriedCurrenciesTo,
  PriceHistory,
  priceHistoryKeys,
  supportedCurrenciesTo,
  SupportedCurrencyFrom,
  SupportedCurrencyTo,
  PriceHistoryCryptoCompareEntry,
  CachedCollection,
  CNFT,
  ADAPool,
} from "./types/types";
import CONFIG from "../config/default";
import {
  calculateMissingHistoryEntry,
  extractPriceHistoryEntry,
  getExternalPrice,
  historyEntryToResult,
  safeNumberPrecision,
} from "./cryptocompare";
import { axios } from "./utils/index";
import {
  getCNFT,
  getCollections,
  getCollectionsUsingOpenCNFTInterval,
} from "./opencnft";
import { getAdaPools } from "./adapools";

const dailyHistoryLimit = 2000; // defined by CryptoCompare
const hourlyHistoryLimit = moment.duration(1, "week").asHours();

const initEmptyHistory = (): PriceHistory =>
  Object.create(
    Object.fromEntries(
      priceHistoryKeys.map((from) => [
        from,
        Object.fromEntries(supportedCurrenciesTo.map((to) => [to, []])),
      ])
    )
  );

// Server cache
let currentPrice: CurrentPrice | undefined;
let currentAdaPools: ADAPool[] = [];
let currentCNFTsPrice: { [key: string]: CachedCollection } = {};
let lastOpenCNFTRequested: number = 0; // used for pagination and avoid the rate limiter
const historyDailyAll: PriceHistory = initEmptyHistory();
const historyHourlyWeek: PriceHistory = initEmptyHistory();

/**
 * HTTP API interface
 */

const router = express();

const middlewares = [
  middleware.handleCors,
  middleware.handleBodyRequestParsing,
  middleware.handleCompression,
];

applyMiddleware(middlewares, router);

const updatePrice = async (): Promise<void> => {
  try {
    const price = await getExternalPrice();
    currentPrice = price;
  } catch (e) {
    console.error("Error updating price: ", e);
  }
};

const updateAdaPools = async (): Promise<void> => {
  try {
    currentAdaPools = await getAdaPools();
  } catch (e) {
    console.error("Error updating adapools: ", e);
  }
};

const updateCollections = async (): Promise<void> => {
  try {
    const collections = await getCollections();
    collections.forEach((collection) => {
      if (!collection.policies) return;
      // if data already exist in the cache, we don't update it
      const data =
        currentCNFTsPrice[collection.policies] &&
        currentCNFTsPrice[collection.policies].data != null
          ? currentCNFTsPrice[collection.policies].data
          : null;

      currentCNFTsPrice[collection.policies] = {
        ...collection,
        data,
        lastUpdatedTimestamp: Date.now(),
      };
    });
  } catch (e) {
    console.error("Error updating price: ", e);
  }
};

export const updateCollectionsUsingOpenCNFTInterval = async (
  start: number,
  limit = 20
): Promise<void> => {
  const result = await getCollectionsUsingOpenCNFTInterval(
    currentCNFTsPrice,
    start,
    limit
  );
  currentCNFTsPrice = { ...currentCNFTsPrice, ...result };
};

const updateHistory = async (
  cache: PriceHistory,
  endpoint: string,
  limit: number
) => {
  const baseUrl = CONFIG.priceAPI.url;
  const newCache = initEmptyHistory();
  for (const from of priceHistoryKeys) {
    newCache[from][priceHistoryBaseCurrencyTo] = await axios
      .get(baseUrl + endpoint, {
        params: {
          fsym: from,
          tsym: priceHistoryBaseCurrencyTo,
          limit: limit,
          api_key: CONFIG.priceAPI.key,
        },
      })
      .then((resp) => {
        if (resp.status === 200) {
          const data = resp.data.Data.Data;
          const entry = assertType<Array<PriceHistoryCryptoCompareEntry>>(data);
          return entry.map(extractPriceHistoryEntry);
        }
        throw resp.data.Message;
      });
  }

  // calculate missing values
  for (const from of priceHistoryKeys) {
    for (const to of priceHistoryNotQueriedCurrenciesTo) {
      newCache[from][to] = newCache[from][priceHistoryBaseCurrencyTo].map(
        (from_base, i) => {
          const to_base: any = newCache[to][priceHistoryBaseCurrencyTo][i];
          return calculateMissingHistoryEntry(from_base, to_base);
        }
      );
    }
  }

  // replace cache
  for (const from of priceHistoryKeys) {
    cache[from] = newCache[from];
  }
};

const updateDaily = () =>
  exponentialBackoff(
    () =>
      updateHistory(historyDailyAll, "/data/v2/histoday", dailyHistoryLimit),
    CONFIG.APIGenerated.refreshInterval
  );
const updateHourly = () =>
  exponentialBackoff(
    () =>
      updateHistory(
        historyHourlyWeek,
        "/data/v2/histohour",
        hourlyHistoryLimit
      ),
    CONFIG.APIGenerated.refreshInterval
  );

const getCardanoPoolsEndpoint = async (req: Request, res: Response) => {

  try {
    const limit = assertType<number | undefined>(Number(req.query.limit)) || 20;
    const page = assertType<number | undefined>(Number(req.query.page)) || 1;
    const search = assertType<string | undefined>(req.query.search);

    if (limit && limit > 20) {
      res.status(400).send({
        status: "Too many pools. Maximum 20.",
        data: [],
      });
      return;
    }

    const start = (page - 1) * limit;
    const end = start + limit;

    let results = [];

    if(search){
      results = currentAdaPools.filter((pool) => {
        return pool.name.toLowerCase().includes(search.toLowerCase()) || pool.pool_id.toLowerCase().includes(search.toLowerCase());
      });
    } else {
      results = currentAdaPools;
    }

    const numberOfPages = Math.ceil(results.length / limit)
    if (page > numberOfPages) {
      res.status(400).send({
        status: "Page number is too high. Please choose a lower page number.",
        data: [],
      });
      return;
    }
    const pools = results.slice(start, end);
    res.status(200).send({
      status: "ok",
      data: pools,
      limit: limit,
      page: page,
      numberOfPages,
      hasNextPage: end < currentAdaPools.length,
    });
  } catch (e) {
    res.status(400).send({
      status: "error",
      message: (e as Error).message,
    });
    return;
  }
};

const getNFTsPriceEndpoint = async (req: Request, res: Response) => {
  if (req.body == null) {
    res.status(400).send('Did not specify "body"!');
    return;
  }
  const nfts = assertType<string[]>(req.body);
  if (nfts.length === 0) {
    res.status(400).send('Did not specify "nfts"!');
    return;
  }

  if (nfts.length > 100) {
    res.status(400).send({
      status: "Too many nfts. Maximum 100.",
      data: [],
    });
    return;
  }

  if (Object.keys(currentCNFTsPrice).length == 0) {
    res.status(200).send({
      status: "CNFT Price API not available",
      data: [],
    });
    return;
  }

  const result = Object.keys(currentCNFTsPrice).map((key) => {
    const cachedNft = currentCNFTsPrice[key];
    if (cachedNft.policies != null && nfts.includes(cachedNft.policies)) {
      return cachedNft;
    } else {
      return null;
    }
  });

  // remove null values
  const filteredResult = result.filter((nft) => nft != null);

  res.status(200).send({
    status: "ok",
    data: filteredResult,
  });
};

const getPriceEndpoint = async (req: Request, res: Response) => {
  if (req.body == null) {
    res.status(400).send('Did not specify "body"!');
    return;
  }
  // also accept unsupported currencies, just return null
  const currFrom = assertType<string[]>(req.body.from);
  const currTo = assertType<SupportedCurrencyTo>(req.body.to);
  if (currFrom.length === 0) {
    res.status(400).send('Did not specify "from" currencies!');
    return;
  }
  if (currTo == null) {
    res.status(400).send('Did not specify "to" currency!');
    return;
  }
  // fetch price if necessary
  if (currentPrice == null) {
    await updatePrice();
  }

  const result = Object.fromEntries(
    currFrom.map((from) => {
      const entry = currentPrice?.[from as SupportedCurrencyFrom]?.[currTo];
      return [
        from,
        {
          lastUpdate: entry?.lastUpdate,
          changePercent24h:
            entry?.changePercent24h.toPrecision(safeNumberPrecision),
          price: entry?.price.toPrecision(safeNumberPrecision),
          historyHourly:
            historyHourlyWeek[from as SupportedCurrencyFrom]?.[currTo].map(
              historyEntryToResult
            ),
          historyDaily:
            historyDailyAll[from as SupportedCurrencyFrom]?.[currTo].map(
              historyEntryToResult
            ),
        },
      ];
    })
  );
  res.send(result);
};

const routes: Route[] = [
  { path: "/v1/getPrice", method: "post", handler: getPriceEndpoint },
  { path: "/v1/getNFTPrices", method: "post", handler: getNFTsPriceEndpoint },
  {
    path: "/v1/getCardanoPools",
    method: "get",
    handler: getCardanoPoolsEndpoint,
  },
];

applyRoutes(routes, router);
router.use(middleware.logErrors);
router.use(middleware.errorHandler);

const server = http.createServer(router);
const port: number = CONFIG.APIGenerated.port;
const refreshInterval = CONFIG.APIGenerated.refreshInterval;
const refreshBackoffCap = CONFIG.APIGenerated.refreshBackoffCap;
const baseUrl = CONFIG.priceAPI.url;

server.listen(port, () => console.log(`listening on ${port}...`));

console.log(`baseUrl: ${baseUrl}`);
console.log(`refreshInterval: ${refreshInterval}`);
console.log(`refreshBackoffCap: ${refreshBackoffCap}`);
console.log("Starting interval");

/**
 * Daemon
 */

new Promise(async (resolve) => {
  await updatePrice();
  await updateAdaPools();
  await updateCollections();

  setInterval(async () => {
    await updatePrice();
  }, CONFIG.APIGenerated.refreshInterval);

  setInterval(async () => {
    await updateAdaPools();
  }, CONFIG.APIGenerated.refreshAdaPools);

  setInterval(async () => {
    await updateCollections();
  }, CONFIG.APIGenerated.collectionUpdateInterval);

  updateDaily();

  // Update X OpenCNFTs every 1 minute
  setInterval(async () => {
    if (currentCNFTsPrice == null) return;
    return updateCollectionsUsingOpenCNFTInterval(
      lastOpenCNFTRequested,
      CONFIG.APIGenerated.openCNFTRatePerRequest
    ).then(() => {
      if (lastOpenCNFTRequested >= Object.keys(currentCNFTsPrice).length) {
        lastOpenCNFTRequested = 0;
      } else {
        lastOpenCNFTRequested += CONFIG.APIGenerated.openCNFTRatePerRequest;
      }
    });
  }, CONFIG.APIGenerated.openCNFTRefreshRate);

  setTimeout(
    () => {
      setInterval(async () => {
        updateDaily();
      }, moment.duration(1, "day").asMilliseconds());
    },
    // CryptoCompare updates history at gmt midnight. Add 5 mins, just in case.
    moment()
      .utc()
      .endOf("day")
      .add(5, "minutes")
      .diff(moment().utc(), "milliseconds")
  );

  updateHourly();
  setTimeout(
    () => {
      setInterval(async () => {
        updateHourly();
      }, moment.duration(1, "hour").asMilliseconds());
    },
    // CryptoCompare *probably* updates history at the end of hour. Docs don't mention it,
    // but that's where the timestamps are. Add 1 min, just in case.
    moment().endOf("hour").add(1, "minute").diff(moment(), "milliseconds")
  );
});
