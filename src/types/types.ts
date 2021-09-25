export type CryptoPrice = {
    FROMSYMBOL: string,
    PRICE: number,
    LASTUPDATE: number,
    CHANGEPCTDAY: number,
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
