import dotenv from "dotenv";

dotenv.config({ path: ".env" });

export default {
  priceAPI: {
    url: process.env.CRYPTOCOMPARE_URL ?? "https://min-api.cryptocompare.com",
    key: process.env.CRYPTOCOMPARE_KEY ?? "",
  },
  APIGenerated: {
    refreshBackoffCap: process.env.REFRESH_BACKOFF_CAP ?? 60000 * 60 * 3,
    refreshInterval: process.env.REFRESH_INTERVAL ?? 60000 * 5, // refreshes every 5 mins
    openCNFTRatePerRequest: process.env.OPEN_CNFT_RATE_REQUEST ?? 20,
    openCNFTRefreshRate: process.env.OPEN_CNFT_REFRESH_RATE ?? (60000 * 1 + 5000), // refreshes every 1 min and 1 sec
    collectionUpdateInterval: process.env.OPEN_CNFT_REFRESH_RATE ?? 60000 * 60 * 6, // refreshes every 6 hours
    port: process.env.PORT ?? 8080,
  },
} as ConfigType;
