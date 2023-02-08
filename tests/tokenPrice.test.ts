import nock from "nock";
import { generatePriceHistoryURL, getExternalPrice } from "../src/cryptocompare";
import { readFileSync } from "fs";
import BigNumber from "bignumber.js";

const nockEndpoint = (filePath: string, url: string): void => {
  const urlObj = new URL(url);
  const file = readFileSync(filePath, "utf-8");
  const json = JSON.parse(file);
  nock(urlObj.origin).get(urlObj.pathname).query(true).reply(200, json);
};

beforeAll(() => {
  nock.cleanAll();
  nock.disableNetConnect();
});

describe("Cryptocompare API", () => {
  // TODO: Uncomment this
  // test("Cryptocompare API is reachable and parses correctly", async () => {
  //   const getPriceMultiFull = generatePriceHistoryURL();
  //   nock.enableNetConnect();
  //   try {
  //     const prices = await getExternalPrice(false);
  //     expect(prices).toBeInstanceOf(Object);
  //   } catch (e) {
  //     throw e;
  //   }
  // });

  test("External Prices are processed correctly", async () => {
    const getPriceMultiFull = generatePriceHistoryURL();
    nockEndpoint("./tests/mocks/externalPrice.json", getPriceMultiFull);

    try {
      const prices = await getExternalPrice(false);
      expect(prices).toStrictEqual({
        ADA: {
          EUR: {
            changePercent24h: new BigNumber("1.7940932928512299"),
            lastUpdate: 1675806041,
            price: new BigNumber("0.3688"),
          },
          JPY: {
            changePercent24h: new BigNumber("0.5182118050076848"),
            lastUpdate: 1675806044,
            price: new BigNumber("51.818179136"),
          },
          USD: {
            changePercent24h: new BigNumber("1.8050541516245504"),
            lastUpdate: 1675806047,
            price: new BigNumber("0.3948"),
          },
        },
        ETH: {
          EUR: {
            changePercent24h: new BigNumber("1.6756668303059996"),
            lastUpdate: 1675806047,
            price: new BigNumber("1553.35"),
          },
          JPY: {
            changePercent24h: new BigNumber("0.5182118050076773"),
            lastUpdate: 1675806044,
            price: new BigNumber("218826.77"),
          },
          USD: {
            changePercent24h: new BigNumber("1.6963119407175886"),
            lastUpdate: 1675806046,
            price: new BigNumber("1666.05"),
          },
        },
      });
    } catch (e) {
      throw e;
    }
  });
});
