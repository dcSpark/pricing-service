import nock from "nock";
import { readFileSync } from "fs";

export const nockEndpoint = (filePath: string, url: string): void => {
  const urlObj = new URL(url);
  const file = readFileSync(filePath, "utf-8");
  const json = JSON.parse(file);
  nock(urlObj.origin).get(urlObj.pathname).query(true).reply(200, json);
};

export const jsonFile = (filePath: string): object => {
  const file = readFileSync(filePath, "utf-8");
  return JSON.parse(file);
};
