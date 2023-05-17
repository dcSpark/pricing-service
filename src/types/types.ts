import BigNumber from "bignumber.js";

export type CryptoCompareCurrentPriceEntry = {
  PRICE: number;
  LASTUPDATE: number;
  CHANGEPCT24HOUR: number;
};

export type CurrentPriceEntry = {
  price: BigNumber;
  lastUpdate: number;
  changePercent24h: BigNumber;
};

export interface NFTPrice {
  floor_price: BigNumber;
  floor_price_marketplace: string;
  asset_holders: number;
  asset_minted: number;
  total_volume: BigNumber;
  attribution: string;
  policy: string;
  highest_sale: {
    price: BigNumber;
    asset_name: string;
    name: string;
  };
}

export type CachedNFTMapping = {
  [key: string]: string;
};

export const supportedCurrenciesFrom = ["ADA", "ETH"] as const;
export type SupportedCurrencyFrom = typeof supportedCurrenciesFrom[number];

export const supportedCurrenciesTo = [
  "USD",
  "JPY",
  "EUR",
  "CNY",
  "AUD",
  "GBP",
  "MXN",
  "HKD",
  "TWD",
  "CHF",
  "INR",
  "BRL",
  "CAD",
] as const;
export type SupportedCurrencyTo = typeof supportedCurrenciesTo[number];

export type CurrentPrice = Record<
  SupportedCurrencyFrom,
  Record<SupportedCurrencyTo, CurrentPriceEntry>
>;

export type PriceHistoryCryptoCompareEntry = {
  time: number;
  open: number;
};
export type PriceHistoryEntry = {
  time: PriceHistoryCryptoCompareEntry["time"];
  price: BigNumber; // opening price is the price at timestamp
};

export interface CNFT {
  // attribution: string;
  policy: string;
  thumbnail: string;
  total_volume: number;
  // first_sale: number;
  total_tx: number;
  total_nfts_sold: number;
  minted: number;
  holders: number;
  highest_sale: {
    price: number;
    asset_name: string;
    name: string;
    fingerprint: string;
  };
  floor_price: number;
  floor_price_marketplace: string;
}

export interface ADAPoolResponse {
  code: number;
  time: string;
  msg: string;
  data: Record<string, ADAPool>;
  terms: string;
}

export interface ADAPool {
  pool_id: string;
  name: string;
  stake: string;
  pool_id_hash: string;
  tax_ratio: string | null;
  tax_fix: string;
  blocks_epoch: string;
  blocks_lifetime: string;
  roa_short: string;
  roa_lifetime: string;
  pledge: string;
  delegators: string;
  homepage: string | null;
  saturation: number;
  img: string;
  url: string;
}

export interface NFTCollection {
  id: number;
  name: string | null;
  policies: string | null; // no idea how this can be null but it can
}

export interface CachedCollection extends NFTCollection {
  data: CNFT | null;
  lastUpdatedTimestamp: number;
}

// To reduce the number of queries, we query "from" all currencies "to" one base currency,
// and fill in the remaining values ourselves.
export const priceHistoryBaseCurrencyTo = "USD" as const;
export type PriceHistoryNotQueriedCurrencyTo = Exclude<
  SupportedCurrencyTo,
  typeof priceHistoryBaseCurrencyTo
>;
export type PriceHistoryKey =
  | SupportedCurrencyFrom
  | PriceHistoryNotQueriedCurrencyTo;
export const priceHistoryNotQueriedCurrenciesTo = supportedCurrenciesTo.filter(
  (to) => to !== priceHistoryBaseCurrencyTo
) as PriceHistoryNotQueriedCurrencyTo[];
export const priceHistoryKeys: PriceHistoryKey[] = [
  ...priceHistoryNotQueriedCurrenciesTo,
  ...supportedCurrenciesFrom,
];
export type PriceHistory = Record<
  PriceHistoryKey,
  Record<SupportedCurrencyTo, PriceHistoryEntry[]>
>;
