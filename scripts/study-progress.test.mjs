import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";
const Store = vm.runInNewContext(
  (await fs.readFile(
    new URL("../src/study-progress.js", import.meta.url),
    "utf8",
  )) + "\nStudyProgress;",
);
const datasets = {
  2024: {
    questions: [
      { id: "a", part: 1, correct: 0, choices: [{}, {}] },
      { id: "b", part: 2, correct: 1, choices: [{}, {}] },
    ],
  },
  hacker3: {
    progressKey: "toeic-studio-hacker3-v1",
    questions: [{ id: "c", part: 1, correct: 1, choices: [{}, {}] }],
  },
};
function setup() {
  const values = new Map(),
    storage = {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    };
  return { values, store: new Store(datasets, storage) };
}
test("combined view writes through to owners and keeps individual navigation", () => {
  const { store, values } = setup(),
    single = store.load("2024");
  single.answers.a = 1;
  single.part = 2;
  single.positions[2] = "b";
  store.save("2024", single);
  const all = store.load("all");
  assert.equal(all.answers.a, 1);
  assert.equal(all.mistakes.a[0].at, null);
  all.answers.a = 0;
  all.answers.c = 0;
  all.mistakes.c = [{ choice: 0, correct: 1, at: "2026-10-26T00:00:00.000Z" }];
  all.part = 1;
  all.positions[1] = "c";
  store.save("all", all);
  const legacy = store.load("2024");
  assert.equal(legacy.answers.a, 0);
  assert.equal(legacy.part, 2);
  assert.equal(legacy.positions[2], "b");
  assert.equal(legacy.mistakes.a[0].choice, 1);
  assert.equal(store.load("hacker3").answers.c, 0);
  const navigation = JSON.parse(values.get("toeic-studio-all-v1"));
  assert.equal(navigation.positions[1], "c");
  assert.ok(
    !Object.hasOwn(navigation, "answers"),
    "Combined mode must not fork answers",
  );
});
test("retry deletion preserves wrong attempts and bookmarks across views", () => {
  const { store } = setup(),
    state = store.load("hacker3");
  state.answers.c = 0;
  state.bookmarks.c = true;
  store.save("hacker3", state);
  const all = store.load("all");
  delete all.answers.c;
  store.save("all", all);
  const retry = store.load("hacker3");
  assert.equal(retry.answers.c, undefined);
  assert.equal(retry.mistakes.c[0].choice, 0);
  assert.equal(retry.bookmarks.c, true);
  retry.answers.c = 1;
  store.save("hacker3", retry);
  assert.equal(store.load("all").answers.c, 1);
  assert.equal(store.load("all").mistakes.c.length, 1);
});
test("backups validate history and reject foreign questions and malformed attempts", () => {
  const { store } = setup();
  const old = {
    answers: { a: 1 },
    bookmarks: {},
    part: 1,
    positions: { 1: "a" },
  };
  const migrated = store.validate(old, "2024");
  assert.equal(migrated.mistakes.a[0].correct, 0);
  assert.throws(() => store.validate({ ...old, answers: { c: 0 } }, "2024"));
  assert.throws(() =>
    store.validate(
      { ...old, mistakes: { a: [{ choice: 99, correct: 0, at: null }] } },
      "2024",
    ),
  );
  assert.throws(() => store.validate({ ...old, part: 8 }, "2024"));
  assert.throws(() =>
    store.validate({ ...old, positions: { 2: "a" } }, "2024"),
  );
  assert.equal(store.validate(migrated, "all").mistakes.a.length, 1);
});
test("clear removes every collection and combined state while keeping other preferences", () => {
  const { store, values } = setup();
  for (const key of ["2024", "hacker3", "all"])
    store.save(key, store.load(key));
  values.set("toeic-studio-colorblind-theme", "true");
  values.set("another-app", "keep");
  store.clear();
  assert.equal(values.size, 2);
  assert.equal(store.load("all").mistakes.a, undefined);
  assert.equal(Object.keys(store.load("2024").answers).length, 0);
  assert.equal(values.get("another-app"), "keep");
});
