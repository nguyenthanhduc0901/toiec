import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadLibrary } from "./library.mjs";
import { createAudioCache, audioRange } from "./audio-cache.mjs";
import { acceptsGzip, createPageCache } from "./page-cache.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.env.PORT || 4173);
const audioCache = createAudioCache(root, loadLibrary(root));
const getPage = createPageCache(path.join(root, "index.html"));
async function servePage(req, res, stat) {
  try {
    const page = await getPage(stat);
    const headers = {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
      Vary: "Accept-Encoding",
      ETag: page.etag,
    };
    if (
      (req.headers["if-none-match"] || "")
        .split(",")
        .map((value) => value.trim())
        .some((value) => value === page.etag || value === "*")
    ) {
      res.writeHead(304, headers);
      res.end();
      return;
    }
    const compressed = acceptsGzip(req.headers["accept-encoding"]);
    const body = compressed ? page.gzip : page.raw;
    if (compressed) headers["Content-Encoding"] = "gzip";
    headers["Content-Length"] = body.length;
    res.writeHead(200, headers);
    res.end(req.method === "HEAD" ? undefined : body);
  } catch {
    res.writeHead(500);
    res.end("Could not load application");
  }
}
function json(res, status, value) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(value));
}
async function handleAudio(req, res, url) {
  try {
    if (url.pathname === "/api/audio-cache" && req.method === "GET") {
      json(
        res,
        200,
        await audioCache.manifest(
          url.searchParams.get("year"),
          Number(url.searchParams.get("part")),
        ),
      );
      return;
    }
    if (url.pathname === "/api/audio-cache" && req.method === "POST") {
      if (
        !req.headers["content-type"]?.startsWith("application/json") ||
        (req.headers.origin &&
          req.headers.origin !== `http://${req.headers.host}`)
      ) {
        json(res, 403, { error: "Forbidden" });
        return;
      }
      let body = "";
      for await (const chunk of req) {
        body += chunk;
        if (body.length > 4096) {
          json(res, 413, { error: "Request too large" });
          return;
        }
      }
      const { url: source } = JSON.parse(body);
      await audioCache.download(source);
      json(res, 200, { url: source, ready: true });
      return;
    }
    if (
      url.pathname === "/api/audio-cache/file" &&
      ["GET", "HEAD"].includes(req.method)
    ) {
      const cached = await audioCache.file(url.searchParams.get("url"));
      if (!cached) {
        json(res, 404, { error: "Audio not cached" });
        return;
      }
      let range;
      try {
        range = audioRange(req.headers.range, cached.size);
      } catch {
        res.writeHead(416, { "Content-Range": `bytes */${cached.size}` });
        res.end();
        return;
      }
      const headers = {
        "Content-Type": "audio/mpeg",
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=31536000, immutable",
        "Content-Length": range ? range.end - range.start + 1 : cached.size,
      };
      if (range)
        headers["Content-Range"] =
          `bytes ${range.start}-${range.end}/${cached.size}`;
      res.writeHead(range ? 206 : 200, headers);
      if (req.method === "HEAD") res.end();
      else {
        const stream = fs.createReadStream(cached.path, range || {});
        stream.on("error", () => res.destroy());
        res.on("close", () => stream.destroy());
        stream.pipe(res);
      }
      return;
    }
    json(res, 405, { error: "Method not allowed" });
  } catch (error) {
    if (!res.headersSent)
      json(
        res,
        error.message === "Unknown audio URL" ||
          error.message === "Invalid collection"
          ? 400
          : 502,
        { error: "Audio could not be cached" },
      );
    else res.destroy();
  }
}
const types = {
  ".html": "text/html; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};
const server = http.createServer((req, res) => {
  let url;
  try {
    url = new URL(req.url, "http://localhost");
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }
  if (url.pathname.startsWith("/api/audio-cache")) {
    void handleAudio(req, res, url);
    return;
  }
  if (url.pathname === "/api/study-reset" && req.method === "GET") {
    // A local, explicitly requested fresh start; absent on hosted/static builds.
    let epoch = null;
    try {
      const request = JSON.parse(
        fs.readFileSync(
          path.join(root, "work", "study-reset-request.json"),
          "utf8",
        ),
      );
      if (typeof request.epoch === "string") epoch = request.epoch;
    } catch {}
    json(res, 200, { epoch });
    return;
  }
  if (!["GET", "HEAD"].includes(req.method)) {
    res.writeHead(405);
    res.end();
    return;
  }
  let relative;
  try {
    relative =
      decodeURIComponent(new URL(req.url, "http://localhost").pathname).replace(
        /^\/+/,
        "",
      ) || "index.html";
  } catch {
    res.writeHead(400);
    res.end();
    return;
  }
  const target = path.resolve(root, relative);
  const contained = path.relative(root, target);
  if (
    contained.startsWith("..") ||
    path.isAbsolute(contained) ||
    contained.split(/[\\/]/).some((p) => p.startsWith(".")) ||
    ["work", "private", "tmp", "browser-profile"].includes(
      contained.split(/[\\/]/)[0],
    )
  ) {
    res.writeHead(403);
    res.end();
    return;
  }
  fs.stat(target, (error, stat) => {
    if (error || !stat.isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    if (target === path.join(root, "index.html")) {
      void servePage(req, res, stat);
      return;
    }
    res.writeHead(200, {
      "Content-Type": types[path.extname(target)] || "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    if (req.method === "HEAD") res.end();
    else fs.createReadStream(target).pipe(res);
  });
});
server.on("error", (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
server.listen(port, "127.0.0.1", () =>
  console.log(`TOEIC Studio: http://127.0.0.1:${port}\nPress Ctrl+C to stop.`),
);
