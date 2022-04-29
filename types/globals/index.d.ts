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

declare global {
    namespace NodeJS {
      interface Global {
        CONFIG: ConfigType;
      }
    }
  }