# Working instructions for coding agents

## Goal and current state

This is a local-first English-interface TOEIC practice app for ETS 2023, ETS 2024, ETS 2026 HACKER TOEIC 2 and HACKER TOEIC 3, Tests 1–10 per collection. The user wants a year selector, continuous practice **by Part across all ten tests of the selected year**, and immediate original correct-answer feedback plus explanation after choosing an answer. Preserve that behavior.

The repository is self-contained for application code and question data. It does not depend on the original author's filesystem, Codex, browser profile, credentials, or previous conversation. Read README.md, docs/ARCHITECTURE.md, and docs/DATA-SOURCES.md before material changes.

## Setup

- Open index.html directly for the existing build; no installation required.
- For development, use Node.js >=18. No npm dependencies are needed.
- `npm run build` produces the tracked standalone index.html.
- `npm run check` verifies the dataset and that the standalone build matches source.
- `npm start` serves locally on 127.0.0.1:4173; this is optional.

## Source of truth

- Edit src/template.html, src/app.css, src/app.js, data/ets2023.json, data/ets2024.json, data/ets2026.json, data/hacker2.json, and data/hacker3.json.
- scripts/library.mjs builds a version-2 bundle with datasets keyed by year; the app can also read the legacy single-dataset format.
- Do not hand-edit the generated index.html. Rebuild and commit it with source changes.
- Keep scripts portable and use paths relative to their own module directory.
- Do not add frameworks, a backend, external script dependencies, accounts, hosting, or a package installation unless the requested feature requires it.

## Data and behavior invariants

- 10,000 questions across five collections. Each collection has 2,000 questions, 200 per test, Part totals [60,250,390,300,300,160,540].
- Keep the legacy toeic-studio-ets2024-v1 storage key and 2024 IDs unchanged. 2023 and 2026 use toeic-studio-ets{year}-v1 and y{year}-prefixed IDs. HACKER TOEIC 2/3 use dataset keys `hacker2`/`hacker3`, matching ID prefixes, and progress keys `toeic-studio-hacker2-v1` / `toeic-studio-hacker3-v1`. Per-collection ownership is authoritative. The runtime all view combines them and writes through to the correct collection; never persist a second copy of combined answers. Combined navigation has its own key. The separate toeic-studio-active-year key stores only the selected year.
- Order within each Part is Test 1 to Test 10, with the original question order preserved. Retain stable question IDs so saved progress remains valid.
- Parts 3, 4, 6, and 7 have shared stimulus groups. Moving within the same group must not reset audio.
- Choices are indexed from zero. Part 2 has A/B/C; other Parts have A/B/C/D except HACKER TOEIC 3 Test 6 Q37 (`hacker3-t6-p3-g73749-s2`), where both source quiz and review provide only A/B/C. Preserve these three choices; do not invent D.
- Use original correct answers and explanations. Never invent missing answers. Missing correct answers must remain null and ungraded. The known source omission is HACKER TOEIC 2 Test 7 Q93 (`hacker2-t7-p4-g78414-s1`); its original explanation is available. Do not fill its key from bold formatting or reasoning.
- After the first selection, show feedback and explanation immediately and lock that answer until a wrong-answer retry or Part reset. Keep every recorded wrong attempt in mistakes even after a correct retry. The per-question reset feature is retired.
- Preserve local progress, bookmarks, export/import, source links, safe HTML rendering, and responsive layout.
- Keep the study screen concise: do not restore instructional slogans, per-Part description paragraphs, answer-coverage banners, routine audio captions, shared-group explanatory sentences, or the personal-practice footer. Detailed dataset counts remain available in the data/backup dialog; show audio notices only for actual playback issues.
- Keep credentials, raw authenticated HTML, full account exports, attempt UUIDs, cookies, nonce values, browser profiles, and private progress backups out of Git.
- Reading authenticated data does not authorize creating or submitting exams. Obtain explicit user approval before altering the user's Zenlish history or account. There is no reusable blanket approval in this repository.

## Validation

Run build and check after changes. For UI changes, also check in a browser: year switching, unchanged legacy 2024 progress, independent per-year persistence/export/import, correct/incorrect feedback, explanation visibility, test boundaries, Part switching, shared audio, filtering, bookmarks, final-question guard, and mobile overflow. Restore test answers and selected year afterwards. See docs/VALIDATION.md for verification records.

## Known limits

Images/audio are remote HTTPS URLs and need Internet. Local progress belongs to a browser/origin; cloning Git does not move it. Avoid claiming fully offline media or automatic progress sync. Cloudflare Pages Direct Upload hosts https://toeic-ducthanh.pages.dev/; deploy only dist/ built by npm run build:hosted, never the repository or progress backups. Git pushes do not automatically update hosting.

HACKER TOEIC 3 Test 7 Q15/Q20/Q22 have no audio in either quiz or review. Preserve the empty audio URLs, missingAudio metadata and visible source-audio notice; never guess media links.

## Current local features and maintenance

Use src/study-library.js for indexed collection/combined data, src/study-progress.js for persistence, src/safe-html.js for source sanitization, and src/mistake-export.js for readable exports. Build injection order is shared in scripts/bundle.mjs; scripts/check.mjs validates data and reproducible output directly. Keep full question-map visibility; do not reintroduce pagination or rebuild unchanged map nodes on every navigation/cache event.

Combined mode must use all 10,000 stable IDs and sync answers, bookmarks, overrides and mistake history to the original collection keys. Export mistakes with full question/shared content, choices, every wrong attempt, current/correct answers and original explanation. Preserve legacy backup compatibility. User preference for this work is local changes only: no commit, push or deploy unless requested.

The user requested a fresh start of all local progress. The ignored local reset-request epoch implements that one-time action; never embed a forced reset into the standalone or hosted build. Theme and media cache are not study progress.

All app-authored UI, accessible labels, notifications and report headings are English. Keep original question and explanation content unchanged, including source Vietnamese explanations. Storage keys and backup format identifiers are not translated.
