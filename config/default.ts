import dotenv from "dotenv";

dotenv.config({ path: ".env" });

export default {
  priceAPI: {
    url: process.env.CRYPTOCOMPARE_URL ?? "https://min-api.cryptocompare.com",
    key: process.env.CRYPTOCOMPARE_KEY ?? "",
  },
  adaPoolsAPI: {
    url: process.env.ADAPOOLS_URL ?? "https://api.cexplorer.io",
    key: process.env.ADAPOOLS_KEY ?? "",
    network: process.env.ADAPOOLS_NETWORK ?? "mainnet",
  },
  APIGenerated: {
    refreshBackoffCap: process.env.REFRESH_BACKOFF_CAP ?? 60000 * 60 * 3,
    refreshInterval: process.env.REFRESH_INTERVAL ?? 60000 * 5, // refreshes every 5 mins
    refreshAdaPools: process.env.REFRESH_ADAPOOLS ?? 60000 * 60 * 6, // refreshes every 6 hours
    openCNFTkey: process.env.OPENCNFT_KEY ?? "",
    openCNFTRatePerRequest: process.env.OPEN_CNFT_RATE_REQUEST ?? 20,
    openCNFTRefreshRate: process.env.OPEN_CNFT_REFRESH_RATE ?? (60000 * 1 + 5000), // refreshes every 1 min and 1 sec
    collectionUpdateInterval: process.env.OPEN_CNFT_REFRESH_RATE ?? 60000 * 60 * 6, // refreshes every 6 hours
    apiJnglkey: process.env.JNGL_KEY ?? "",
    port: process.env.PORT ?? 8080,
  },
} as ConfigType;
