import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
const Library = vm.runInNewContext(
  (await fs.readFile(
    new URL("../src/study-library.js", import.meta.url),
    "utf8",
  )) + "\nStudyLibrary;",
);
test("indexes are reused and combined groups retain canonical source identity", () => {
  const q1 = { id: "q1", group: "g1", part: 3, test: 1 },
    q2 = { id: "q2", group: "g1", part: 3, test: 1 },
    q3 = { id: "q3", group: "g2", part: 3, test: 1 };
  const data = {
    2024: {
      questions: [q1, q2],
      groups: [{ id: "g1", part: 3, audio: "same.mp3" }],
      tests: [{ test: 1 }],
    },
    hacker3: {
      questions: [q3],
      groups: [{ id: "g2", part: 3, audio: "same.mp3" }],
      tests: [{ test: 1 }],
    },
  };
  const library = new Library(data),
    all = library.get("all");
  assert.equal(library.get("all"), all);
  assert.equal(all.questionMap.get("q1"), q1);
  assert.equal(all.groupQuestions.get("g1").length, 2);
  assert.equal(all.questionRanks.get("q3"), 2);
  assert.equal(all.partNumbers.get("q3"), 3);
  assert.equal(all.audioByPart[2].length, 1);
  assert.equal(library.get("2024").partNumbers.get("q1"), 1);
  assert.equal(data[2024].questions.length, 2);
  assert.equal(all.data.tests.length, 2);
});
