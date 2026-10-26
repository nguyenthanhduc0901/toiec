# Architecture and data contract

## Application

Vanilla HTML/CSS/JavaScript, no dependencies. `scripts/build.mjs` injects CSS, JavaScript and JSON into `src/template.html` and writes `index.html`. JSON escapes `<` to prevent accidental closing of its `<script type="application/json">` element. All question data is available without browser fetches; opening the file directly is supported.

`scripts/serve.mjs` serves the repository on loopback and provides a small local audio-cache API. It does not authenticate to Zenlish or submit exams. There is no account database or analytics integration.

## Collections: data/ets2023.json, data/ets2024.json and data/ets2026.json

Each year uses the dataset format below. scripts/library.mjs combines them into `{version:2,datasets:{"2023":...,"2024":...,"2026":...}}`, embedded in the standalone HTML. The year switch swaps dataset indexes and restores that year's saved state. The 2024 dataset/IDs are unchanged; 2023/2026 IDs add a `y2023-`/`y2026-` prefix. Content, navigation and source labels always follow the selected year.

Top-level fields:

- `version`, `year`, `source`, `collectedAt`: dataset metadata.
- `tests`: ten summaries with `test`, `questions`, per-Part `parts`, `answers`, `explanations`.
- `groups`: shared reading/listening stimuli.
- `questions`: flat normalized list, ordered by test, Part and original question number.

Group fields:

| Field | Meaning |
| --- | --- |
| id | Stable `t{test}-p{part}-g{WordPress question ID}` |
| test / part | Original test and Part numbers |
| content | Original HTML or HTML-entity-encoded stimulus |
| audio | Original HTTPS audio URL, or empty string |
| source | Original quiz URL |
| numbers | Original question numbers sharing this stimulus |

Question fields:

| Field | Meaning |
| --- | --- |
| id | Stable group ID plus `-s{subIndex}` |
| group | Foreign key to groups |
| test / part | Source test and Part |
| original | Original full-test question number, 1–200 |
| title | Source prompt; may be only a question number in listening Parts |
| choices | Ordered `{label, text}` entries |
| correct | Zero-based correct choice; null if genuinely unavailable |
| explanation | Original explanation HTML |
| questionId / subIndex | Source question-group ID and zero-based subquestion position |

Do not infer order from numeric WordPress IDs. The original site uses `term_questions` when `question_order_version >= 2`. Some old IDs do not sort into the correct question sequence. The normalized `original` fields and list order already preserve the canonical sequence.

Build `partLists` by filtering questions for each Part; because the flat list is in test order, this gives Test 1 → Test 10 without losing groups. Correct answers were joined by source question ID and subquestion position, not by a legacy flat user-answer array.

## Rendering and scoring

`safe()` decodes source HTML when needed, creates an inert template, removes executable/interactive elements, allowlists tags/attributes/styles, and restricts source URLs to HTTP(S). Preserve this boundary when adding source content.

`saved.answers` stores the first selected zero-based choice. A question's grading is correct/wrong only if an original correct answer exists. Missing answers are marked selected but ungraded. The app displays original explanations after selection. The first answer remains locked until a Part reset or a wrong-answer retry. The per-question reset button has been removed. Wrong choices append `{choice, correct, at}` to `saved.mistakes[id]`; retry clears only current answers and never removes this history. The ever-wrong filter and mistake reports continue to include a question after it has been corrected.

The audio DOM element is replaced only when the shared group changes. Before replacing it, playback stops. The media URLs are public source links; browser-native audio controls perform playback without requiring CORS-enabled JavaScript downloads.

User navigation passes an explicit autoplay flag through `render()` to `showMedia()`. A new group's audio calls `play()` synchronously within that interaction; initial page load and non-navigation renders stay silent. Navigation within the current group preserves both playback position and paused state. Playback rejections are handled; browser autoplay restrictions show a manual Play hint, and aborted or obsolete players do not update the current UI.

Part 1 audio uses the native media fragment `#t=5` to start playback at 5 seconds; Part 2 uses `#t=1.9` to start at 1.9 seconds. These offsets apply across all years, for both manual Play and autoplay, with cached and remote audio. Players set both defaultPlaybackRate and playbackRate to 1.2 for Part 2, 1.1 for Parts 3 and 4, and 1.0 for other Parts. The default rate keeps the setting when the player loads or switches to a cached source. Other Parts and the original media links remain unchanged; no media files are edited.

## Audio preloading

`src/audio-cache.js` is bundled before `src/app.js`. Its Part-scoped queue deduplicates audio URLs, shuffles the entire current Part (independent of filters), prioritizes the current clip, and issues at most two background requests at once. Failures rejoin the queue up to three attempts; exhausted failures can be retried. Changing year/Part aborts the browser's previous queue. Server downloads already started can finish and remain reusable.

The server accepts only exact URLs present in the bundled datasets. `GET /api/audio-cache?year=...&part=...` returns the complete manifest and disk-ready URLs. `POST /api/audio-cache` accepts a JSON URL and downloads public media without credentials or redirects. A validated complete response is written to a SHA-256-named temporary file under ignored `work/audio-cache/`, then atomically renamed. Pending identical requests share one download. Partial or failed files never count as ready. `GET/HEAD /api/audio-cache/file?url=...` serves cached files with byte-range support for seeking. Private/work folders cannot be accessed through the static server.

Map buttons are updated in place after each completed download, so focus and question state are preserved. All questions sharing an audio URL get the readiness color; grading, active state and bookmarks remain distinct. Playback uses the cached URL when ready, retaining the Part 2 start fragment. A recording already playing or paused partway through is never swapped. Cached metadata is restored from actual files on reload, not saved progress. Cache is local to this machine and is not exported or committed. File-mode/other static hosts retain direct remote playback and show that bulk preloading requires the local server.

## Local persistence

Keys: `toeic-studio-ets2023-v1`, `toeic-studio-ets2024-v1` and `toeic-studio-ets2026-v1`, with independent state. The original 2024 key remains unchanged so existing progress loads without migration. `toeic-studio-active-year` remembers the selected collection.

State: `answers`, `bookmarks`, `overrides`, `part`, `positions`.

`overrides` holds explicitly imported correct answers and explanations keyed by stable question ID. Backup format is `{format:"toeic-studio-ets{year}-v1",saved,exportedAt}`. Import validates all answers, bookmarks, overrides, Part and saved positions before any change and restores all of these fields. Wrong-year imports are rejected. Progress is browser/origin-specific; only backups explicitly requested by the user belong in Git.

Supplemental answer import format:

```json
{
  "format": "zenlish-review-2026",
  "answers": [
    { "id": "existing normalized question ID", "correct": 0, "explanation": "<p>Original explanation</p>" }
  ]
}
```

The format suffix must match the selected year (2023, 2024 or 2026). Validate IDs, index bounds and field types; do not execute imported HTML.

## Color vision support

The header toggle sets `colorblind-theme` on the document root and persists its boolean separately as `toeic-studio-colorblind-theme`. It changes presentation without rendering or touching yearly progress or audio. Blue/solid/check marks identify correct answers; brown-orange/dashed/cross marks identify wrong ones. Neutral/dotted/question marks identify ungraded answers. Map buttons retain question numbers and add status symbols, a download arrow for cached audio, and a star for bookmarks. Accessible map names include grading and bookmark status in both themes. Theme changes keep media, filters, question position and focus intact.

## HACKER TOEIC 2 collection

`data/hacker2.json` adds the `hacker2` dataset alongside the unchanged numeric ETS keys. Its metadata is `collection: "hacker2"`, `label: "HACKER TOEIC 2"`, `progressKey: "toeic-studio-hacker2-v1"`. `loadLibrary()` discovers this file along with etsYYYY.json. Existing bundle version 2 and legacy ETS files remain supported.

The internal selection variable and `data-year` attributes also accept collection IDs. Display labels fall back to ETS + year for legacy data; persistence falls back to the original ETS key. HACKER progress export uses toeic-hacker2-tien-do.json and its own format/key; imports from other collections are rejected. The active-year key can now contain hacker2. Audio-cache manifest lookup already accepts string dataset keys.

All ten tests contain 200 questions, with the same canonical Part totals/grouping as ETS. There are 1,999 machine-marked original answers and 2,000 original explanations. Source review Test 7 Q93 has no correct-choice marker. Its `correct` stays null and ID is declared in missingAnswers; validation accepts exactly this one known omission and requires its explanation. Formatting in explanations is not used to invent or override answer keys.


## HACKER TOEIC 3

`data/hacker3.json` follows the HACKER 2 collection contract with dataset key hacker3, label HACKER TOEIC 3, progress key toeic-studio-hacker3-v1 and unique hacker3-prefixed IDs. The collection selector, backup format and audio-cache lookup reuse the existing generic label/progress metadata without changing any existing collection IDs, keys or question data. It contains all 2,000 original keys and explanations. The exact-ID validation exception for Test 6 Q37 preserves the source quiz/review three-choice structure while grading normally against original choice B.


## Current module boundaries and combined study

- `scripts/bundle.mjs` is the sole source of CSS/JS injection order for build and verification. `scripts/check.mjs` now contains validation directly; the former forwarding wrapper/check-library split is removed.
- `StudyLibrary` creates lazy reusable indexes: groups, questions, canonical ranks, Part numbers, shared groups and deduplicated Part audio URLs. The all selection reuses original question objects and IDs; its ordering is collection then canonical source order. Test filter values include collection IDs to distinguish all 50 tests.
- `StudyProgress` preserves all legacy per-collection keys. Combined answers/bookmarks/overrides/mistakes are loaded from and written through to the owning collection. The all storage key contains only combined navigation, never a second copy of answers. Legacy wrong answers migrate to history with a null timestamp; no timestamp is invented. Backup validation rejects foreign IDs and malformed attempts.
- `safe-html.js` owns source HTML sanitization. `mistake-export.js` renders readable HTML from sanitized report fields and provides download helpers. JSON includes question/shared content, choices, collection/test/Part provenance, audio/source links, current answer, last wrong answer, all recorded wrong choices and their original correct answer, and explanation.
- `app.js` coordinates UI. A retry session snapshots eligible IDs, clears their answers, preserves historical attempts and shows only target siblings in shared groups. Other questions and shared audio remain intact.
- Map buttons are rebuilt only when the visible ID list/selection changes. Navigation, grading and cache completion update existing nodes. Audio readiness uses URL-indexed map buttons and skips unchanged attributes; group cards and Part buttons are also reused.
- The local server caches raw/gzipped index.html by file mtime and size, shares compression work across requests, respects Accept-Encoding, sets Vary/ETag and supports 304 responses. Builds invalidate this cache naturally.

## Explicit local fresh start

GET /api/study-reset returns a local epoch only if the ignored work/study-reset-request.json exists. An HTTP localhost client applies an explicitly requested epoch once, clearing all study progress and remembering toeic-studio-reset-epoch. It does not affect static/hosted builds, theme settings, disk audio cache or backup files. No epoch is shipped with the app. Normal page loads and updates do not request a reset.


## Interface language

App-authored interface text, accessibility labels, errors, confirmations and exported report headings use English (lang=en, en-US date/number formatting). Original question choices/passages/explanations retain their source language. Progress storage keys, IDs and backup format identifiers are unchanged; download filenames use progress/mistakes.


## Shared listening speed preferences

The Audio speed dialog applies a common speed to listening Parts 1–4, with optional individual Part values. AudioSettings stores preferences separately in toeic-studio-audio-speeds-v1. Defaults remain 1.0 / 1.2 / 1.1 / 1.1, allowed range 0.5–3.0. Changes update the active audio element in place and apply to every collection and combined mode. Storage events synchronize preferences between tabs; clearing study progress retains these preferences. Playback start offsets remain unchanged. The combined selector label is intentionally Tất cả per user preference; other app-authored UI stays English. Sidebar Part descriptions, section captions, source-website button and legacy availability filter were removed.


## Auto-next on correct answers

The checkbox preference toeic-studio-auto-next-correct-v1 is shared across collections and independent of progress. It is disabled in grouped Parts 3/4/6/7. Answer handling independently guards Parts 1/2/5, a known correct answer, the newly selected correct choice, and current question identity before calling step(1) synchronously. Normal navigation respects filters/retry scope and stops at the last question. There are no delayed transitions, so manual navigation cannot race a timer and the next audio retains the answer-click user gesture. Incorrect, ungraded and already locked answers do not advance.
