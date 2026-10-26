"use strict";
function exportRich(raw) {
  const div = document.createElement("div");
  div.append(safe(raw));
  return { html: div.innerHTML, text: div.textContent.trim() };
}
function mistakeReportHtml(report) {
  const doc = document.implementation.createHTMLDocument(
    "Previously incorrect questions",
  );
  doc.documentElement.lang = "en";
  const meta = doc.createElement("meta");
  meta.name = "viewport";
  meta.content = "width=device-width,initial-scale=1";
  doc.head.append(meta);
  const style = doc.createElement("style");
  style.textContent =
    "body{font:16px/1.65 system-ui,sans-serif;color:#18212b;max-width:960px;margin:32px auto;padding:0 22px}article{border-top:2px solid #9ba8b6;margin-top:32px;padding-top:16px;break-inside:avoid}img{max-width:100%;height:auto}table{border-collapse:collapse;max-width:100%}td,th{border:1px solid #999;padding:5px}.correct{border-left:4px solid #174f91;background:#e5effb}.wrong{border-left:4px dashed #874300;background:#fff0d9}li{padding:6px 10px;margin:5px 0}.shared,.explanation{background:#f4f6f8;padding:16px;overflow-wrap:anywhere}.meta{color:#46515f;font-size:14px}@media print{body{margin:0;max-width:none}a{color:inherit}article{break-inside:auto}h2,h3{break-after:avoid}}";
  doc.head.append(style);
  const add = (parent, tag, text, cls) => {
    const el = doc.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (cls) el.className = cls;
    parent.append(el);
    return el;
  };
  const rich = (parent, html, cls) => {
    const el = add(parent, "div", undefined, cls);
    el.append(safe(html));
    return el;
  };
  add(doc.body, "h1", "Previously incorrect questions");
  add(
    doc.body,
    "p",
    `${report.label}${report.part ? " · Part " + report.part : ""} · ${report.count} questions · Exported ${new Date(report.exportedAt).toLocaleString("en-US")}`,
    "meta",
  );
  for (const q of report.questions) {
    const article = add(doc.body, "article");
    add(
      article,
      "h2",
      `${q.collectionLabel} · Test ${q.test} · Part ${q.part} · Question ${q.originalQuestionNumber}`,
    );
    rich(article, q.question.html);
    if (q.sharedContent.html) {
      add(article, "h3", "Shared test content");
      rich(article, q.sharedContent.html, "shared");
    }
    if (q.audio) {
      const link = add(article, "a", "Open original audio");
      link.href = q.audio;
      link.rel = "noopener noreferrer";
    }
    const list = add(article, "ol");
    list.type = "A";
    for (const c of q.choices) {
      const li = add(
        list,
        "li",
        undefined,
        c.index === q.correctAnswer?.index
          ? "correct"
          : c.index === q.lastWrongAnswer.index
            ? "wrong"
            : "",
      );
      li.append(safe(c.html || c.text));
    }
    add(
      article,
      "p",
      `Most recent incorrect answer: ${q.lastWrongAnswer.label}.`,
    );
    add(
      article,
      "p",
      `Correct answer: ${q.correctAnswer?.label || "Not provided by the source"}.`,
    );
    add(
      article,
      "p",
      `Current answer: ${q.currentAnswer?.label || "Not answered / retry in progress"}.`,
    );
    add(article, "h3", "Incorrect answer history");
    const history = add(article, "ul");
    for (const attempt of q.wrongAttempts)
      add(
        history,
        "li",
        `Selected ${attempt.selectedAnswer.label}; correct answer at the time: ${attempt.correctAnswer?.label || "Unavailable"} · ${attempt.at ? new Date(attempt.at).toLocaleString("en-US") : "Legacy progress; timestamp unavailable"}`,
      );
    add(article, "h3", "Original explanation");
    rich(article, q.explanation.html, "explanation");
    const link = add(article, "a", "Open source test");
    link.href = q.source;
    link.rel = "noopener noreferrer";
  }
  return "<!doctype html>\n" + doc.documentElement.outerHTML;
}
function downloadContent(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
