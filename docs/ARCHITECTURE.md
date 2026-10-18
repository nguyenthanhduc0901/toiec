# Architecture and data contract

## Application

Vanilla HTML/CSS/JavaScript, no dependencies. `scripts/build.mjs` injects CSS, JavaScript and JSON into `src/template.html` and writes `index.html`. JSON escapes `<` to prevent accidental closing of its `<script type="application/json">` element. All question data is available without browser fetches; opening the file directly is supported.

`scripts/serve.mjs` optionally serves the same repository on loopback. It does not proxy Zenlish or authenticate a user. There is no API server, database, analytics integration, or submission workflow.

## Collections: data/ets2024.json and data/ets2026.json

Each year uses the dataset format below. scripts/library.mjs combines them into `{version:2,datasets:{"2024":...,"2026":...}}`, embedded in the standalone HTML. The year switch swaps dataset indexes and restores that year's saved state. The 2024 dataset/IDs are unchanged; 2026 IDs add a `y2026-` prefix. Content, navigation and source labels always follow the selected year.

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

`saved.answers` stores the first selected zero-based choice. A question's grading is correct/wrong only if an original correct answer exists. Missing answers are marked selected but ungraded. The app displays original explanations after selection. The first answer remains locked until the user resets that Part.

The audio DOM element is replaced only when the shared group changes. Before replacing it, playback stops. The media URLs are public source links; browser-native audio controls perform playback without requiring CORS-enabled JavaScript downloads.

User navigation passes an explicit autoplay flag through `render()` to `showMedia()`. A new group's audio calls `play()` synchronously within that interaction; initial page load and non-navigation renders stay silent. Navigation within the current group preserves both playback position and paused state. Playback rejections are handled; browser autoplay restrictions show a manual Play hint, and aborted or obsolete players do not update the current UI.

Part 2 audio uses the native media fragment `#t=1.9` to start playback at 1.9 seconds for both manual Play and autoplay. Other Parts and the original media links remain unchanged; no media files are edited.

## Local persistence

Keys: `toeic-studio-ets2024-v1` and `toeic-studio-ets2026-v1`, with independent state. The original 2024 key remains unchanged so existing progress loads without migration. `toeic-studio-active-year` remembers the selected collection.

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

The format suffix must match the selected year (2024 or 2026). Validate IDs, index bounds and field types; do not execute imported HTML.
