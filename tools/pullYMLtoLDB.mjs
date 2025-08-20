import { compilePack } from "@foundryvtt/foundryvtt-cli";
import { promises as fs } from "fs";

const MODULE_ID = process.cwd();
const yaml = true;
const folders = true;

const packs = await fs.readdir("./packs_yaml");
for (const pack of packs) {
  if (pack === ".gitattributes") continue;
  console.log("Packing " + pack);
  await compilePack(
    `${MODULE_ID}/packs_yaml/${pack}`,
    `${MODULE_ID}/packs/${pack}`,
    { yaml, recursive: folders }
  );
}
