# Spec: Anti-Bad-Habit Tracker MVP

## Objective

Build a single-user habit interruption tracker that helps the user eliminate one bad habit through strict daily accountability and a motivating interface.

The product must provide a clear daily decision (clean vs. not clean), visible streak progress, lightweight journaling, and a daily in-app reminder at 10:00 AM.

### Success Criteria

- The app records one explicit daily status per day: `clean` or `not_clean`.
- Streak logic is strict: any `not_clean` day breaks the streak and resets current streak progression toward 60 days.
- The user can see current streak and progress to a 60-day goal at all times.
- Journal entries can be written and persisted per day.
- The app shows an in-app reminder banner at 10:00 AM local time while the app is open.
- All functionality works using only Vite + HTML + CSS + JavaScript.

## Scope

### In Scope (MVP)

- Replace current visual style with a more motivating, intentional color palette.
- Daily check-in flow for one target bad habit:
  - Mark day as `clean`.
  - Mark day as `not_clean`.
- Strict streak system:
  - Consecutive `clean` days increase streak.
  - Any `not_clean` day causes streak break and restart behavior.
- 60-day goal visualization:
  - Current streak value.
  - Remaining days to goal.
  - Progress indicator/bar.
- Journal:
  - Add and edit daily journal text.
  - Persist locally.
- Reminder:
  - Fixed 10:00 AM local-time in-app banner only.
  - Reminder appears only when app is open.

### Out of Scope (MVP)

- Multi-user accounts.
- Authentication.
- Backend or cloud sync.
- Push/system notifications when browser is closed.
- Service worker or PWA requirements.
- Features requiring tech beyond Vite + HTML + CSS + JS.

### Future Phase Candidates (Not MVP)

- Multiple habits.
- Trigger analysis and relapse pattern reports.
- Export/import data.

## Agreements

1. This project remains a vanilla Vite app with no framework migration. - Yes
2. Data persistence is local-only (browser storage). - Yes
3. Timezone for streak/day boundaries is the user’s local browser timezone. - Yes
4. Reminder reliability is only guaranteed while app is open. - Yes

## Commands & Operations

### Development

- Install dependencies: `pnpm install`
- Run dev server: `pnpm run dev`
- Build production bundle: `pnpm run build`
- Preview production build: `pnpm run preview`

### Verification Operations

- Manual check: daily check-in toggles state and updates streak correctly.
- Manual check: setting a day to `not_clean` breaks streak and restarts progress.
- Manual check: journal entry persists after reload.
- Manual check: at 10:00 AM local time (or via test hook), in-app reminder banner appears.

### Deployment

- No deployment pipeline changes required in MVP.

## Project Structure

- `index.html` -> Root HTML shell and modal/root containers.
- `src/main.js` -> State model, streak logic, rendering, interactions, reminder scheduling.
- `src/style.css` -> Theme tokens, layout, component styling, motion.
- `docs/specs/` -> Specification documents.

## Code Style

- Plain ES modules in `src/main.js`.
- Keep logic in small functions with explicit names (`computeStreak`, `saveState`, `renderReminderBanner`).
- Use CSS custom properties for the new color palette and visual tokens.
- Keep semantic naming for statuses (`clean`, `not_clean`) and avoid ambiguous booleans.

Example status model:

```js
const dayRecord = {
  date: "2026-06-18",
  status: "clean", // or "not_clean"
  journal: "Handled trigger by taking a walk",
};
```

## Testing Strategy

No formal test framework is currently configured. MVP verification is manual and scenario-based.

### Required Manual Scenarios

1. Mark current day as `clean` for 3 consecutive days and confirm streak increments 1, 2, 3.
2. Mark next day as `not_clean` and confirm streak resets according to strict rule.
3. Add journal text for a day, reload page, verify text persists.
4. Verify 60-day progress indicator updates after each day status change.
5. Verify reminder banner appears at 10:00 AM local time while app is open.
6. Verify UI remains usable on desktop and mobile widths.

### Non-Functional Checks

- No console errors during normal flows.
- Color contrast remains readable in primary surfaces and buttons.
- Animations are minimal and purposeful, without blocking input.

## Boundaries

### Always Do

- Preserve Vite + HTML + CSS + JS only.
- Keep streak logic strict and deterministic.
- Persist user data locally and safely parse storage.
- Keep UI responsive for desktop and mobile.

### Ask First

- Any new dependency.
- Any change to day-boundary interpretation (timezone/day cutoff behavior).
- Any scope expansion beyond single-habit MVP.

### Never Do

- Add backend/auth infrastructure in MVP.
- Claim reminders work when browser is closed.
- Introduce service worker/PWA dependencies for this phase.
- Weaken strict streak reset rule.

## Definition of Done

MVP is complete when:

- All in-scope features are implemented and manually verified.
- Strict 60-day rule behavior is correct and documented in UI copy.
- Reminder banner appears at 10:00 AM while app is open.
- Final interface uses updated motivating palette and remains clear on mobile/desktop.

## Open Questions

- Should users be allowed to edit historical day statuses after they are set? - Yes
- Should missed days default to `not_clean` or remain explicitly unset until user confirms? - default to `not_clean`
- Should journal entries be required, optional, or prompted only after `not_clean` days? - optional
