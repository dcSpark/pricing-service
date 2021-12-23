interface ConfigType {
  priceAPI: {
    url: string,
    key: string,
  },
  APIGenerated: {
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