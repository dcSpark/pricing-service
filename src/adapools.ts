import CONFIG from "../config/default";
// do not use directly, use `axios`
import axiosRaw from "axios";
import { axios } from "./utils/index";
import { assertType } from "typescript-is";
import { ADAPool, ADAPoolResponse } from "./types/types";

export const generateAdaPoolsURL = (): string => {
  const baseUrl = CONFIG.adaPoolsAPI.url;
  const getPriceMultiFull = baseUrl + `/v1/individual/dcspark_list`;
  return getPriceMultiFull;
};

export const parseAdaPoolsResponse = (
  resp: any
): ADAPool[] => {
  try {
    const respValidated = assertType<ADAPoolResponse>(resp);
    return Object.values(respValidated.data);
  } catch (e) {
    throw "Error while parsing response " + e;
  }
};

export const getAdaPools = (
  logging = true
): Promise<ADAPool[]> => {
  const axiosConfig = {
    headers: {
      "x-network": "mainnet",
      "x-api-key": CONFIG.adaPoolsAPI.key,
    },
  };
  const getAdaPools = generateAdaPoolsURL();
  const fetcher = logging ? axios.get : axiosRaw.get;
  return fetcher(getAdaPools, axiosConfig).then((resp) => {
    if (resp.status === 404) {
      throw "AdaPools API not found";
    }
    if (resp.status === 403) {
      throw "AdaPools API forbidden. Check that API Key is valid.";
    }
    if (resp.status !== 200) {
      throw "AdaPools API error";
    }
    return parseAdaPoolsResponse(resp.data);
  });
};
