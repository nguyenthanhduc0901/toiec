# Verification record

The initial application was verified in Microsoft Edge through its local DevTools Protocol connection. That connection is not required to run a clone and its credentials/profile are not included.

Verified behavior:

- 10 complete tests, 200 questions each; total 2,000.
- Every question has a valid original answer index and nonempty original explanation.
- Part totals: 60 / 250 / 390 / 300 / 300 / 160 / 540.
- Canonical original numbering 1–200 for every test; source groups remain linked.
- Correct/incorrect selection feedback, correct-choice highlighting, immediate explanation and first-choice locking.
- Correct feedback and source explanation sampled across all 70 combinations of test and Part.
- Continuous navigation across the Test 1 → Test 2 boundary; final-question guard.
- Shared audio element retained while moving within a stimulus group.
- Test filtering, bookmarks and localStorage persistence; test selections restored after QA.
- Source HTML sanitization rejects scripts, event handlers and unsafe URL schemes.
- Desktop and 390px mobile layout without horizontal overflow.
- Actual audio metadata and an image loaded from source; HEAD checks of one audio and one image per test returned HTTP 200 (20 checks).

`npm run check` provides portable repeatable checks for all dataset records and the generated HTML. It does not download all media files or certify the source's answer keys independently. Media availability may change after the original verification.

For UI changes, rerun relevant browser checks. For changes only to documentation, use ordinary review rather than introducing browser tests.
