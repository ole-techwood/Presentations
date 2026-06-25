# Spec: Anti-Bad-Habit Tracker

## Objective

Build a single-user, responsive web tracker that helps the user break bad habits through strict daily accountability, clear progress signaling, and motivating rewards.

### Problem Statement

The user already knows which habits to stop, but lacks daily consistency and immediate, legible progress feedback.

### Target User

- Primary user: one individual (the owner of the app)
- No team or shared usage in MVP

### Success Criteria

The MVP is successful when all criteria below are true:

1. The user can add habits and perform daily check-ins in under 60 seconds for a typical day.
2. Each habit has a visible streak counter that increases only for consecutive clean days.
3. The app unlocks milestone badges at 3, 7, 30, and 60 consecutive clean days per habit.
4. Any missed day resets that habit's streak.
5. Future dates cannot be checked in.
6. At 60 consecutive clean days, the habit is marked as "broken".
7. Data persists locally after page refresh and browser restart.
8. Interface is responsive and usable on both desktop and mobile.

## Scope

### In Scope (MVP)

1. Responsive web interface (desktop + mobile) using vanilla Vite app structure.
2. Material Design 3-inspired visual system:
   - modern, smooth, animated interactions
   - clear hierarchy and progress feedback
3. Habit CRUD (at minimum create and delete; edit is optional in MVP if schedule risk appears).
4. Daily check-in model per habit:
   - clean day
   - missed/not clean day
5. Strict streak logic:
   - consecutive clean days increment streak
   - missed day resets streak
6. Milestone rewards:
   - badge unlocks at 3, 7, 30, 60 days
   - per-habit badge state
7. 60-day completion rule:
   - at 60 consecutive clean days, mark habit as broken
8. Progress visibility:
   - current streak
   - next milestone
   - overall progression to 60
9. Local-first persistence (browser storage only).

### Out of Scope (MVP)

1. Login, account system, or multi-user support.
2. Cloud sync or backend persistence.
3. Server-side analytics.
4. Native mobile apps.
5. Future-date backfilling or future-date check-ins.

### Phase 2 Candidates (Not in MVP)

1. Optional reminders/notifications.
2. History insights and relapse pattern analysis.
3. Export/import backups.
4. Cross-device sync.

## Commands & Operations

### Development Commands

- Install dependencies: `pnpm install`
- Start dev server: `pnpm run dev`
- Build production bundle: `pnpm run build`
- Preview production build: `pnpm run preview`
- Run tests: `pnpm run test`

### Manual Verification Operations

1. Create one habit and confirm it appears immediately.
2. Mark 3 consecutive clean days and confirm 3-day badge unlock.
3. Continue to 7 days and confirm 7-day badge unlock.
4. Mark a missed day and confirm streak resets to 0 for that habit.
5. Try setting a future date and confirm the UI blocks the action.
6. Reload page and restart browser; confirm data remains.
7. Validate behavior on mobile and desktop widths.

### Data/State Operations

1. Persist all app state in browser local storage.
2. Parse storage defensively and recover to safe defaults on malformed data.
3. Version the storage schema key to allow safe future migration.

## Project Structure

- `index.html` -> app shell and root containers
- `src/main.js` -> state model, streak engine, rendering, interactions
- `src/style.css` -> Material 3-inspired tokens, components, motion, responsive rules
- `docs/specs/` -> specifications
- `docs/plans/` -> implementation plans

## Code Style

1. Keep logic split into focused functions (`computeStreak`, `canCheckInDate`, `unlockBadges`, `saveState`).
2. Use semantic statuses (`clean`, `missed`) instead of ambiguous booleans.
3. Use CSS custom properties for color, spacing, motion, and elevation tokens.
4. Keep animation purposeful and lightweight (no interaction-blocking transitions).
5. Maintain accessibility basics: visible focus states, readable contrast, keyboard-reachable controls.

## Testing Strategy

### Test Levels

1. Manual scenario tests are required for MVP completion.
2. Optional lightweight unit tests in Vitest for streak and badge logic are encouraged.

### Required Manual Scenarios

1. Streak increments only on consecutive clean days.
2. Missed day always resets streak.
3. Badges unlock exactly at 3/7/30/60 and not earlier.
4. 60-day state marks habit as broken.
5. Future-date check-ins are blocked.
6. Local storage survives reload/reopen.

### Quality Gates

1. `pnpm run build` must succeed.
2. No console errors during core flows.
3. Core flows remain smooth on common mobile viewport widths.

## Boundaries

### Always Do

1. Keep implementation as responsive web app (desktop + mobile).
2. Keep data local-first with no login dependency.
3. Enforce strict streak reset on missed day.
4. Prevent future-date check-ins.
5. Preserve milestone system (3, 7, 30, 60) and 60-day break rule.

### Ask First

1. Any new package dependency.
2. Any scope expansion into auth, backend, or cloud sync.
3. Any rule changes to streak reset or milestone thresholds.
4. Any major visual direction changes that move away from Material 3 guidance.

### Never Do

1. Add login for MVP.
2. Add backend-only required path for core functionality.
3. Allow future-date check-ins.
4. Add grace-token logic for misses in MVP.
5. Soften or bypass the missed-day reset rule.

## Definition of Done

The MVP is done when:

1. All in-scope features are implemented.
2. All required manual scenarios pass.
3. Build succeeds.
4. UX is smooth, modern, and clearly communicates progress and rewards.
5. Rules are explicit in UI copy so behavior is not ambiguous.

## Open Questions

1. Should missed days be explicitly marked by user action only, or auto-marked after local day ends? - after local day ends
2. Should a "broken habit" (60 days) remain trackable as maintenance streak or become archived? - archived
3. Should per-habit notes/journaling be added in MVP or Phase 2? - add journaling in MVP, introduce intentional bug when I type a character in ther journal, it triggers rerendering
