import nock from "nock";
import { jsonFile, nockEndpoint } from "./utils";
import {
  getCNFT,
  getCNFTURL,
  getCollections,
  getCollectionsURL,
} from "../src/opencnft";
import { getCollectionsUsingOpenCNFTInterval } from "../src/opencnft";
import { CachedCollection } from "../src/types/types";

beforeAll(() => {
  nock.cleanAll();
  nock.disableNetConnect();
});

describe("CNFT APIs", () => {
  test("CNFT Predator Parsing", async () => {
    nockEndpoint("./tests/mocks/cnft-predator.json", getCollectionsURL());
    try {
      const collection = await getCollections(false);
      expect(collection[0]).toStrictEqual({
        id: 65430,
        name: "Alley Katz",
        policies: "d34743543ccbda22bb948400a4a919b7b54e82123030702e38cc62b6",
      });
    } catch (e) {
      throw e;
    }
  });

  test("OpenCNFT Parsing", async () => {
    const katzPolicyId =
      "d34743543ccbda22bb948400a4a919b7b54e82123030702e38cc62b6";
    nockEndpoint("./tests/mocks/cnft.json", getCNFTURL(katzPolicyId));
    try {
      const cnft = await getCNFT(katzPolicyId, false);
      expect(cnft).toStrictEqual({
        attribution:
          "NOTICE: © 2022 OpenCNFT. Just include the source of the data (opencnft.io) ;)",
        policy: "d34743543ccbda22bb948400a4a919b7b54e82123030702e38cc62b6",
        thumbnail: "ipfs://QmfZoBg6Q7WgaAMbiEA5cfWhoYGjpcTCz3KujurDm8kzXj",
        total_volume: 3614340000008,
        first_sale: 1.7976931348623157e308,
        total_tx: 7657,
        total_assets_sold: 5794,
        asset_minted: 9753,
        asset_holders: 2401,
        highest_sale: {
          asset_name: "ALLEYKATZ05192",
          name: "d34743543ccbda22bb948400a4a919b7b54e82123030702e38cc62b6.ALLEYKATZ05192",
          price: 13500000000,
        },
        floor_price: 435000000,
        floor_price_marketplace: "jpg.store",
      });
    } catch (e) {
      throw e;
    }
  });

  test("OpenCNFT Parsing - No Data", async () => {
    let currentCNFTsPrice: { [key: string]: CachedCollection } = jsonFile(
      "./tests/mocks/cnft-api-input.json"
    ) as any;

    Object.keys(currentCNFTsPrice).forEach((key) => {
      nockEndpoint(`./tests/mocks/cnft/${key}.json`, getCNFTURL(key));
    });

    try {
      currentCNFTsPrice = await getCollectionsUsingOpenCNFTInterval(
        currentCNFTsPrice,
        0,
        2
      );
      console.log(currentCNFTsPrice);
      expect(
        currentCNFTsPrice[
          "b97859c71e4e73af3ae83c30a3172c434c43041f6ff19c297fb76094"
        ]
      ).toStrictEqual({
        id: 63760,
        name: "EarthNode",
        policies: "b97859c71e4e73af3ae83c30a3172c434c43041f6ff19c297fb76094",
        data: {
          attribution:
            "NOTICE: © 2022 OpenCNFT. Just include the source of the data (opencnft.io) ;)",
          policy: "b97859c71e4e73af3ae83c30a3172c434c43041f6ff19c297fb76094",
          thumbnail: "ipfs://QmYUA3THPRhQcdmSzgJUTYMa98hvYWtD9i9vUG8ZcNeQeo",
          total_volume: 2745353000000,
          first_sale: 1.7976931348623157e308,
          total_tx: 33,
          total_assets_sold: 32,
          asset_minted: 1000,
          asset_holders: 515,
          highest_sale: {
            asset_name: "EarthNode835",
            name: "b97859c71e4e73af3ae83c30a3172c434c43041f6ff19c297fb76094.EarthNode835",
            price: 135000000000,
          },
          floor_price: 78500000000,
          floor_price_marketplace: "jpg.store",
        },
        lastUpdatedTimestamp:
          currentCNFTsPrice[
            "b97859c71e4e73af3ae83c30a3172c434c43041f6ff19c297fb76094"
          ].lastUpdatedTimestamp,
      });

      expect(
        currentCNFTsPrice[
          "b863bc7369f46136ac1048adb2fa7dae3af944c3bbb2be2f216a8d4f"
        ]
      ).toStrictEqual({
        id: 27835,
        name: "Berry",
        policies: "b863bc7369f46136ac1048adb2fa7dae3af944c3bbb2be2f216a8d4f",
        data: {
          attribution:
            "NOTICE: © 2022 OpenCNFT. Just include the source of the data (opencnft.io) ;)",
          policy: "b863bc7369f46136ac1048adb2fa7dae3af944c3bbb2be2f216a8d4f",
          thumbnail:
            "ipfs://ipfs/Qmb43sxTNDVze7VAodazKoPDaB6vjMKs8sEqGuexiAu5TS",
          total_volume: 1186259990000,
          first_sale: 1.7976931348623157e308,
          total_tx: 16,
          total_assets_sold: 16,
          asset_minted: 100,
          asset_holders: 84,
          highest_sale: {
            asset_name: "BerryCardinal",
            name: "b863bc7369f46136ac1048adb2fa7dae3af944c3bbb2be2f216a8d4f.BerryCardinal",
            price: 115000000000,
          },
          floor_price: 64000000000,
          floor_price_marketplace: "jpg.store",
        },
        lastUpdatedTimestamp:
          currentCNFTsPrice[
            "b863bc7369f46136ac1048adb2fa7dae3af944c3bbb2be2f216a8d4f"
          ].lastUpdatedTimestamp,
      });
    } catch (e) {
      throw e;
    }
  });
});
