// do not use directly, use `axios`
import axiosRaw from "axios";
import { axios } from "./utils/index";
import { assertType } from "typescript-is";
import { CNFT, NFTCollection } from "./types/types";

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

export const parseCNFTResponse = (resp: any): CNFT[] => {
  try {
    const respValidated = assertType<CNFT[]>(resp.data);
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
    return resp.data;
  });
};
