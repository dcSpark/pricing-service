export default ({ 
  priceAPI: {
    url: process.env.CRYPTOCOMPARE_URL || "https://min-api.cryptocompare.com",
    key: process.env.CRYPTOCOMPARE_KEY || ""
  },
  APIGenerated: {
    refreshInterval: 60000, // refreshes once per min
    port: 8090 
  }
} as ConfigType);
