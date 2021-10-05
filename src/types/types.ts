export type CryptoPrice = {
    FROMSYMBOL: string,
    PRICE: number,
    LASTUPDATE: number,
    CHANGEPCT24HOUR: number,
}

export type CryptoResponse = {
    ADA: {
        USD: CryptoPrice,
        JPY: CryptoPrice,
        EUR: CryptoPrice
    },
    SOL: {
        USD: CryptoPrice,
        JPY: CryptoPrice,
        EUR: CryptoPrice
    },
    ETH: {
        USD: CryptoPrice,
        JPY: CryptoPrice,
        EUR: CryptoPrice
    },
}
