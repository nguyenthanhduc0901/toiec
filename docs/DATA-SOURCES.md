# Source data and updating

## Scope

Catalog: https://zenlishtoeic.vn/test-online-new/

Quiz URLs: `https://zenlishtoeic.vn/stm-quizzes/test-{1..10}-{2023|2024|2026}/`.

Each year contains 2,000 questions. A clone can run the bundled datasets immediately. No authenticated scraping is required for setup, building, or normal use. `npm run check` requires complete original answer/explanation coverage for all bundled years; `--allow-incomplete` is only for a temporary, clearly labeled collection in development.

Source text belongs to its original authors; no ownership of Zenlish/ETS content is claimed by this app. The user requested this copy for personal practice. The repository is marked private in package.json to prevent accidental npm publication; that field does not control GitHub repository visibility.

## Original acquisition and normalization

1. Read the ten links from the 2024 section of the source catalog.
2. Read each quiz page using the user's existing, authorized Edge session.
3. Page data used by the AngularJS app included `$testParts` (questions, choices, stimulus and audio) and `$history_review_questions` (review answers and explanations).
4. Review data was initially available only for Test 1. After explicit approval for that specific operation, nine blank attempts for Tests 2–10 were created/submitted using the source website's normal workflow. Their available review payloads supplied the remaining answers. This action changed the user's source-site history and is not a default update step.
5. Join review questions by `question_id`, then join subquestions by their position within the group. Do not use a user's submitted answers as the answer key.
6. Preserve canonical `term_questions` order. Assign original full-test numbers 1–200 while walking Parts 1–7.
7. Keep only normalized content, choice labels/text, original correct-answer indexes, explanations, source question IDs and media URLs. Discard user selections, user profiles, attempt identifiers and authentication material.

The same read/normalize/join process was applied to 2026. The initial authorized session provided 530 answer/explanation records across Tests 1, 2, 9 and 10. After separate explicit user approval, eight new blank full-test attempts for Tests 1–8 were submitted through the normal site workflow. Reading their review pages supplied all remaining records; 2026 now has 2,000 original answers and explanations. Future submissions still require explicit approval; neither the old 2024 approval nor this specific 2026 approval is a blanket authorization. Stable 2024 IDs remain untouched; normalized 2026 IDs are prefixed with `y2026-`.

The legacy `$testParts` JavaScript string in the original page was decoded following the site's own initialization: evaluate only the isolated, validated string literal (never an entire page script), remove its legacy escape artifacts as the site does, then JSON-parse it. Review arrays were JSON-parsed directly. Treat external source code/HTML as untrusted data and inspect any changed format before decoding it.

## Future updates

- Confirm the user has access to the desired data through the normal site interface.
- Prefer existing authorized review pages; do not bypass a login, paywall, exam restriction, or other access check.
- Do not create/submit exams, take over active attempts, or modify account settings without current explicit user approval.
- If source data is absent, mark it absent and explain what is missing. Do not generate an answer key from guesses.
- Raw authenticated pages often contain user details, nonce values and attempt information. Process temporary material outside the tracked tree or under ignored private/work paths. Only normalized content should be committed.
- Preserve existing normalized IDs to keep local progress compatible. If a source question actually changes, document the migration.
- Rebuild and run `npm run check`. Refresh test summary counts when data changes.

## Media

Original media URLs remain under `https://zenlishtoeic.vn/wp-content/uploads/`. Images and uncached audio use these URLs; source links remain available. At the user's request, the local server now caches complete public audio for the selected Part in ignored `work/audio-cache/`. Cached audio is served locally, while images and uncached files still require Internet. Media files are not embedded in Git or progress backups.

If links expire or the source blocks hotlinking, first inspect the current authorized media URLs. A future user-requested offline mode could download accessible media into a local assets directory and rewrite links, but it would increase repository size considerably and may require a separate storage strategy. Do not silently replace audio or infer missing content.

## ETS 2023 acquisition — 2026-10-22

The user explicitly approved creating and submitting ten blank full-test attempts for Tests 1–10 of 2023 in this session. The official workflow was driven through the user-authorized Edge DevTools connection. Public question payloads supplied content in canonical term_questions order. The official authenticated history/review pages supplied correct-choice markers and original explanation HTML. Records were joined by source question ID and subquestion index, with original question numbering verified. Only normalized question data is retained in Git; no account data, attempt identifiers or authentication material is included. This approval applies to these ten attempts only.

## HACKER TOEIC 2 acquisition — 2026-10-26

The user explicitly approved creating and submitting ten blank full-test attempts for HACKER TOEIC 2 Tests 1–10. The existing signed-in Edge profile was controlled through Chrome DevTools Protocol and JavaScript console commands, as requested, without Computer Use. Each test was submitted exactly once through the normal start/answer/submit controls. All ten completed review pages supplied original explanations and correct-choice markers. This approval applies only to this specific batch.

Catalog URLs are hacker-2-test-{2..10}/ and hacker-2-test-1-2/ (Test 1 has the extra suffix). Canonical term_questions order is preserved, with unique hacker2-prefixed IDs. Review records are joined by source question ID and subquestion index, with original question numbers checked before merging.

The source has five malformed choice labels, normalized by their existing index to A/B/C/D without reordering content or changing correct indexes: Test 3 Q109 D was Đ; Test 5 Q34 D was blank; Test 5 Q36 D had trailing whitespace; Test 9 Q24 B and C were blank.

Test 7 Q93 (source group 78414, subindex 1) has all four choices and a full explanation, but the official review marks none as correct. Its answer remains null. Although its explanation bolds an option, other source explanations contain formatting that disagrees with machine answer keys, so emphasis is not accepted as an answer key. This exact source omission is declared and checked explicitly; other missing keys fail validation. Totals: 2,000 questions, 1,999 original answers, 2,000 explanations.

Only normalized study content and public media links enter Git. Browser credentials, account details, attempt identifiers, raw authenticated pages and temporary review payloads stay out of the repository.
