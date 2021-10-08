export default ({ 
  priceAPI: {
    url: process.env.CRYPTOCOMPARE_URL || "https://min-api.cryptocompare.com",
    key: process.env.CRYPTOCOMPARE_KEY || ""
  },
  APIGenerated: {
    refreshRate: 60000, // per min
    port: 8090 
  }
} as ConfigType);
