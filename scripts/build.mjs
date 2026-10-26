import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderStandalone } from "./bundle.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = renderStandalone(root);
fs.writeFileSync(path.join(root, "index.html"), html);
console.log(
  `Built index.html (${Buffer.byteLength(html).toLocaleString()} bytes).`,
);
