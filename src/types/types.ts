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

export type CryptoResponseEntry = Record<SupportedCurrencyTo, CryptoPrice>;

export type CryptoResponse = Record<SupportedCurrencyFrom, CryptoResponseEntry>
