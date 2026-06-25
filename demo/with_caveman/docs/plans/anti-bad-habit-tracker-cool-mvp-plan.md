# Implementation Plan: Anti-Bad-Habit Tracker

## Overview

This plan delivers the MVP defined in `docs/specs/anti-bad-habit-tracker-cool-mvp-spec.md` for a single-user, local-first, responsive web app using the existing Vite + vanilla JavaScript structure. The implementation preserves strict accountability rules (missed day resets streak, no future check-ins), milestone rewards (3/7/30/60), and the 60-day archive rule for broken habits. It also includes per-habit journaling in MVP, including the explicitly requested intentional re-render bug on journal typing.

## Existing Codebase Notes (Read-Only Findings)

- Current app already has habit add/delete, daily checkbox, streak calculation, localStorage persistence, progress bar/chip, and a detail modal in `src/main.js`.
- `src/main.js` currently contains duplicated blocks of core logic; this increases regression risk and should be normalized during implementation.
- Storage key already uses versioning (`habit_tracker_v1`), but current model does not include milestone badge state, explicit missed-day records, archive state, or journal entries.
- UI scaffold in `index.html` and `src/style.css` is Material-inspired and responsive baseline exists; feature-specific sections for badges, milestone progress, archive, and journaling are not yet present.
- Test command is available (`pnpm run test`), but no MVP logic tests are currently visible.

## Hard Constraints

- No backend, auth, or cloud sync.
- Must block future-date check-ins.
- Missed day must reset streak.
- Milestones fixed at 3, 7, 30, 60.
- At 60 consecutive clean days, habit is marked broken and archived.
- Local storage persistence must survive reload/restart with defensive parsing.
- Maintain responsive desktop/mobile behavior.

## Risks and Mitigations

- Risk: Date edge cases (timezone/day rollover) can create false streak resets.
  Mitigation: Centralize date key generation and compare using normalized local day keys only.
- Risk: Duplicate logic in `src/main.js` can cause behavior drift when adding new rules.
  Mitigation: Consolidate to single source of truth functions before extending feature logic.
- Risk: Intentional journal re-render bug may accidentally affect non-journal interactions.
  Mitigation: Scope bug trigger to journal input handler only and document it clearly in code comments and test notes.
- Risk: Auto-marking missed days at local day end can be inconsistent if app is closed.
  Mitigation: Reconcile missed statuses on next app load/open by inspecting day gaps.

## Task 1: Establish Habit Domain Model and Safe Persistence

**Description:** Define and normalize the habit data model to support clean/missed day states, badges, archive status, and journal entries while preserving backward compatibility with existing localStorage data.

**Acceptance criteria:**

- [ ] Storage schema includes fields for `statusByDate` (or equivalent), `streak`, `badgesUnlocked`, `isBroken`, `archivedAt`, and `journalEntries`.
- [ ] Existing stored data from current app loads safely and migrates to the new schema defaults without runtime errors.
- [ ] Malformed storage payloads recover to safe defaults without crashing.

**Verification:**

- [ ] Tests pass: `pnpm run test`
- [ ] Build succeeds: `pnpm run build`
- [ ] Manual check: Refresh and restart browser; habits still load and app remains functional after injecting malformed storage JSON.

**Dependencies:** None

**Files likely touched:**

- `src/main.js`

**Estimated scope:** Small: 1-2 files

## Task 2: Implement Strict Daily Accountability Engine

**Description:** Implement date validation and streak/miss computation rules, including blocking future check-ins and enforcing streak reset for missed days with local day-end reconciliation.

**Acceptance criteria:**

- [ ] Future-date check-ins are rejected by logic and blocked in UI flows.
- [ ] Consecutive clean days increment streak only when no missed day exists in between.
- [ ] Missed day resets streak to 0 and is reflected consistently after reload.

**Verification:**

- [ ] Tests pass: `pnpm run test`
- [ ] Build succeeds: `pnpm run build`
- [ ] Manual check: Simulate consecutive clean days then mark/trigger missed day and confirm streak reset + persistence.

**Dependencies:** 1

**Files likely touched:**

- `src/main.js`
- `src/main.test.js`

**Estimated scope:** Medium: 3-5 files

## Task 3: Deliver Habit Progress Slice (Milestones + 60-Day Archive)

**Description:** Add milestone unlocking and progress signaling per habit (current streak, next milestone, progress to 60), then archive habits once they reach 60 consecutive clean days.

**Acceptance criteria:**

- [ ] Badges unlock exactly at 3, 7, 30, and 60 clean-day streak thresholds per habit.
- [ ] Each habit displays current streak, next milestone, and progress toward 60.
- [ ] At 60 consecutive clean days, habit is marked broken and moved to archived state.

**Verification:**

- [ ] Tests pass: `pnpm run test`
- [ ] Build succeeds: `pnpm run build`
- [ ] Manual check: Walk one habit through threshold values and confirm archive transition at day 60.

**Dependencies:** 2

**Files likely touched:**

- `src/main.js`
- `index.html`
- `src/style.css`
- `src/main.test.js`

**Estimated scope:** Medium: 3-5 files

## Checkpoint: After Tasks 1–3

- [ ] All tests pass
- [ ] Application builds without errors
- [ ] Core flow works end-to-end: create habit, check in clean days, unlock milestones, archive at 60

## Task 4: Add Journal Feature in Habit Detail (with Requested Intentional Bug)

**Description:** Add per-habit journaling UI and persistence in the detail modal, including the explicit MVP request to trigger full re-render on each typed character in journal input.

**Acceptance criteria:**

- [ ] User can add/edit journal text for a selected habit day and data persists locally.
- [ ] Journal field interactions are accessible via keyboard and visible in mobile/desktop layouts.
- [ ] Typing one character in journal input triggers app re-render (intentional known bug, documented).

**Verification:**

- [ ] Tests pass: `pnpm run test`
- [ ] Build succeeds: `pnpm run build`
- [ ] Manual check: Type in journal, observe immediate re-render behavior, reload and confirm saved journal content.

**Dependencies:** 1, 2

**Files likely touched:**

- `index.html`
- `src/main.js`
- `src/style.css`

**Estimated scope:** Medium: 3-5 files

## Task 5: Complete Responsive UI and Rule Clarity Copy

**Description:** Update layout/components/copy so accountability rules are explicit in interface text, while preserving smooth Material Design 3-inspired interactions across desktop and mobile.

**Acceptance criteria:**

- [ ] UI clearly communicates strict rules: missed day resets streak, future-date check-ins are blocked, 60-day archive behavior.
- [ ] Habit list, detail modal, badges, and progress elements remain usable at common mobile widths.
- [ ] Focus states and control labels remain keyboard-reachable and readable.

**Verification:**

- [ ] Tests pass: `pnpm run test`
- [ ] Build succeeds: `pnpm run build`
- [ ] Manual check: Verify complete flow on desktop and a narrow mobile viewport without layout breakage.

**Dependencies:** 3, 4

**Files likely touched:**

- `index.html`
- `src/style.css`
- `src/main.js`

**Estimated scope:** Medium: 3-5 files

## Task 6: Add/Strengthen Logic Tests for Core Rules

**Description:** Create or expand Vitest coverage for streak math, missed resets, milestone unlock thresholds, future-date blocking, archive at 60, and journal persistence assumptions.

**Acceptance criteria:**

- [ ] Tests cover streak increment, reset-on-miss, and exact badge thresholds (3/7/30/60).
- [ ] Tests verify future-date check-ins are blocked and 60-day transition archives habit.
- [ ] Tests include journal persistence behavior and documented intentional re-render trigger assumptions where feasible.

**Verification:**

- [ ] Tests pass: `pnpm run test`
- [ ] Build succeeds: `pnpm run build`
- [ ] Manual check: Run targeted scenarios from spec and confirm no console errors during core flows.

**Dependencies:** 2, 3, 4

**Files likely touched:**

- `src/main.test.js`
- `src/main.js`

**Estimated scope:** Small: 1-2 files

## Checkpoint: After Tasks 4–6

- [ ] All tests pass
- [ ] Application builds without errors
- [ ] Journal flow, milestone flow, and archive flow validated on desktop and mobile widths

## Task 7: MVP Final Verification and Regression Pass

**Description:** Execute the full required manual scenarios from the spec, resolve regressions, and ensure release readiness with local-first persistence and smooth UX.

**Acceptance criteria:**

- [ ] All required manual scenarios in spec pass end-to-end.
- [ ] No console errors appear during core usage paths.
- [ ] Build and test commands complete successfully on final code.

**Verification:**

- [ ] Tests pass: `pnpm run test`
- [ ] Build succeeds: `pnpm run build`
- [ ] Manual check: Execute all 7 manual verification operations listed in the spec.

**Dependencies:** 5, 6

**Files likely touched:**

- `src/main.js`
- `src/style.css`
- `index.html`
- `src/main.test.js`

**Estimated scope:** Medium: 3-5 files

## Checkpoint: After Tasks 7–7

- [ ] All tests pass
- [ ] Application builds without errors
- [ ] MVP definition of done confirmed against spec checklist

## Open Questions to Confirm Before Implementation

- Should archived (broken) habits remain visible in a separate archived section by default, or behind a collapsed toggle?
- For journaling, is one entry per day per habit required, or should free-form rolling notes per habit be allowed in MVP?
- The intentional journal re-render bug is included per spec note; confirm this should remain in deliverable branch or only in a demo/testing branch.
