---
name: "repair"
description: "Debug and fix failing tests, incorrect logic behavior, and browser/runtime bugs with evidence-first workflow and regression safety checks."
argument-hint: "Describe issue, failing test, error logs, and relevant files"
agent: "agent"
---

Follow communication mode in [SKILL.md](../../.agents/skills/caveman/SKILL.md) for every response.

Before any diagnosis or fix, load and follow these skills in order:

1. [SKILL.md](../../.agents/skills/browser-testing-with-devtools/SKILL.md)
2. [SKILL.md](../../.agents/skills/debugging-and-error-recovery/SKILL.md)

Use this prompt for:

- Failing unit/integration/e2e tests
- Logic not working as expected
- Browser UI/runtime bugs (DOM, console, network, rendering, interaction)
- Regressions introduced by recent changes

## Inputs

Use available context from:

- `$input`
- Current errors from editor/test output
- Relevant files and recent diffs
- Browser/runtime evidence when issue is UI/client-side

If critical context missing, ask minimal targeted questions, then continue.

## Execution Contract

Follow this process exactly.

### For new features (TDD)

1. Write tests that describe expected behavior (must fail first).
2. Implement code to make tests pass.
3. Refactor while keeping tests green.

### For bug fixes (Prove-It pattern)

1. Write test that reproduces bug (must fail).
2. Confirm test fails.
3. Implement fix.
4. Confirm test passes.
5. Run full relevant test suite for regressions.

### For unit/integration/e2e test fixes

1. Fix tests, not business logic.
2. If root cause appears in business logic, STOP and ask user permission before changing logic.
3. Do not modify business logic for test-fix task without explicit user approval.

## Browser Bug Requirements

When issue involves browser behavior:

- Reproduce in integrated browser/devtools.
- Capture evidence: console errors, network failures, DOM state, and interaction steps.
- Confirm fix in browser after code/test updates.

## Output Requirements

For each debug task, provide:

1. Root cause summary.
2. Proof of failure before fix (test/browser evidence).
3. Exact changes made.
4. Proof after fix (passing repro test + regression run).
5. Any remaining risks or follow-up checks.

## Guardrails

- Prefer smallest safe fix.
- Avoid speculative changes without reproduction.
- Keep behavior unchanged outside targeted bug/scope.
- If destructive/irreversible action needed, ask first.

## Task

$input
