import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { loadLibrary } from "./library.mjs";
import { renderStandalone, scriptSources } from "./bundle.mjs";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const library = loadLibrary(root),
  counts = [60, 250, 390, 300, 300, 160, 540];
const allowIncomplete = process.argv.includes("--allow-incomplete");
const globalIds = new Set();
let answerCount = 0,
  explanationCount = 0;
const knownMissing = new Set(["hacker2-t7-p4-g78414-s1"]);
const sourceMissingAudio = new Set([
  "hacker3-t7-p2-g73010",
  "hacker3-t7-p2-g73029",
  "hacker3-t7-p2-g73035",
]);
const sourceThreeChoices = new Set(["hacker3-t6-p3-g73749-s2"]);
for (const [year, data] of Object.entries(library.datasets)) {
  const hacker = /^hacker[23]$/.test(year);
  if (hacker) {
    assert.equal(data.collection, year);
    assert.equal(data.progressKey, `toeic-studio-${year}-v1`);
    assert.equal(data.label, `HACKER TOEIC ${year.slice(-1)}`);
  } else assert.equal(data.year, Number(year));
  assert.equal(data.questions.length, 2000, year + " question count");
  assert.equal(data.tests.length, 10);
  assert.equal(new Set(data.questions.map((q) => q.id)).size, 2000);
  const groups = new Map(data.groups.map((g) => [g.id, g]));
  assert.equal(groups.size, data.groups.length);
  for (let part = 1; part <= 7; part++)
    assert.equal(
      data.questions.filter((q) => q.part === part).length,
      counts[part - 1],
    );
  for (let test = 1; test <= 10; test++) {
    const questions = data.questions.filter((q) => q.test === test);
    assert.equal(questions.length, 200);
    assert.deepEqual(
      questions.map((q) => q.original),
      Array.from({ length: 200 }, (_, i) => i + 1),
    );
    for (let part = 1; part <= 7; part++)
      assert.equal(
        questions.filter((q) => q.part === part).length,
        counts[part - 1] / 10,
      );
    const summary = data.tests.find((t) => t.test === test);
    assert.equal(
      summary.answers,
      questions.filter((q) => q.correct !== null).length,
    );
    assert.equal(
      summary.explanations,
      questions.filter((q) => q.explanation).length,
    );
  }
  for (const q of data.questions) {
    assert.ok(!globalIds.has(q.id), "IDs must be unique across years");
    globalIds.add(q.id);
    const g = groups.get(q.group);
    assert.ok(g);
    assert.equal(g.test, q.test);
    assert.equal(g.part, q.part);
    assert.ok(g.numbers.includes(q.original));
    assert.ok(
      hacker
        ? g.source.startsWith(
            `https://zenlishtoeic.vn/stm-quizzes/hacker-${year.slice(-1)}-test`,
          )
        : g.source.includes("-" + year + "/"),
    );
    const choiceCount = q.part === 2 || sourceThreeChoices.has(q.id) ? 3 : 4;
    assert.equal(q.choices.length, choiceCount);
    assert.deepEqual(
      q.choices.map((c) => c.label),
      ["A", "B", "C", "D"].slice(0, choiceCount),
    );
    assert.ok(
      q.correct === null ||
        (Number.isInteger(q.correct) &&
          q.correct >= 0 &&
          q.correct < q.choices.length),
    );
    assert.equal(typeof q.explanation, "string");
    if (q.correct !== null) answerCount++;
    if (q.explanation) explanationCount++;
    if (q.part <= 4) {
      if (sourceMissingAudio.has(g.id)) assert.equal(g.audio, "");
      else assert.ok(g.audio.startsWith("https://"));
    }
    if (knownMissing.has(q.id)) {
      assert.equal(q.correct, null);
      assert.ok(q.explanation.trim());
    } else if (!allowIncomplete || year === "2024")
      assert.ok(
        q.correct !== null && q.explanation.trim(),
        "Original answer/explanation missing: " + q.id,
      );
  }
  if (year === "hacker3")
    assert.deepEqual(data.missingAudio, [...sourceMissingAudio]);
  if (hacker)
    assert.deepEqual(
      data.missingAnswers,
      [...knownMissing].filter((id) => id.startsWith(year + "-")),
    );
  if (year === "2024")
    assert.ok(
      data.questions.every((q) => q.id.startsWith("t")),
      "Keep stable 2024 IDs",
    );
  else
    assert.ok(
      data.questions.every((q) =>
        q.id.startsWith(hacker ? year + "-" : "y" + year + "-"),
      ),
      "Use collection-prefixed IDs",
    );
  console.log(
    year +
      ": " +
      data.questions.length +
      " questions, " +
      data.questions.filter((q) => q.correct !== null).length +
      " original answers, " +
      data.questions.filter((q) => q.explanation).length +
      " explanations",
  );
}
for (const source of scriptSources)
  new vm.Script(read(source), { filename: source });
const html = read("index.html");
for (const marker of ["CSS", "JS", "DATA"])
  assert.ok(!html.includes("/*__" + marker + "__*/"));
const embedded = html.match(
  /<script id="dataset" type="application\/json">([\s\S]*?)<\/script>/,
);
assert.ok(embedded);
assert.deepEqual(JSON.parse(embedded[1]), library);
const expected = renderStandalone(root, library);
assert.equal(html, expected, "index.html is stale; run npm run build");
for (const year of Object.keys(library.datasets))
  assert.ok(html.includes('data-year="' + year + '"'));
console.log(
  `PASS: ${Object.keys(library.datasets).length} collections, ${globalIds.size.toLocaleString("en-US")} questions, ${answerCount} answers, ${explanationCount} explanations, canonical order, groups, media URLs and reproducible build.`,
);
