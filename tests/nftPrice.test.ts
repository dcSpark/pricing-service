import nock from "nock";
import { nockEndpoint } from "./utils";
import {
  getCNFT,
  getCNFTURL,
  getCollections,
  getCollectionsURL,
} from "../src/opencnft";

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
});
