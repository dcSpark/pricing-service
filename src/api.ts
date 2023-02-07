import BigNumber from "bignumber.js";
import { CryptoCompareCurrentPriceEntry, CurrentPriceEntry, PriceHistoryCryptoCompareEntry, PriceHistoryEntry, supportedCurrenciesFrom, supportedCurrenciesTo, SupportedCurrencyFrom, SupportedCurrencyTo } from "./types/types";
import CONFIG from "../config/default";
// do not use directly, use `axios`
import axiosRaw, { AxiosRequestConfig } from "axios"
import { assertType } from "typescript-is";

export const safeNumberPrecision = 15;

/**
 * Wrapper for axios that logs results. Extend as needed.
 */
export class axios {
    static async get(url: string, config?: AxiosRequestConfig) {
      const result = await axiosRaw.get(url, config);
      console.log(`GET(${result.status}): ${url}`);
      return result;
    }
  }

export const extractCryptoPrice = (
  fatObject: CryptoCompareCurrentPriceEntry
): CurrentPriceEntry => {
  return {
    // We use number.toString() as input to BigNumber, because BigNumber will throw if the number is not safe
    // (has >15 significant digits). We assume these are safe, because they come directly from CryptoCompare
    price: new BigNumber(fatObject.PRICE.toString()),
    lastUpdate: fatObject.LASTUPDATE,
    changePercent24h: new BigNumber(fatObject.CHANGEPCT24HOUR.toString()),
  };
};

export const generatePriceHistoryURL = (): string => {
  const baseUrl = CONFIG.priceAPI.url;
  const froms = supportedCurrenciesFrom.join(",");
  const tos = supportedCurrenciesTo.join(",");
  const getPriceMultiFull =
    baseUrl +
    `/data/pricemultifull?fsyms=${froms}&tsyms=${tos}&api_key=${CONFIG.priceAPI.key}`;
  return getPriceMultiFull;
};

export const getExternalPrice = (): Promise<any> => {
  const getPriceMultiFull = generatePriceHistoryURL();
  return axios.get(getPriceMultiFull).then((resp) => {
    if (resp.status === 404) {
      throw "Problem with the external API server. Not found.";
    } else if (resp.status === 500) {
      throw "Problem with the external API server. Server error.";
    } else if (resp.status === 400) {
      throw "Problem with the external API server. Request issue.";
    } else if (resp.data["RAW"] == null) {
      console.log("resp.data: ", resp.data);
      throw "Problem with the external API server. RAW response missing.";
    } else {
      // console.log("RAW response:", resp.data["RAW"]);
      try {
        const respValidated = assertType<
          Record<
            SupportedCurrencyFrom,
            Record<SupportedCurrencyTo, CryptoCompareCurrentPriceEntry>
          >
        >(resp.data["RAW"]);
        // const respValidated = resp.data["RAW"];
        // console.log("respValidated: ", respValidated);
        // console.log("type of respValidated: ", typeof respValidated);
        // console.log("CAD PRICE response:", respValidated["ADA"]["CAD"]["PRICE"]);
        const respFiltered = Object.fromEntries(
          supportedCurrenciesFrom.map((from) => [
            from,
            Object.fromEntries(
              supportedCurrenciesTo.map((to) => [
                to,
                extractCryptoPrice(respValidated[from][to]),
              ])
            ),
          ])
        );
        return respFiltered;
      } catch (e) {
        throw "Error while parsing response " + e;
      }
    }
  });
};

export const historyEntryToResult: (entry: PriceHistoryEntry) => {
  time: number;
  price: string;
} = ({ time, price }) => ({
  time,
  price: price.toPrecision(safeNumberPrecision),
});

export const extractPriceHistoryEntry = (
  fatObject: PriceHistoryCryptoCompareEntry
): PriceHistoryEntry => ({
  time: fatObject.time,
  // We use number.toString() as input to BigNumber, because BigNumber will throw if the number is not safe
  // (has >15 significant digits). We assume these are safe, because they come directly from CryptoCompare
  price: new BigNumber(fatObject.open.toString()),
});

export const calculateMissingHistoryEntry = (
  from_base: PriceHistoryEntry,
  to_base: PriceHistoryEntry
): PriceHistoryEntry => {
  if (from_base.time !== to_base.time) {
    throw new Error("Timestamp mismatch!");
  }
  return {
    time: from_base.time,
    // Not too complicated, but just in case here is the reasoning:
    // 1f = f_b * 1b;   1t = t_b * 1b;   1f = f_t * 1t
    // We want f_t:
    // f_t = 1f/1t = (f_b * 1b)/(t_b * 1b) = f_b/t_b
    // careful if (t_b === 0), but that means the market crashed, so we can crash too
    price: from_base.price.div(to_base.price),
  };
};
