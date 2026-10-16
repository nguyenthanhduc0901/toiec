# Architecture and data contract

## Application

Vanilla HTML/CSS/JavaScript, no dependencies. `scripts/build.mjs` injects CSS, JavaScript and JSON into `src/template.html` and writes `index.html`. JSON escapes `<` to prevent accidental closing of its `<script type="application/json">` element. All question data is available without browser fetches; opening the file directly is supported.

`scripts/serve.mjs` optionally serves the same repository on loopback. It does not proxy Zenlish or authenticate a user. There is no API server, database, analytics integration, or submission workflow.

## Dataset: data/ets2024.json

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

## Local persistence

Key: `toeic-studio-ets2024-v1`.

State: `answers`, `bookmarks`, `overrides`, `part`, `positions`.

`overrides` holds explicitly imported correct answers and explanations keyed by stable question ID. The bundled dataset is already complete. Backup format is `{format:"toeic-studio-ets2024-v1",saved,exportedAt}`. Progress is browser/origin-specific; it is intentionally not committed to Git.

Supplemental answer import format:

```json
{
  "format": "zenlish-review-2024",
  "answers": [
    { "id": "existing normalized question ID", "correct": 0, "explanation": "<p>Original explanation</p>" }
  ]
}
```

Validate IDs, index bounds and field types; do not execute imported HTML.
