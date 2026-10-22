# Working instructions for coding agents

## Goal and current state

This is a local-first Vietnamese TOEIC practice app for ETS 2023, ETS 2024 and ETS 2026, Tests 1–10 per year. The user wants a year selector, continuous practice **by Part across all ten tests of the selected year**, and immediate original correct-answer feedback plus explanation after choosing an answer. Preserve that behavior.

The repository is self-contained for application code and question data. It does not depend on the original author's filesystem, Codex, browser profile, credentials, or previous conversation. Read README.md, docs/ARCHITECTURE.md, and docs/DATA-SOURCES.md before material changes.

## Setup

- Open index.html directly for the existing build; no installation required.
- For development, use Node.js >=18. No npm dependencies are needed.
- `npm run build` produces the tracked standalone index.html.
- `npm run check` verifies the dataset and that the standalone build matches source.
- `npm start` serves locally on 127.0.0.1:4173; this is optional.

## Source of truth

- Edit src/template.html, src/app.css, src/app.js, data/ets2023.json, data/ets2024.json, and data/ets2026.json.
- scripts/library.mjs builds a version-2 bundle with datasets keyed by year; the app can also read the legacy single-dataset format.
- Do not hand-edit the generated index.html. Rebuild and commit it with source changes.
- Keep scripts portable and use paths relative to their own module directory.
- Do not add frameworks, a backend, external script dependencies, accounts, hosting, or a package installation unless the requested feature requires it.

## Data and behavior invariants

- 6,000 questions across three years. Each year has 2,000 questions, 200 per test, Part totals [60,250,390,300,300,160,540].
- Keep the legacy toeic-studio-ets2024-v1 storage key and 2024 IDs unchanged. 2023 and 2026 use toeic-studio-ets{year}-v1 and y{year}-prefixed IDs. Never merge answers, overrides, bookmarks or saved positions across years. The separate toeic-studio-active-year key stores only the selected year.
- Order within each Part is Test 1 to Test 10, with the original question order preserved. Retain stable question IDs so saved progress remains valid.
- Parts 3, 4, 6, and 7 have shared stimulus groups. Moving within the same group must not reset audio.
- Choices are indexed from zero. Part 2 has A/B/C; other Parts have A/B/C/D.
- Use original correct answers and explanations. Never invent missing answers. Missing correct answers must remain null and ungraded.
- After the first selection, show feedback and explanation immediately and lock that answer until the question or Part is reset.
- Preserve local progress, bookmarks, export/import, source links, safe HTML rendering, and responsive layout.
- Keep the study screen concise: do not restore instructional slogans, per-Part description paragraphs, answer-coverage banners, routine audio captions, shared-group explanatory sentences, or the personal-practice footer. Detailed dataset counts remain available in the data/backup dialog; show audio notices only for actual playback issues.
- Keep credentials, raw authenticated HTML, full account exports, attempt UUIDs, cookies, nonce values, browser profiles, and private progress backups out of Git.
- Reading authenticated data does not authorize creating or submitting exams. Obtain explicit user approval before altering the user's Zenlish history or account. There is no reusable blanket approval in this repository.

## Validation

Run build and check after changes. For UI changes, also check in a browser: year switching, unchanged legacy 2024 progress, independent per-year persistence/export/import, correct/incorrect feedback, explanation visibility, test boundaries, Part switching, shared audio, filtering, bookmarks, final-question guard, and mobile overflow. Restore test answers and selected year afterwards. See docs/VALIDATION.md for verification records.

## Known limits

Images/audio are remote HTTPS URLs and need Internet. Local progress belongs to a browser/origin; cloning Git does not move it. Avoid claiming fully offline media or automatic progress sync. No deployment is part of the current setup.
