import fs from "node:fs";
import path from "node:path";
import { loadLibrary, serializeLibrary } from "./library.mjs";

export const scriptSources = [
  "src/audio-cache.js",
  "src/audio-settings.js",
  "src/study-progress.js",
  "src/study-library.js",
  "src/safe-html.js",
  "src/mistake-export.js",
  "src/app.js",
];
export function renderStandalone(root, library = loadLibrary(root)) {
  const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");
  return read("src/template.html")
    .replace("/*__CSS__*/", () => read("src/app.css"))
    .replace("/*__DATA__*/", () => serializeLibrary(library))
    .replace("/*__JS__*/", () => scriptSources.map(read).join("\n"));
}
