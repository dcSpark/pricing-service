// do not use directly, use `axios`
import axiosRaw from "axios";
import { axios } from "./utils/index";
import { assertType } from "typescript-is";
import { CachedCollection, CNFT, NFTCollection } from "./types/types";
import CONFIG from "../config/default";

export const parseCNFTPredatorResponse = (data: any): NFTCollection[] => {
  try {
    if (data["success"] == null || data["success"] == false) {
      console.log("failed to get collections");
      throw new Error("Success is false");
    }
    const respValidated = assertType<NFTCollection[]>(data);
    return respValidated;
  } catch (e) {
    throw "Error while parsing response " + e;
  }
};

export const getCollectionsURL = (): string => {
  return "https://api.jngl.io/publicapi/v1/cardano/collections";
};

export const getCollections = async (
  logging = true
): Promise<NFTCollection[]> => {
  const requestConfig = {
    headers: { "X-Api-Key": CONFIG.APIGenerated.apiJnglkey },
  };
  const fetcher = logging ? axios.get : axiosRaw.get;
  return fetcher(getCollectionsURL(), { ...requestConfig}).then((resp) => {
    if (resp.status === 404) {
      throw new Error("Not found");
    }
    return parseCNFTPredatorResponse(resp.data);
  });
};

export const parseCNFTResponse = (resp: unknown): CNFT => {
  try {
    const respValidated = assertType<CNFT>(resp);
    return respValidated;
  } catch (e) {
    throw "Error while parsing response " + e;
  }
};

export const getCNFTURL = (policy: string): string => {
  return `https://api.opencnft.io/2/collection/${policy}`;
};

export const getCNFT = async (
  policy: string,
  logging = true
): Promise<CNFT> => {
  const requestConfig = {
    headers: { "X-Api-Key": CONFIG.APIGenerated.openCNFTkey },
  };
  const cnftURL = getCNFTURL(policy);
  const fetcher = logging ? axios.get : axiosRaw.get;
  return fetcher(cnftURL, { ...requestConfig }).then((resp) => {
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
  for (const key of keysInRange) {
    try {
      const collection = await getCNFT(key);
      if (!collection.policy) continue;
      result[collection.policy] = {
        ...currentCNFTsPrice[collection.policy],
        data: {
          ...collection,
          holders: collection.holders ?? 0, // Assign 0 if holders is not set
          floor_price: collection.floor_price ?? 0, // Assign 0 if floor_price is not set
          thumbnail: collection.thumbnail ?? "", // Assign "" if thumbnail is not set
        },
        lastUpdatedTimestamp: Date.now(),
      };
    } catch (e) {
      console.error("Error updating price for openCNFT: ", e);
    }
  }
  return result;
};

