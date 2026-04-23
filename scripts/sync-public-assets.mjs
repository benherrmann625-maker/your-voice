import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const publicDir = path.join(root, "public");

const assets = [
  "app.js",
  "styles.css",
  "icon.svg",
  "manifest.webmanifest",
  "sw.js",
];

fs.mkdirSync(publicDir, { recursive: true });

for (const asset of assets) {
  fs.copyFileSync(path.join(root, asset), path.join(publicDir, asset));
}

console.log(`Synced ${assets.length} public asset(s).`);
