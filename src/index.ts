import http from "http";
import express from "express";
import { Request, Response } from "express";
import { applyMiddleware, applyRoutes, Route } from "./utils";
import * as middleware from "./middleware";
import axios from "axios";
import { assertType } from "typescript-is";

import {
  CryptoPrice,
  CryptoResponse,
  supportedCurrenciesFrom,
  supportedCurrenciesTo,
  SupportedCurrencyFrom,
  SupportedCurrencyTo
} from "./types/types";

// populated by ConfigWebpackPlugin
declare const CONFIG: ConfigType;

// Most important variable for this server
let currentPrice: CryptoResponse | undefined;

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
          const respValidated = assertType<CryptoResponse>(resp.data["RAW"]);
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
  if (currTo.length === 0) {
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
      currentPrice?.[from as SupportedCurrencyFrom]?.[currTo],
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
  }, CONFIG.APIGenerated.refreshRate)
})

