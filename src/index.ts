import http from "http";
import express from "express";
import { Request, Response } from "express";

// eslint-disable-next-line
const semverCompare = require("semver-compare");

import { applyMiddleware, applyRoutes, Route } from "./utils";
import * as middleware from "./middleware";
import axios from "axios";
import { assertType } from "typescript-is";

import type { CryptoResponse } from "./types/types";

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
          // TODO: filter out the extra stuff
          return respValidated;
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

// fix type
const getPriceEndpoint = async (req: Request, res: Response) => {
  if (currentPrice === {}) {
    await updatePrice();
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

