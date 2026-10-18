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

## Two-year update

- Both 2024 and 2026 contain 10 full tests, 2,000 questions, 2,000 original answers and 2,000 source explanations each.
- Cross-year IDs are unique; the 2024 dataset and its stable IDs are unchanged.
- The 2024/2026 selector updates dataset indexes, header/source labels, counts, progress and backup formats.
- Year switching preserves independent answers, bookmarks, overrides and saved positions. Existing 2024 progress was checked without migration; 1,273 user answers were present and preserved during the update.
- Backup import validates year, answer bounds, bookmarks, overrides, Part and positions; wrong-year imports are rejected. Export follows the selected year.
- Correct-answer feedback and nonempty explanations were checked in all 140 combinations of year, test and Part.
- Each year was checked for test-boundary navigation, shared-group display/audio, whole-group navigation, final-group guard and full 540-question Part 7 map.
- Mobile rendering of the year switch was inspected at 390px without horizontal overflow.
- All temporary QA choices were restored and the app reloaded after browser checks. User progress and raw authenticated material were not added to the update.

For UI changes, rerun relevant browser checks. For changes only to documentation, use ordinary review rather than introducing browser tests.

## Autoplay fix — 2026-10-16

- Reproduced the original bug: Next changed the audio URL, but the new player remained paused at zero.
- After the fix, Next, Part switching, selecting another test, and question-map navigation start the new audio without a Play click.
- Part 3 navigation from original question 32 to 33 retained the same audio URL and advanced from 3.69s to 4.00s instead of restarting. Question 35 started the next group's recording.
- Test 1 → Test 2 starts the new recording; Next remains disabled on the final question.
- Initial page load remains paused. Correct/wrong feedback, explanation visibility, first-choice locking, bookmarks, and persistence after reload passed on a separate QA origin; QA answers were reset afterwards.
- At a 390px viewport, document width did not exceed the viewport. Build and dataset checks passed.

## Stable navigation — 2026-10-16

- Previous/Next now sit above the question workspace, aligned right, in a sticky navigation bar.
- Direct mouse selection of an answer left the Next button at the same viewport coordinates before/after feedback: desktop (1263.77, 383.58), mobile (239.77, 52.14).
- Scrolling through the explanation pinned the navigation bar to viewport top. At 390px, document width remained 375px without horizontal overflow.
- Navigation still triggered audio autoplay. QA answers on the separate localhost origin were reset after testing.

## Part 2 start offset — 2026-10-16

- Manual Play loaded Part 2 with `#t=1.9` and played at 2.26 seconds after the interaction. Next also used the fragment and continued playback after metadata loaded.
- Switching to Part 1 retained the original URL without a time fragment and started at zero.
- Build and dataset checks passed; no saved answers were changed during this check.

## Full question map — 2026-10-16

- Removed map pagination and its state, markup, and styles. Every question matching the current Part and filters is shown in one grid.
- Browser verified 250 map buttons for Part 2, 540 for Part 7, and 54 for Part 7 filtered to Test 1. Selecting question 540 worked and disabled Next at the end.
- At 390px, all 250 Part 2 buttons remained in the grid without horizontal page overflow. Build and dataset checks passed; no answers were changed.
