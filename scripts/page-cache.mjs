import fs from "node:fs/promises";
import { gzip } from "node:zlib";
import { promisify } from "node:util";

const compress = promisify(gzip);
export function acceptsGzip(header = "") {
  const encodings = header.split(",").map((entry) =>
    entry
      .trim()
      .split(";")
      .map((value) => value.trim()),
  );
  const choice =
    encodings.find(([name]) => name === "gzip") ||
    encodings.find(([name]) => name === "*");
  if (!choice) return false;
  const quality = choice.slice(1).find((value) => value.startsWith("q="));
  return quality === undefined || Number(quality.slice(2)) > 0;
}
export function createPageCache(filename) {
  let cached;
  return function getPage(stat) {
    const key = `${stat.mtimeMs}-${stat.size}`;
    if (cached?.key === key) return cached.promise;
    const entry = { key, promise: null };
    entry.promise = fs
      .readFile(filename)
      .then(async (raw) => ({
        raw,
        gzip: await compress(raw),
        etag: `W/"${key}"`,
      }))
      .catch((error) => {
        if (cached === entry) cached = null;
        throw error;
      });
    cached = entry;
    return entry.promise;
  };
}
