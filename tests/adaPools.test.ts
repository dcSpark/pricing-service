import nock from "nock";
import { jsonFile, nockEndpoint } from "./utils";
import { generateAdaPoolsURL, getAdaPools } from "../src/adapools";

beforeAll(() => {
  nock.cleanAll();
  nock.disableNetConnect();
});

describe("Adapools API", () => {
  test("AdaPools API Parsing", async () => {
    nockEndpoint("./tests/mocks/adapools.json", generateAdaPoolsURL());
    try {
      const collection = await getAdaPools(false);
      expect(collection[0]).toStrictEqual({
        pool_id: "pool10akpqvczl93ep4rc59c0aqyn3dm0env2ydysuwmdm670wl24pd8",
        name: "[GOAT] Goat Stake",
        stake: "65509685009528",
        pool_id_hash:
          "7f6c103302f96390d478a170fe80938b76fccd8a23490e3b6ddebcf7",
        tax_ratio: "2.5",
        tax_fix: "340000000",
        blocks_epoch: "1",
        blocks_lifetime: "8131",
        roa_short: "3.662",
        roa_lifetime: "4.51",
        pledge: "1000000000000",
        delegators: "9876",
        homepage: "https://goatstake.com",
        saturation: 0.923519,
        img: "https://img.cexplorer.io/c/8/9/9/3/pool10akpqvczl93ep4rc59c0aqyn3dm0env2ydysuwmdm670wl24pd8.png",
        url: "https://cexplorer.io/pool/pool10akpqvczl93ep4rc59c0aqyn3dm0env2ydysuwmdm670wl24pd8",
      });
    } catch (e) {
      throw e;
    }
  });

  test("Respect sortering in AdaPools API to Array", async () => {
    nockEndpoint("./tests/mocks/adapools.json", generateAdaPoolsURL());
    try {
      const collection = await getAdaPools(false);

      expect(collection[0].pool_id).toStrictEqual(
        "pool10akpqvczl93ep4rc59c0aqyn3dm0env2ydysuwmdm670wl24pd8"
      );
      expect(collection[1].pool_id).toStrictEqual(
        "pool1vx9tzlkgafernd9vpjpxkenutx2gncj4yn88fpq69823qlwcqrt"
      );
      expect(collection[2].pool_id).toStrictEqual(
        "pool16agnvfan65ypnswgg6rml52lqtcqe5guxltexkn82sqgj2crqtx"
      );
      expect(collection[3].pool_id).toStrictEqual(
        "pool17ahr5ygy48vpdfnatqn2z4wfu2te4quapk2yx3k50ce6kd7feg0"
      );
      expect(collection[4].pool_id).toStrictEqual(
        "pool1z5uqdk7dzdxaae5633fqfcu2eqzy3a3rgtuvy087fdld7yws0xt"
      );
    } catch (e) {
      throw e;
    }
  });
});
