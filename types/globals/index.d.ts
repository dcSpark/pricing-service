interface ConfigType {
  priceAPI: {
    url: string,
    key: string,
  },
  adaPoolsAPI: {
    url: string,
    key: string,
    network: 'mainnet' | 'preprod',
  },
  APIGenerated: {
    refreshBackoffCap: number,
    refreshInterval: number,
    refreshAdaPools: number,
    openCNFTRatePerRequest: number, // 60
    openCNFTRefreshRate: number,
    collectionUpdateInterval: number,
    port: number
  },
}
