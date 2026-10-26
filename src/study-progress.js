"use strict";
class StudyProgress {
  constructor(datasets, storage) {
    this.datasets = datasets;
    this.storage = storage;
    this.questionMaps = new Map();
    this.owners = new Map();
    for (const [key, data] of Object.entries(datasets))
      for (const q of data.questions) this.owners.set(q.id, key);
  }
  key(selection) {
    return selection === "all"
      ? "toeic-studio-all-v1"
      : this.datasets[selection].progressKey ||
          `toeic-studio-ets${selection}-v1`;
  }
  empty() {
    return {
      answers: {},
      bookmarks: {},
      overrides: {},
      mistakes: {},
      part: 1,
      positions: {},
    };
  }
  questions(selection) {
    return selection === "all"
      ? Object.values(this.datasets).flatMap((d) => d.questions)
      : this.datasets[selection].questions;
  }
  read(selection) {
    const state = this.empty();
    let raw;
    try {
      raw = JSON.parse(this.storage.getItem(this.key(selection)) || "null");
    } catch (error) {
      if (error instanceof SyntaxError) return state;
      throw error;
    }
    if (raw && typeof raw === "object")
      for (const field of Object.keys(state))
        if (raw[field] !== undefined) state[field] = raw[field];
    return this.normalize(state, selection);
  }
  questionIndex(selection) {
    if (!this.questionMaps.has(selection))
      this.questionMaps.set(
        selection,
        new Map(this.questions(selection).map((q) => [q.id, q])),
      );
    return this.questionMaps.get(selection);
  }
  normalize(state, selection) {
    const result = this.empty(),
      questions = this.questionIndex(selection);
    for (const field of ["answers", "bookmarks", "overrides", "mistakes"]) {
      if (
        !state[field] ||
        typeof state[field] !== "object" ||
        Array.isArray(state[field])
      )
        continue;
      for (const [id, value] of Object.entries(state[field])) {
        const q = questions.get(id);
        if (!q) continue;
        if (
          field === "answers" &&
          Number.isInteger(value) &&
          value >= 0 &&
          value < q.choices.length
        )
          result.answers[id] = value;
        if (field === "bookmarks" && typeof value === "boolean")
          result.bookmarks[id] = value;
        if (
          field === "overrides" &&
          value &&
          Number.isInteger(value.correct) &&
          value.correct >= 0 &&
          value.correct < q.choices.length &&
          typeof value.explanation === "string"
        )
          result.overrides[id] = value;
        if (field === "mistakes" && Array.isArray(value)) {
          const attempts = value.filter(
            (a) =>
              a &&
              Number.isInteger(a.choice) &&
              a.choice >= 0 &&
              a.choice < q.choices.length &&
              Number.isInteger(a.correct) &&
              a.correct >= 0 &&
              a.correct < q.choices.length &&
              a.choice !== a.correct &&
              (a.at === null ||
                (typeof a.at === "string" &&
                  Number.isFinite(Date.parse(a.at)))),
          );
          if (attempts.length)
            result.mistakes[id] = attempts.map((a) => ({
              choice: a.choice,
              correct: a.correct,
              at: a.at,
            }));
        }
      }
    }
    result.part =
      Number.isInteger(state.part) && state.part >= 1 && state.part <= 7
        ? state.part
        : 1;
    if (state.positions && typeof state.positions === "object")
      for (const [part, id] of Object.entries(state.positions))
        if (
          Number(part) >= 1 &&
          Number(part) <= 7 &&
          (id === null || questions.get(id)?.part === Number(part))
        )
          result.positions[part] = id;
    // Migrate an existing wrong answer without inventing an attempt timestamp.
    for (const [id, choice] of Object.entries(result.answers)) {
      const correct = (result.overrides[id] || questions.get(id)).correct;
      if (
        correct !== null &&
        choice !== correct &&
        !result.mistakes[id]?.length
      )
        result.mistakes[id] = [{ choice, correct, at: null }];
    }
    return result;
  }
  load(selection) {
    if (selection !== "all") return this.read(selection);
    const state = this.read("all");
    for (const field of ["answers", "bookmarks", "overrides", "mistakes"])
      state[field] = {};
    for (const key of Object.keys(this.datasets)) {
      const own = this.read(key);
      for (const field of ["answers", "bookmarks", "overrides", "mistakes"])
        Object.assign(state[field], own[field]);
    }
    return state;
  }
  write(selection, state) {
    const key = this.key(selection),
      value = JSON.stringify(state);
    if (this.storage.getItem(key) !== value) this.storage.setItem(key, value);
  }
  save(selection, state) {
    if (selection !== "all") {
      this.write(selection, state);
      return;
    }
    for (const key of Object.keys(this.datasets)) {
      const own = this.read(key);
      for (const field of ["answers", "bookmarks", "overrides", "mistakes"])
        own[field] = Object.fromEntries(
          Object.entries(state[field]).filter(
            ([id]) => this.owners.get(id) === key,
          ),
        );
      this.write(key, own);
    }
    this.write("all", { part: state.part, positions: state.positions });
  }
  clear() {
    for (const selection of [...Object.keys(this.datasets), "all"])
      this.storage.removeItem(this.key(selection));
  }
  validate(input, selection) {
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new Error("Invalid progress file.");
    for (const field of [
      "answers",
      "bookmarks",
      "overrides",
      "positions",
      "mistakes",
    ])
      if (
        input[field] !== undefined &&
        (!input[field] ||
          typeof input[field] !== "object" ||
          Array.isArray(input[field]))
      )
        throw new Error("Invalid progress data.");
    if (!input.answers || !input.bookmarks)
      throw new Error("Invalid progress file.");
    const normalized = this.normalize(input, selection);
    for (const field of ["answers", "bookmarks", "overrides", "positions"])
      if (
        Object.keys(input[field] || {}).some(
          (id) => !Object.hasOwn(normalized[field], id),
        )
      )
        throw new Error("The file contains an invalid question or choice.");
    for (const [id, attempts] of Object.entries(input.mistakes || {}))
      if (
        !Array.isArray(attempts) ||
        !attempts.length ||
        normalized.mistakes[id]?.length !== attempts.length ||
        JSON.stringify(normalized.mistakes[id]) !==
          JSON.stringify(
            attempts.map((a) => ({
              choice: a?.choice,
              correct: a?.correct,
              at: a?.at,
            })),
          )
      )
        throw new Error("Invalid mistake history.");
    if (input.part !== undefined && input.part !== normalized.part)
      throw new Error("Invalid Part in the file.");
    return normalized;
  }
}
