import nock from "nock";
import {
  generatePriceHistoryURL,
  getExternalPrice,
} from "../src/cryptocompare";
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
  test("Cryptocompare API is reachable and parses correctly", async () => {
    nock.enableNetConnect();
    try {
      const prices = await getExternalPrice(false);
      expect(prices).toBeInstanceOf(Object);
    } catch (e) {
      throw e;
    }
  });

  test("External Prices are processed correctly", async () => {
    const getPriceMultiFull = generatePriceHistoryURL();
    nockEndpoint("./tests/mocks/externalPrice.json", getPriceMultiFull);

    try {
      const prices = await getExternalPrice(false);
      expect(prices).toMatchObject({
        ADA: {
          EUR: {
            changePercent24h: new BigNumber("7.061569886197841"),
            lastUpdate: 1676472106,
            price: new BigNumber("0.3669"),
          },
          JPY: {
            changePercent24h: new BigNumber("7.003199804240581"),
            lastUpdate: 1676472110,
            price: new BigNumber("52.46429523400001"),
          },
          USD: {
            changePercent24h: new BigNumber("5.783783783783792"),
            lastUpdate: 1676472111,
            price: new BigNumber("0.3914"),
          },
          MXN: {
            changePercent24h: new BigNumber("6.4576280197159734"),
            lastUpdate: 1676472114,
            price: new BigNumber("7.2889792"),
          },
        },
        ETH: {
          EUR: {
            changePercent24h: new BigNumber("2.0291136704365593"),
            lastUpdate: 1676472112,
            price: new BigNumber("1476.8"),
          },
          JPY: {
            changePercent24h: new BigNumber("2.349013103129815"),
            lastUpdate: 1676472110,
            price: new BigNumber("211293.98"),
          },
          USD: {
            changePercent24h: new BigNumber("1.3830751721610304"),
            lastUpdate: 1676472116,
            price: new BigNumber("1576.74"),
          },
          MXN: {
            changePercent24h: new BigNumber("2.0679827610176558"),
            lastUpdate: 1676472063,
            price: new BigNumber("29367"),
          },
        },
      });
    } catch (e) {
      throw e;
    }
  });
});
