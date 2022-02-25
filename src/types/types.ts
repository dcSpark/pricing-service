import BigNumber from "bignumber.js";

export type CryptoCompareCurrentPriceEntry = {
  PRICE: number,
  LASTUPDATE: number,
  CHANGEPCT24HOUR: number,
}

export type CurrentPriceEntry = {
    price: BigNumber,
    lastUpdate: number,
    changePercent24h: BigNumber,
}

export const supportedCurrenciesFrom = ['ADA', 'SOL', 'ETH'] as const;
export type SupportedCurrencyFrom = typeof supportedCurrenciesFrom[number];

export const supportedCurrenciesTo = ['USD', 'JPY', 'EUR'] as const;
export type SupportedCurrencyTo = typeof supportedCurrenciesTo[number];

export type CurrentPrice = Record<SupportedCurrencyFrom, Record<SupportedCurrencyTo, CurrentPriceEntry>>

export type PriceHistoryCryptoCompareEntry = {
  time: number;
  open: number;
}
export type PriceHistoryEntry = {
  time: PriceHistoryCryptoCompareEntry['time'];
  price: BigNumber; // opening price is the price at timestamp
}

// To reduce the number of queries, we query "from" all currencies "to" one base currency,
// and fill in the remaining values ourselves. 
export const priceHistoryBaseCurrencyTo = 'USD' as const;
export type PriceHistoryNotQueriedCurrencyTo = Exclude<SupportedCurrencyTo, typeof priceHistoryBaseCurrencyTo> 
export type PriceHistoryKey = SupportedCurrencyFrom | PriceHistoryNotQueriedCurrencyTo
export const priceHistoryNotQueriedCurrenciesTo = 
  supportedCurrenciesTo.filter(to => to !== priceHistoryBaseCurrencyTo) as PriceHistoryNotQueriedCurrencyTo[];
export const priceHistoryKeys: PriceHistoryKey[] = [...priceHistoryNotQueriedCurrenciesTo, ...supportedCurrenciesFrom];
export type PriceHistory = 
  Record<PriceHistoryKey, Record<SupportedCurrencyTo, PriceHistoryEntry[]>>