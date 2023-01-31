interface ConfigType {
  priceAPI: {
    url: string,
    key: string,
  },
  APIGenerated: {
    refreshBackoffCap: number,
    refreshInterval: number,
    port: number
  },
}
