"use strict";
class StudyLibrary {
  constructor(datasets) {
    this.selections = {
      ...datasets,
      all: {
        label: "Tất cả",
        progressKey: "toeic-studio-all-v1",
        questions: Object.values(datasets).flatMap((d) => d.questions),
        groups: Object.values(datasets).flatMap((d) => d.groups),
        tests: Object.entries(datasets).flatMap(([collection, d]) =>
          d.tests.map((test) => ({ ...test, collection })),
        ),
      },
    };
    this.indexes = new Map();
  }
  get(selection) {
    if (this.indexes.has(selection)) return this.indexes.get(selection);
    const data = this.selections[selection];
    if (!data) throw new Error("Unknown collection");
    const partLists = Array.from({ length: 7 }, () => []),
      audioByPart = Array.from({ length: 7 }, () => []),
      groupQuestions = new Map(),
      partNumbers = new Map();
    for (const q of data.questions) {
      const list = partLists[q.part - 1];
      list.push(q);
      partNumbers.set(q.id, list.length);
      if (!groupQuestions.has(q.group)) groupQuestions.set(q.group, []);
      groupQuestions.get(q.group).push(q);
    }
    for (const group of data.groups)
      if (group.audio) audioByPart[group.part - 1].push(group.audio);
    const indexes = {
      data,
      partLists,
      audioByPart: audioByPart.map((urls) => [...new Set(urls)]),
      groupQuestions,
      partNumbers,
      groupMap: new Map(data.groups.map((g) => [g.id, g])),
      questionMap: new Map(data.questions.map((q) => [q.id, q])),
      questionRanks: new Map(data.questions.map((q, i) => [q.id, i])),
    };
    this.indexes.set(selection, indexes);
    return indexes;
  }
}
