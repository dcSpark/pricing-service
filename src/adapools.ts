import CONFIG from "../config/default";
import fetch from "node-fetch";
import { assertType } from "typescript-is";
import { ADAPool, ADAPoolResponse } from "./types/types";

export const generateAdaPoolsURL = (): string => {
  const baseUrl = CONFIG.adaPoolsAPI.url;
  const getPriceMultiFull = baseUrl + `/v1/individual/dcspark_list`;
  return getPriceMultiFull;
};

export const parseAdaPoolsResponse = (resp: any): ADAPool[] => {
  try {
    const respValidated = assertType<ADAPoolResponse>(resp);
    return Object.values(respValidated.data);
  } catch (e) {
    throw "Error while parsing response " + e;
  }
};

export const getAdaPools = (logging = true): Promise<ADAPool[]> => {
  const requestConfig = {
    headers: {
      Accept: "text/json",
      "Content-Type": "application/json",
      "x-network": "mainnet",
      "x-api-key": CONFIG.adaPoolsAPI.key,
    },
  };
  const getAdaPools = generateAdaPoolsURL();
  // Axios with adaPools wasn't working for some reason so I switched to node-fetch
  return fetch(getAdaPools, {
    method: "POST",
    ...requestConfig,
  }).then(async (resp) => {
    if (logging) {
      console.log(`POST(${resp.status}): ${getAdaPools}`);
    }
    if (resp.status === 404) {
      throw "AdaPools API not found";
    }
    if (resp.status === 403) {
      throw "AdaPools API forbidden. Check that API Key is valid.";
    }
    if (resp.status !== 200) {
      throw "AdaPools API error";
    }
    const data = await resp.json();
    return parseAdaPoolsResponse(data);
  });
};
