import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const mobileDir = path.join(root, "mobile-shell");

const assets = [
  "index.html",
  "app.js",
  "styles.css",
  "icon.svg",
  "manifest.webmanifest",
  "sw.js",
];

fs.rmSync(mobileDir, { recursive: true, force: true });
fs.mkdirSync(mobileDir, { recursive: true });

for (const asset of assets) {
  fs.copyFileSync(path.join(root, asset), path.join(mobileDir, asset));
}

console.log(`Built mobile shell with ${assets.length} asset(s).`);
