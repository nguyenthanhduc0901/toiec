# Working instructions for coding agents

## Goal and current state

This is a complete, local-first Vietnamese TOEIC practice app for ETS 2024 Tests 1–10. The user wants continuous practice **by Part across all ten tests**, and immediate original correct-answer feedback plus explanation after choosing an answer. Preserve that behavior.

The repository is self-contained for application code and question data. It does not depend on the original author's filesystem, Codex, browser profile, credentials, or previous conversation. Read README.md, docs/ARCHITECTURE.md, and docs/DATA-SOURCES.md before material changes.

## Setup

- Open index.html directly for the existing build; no installation required.
- For development, use Node.js >=18. No npm dependencies are needed.
- `npm run build` produces the tracked standalone index.html.
- `npm run check` verifies the dataset and that the standalone build matches source.
- `npm start` serves locally on 127.0.0.1:4173; this is optional.

## Source of truth

- Edit src/template.html, src/app.css, src/app.js, and data/ets2024.json.
- Do not hand-edit the generated index.html. Rebuild and commit it with source changes.
- Keep scripts portable and use paths relative to their own module directory.
- Do not add frameworks, a backend, external script dependencies, accounts, hosting, or a package installation unless the requested feature requires it.

## Data and behavior invariants

- 2,000 questions; 200 per test; Part totals [60,250,390,300,300,160,540].
- Order within each Part is Test 1 to Test 10, with the original question order preserved. Retain stable question IDs so saved progress remains valid.
- Parts 3, 4, 6, and 7 have shared stimulus groups. Moving within the same group must not reset audio.
- Choices are indexed from zero. Part 2 has A/B/C; other Parts have A/B/C/D.
- Use original correct answers and explanations. Never invent missing answers. Missing correct answers must remain null and ungraded.
- After the first selection, show feedback and explanation immediately and lock that answer until the Part is reset.
- Preserve local progress, bookmarks, export/import, source links, safe HTML rendering, and responsive layout.
- Keep credentials, raw authenticated HTML, full account exports, attempt UUIDs, cookies, nonce values, browser profiles, and private progress backups out of Git.
- Reading authenticated data does not authorize creating or submitting exams. Obtain explicit user approval before altering the user's Zenlish history or account. There is no reusable blanket approval in this repository.

## Validation

Run build and check after changes. For UI changes, also check in a browser: correct/incorrect feedback, explanation visibility, test boundaries, Part switching, shared audio, filtering, bookmarks, progress persistence, final-question guard, and mobile overflow. Restore any test answers afterwards. See docs/VALIDATION.md for the original verification record.

## Known limits

Images/audio are remote HTTPS URLs and need Internet. Local progress belongs to a browser/origin; cloning Git does not move it. Avoid claiming fully offline media or automatic progress sync. No deployment is part of the current setup.
