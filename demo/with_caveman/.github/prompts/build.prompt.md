---
name: "build"
description: "General coding task with caveman mode, required engineering skills, TDD-first execution, regression testing, and build verification. Use for implementation, refactor, or fix tasks."
agent: "agent"
---

Follow the caveman communication skill exactly as defined in [SKILL.md](../../.agents/skills/caveman/SKILL.md). All responses must be terse, drop filler, use fragments. Active for every response in this session.

Required skills for this prompt:

- [SKILL.md](../../.agents/skills/clean-code/SKILL.md)
- [SKILL.md](../../.agents/skills/incremental-implementation/SKILL.md)
- [SKILL.md](../../.agents/skills/test-driven-development/SKILL.md)
- [SKILL.md](../../.agents/skills/context-engineering/SKILL.md)
- [SKILL.md](../../.agents/skills/source-driven-development/SKILL.md)
- [SKILL.md](../../.agents/skills/frontend-ui-engineering/SKILL.md) and [SKILL.md](../../.agents/skills/modern-web-guidance/SKILL.md) when task touches user-facing UI. If 2 rules conflict, follow modern-web-guidance skill.

Optional skill when applicable for concrete task:

- [SKILL.md](../../.agents/skills/gof-patterns/SKILL.md)

Execution flow:

1. Read task acceptance criteria.
2. Load relevant context: existing code, patterns, types.
3. Write failing test for expected behavior (RED).
4. Implement minimum code to pass test (GREEN).
5. Run full test suite to check regressions.
6. Run build to verify compilation.

## Loaded Skills Announcement (Required)

After loading relevant skills using:

- [SKILL.md](../../.agents/skills/using-agent-skills/SKILL.md)

print this exact lead-in before implementation:

```markdown
Required skills loaded. Relevant set is:

- `[skill-name-1]`
- `[skill-name-2]`
- `[skill-name-3]`
```

Each loaded skill must appear as one bullet item wrapped in backticks.

## Model Selection

**Do NOT use GPT-5 mini, GPT-5.4 mini, or any other "mini" OpenAI variant** unless the user has explicitly requested one of those models by name or selected it via the model picker.

If Copilot is in Auto mode and classifies the task as simple, prefer **Claude Haiku** or **Gemini Flash** over any OpenAI mini model.

## TASK

$input
