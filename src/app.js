"use strict";
const LIBRARY = JSON.parse(document.getElementById("dataset").textContent);
const REAL_DATA = LIBRARY.datasets || { [String(LIBRARY.year)]: LIBRARY };
const libraryIndex = new StudyLibrary(REAL_DATA);
const YEAR_DATA = libraryIndex.selections;
const browserStorage = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
  removeItem: (key) => localStorage.removeItem(key),
};
const progressStore = new StudyProgress(REAL_DATA, browserStorage);
const audioSettings = new AudioSettings(browserStorage);
function labelFor(key) {
  return REAL_DATA[key]?.label || `ETS ${key}`;
}
function owner(q) {
  return progressStore.owners.get(q.id);
}
function questionLabel(q) {
  return labelFor(owner(q));
}
let year = "2024";
try {
  const selected = localStorage.getItem("toeic-studio-active-year");
  if (Object.hasOwn(YEAR_DATA, selected)) year = selected;
} catch {}
if (!YEAR_DATA[year]) year = Object.keys(YEAR_DATA)[0];
let DATA = YEAR_DATA[year];
function progressKey() {
  return DATA.progressKey || `toeic-studio-ets${year}-v1`;
}
function collectionLabel() {
  return DATA.label || `ETS ${year}`;
}
let KEY = progressKey();
const $ = (id) => document.getElementById(id);
const AUTO_NEXT_KEY = "toeic-studio-auto-next-correct-v1";
function loadAutoNextPreference() {
  try { $("auto-next-correct").checked = browserStorage.getItem(AUTO_NEXT_KEY) === "true"; }
  catch { $("auto-next-correct").checked = false; }
}
loadAutoNextPreference();
$("auto-next-correct").onchange = () => {
  try { browserStorage.setItem(AUTO_NEXT_KEY, String($("auto-next-correct").checked)); }
  catch { toast("Unable to save the auto-next preference in this browser."); }
};
const THEME_KEY = "toeic-studio-colorblind-theme";
function setColorblindTheme(enabled) {
  document.documentElement.classList.toggle("colorblind-theme", enabled);
  $("colorblind-theme").setAttribute("aria-pressed", String(enabled));
}
try {
  setColorblindTheme(localStorage.getItem(THEME_KEY) === "true");
} catch {
  setColorblindTheme(false);
}
$("colorblind-theme").onclick = () => {
  const enabled =
    !document.documentElement.classList.contains("colorblind-theme");
  setColorblindTheme(enabled);
  try {
    localStorage.setItem(THEME_KEY, String(enabled));
  } catch {
    toast("Unable to save the theme preference in this browser.");
  }
};

let {
  groupMap,
  questionMap,
  partLists,
  questionRanks,
  partNumbers,
  groupQuestions,
} = libraryIndex.get(year);
let retryIds = null;
let mapButtons = new Map();
let audioMapButtons = new Map();
let renderedMapSelection = null;
function groupedPart() {
  return [3, 4, 6, 7].includes(part);
}
function navigationItems(list) {
  if (!groupedPart()) return list;
  const seen = new Set();
  return list.filter((q) => {
    if (seen.has(q.group)) return false;
    seen.add(q.group);
    return true;
  });
}
let storageOk = true;
function loadProgress() {
  try {
    return progressStore.load(year);
  } catch {
    storageOk = false;
    return progressStore.empty();
  }
}
let saved = loadProgress();
let part = Number(saved.part) || 1;
if (part < 1 || part > 7) part = 1;
let filterTest = "all",
  filterStatus = "all",
  currentId = saved.positions[part] || partLists[part - 1][0].id,
  mediaGroup = null,
  toastTimer;
const audioDownloads = new PartAudioCache({ onChange: refreshAudioCacheUI });
function refreshAudioCacheUI() {
  const state = audioDownloads.state;
  if (!state) return;
  const count = state.urls.filter((url) =>
    audioDownloads.ready.has(url),
  ).length;
  const status = $("audio-cache-status"),
    retry = $("audio-cache-retry");
  $("audio-cache-info").hidden = !state.urls.length;
  $("audio-cache-legend").hidden = !state.urls.length;
  status.textContent = state.unsupported
    ? "Audio preloading requires the local server."
    : state.loading
      ? "Checking downloaded audio…"
      : count === state.urls.length
        ? "Downloaded " + count + "/" + state.urls.length + " audio"
        : "Audio ready: " +
          count +
          "/" +
          state.urls.length +
          (state.failed.size ? " · " + state.failed.size + " errors" : "");
  retry.hidden = !state.failed.size && !state.unsupported;
  for (const [url, buttons] of audioMapButtons) {
    const ready = audioDownloads.ready.has(url);
    for (const button of buttons) {
      if (button._audioReady === ready) continue;
      button._audioReady = ready;
      button.classList.toggle("audio-ready", ready);
      button.title =
        button.dataset.baseTitle + (ready ? " · Audio downloaded" : "");
      button.setAttribute("aria-label", button.title);
    }
  }
  // Do not interrupt a playing/paused recording to swap its source.
  const q = questionMap.get(currentId),
    a = $("media").querySelector("audio");
  if (q && a && a.paused && a.currentTime === 0) {
    const url = groupMap.get(q.group).audio;
    if (audioDownloads.ready.has(url)) {
      const source = audioDownloads.source(url, q.part);
      if (a.getAttribute("src") !== source) a.src = source;
    }
  }
}
function syncAudioDownloads() {
  const urls = libraryIndex.get(year).audioByPart[part - 1];
  audioDownloads.select(
    year,
    part,
    urls,
    groupMap.get(questionMap.get(currentId)?.group)?.audio,
  );
}
function toast(text) {
  $("toast").textContent = text;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").hidden = true), 3600);
}
function save() {
  saved.part = part;
  saved.positions[part] = currentId;
  try {
    progressStore.save(year, saved);
  } catch {
    storageOk = false;
    toast(
      "Unable to save in this browser. Export your progress to keep your work.",
    );
  }
}
function refreshYearLabels() {
  document.title = `TOEIC Studio · ${collectionLabel()}`;
  $("collection-year").textContent = collectionLabel();
  $("header-year").textContent = collectionLabel();
  $("library-year").textContent = `LIBRARY · ${collectionLabel()}`;
  for (const b of document.querySelectorAll("[data-year]")) {
    b.classList.toggle("active", b.dataset.year === year);
    b.setAttribute("aria-pressed", String(b.dataset.year === year));
  }
  const select = $("test-filter");
  select.replaceChildren();
  const all = document.createElement("option");
  all.value = "all";
  all.textContent = `All ${DATA.tests.length} tests`;
  $("collection-count").textContent = `${DATA.tests.length} tests`;
  select.append(all);
  for (const t of DATA.tests) {
    const o = document.createElement("option");
    o.value = year === "all" ? `${t.collection}:${t.test}` : t.test;
    o.textContent = `Test ${t.test} · ${year === "all" ? labelFor(t.collection) : collectionLabel()}`;
    select.append(o);
  }
}
function switchYear(next) {
  next = String(next);
  if (next === year || !Object.hasOwn(YEAR_DATA, next)) return;
  save();
  $("media").querySelector("audio")?.pause();
  year = next;
  DATA = YEAR_DATA[year];
  KEY = progressKey();
  ({
    groupMap,
    questionMap,
    partLists,
    questionRanks,
    partNumbers,
    groupQuestions,
  } = libraryIndex.get(year));
  retryIds = null;
  saved = loadProgress();
  part = Number(saved.part) || 1;
  if (part < 1 || part > 7) part = 1;
  filterTest = "all";
  filterStatus = "all";
  currentId = saved.positions[part] || partLists[part - 1][0].id;
  mediaGroup = null;
  refreshYearLabels();
  $("status-filter").value = "all";
  $("import-message").textContent = "";
  try {
    localStorage.setItem("toeic-studio-active-year", year);
  } catch {}
  render();
  if ($("data-dialog").open) openData();
}
function answerData(q) {
  return saved.overrides[q.id] || q;
}
function hasAnswer(q) {
  return (
    Object.hasOwn(saved.answers, q.id) &&
    Number.isInteger(saved.answers[q.id]) &&
    saved.answers[q.id] >= 0 &&
    saved.answers[q.id] < q.choices.length
  );
}
function grade(q) {
  if (!hasAnswer(q)) return "";
  const d = answerData(q);
  return d.correct === null
    ? "answered"
    : saved.answers[q.id] === d.correct
      ? "correct"
      : "wrong";
}
function everWrong(q) {
  return !!saved.mistakes[q.id]?.length;
}
function matchesTest(q) {
  return (
    filterTest === "all" ||
    (year === "all"
      ? `${owner(q)}:${q.test}` === filterTest
      : q.test === Number(filterTest))
  );
}
function view() {
  return partLists[part - 1].filter(
    (q) =>
      (!retryIds || retryIds.has(q.id)) &&
      matchesTest(q) &&
      (filterStatus === "all" ||
        (filterStatus === "new" && !hasAnswer(q)) ||
        (filterStatus === "wrong" && grade(q) === "wrong") ||
        (filterStatus === "ever-wrong" && everWrong(q)) ||
        (filterStatus === "bookmarked" && saved.bookmarks[q.id])),
  );
}
function adjacentQuestion(delta, list = view()) {
  const current = questionMap.get(currentId);
  if (!current) return;
  const rank = (q) => questionRanks.get(q.id);
  const items = navigationItems(list).filter(
    (q) => !groupedPart() || q.group !== current.group,
  );
  return delta < 0
    ? items
        .slice()
        .reverse()
        .find((q) => rank(q) < rank(current))
    : items.find((q) => rank(q) > rank(current));
}
function updateNavigation() {
  const list = view();
  $("prev").disabled = !adjacentQuestion(-1, list);
  $("next").disabled = !adjacentQuestion(1, list);
}
function rich(id, raw) {
  $(id).replaceChildren(safe(raw));
}
for (const b of document.querySelectorAll("[data-year]"))
  b.onclick = () => switchYear(b.dataset.year);
refreshYearLabels();
function renderParts() {
  if (!$("parts").children.length) {
    const fragment = document.createDocumentFragment();
    for (let i = 1; i <= 7; i++) {
      const button = document.createElement("button");
      button.className = "part-button";
      button.dataset.part = i;
      button.innerHTML = `<span class="part-icon">0${i}</span><span class="part-name">Part ${i}</span><span class="part-count"></span>`;
      fragment.append(button);
    }
    $("parts").replaceChildren(fragment);
  }
  for (const button of $("parts").children) {
    const index = Number(button.dataset.part);
    const active = index === part;
    if (button.classList.contains("active") !== active) {
      button.classList.toggle("active", active);
      button.setAttribute("aria-current", active ? "page" : "false");
    }
    const count = String(partLists[index - 1].length);
    if (button.querySelector(".part-count").textContent !== count)
      button.querySelector(".part-count").textContent = count;
  }
}
$("parts").onclick = (event) => {
  const button = event.target.closest("button[data-part]");
  if (!button) return;
  part = Number(button.dataset.part);
  retryIds = null;
  filterTest = "all";
  filterStatus = "all";
  $("test-filter").value = "all";
  $("status-filter").value = "all";
  currentId = saved.positions[part] || partLists[part - 1][0].id;
  render({ autoplay: true });
};

function renderStats() {
  const all = partLists[part - 1],
    done = all.filter(hasAnswer),
    graded = done.filter((q) => answerData(q).correct !== null),
    right = graded.filter((q) => grade(q) === "correct");
  $("done-count").textContent = done.length;
  $("right-count").textContent = right.length;
  updateRetryControls();
  $("accuracy").textContent = graded.length
    ? Math.round((right.length / graded.length) * 100) + "%"
    : "—";
  $("progress-bar").style.width = (done.length / all.length) * 100 + "%";
}
function showMedia(q, autoplay = false) {
  const g = groupMap.get(q.group);
  if (mediaGroup === g.id) return;
  const old = $("media").querySelector("audio");
  if (old) old.pause();
  mediaGroup = g.id;
  $("media").replaceChildren();
  rich("passage", g.content);
  $("stimulus-note").replaceChildren();
  $("group-range").textContent =
    g.numbers.length > 1
      ? `Question ${g.numbers[0]}–${g.numbers.at(-1)}`
      : `Question ${q.original}`;
  $("stimulus-label").textContent = g.audio
    ? "LISTEN & ANSWER"
    : q.part === 1
      ? "PHOTOGRAPH"
      : "TEST CONTENT";
  if (g.audio) {
    const a = document.createElement("audio");
    a.controls = true;
    a.preload = "auto";
    a.defaultPlaybackRate = audioSettings.rate(q.part);
    a.src = audioDownloads.source(g.audio, q.part);
    a.playbackRate = a.defaultPlaybackRate;
    const meta = document.createElement("div");
    meta.className = "audio-meta";
    const label = document.createElement("span");
    label.hidden = true;
    const link = document.createElement("a");
    link.href = g.audio;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Open audio ↗";
    meta.append(label, link);
    $("media").append(a, meta);
    a.onplay = () =>
      document.querySelectorAll("audio").forEach((other) => {
        if (other !== a) other.pause();
      });
    a.onerror = () => {
      label.hidden = false;
      label.textContent = "Unable to load audio. Try the source link.";
      label.className = "audio-error";
    };
    // Start inside the navigation gesture; keep shared-group playback untouched.
    if (autoplay)
      a.play().catch((error) => {
        if (
          !a.isConnected ||
          mediaGroup !== g.id ||
          error.name === "AbortError"
        )
          return;
        if (error.name === "NotAllowedError") {
          label.hidden = false;
          label.textContent = "Autoplay was blocked. Press Play to listen.";
        }
      });
  }
  if (q.part <= 4 && !g.audio) {
    const notice = document.createElement("p");
    notice.className = "audio-error";
    notice.textContent = "The source has not provided audio for this question.";
    $("stimulus-note").append(notice);
  }
  if ([3, 4].includes(q.part)) {
    const draft = document.createElement("textarea");
    draft.className = "listening-draft";
    draft.rows = 9;
    draft.placeholder = "Type what you hear…";
    draft.setAttribute("aria-label", "Listening draft");
    draft.setAttribute("autocomplete", "off");
    draft.spellcheck = false;
    $("stimulus-note").append(draft);
  } else if (
    !$("passage").textContent.trim() &&
    !$("passage").querySelector("img,table")
  ) {
    if (g.audio) {
      const art = document.createElement("div");
      art.className = "sound-art";
      art.setAttribute("aria-hidden", "true");
      for (let i = 0; i < 13; i++) art.append(document.createElement("span"));
      $("stimulus-note").append(art);
    }
  }
}
function renderQuestion(q, card) {
  const field = (name) => card.querySelector(`[data-field="${name}"]`);
  const rich = (name, raw) => field(name).replaceChildren(safe(raw));
  card.dataset.questionId = q.id;
  card.id = `question-${q.id}`;
  card.setAttribute(
    "aria-label",
    `Question ${q.original} in the original test`,
  );
  const index = partNumbers.get(q.id) - 1;
  const d = answerData(q);
  card._questionState = [
    saved.answers[q.id],
    d,
    saved.bookmarks[q.id],
    index,
    year,
  ];
  field("test-badge").textContent = `TEST ${q.test} / ${questionLabel(q)}`;
  field("question-number").textContent = `Question ${index + 1}`;
  rich("question-title", q.title.replace(/^\s*\d+\s*[.)]\s*/, ""));
  field("original-number").textContent =
    `Question ${q.original} in the original test · Part ${q.part}`;
  field("source-link").href = groupMap.get(q.group).source;
  field("bookmark").setAttribute(
    "aria-pressed",
    saved.bookmarks[q.id] ? "true" : "false",
  );
  field("bookmark").textContent = saved.bookmarks[q.id] ? "★" : "☆";
  field("bookmark").onclick = () => {
    saved.bookmarks[q.id] = !saved.bookmarks[q.id];
    save();
    renderQuestion(q, card);
    renderMap(view());
    updateNavigation();
  };
  const chosen = hasAnswer(q) ? saved.answers[q.id] : null;
  const frag = document.createDocumentFragment();
  q.choices.forEach((choice, i) => {
    const b = document.createElement("button");
    b.className = "choice";
    b.dataset.choice = i;
    const letter = document.createElement("span");
    letter.className = "choice-letter";
    letter.textContent = choice.label;
    const text = document.createElement("span");
    text.className = "choice-text";
    text.append(safe(choice.text));
    b.append(letter, text);
    b.setAttribute("aria-pressed", chosen === i ? "true" : "false");
    if (chosen !== null) {
      b.disabled = true;
      if (d.correct === i) b.classList.add("correct");
      else if (chosen === i)
        b.classList.add(d.correct === null ? "selected" : "wrong");
      if (d.correct === i || chosen === i) {
        const mark = document.createElement("span");
        mark.className = "choice-mark";
        mark.textContent =
          d.correct === i ? "✓" : d.correct === null ? "•" : "×";
        b.append(mark);
      }
    }
    b.onclick = () => {
      if (hasAnswer(q)) return;
      saved.answers[q.id] = i;
      if (d.correct !== null && i !== d.correct) {
        (saved.mistakes[q.id] ||= []).push({
          choice: i,
          correct: d.correct,
          at: new Date().toISOString(),
        });
      }
      save();
      renderQuestion(q, card);
      renderStats();
      renderMap(view());
      updateNavigation();
      // Keep navigation inside the answer gesture so the next audio can autoplay.
      if (
        $("auto-next-correct").checked &&
        [1, 2, 5].includes(q.part) &&
        d.correct !== null &&
        i === d.correct &&
        currentId === q.id
      ) step(1);
    };
    frag.append(b);
  });
  field("choices").replaceChildren(frag);
  field("feedback").replaceChildren();
  if (chosen !== null) {
    const box = document.createElement("div");
    box.className = "feedback";
    const status = document.createElement("div");
    status.className = "feedback-status";
    if (d.correct === null) {
      status.classList.add("unknown");
      status.textContent = `Selected ${q.choices[chosen].label} · No official answer is available for grading.`;
    } else {
      if (chosen !== d.correct) status.classList.add("wrong");
      status.textContent =
        (chosen === d.correct ? "✓ Correct!" : "Incorrect.") +
        ` Correct answer: ${q.choices[d.correct].label}.`;
    }
    box.append(status);
    const label = document.createElement("div");
    label.className = "explanation-label";
    label.textContent = "ZENLISH EXPLANATION";
    const explanation = document.createElement("div");
    explanation.className = "explanation rich";
    if (d.explanation) explanation.append(safe(d.explanation));
    else
      explanation.textContent =
        "The source has not provided an explanation for this question. You can import it from the original test review.";
    box.append(label, explanation);
    field("feedback").append(box);
  }
}
function renderQuestions(q) {
  const questions = (groupedPart() ? groupQuestions.get(q.group) : [q]).filter(
    (item) => !retryIds || retryIds.has(item.id),
  );
  const existing = [...$("questions").children];
  const reuse =
    existing.length === questions.length &&
    questions.every(
      (item, index) => existing[index].dataset.questionId === item.id,
    );
  const fragment = reuse ? null : document.createDocumentFragment();
  questions.forEach((item, index) => {
    const card = reuse
      ? existing[index]
      : $("question-template").content.firstElementChild.cloneNode(true);
    const state = [
      saved.answers[item.id],
      answerData(item),
      saved.bookmarks[item.id],
      partNumbers.get(item.id) - 1,
      year,
    ];
    if (!reuse || state.some((value, i) => value !== card._questionState?.[i]))
      renderQuestion(item, card);
    card.classList.toggle("is-current", item.id === currentId);
    if (fragment) fragment.append(card);
  });
  if (fragment) $("questions").replaceChildren(fragment);
}

function renderMap(list) {
  $("map-total").textContent = `${list.length} questions`;
  const reuse =
    renderedMapSelection === year &&
    mapButtons.size === list.length &&
    [...mapButtons.keys()].every((id, index) => id === list[index].id);
  if (!reuse) {
    mapButtons = new Map();
    audioMapButtons = new Map();
    const fragment = document.createDocumentFragment();
    for (const q of list) {
      const button = document.createElement("button");
      button.dataset.questionId = q.id;
      button.append(document.createTextNode(String(partNumbers.get(q.id))));
      for (const [className, text] of [
        ["map-state-symbol", ""],
        ["map-audio-symbol", "↓"],
      ]) {
        const symbol = document.createElement("span");
        symbol.className = className;
        symbol.setAttribute("aria-hidden", "true");
        symbol.textContent = text;
        button.append(symbol);
      }
      button.dataset.audioUrl = groupMap.get(q.group).audio || "";
      if (button.dataset.audioUrl) {
        const siblings = audioMapButtons.get(button.dataset.audioUrl) || [];
        siblings.push(button);
        audioMapButtons.set(button.dataset.audioUrl, siblings);
      }
      mapButtons.set(q.id, button);
      fragment.append(button);
    }
    $("question-map").replaceChildren(fragment);
    renderedMapSelection = year;
  }
  const activeGroup = questionMap.get(currentId)?.group;
  for (const q of list) {
    const button = mapButtons.get(q.id),
      status = grade(q),
      inGroup = groupedPart() && q.group === activeGroup,
      active = q.id === currentId,
      bookmarked = !!saved.bookmarks[q.id],
      history = everWrong(q);
    const state = [status, inGroup, active, bookmarked, history].join(":");
    if (button._mapState === state) continue;
    button._mapState = state;
    button.className = `map-button ${status}${inGroup ? " in-group" : ""}${active ? " active" : ""}${bookmarked ? " bookmarked" : ""}${button._audioReady ? " audio-ready" : ""}`;
    button.querySelector(".map-state-symbol").textContent =
      status === "correct"
        ? "✓"
        : status === "wrong"
          ? "×"
          : status === "answered"
            ? "?"
            : "·";
    const title =
      `Question ${partNumbers.get(q.id)} · ${questionLabel(q)} · Test ${q.test} · Original question ${q.original}` +
      (status === "correct"
        ? " · Correct"
        : status === "wrong"
          ? " · Incorrect"
          : status === "answered"
            ? " · Ungraded"
            : " · Unanswered") +
      (bookmarked ? " · Bookmarked" : "") +
      (history ? " · Previously incorrect" : "");
    button.dataset.baseTitle = title;
    button.title = title + (button._audioReady ? " · Audio downloaded" : "");
    button.setAttribute("aria-label", button.title);
    if (active) button.setAttribute("aria-current", "true");
    else button.removeAttribute("aria-current");
  }
  refreshAudioCacheUI();
}
$("question-map").onclick = (event) => {
  const button = event.target.closest("button[data-question-id]");
  if (button) go(button.dataset.questionId);
};

function render({ autoplay = false } = {}) {
  const autoNextAllowed = [1, 2, 5].includes(part);
  $("auto-next-correct").disabled = !autoNextAllowed;
  $("auto-next-label").classList.toggle("is-disabled", !autoNextAllowed);
  const list = view();
  if (!list.some((q) => q.id === currentId)) currentId = list[0]?.id || null;
  const q = questionMap.get(currentId);
  const items = navigationItems(list);
  const i = items.findIndex((x) =>
    groupedPart() ? x.group === q?.group : x.id === currentId,
  );
  $("part-title").textContent = `Part ${part}`;
  $("position").textContent = list.length
    ? groupedPart()
      ? `Group ${i + 1} / ${items.length} · ${list.length} questions`
      : `${i + 1} / ${list.length} questions`
    : "0 questions";
  $("workspace").classList.toggle("grouped", groupedPart());
  $("prev").textContent = "Back";
  $("next").textContent = "Next";
  $("workspace").hidden = !q;
  $("empty").hidden = !!q;
  updateNavigation();
  renderParts();
  renderStats();
  if (q) {
    showMedia(q, autoplay);
    renderQuestions(q);
  } else {
    const a = $("media").querySelector("audio");
    if (a) a.pause();
    mediaGroup = null;
  }
  renderMap(list);
  save();
  syncAudioDownloads();
}
function go(id) {
  currentId = id;
  render({ autoplay: true });
  if (groupedPart())
    document
      .getElementById(`question-${id}`)
      ?.scrollIntoView({ block: "start" });
}
function step(delta) {
  const q = adjacentQuestion(delta);
  if (q) go(q.id);
}
$("audio-cache-retry").onclick = () => audioDownloads.retry();
$("prev").onclick = () => step(-1);
$("next").onclick = () => step(1);
$("test-filter").onchange = (e) => {
  retryIds = null;
  filterTest = e.target.value;
  render({ autoplay: true });
};
$("status-filter").onchange = (e) => {
  retryIds = null;
  filterStatus = e.target.value;
  render({ autoplay: true });
};
$("reset").onclick = () => {
  if (!confirm(`Clear saved answers in Part ${part}?`)) return;
  partLists[part - 1].forEach((q) => delete saved.answers[q.id]);
  retryIds = null;
  filterStatus = "all";
  $("status-filter").value = "all";
  save();
  render();
};
document.addEventListener("keydown", (e) => {
  if (
    $("data-dialog").open ||
    $("mistakes-dialog").open ||
    $("audio-settings-dialog").open ||
    /INPUT|TEXTAREA|SELECT|AUDIO|BUTTON/.test(e.target.tagName)
  )
    return;
  if (e.key === "ArrowRight") {
    e.preventDefault();
    step(1);
  }
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    step(-1);
  }
});
function openData() {
  const known = DATA.questions.filter(
    (q) => answerData(q).correct !== null,
  ).length;
  $("data-summary").textContent =
    `${collectionLabel()} · ${DATA.questions.length.toLocaleString("en-US")} questions · ${known} official answers · ${DATA.questions.filter((q) => answerData(q).explanation).length} explanations.`;
  $("data-rows").replaceChildren();
  for (const test of DATA.tests) {
    const qs = DATA.questions.filter(
      (q) =>
        q.test === test.test &&
        (year !== "all" || owner(q) === test.collection),
    );
    const row = document.createElement("tr");
    for (const text of [
      `${year === "all" ? labelFor(test.collection) + " · " : ""}Test ${test.test}`,
      qs.length,
      qs.filter((q) => answerData(q).correct !== null).length,
      qs.filter((q) => answerData(q).explanation).length,
    ]) {
      const cell = document.createElement("td");
      cell.textContent = text;
      row.append(cell);
    }
    $("data-rows").append(row);
  }
  if (!$("data-dialog").open) $("data-dialog").showModal();
}
$("data-button").onclick = openData;
$("close-dialog").onclick = () => $("data-dialog").close();
function download(name, data) {
  downloadContent(
    name,
    JSON.stringify(data, null, 2),
    "application/json;charset=utf-8",
  );
}
$("export-progress").onclick = () =>
  download(`toeic-${year}-progress.json`, {
    format: KEY,
    saved,
    exportedAt: new Date().toISOString(),
  });
function validateProgressFile(d) {
  if (d.format !== KEY)
    throw new Error(
      "This progress file does not belong to " +
        collectionLabel() +
        ". Select the matching collection before importing.",
    );
  return progressStore.validate(d.saved, year);
}
$("import-progress").onchange = async (e) => {
  try {
    const file = e.target.files[0];
    if (!file) return;
    const next = validateProgressFile(JSON.parse(await file.text()));
    if (
      !confirm(
        "Replace progress for " + collectionLabel() + " with this backup?",
      )
    )
      return;
    saved = next;
    retryIds = null;
    part = saved.part;
    filterTest = "all";
    filterStatus = "all";
    currentId = saved.positions[part] || partLists[part - 1][0].id;
    mediaGroup = null;
    $("test-filter").value = "all";
    $("status-filter").value = "all";
    save();
    render();
    openData();
    $("import-message").textContent =
      "Progress restored for " + collectionLabel() + ".";
  } catch (error) {
    $("import-message").textContent = error.message;
  } finally {
    e.target.value = "";
  }
};
$("import-answers").onchange = async (e) => {
  try {
    const file = e.target.files[0];
    if (!file) return;
    const data = JSON.parse(await file.text());
    if (
      data.format !== `zenlish-review-${year}` ||
      !Array.isArray(data.answers)
    )
      throw new Error(
        `An answer-key file is required in this format: zenlish-review-${year}.`,
      );
    const patches = {};
    for (const item of data.answers) {
      const q = questionMap.get(item.id);
      if (
        !q ||
        !Number.isInteger(item.correct) ||
        item.correct < 0 ||
        item.correct >= q.choices.length ||
        typeof item.explanation !== "string"
      )
        throw new Error("The file contains an invalid question or answer.");
      patches[q.id] = { correct: item.correct, explanation: item.explanation };
    }
    Object.assign(saved.overrides, patches);
    save();
    render();
    openData();
    $("import-message").textContent =
      `Imported ${Object.keys(patches).length} answer keys.`;
  } catch (error) {
    $("import-message").textContent = error.message;
  } finally {
    e.target.value = "";
  }
};
function retryTargets() {
  return partLists[part - 1].filter(
    (q) =>
      matchesTest(q) &&
      (filterStatus === "ever-wrong"
        ? everWrong(q)
        : grade(q) === "wrong" || (everWrong(q) && !hasAnswer(q))),
  );
}
function updateRetryControls() {
  const count = retryTargets().length;
  $("retry-wrong").disabled = !count;
  $("retry-wrong").textContent =
    (filterStatus === "ever-wrong"
      ? "Retry missed questions"
      : "Retry wrong answers") + ` (${count})`;
  $("retry-session").hidden = !retryIds;
  if (retryIds) {
    const done = [...retryIds].filter((id) =>
      hasAnswer(questionMap.get(id)),
    ).length;
    $("retry-session-status").textContent =
      `Retry Part ${part}: ${done}/${retryIds.size} questions answered`;
  }
}
function startWrongRetry() {
  const targets = retryTargets();
  if (!targets.length) return;
  retryIds = new Set(targets.map((q) => q.id));
  for (const q of targets) delete saved.answers[q.id];
  filterStatus = "all";
  $("status-filter").value = "all";
  currentId = targets[0].id;
  save();
  render({ autoplay: true });
}
$("retry-wrong").onclick = startWrongRetry;
$("exit-retry").onclick = () => {
  retryIds = null;
  render();
};
function clearAllProgress() {
  progressStore.clear();
  saved = progressStore.load(year);
  part = 1;
  retryIds = null;
  filterTest = "all";
  filterStatus = "all";
  currentId = partLists[0][0].id;
  mediaGroup = null;
  $("test-filter").value = "all";
  $("status-filter").value = "all";
  render();
  if ($("data-dialog").open) openData();
  toast("Progress and mistake history cleared for all collections.");
}
$("clear-all-progress").onclick = () => {
  if (
    confirm(
      "Delete all answers, mistake history, bookmarks, imported answer keys, and saved positions for every collection in this browser?",
    )
  )
    clearAllProgress();
};
window.addEventListener("storage", (e) => {
  if (!e.key || e.key === AUTO_NEXT_KEY) loadAutoNextPreference();
  if (!e.key || e.key === audioSettings.key) {
    audioSettings.reload();
    applyAudioSettings();
  }
  if (
    !e.key ||
    e.key === KEY ||
    (year === "all" &&
      Object.keys(REAL_DATA).some((key) => progressStore.key(key) === e.key))
  ) {
    saved = loadProgress();
    render();
  }
});
function buildMistakeReport(scope = "part") {
  const questions = DATA.questions
    .filter((q) => (scope !== "part" || q.part === part) && everWrong(q))
    .map((q) => {
      const g = groupMap.get(q.group),
        d = answerData(q),
        prompt = exportRich(q.title),
        shared = exportRich(g.content),
        explanation = exportRich(d.explanation);
      const choices = q.choices.map((c, index) => ({
        index,
        label: c.label,
        ...exportRich(c.text),
      }));
      const choice = (index) =>
        Number.isInteger(index) ? choices[index] || null : null;
      const wrongAttempts = saved.mistakes[q.id].map((a) => ({
        at: a.at,
        selectedAnswer: choice(a.choice),
        correctAnswer: choice(a.correct),
      }));
      return {
        id: q.id,
        collection: owner(q),
        collectionLabel: questionLabel(q),
        test: q.test,
        part: q.part,
        originalQuestionNumber: q.original,
        question: prompt,
        sharedContent: shared,
        choices,
        audio: g.audio,
        source: g.source,
        explanation,
        correctAnswer: choice(d.correct),
        lastWrongAnswer: wrongAttempts.at(-1).selectedAnswer,
        currentAnswer: hasAnswer(q) ? choice(saved.answers[q.id]) : null,
        wrongAttempts,
      };
    });
  return {
    format: "toeic-mistakes-v1",
    exportedAt: new Date().toISOString(),
    selection: year,
    label: collectionLabel(),
    part: scope === "part" ? part : null,
    count: questions.length,
    questions,
  };
}
function updateMistakeExport() {
  const report = buildMistakeReport($("mistakes-scope").value);
  $("mistakes-summary").textContent =
    `${report.count} previously incorrect questions · ${collectionLabel()}${report.part ? " · Part " + report.part : ""}`;
  $("download-mistakes").disabled = !report.count;
}
$("export-mistakes").onclick = () => {
  $("mistakes-scope").value = "part";
  updateMistakeExport();
  $("mistakes-dialog").showModal();
};
$("close-mistakes").onclick = () => $("mistakes-dialog").close();
$("mistakes-scope").onchange = updateMistakeExport;
$("download-mistakes").onclick = () => {
  const report = buildMistakeReport($("mistakes-scope").value);
  if (!report.count) return;
  const html = $("mistakes-format").value === "html";
  downloadContent(
    `toeic-${year}-${report.part ? "part-" + report.part + "-" : ""}mistakes.${html ? "html" : "json"}`,
    html ? mistakeReportHtml(report) : JSON.stringify(report, null, 2),
    html ? "text/html;charset=utf-8" : "application/json;charset=utf-8",
  );
};
function applyAudioSettings() {
  const player = $("media").querySelector("audio");
  if (player) {
    const rate = audioSettings.rate(part);
    player.defaultPlaybackRate = rate;
    player.playbackRate = rate;
  }
  for (const input of document.querySelectorAll("[data-audio-part]"))
    input.value = audioSettings.rate(Number(input.dataset.audioPart));
  const rates = Object.values(audioSettings.rates);
  $("all-audio-speed").value = rates.every((rate) => rate === rates[0])
    ? rates[0]
    : "";
}
function changeAudioSpeed(input, target) {
  if (!input.value || !input.checkValidity()) {
    toast("Choose a speed between 0.5× and 3×.");
    applyAudioSettings();
    return;
  }
  try {
    audioSettings.set(target, Number(input.value));
  } catch (error) {
    toast(
      error.message === "Choose a speed between 0.5× and 3×."
        ? error.message
        : "Unable to save audio settings in this browser.",
    );
  }
  applyAudioSettings();
}
$("audio-settings-button").onclick = () => {
  applyAudioSettings();
  $("audio-settings-dialog").showModal();
};
$("close-audio-settings").onclick = () => $("audio-settings-dialog").close();
$("all-audio-speed").onchange = (event) =>
  changeAudioSpeed(event.target, "all");
for (const input of document.querySelectorAll("[data-audio-part]"))
  input.onchange = () =>
    changeAudioSpeed(input, Number(input.dataset.audioPart));
$("reset-audio-speeds").onclick = () => {
  try {
    audioSettings.reset();
  } catch {
    toast("Unable to save audio settings in this browser.");
  }
  applyAudioSettings();
};

async function applyRequestedReset() {
  if (
    location.protocol !== "http:" ||
    !["localhost", "127.0.0.1", "[::1]"].includes(location.hostname)
  )
    return;
  try {
    const response = await fetch("/api/study-reset", { cache: "no-store" });
    if (!response.ok) return;
    const request = await response.json();
    if (
      typeof request.epoch === "string" &&
      request.epoch !== localStorage.getItem("toeic-studio-reset-epoch")
    ) {
      clearAllProgress();
      localStorage.setItem("toeic-studio-reset-epoch", request.epoch);
    }
  } catch {
    /* No reset request is required for static/file mode. */
  }
}
render();
void applyRequestedReset();
if (!storageOk)
  toast(
    "Unable to read browser storage. You can export your progress as a backup.",
  );
