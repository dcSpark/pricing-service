export type CryptoPrice = {
    FROMSYMBOL: string,
    PRICE: number,
    LASTUPDATE: number,
    CHANGEPCT24HOUR: number,
}

export const supportedCurrenciesFrom = ['ADA', 'SOL', 'ETH'] as const;
export type SupportedCurrencyFrom = typeof supportedCurrenciesFrom[number];

export const supportedCurrenciesTo = ['USD', 'JPY', 'EUR'] as const;
export type SupportedCurrencyTo = typeof supportedCurrenciesTo[number];

export type CurrentPrice = Record<SupportedCurrencyFrom, Record<SupportedCurrencyTo, CryptoPrice>>

export type PriceHistoryCryptoCompareEntry = {
  time: number;
  open: number;
}
export type PriceHistoryEntry = {
  time: PriceHistoryCryptoCompareEntry['time'];
  price: PriceHistoryCryptoCompareEntry['open']; // opening price is the price at timestamp
}

// To reduce the number of querries, we qerry "from" all currencies "to" one base currency,
// and fill in the remaining values ourselves. 
export const priceHistoryBaseCurrencyTo = 'USD' as const;
export type PriceHistoryUnquerriedCurrencyTo = Exclude<SupportedCurrencyTo, typeof priceHistoryBaseCurrencyTo> 
export type PriceHistoryKey = SupportedCurrencyFrom | PriceHistoryUnquerriedCurrencyTo
export const priceHistoryUnquerriedCurrenciesTo = 
  supportedCurrenciesTo.filter(to => to !== priceHistoryBaseCurrencyTo) as PriceHistoryUnquerriedCurrencyTo[];
export const priceHistoryKeys: PriceHistoryKey[] = [...priceHistoryUnquerriedCurrenciesTo, ...supportedCurrenciesFrom];
export type PriceHistory = 
  Record<PriceHistoryKey, Record<SupportedCurrencyTo, PriceHistoryEntry[]>>