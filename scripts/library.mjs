import fs from "node:fs";
import path from "node:path";
export function loadLibrary(root) {
  const files = fs
    .readdirSync(path.join(root, "data"))
    .filter((name) => /^(ets\d{4}|hacker[23])\.json$/.test(name))
    .sort();
  return {
    version: 2,
    datasets: Object.fromEntries(
      files.map((name) => {
        const key = name.startsWith("ets")
          ? name.slice(3, -5)
          : name.slice(0, -5);
        return [
          key,
          JSON.parse(fs.readFileSync(path.join(root, "data", name), "utf8")),
        ];
      }),
    ),
  };
}
export function serializeLibrary(library) {
  return JSON.stringify(library)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
