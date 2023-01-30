export default {
  priceAPI: {
    url: process.env.CRYPTOCOMPARE_URL ?? "https://min-api.cryptocompare.com",
    key: process.env.CRYPTOCOMPARE_KEY ?? "",
  },
  APIGenerated: {
    refreshBackoffCap: process.env.REFRESH_BACKOFF_CAP ?? 60000 * 60 * 3,
    refreshInterval: process.env.REFRESH_INTERVAL ?? 60000 * 5, // refreshes every 5 mins
    port: process.env.PORT ?? 8090,
  },
} as ConfigType;
