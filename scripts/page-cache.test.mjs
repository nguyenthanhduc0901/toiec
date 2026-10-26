import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { gunzipSync } from "node:zlib";
import { createPageCache, acceptsGzip } from "./page-cache.mjs";
test("compression respects explicit client preferences", () => {
  assert.equal(acceptsGzip("gzip, deflate, br"), true);
  assert.equal(acceptsGzip("br"), false);
  assert.equal(acceptsGzip("gzip;q=0, *;q=1"), false);
  assert.equal(acceptsGzip("*;q=0.8"), true);
  assert.equal(acceptsGzip("gzip;q=0.5"), true);
});
test("HTML cache shares compression work and invalidates after rebuild", async () => {
  const base = path.resolve(
    new URL("../work/page-cache-tests/", import.meta.url).pathname.replace(
      /^\/([A-Za-z]:)/,
      "$1",
    ),
  );
  await fs.mkdir(base, { recursive: true });
  const directory = await fs.mkdtemp(path.join(base, "run-"));
  assert.ok(
    path.relative(base, directory) &&
      !path.relative(base, directory).startsWith(".."),
  );
  const file = path.join(directory, "index.html");
  try {
    await fs.writeFile(file, "<html>Hello</html>".repeat(100));
    const getPage = createPageCache(file),
      stat = await fs.stat(file);
    const first = getPage(stat);
    assert.equal(getPage(stat), first);
    const page = await first;
    assert.equal(gunzipSync(page.gzip).toString(), page.raw.toString());
    assert.ok(page.gzip.length < page.raw.length);
    await fs.appendFile(file, "updated");
    const changed = await getPage(await fs.stat(file));
    assert.notEqual(changed.etag, page.etag);
    assert.ok(changed.raw.toString().endsWith("updated"));
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
