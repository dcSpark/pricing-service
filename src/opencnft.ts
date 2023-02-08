// do not use directly, use `axios`
import axiosRaw from "axios";
import { axios } from "./utils/index";
import { assertType } from "typescript-is";
import { CachedCollection, CNFT, NFTCollection } from "./types/types";

export const parseCNFTPredatorResponse = (data: any): NFTCollection[] => {
  try {
    if (data["success"] == null || data["success"] == false) {
      console.log("failed to get collections");
      throw new Error("Success is false");
    }
    const respValidated = assertType<NFTCollection[]>(data["collections"]);
    return respValidated;
  } catch (e) {
    throw "Error while parsing response " + e;
  }
};

export const getCollectionsURL = (): string => {
  return "https://cnft-predator.herokuapp.com/collections";
};

export const getCollections = async (
  logging = true
): Promise<NFTCollection[]> => {
  const fetcher = logging ? axios.get : axiosRaw.get;
  return fetcher(getCollectionsURL()).then((resp) => {
    if (resp.status === 404) {
      throw new Error("Not found");
    }
    return parseCNFTPredatorResponse(resp.data);
  });
};

export const parseCNFTResponse = (resp: any): CNFT => {
  try {
    const respValidated = assertType<CNFT>(resp);
    return respValidated;
  } catch (e) {
    throw "Error while parsing response " + e;
  }
};

export const getCNFTURL = (policy: string): string => {
  return `https://api.opencnft.io/1/policy/${policy}`;
};

export const getCNFT = async (
  policy: string,
  logging = true
): Promise<CNFT> => {
  const fetcher = logging ? axios.get : axiosRaw.get;
  return fetcher(getCNFTURL(policy)).then((resp) => {
    if (resp.status === 404) {
      throw new Error("Not found");
    }
    return parseCNFTResponse(resp.data);
  });
};

export const getCollectionsUsingOpenCNFTInterval = async (
  currentCNFTsPrice: { [key: string]: CachedCollection },
  start: number,
  limit = 20
): Promise<{ [key: string]: CachedCollection }> => {
  let result: { [key: string]: CachedCollection } = {};
  // get the keys of the currentCNFTsPrice
  const keys = Object.keys(currentCNFTsPrice);
  // get the keys of the currentCNFTsPrice that are in the range of start and start + limit
  const keysInRange = keys.slice(start, start + limit);
  for (const keys of keysInRange) {
    try {
      const collection = await getCNFT(keys);
      if (!collection.policy) continue;
      result[collection.policy] = {
        ...currentCNFTsPrice[collection.policy],
        data: collection,
        lastUpdatedTimestamp: Date.now(),
      };
    } catch (e) {
      console.error("Error updating price for openCNFT: ", e);
    }
  }
  return result;
};
