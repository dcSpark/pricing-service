import http from "http";
import express from "express";
import { Request, Response } from "express";

// eslint-disable-next-line
const semverCompare = require("semver-compare");

import { applyMiddleware, applyRoutes, Route } from "./utils";
import * as middleware from "./middleware";
import axios from "axios";
import { assertType } from "typescript-is";

import type { CryptoPrice, CryptoResponse } from "./types/types";

// populated by ConfigWebpackPlugin
declare const CONFIG: ConfigType;

// Most important variable for this server
let currentPrice: CryptoResponse | {} = {};

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
    CHANGEPCTDAY: fatObject.CHANGEPCTDAY
  }
}

const getExternalPrice = (): Promise<any> => {
  const baseUrl = CONFIG.priceAPI.url;
  const getPriceMultiFull = baseUrl + "/data/pricemultifull?fsyms=ADA,SOL,ETH&tsyms=USD,JPY,EUR&api_key=" + CONFIG.priceAPI.key;
  
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
          const respFiltered = {
            ADA: {
              USD: extractCryptoPrice(respValidated.ADA.USD),
              JPY: extractCryptoPrice(respValidated.ADA.JPY),
              EUR: extractCryptoPrice(respValidated.ADA.EUR)
            },
            SOL: {
              USD: extractCryptoPrice(respValidated.SOL.USD),
              JPY: extractCryptoPrice(respValidated.SOL.JPY),
              EUR: extractCryptoPrice(respValidated.SOL.EUR)
            },
            ETH: {
              USD: extractCryptoPrice(respValidated.ETH.USD),
              JPY: extractCryptoPrice(respValidated.ETH.JPY),
              EUR: extractCryptoPrice(respValidated.ETH.EUR)
            }
          }
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
  if (Object.keys(currentPrice).length === 0) {   
    await updatePrice(getPriceMultiFullURL());
  }
  res.send(currentPrice)
  return;
}

const routes: Route[] = [
  { path: "/v1/getPrice"
  , method: "get"
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

