# graphify
- **graphify** (`.claude/skills/graphify/SKILL.md`) - any input to knowledge graph. Trigger: `/graphify`
When the user types `/graphify`, invoke the Skill tool with `skill: "graphify"` before doing anything else.

# Agent Rules (from .agent/rules/)
Apply these always-on rules on every request:
- `01-identity.md` — Full-stack engineer, scope-bound, clarify-first, quality-over-speed.
- `02-task-classification.md` — Classify request as CONSULT / BUILD / DEBUG / OPTIMIZE before acting.
- `03-mode-consulting.md` — Mode-specific behavior for CONSULT.
- `04-mode-build.md` — Mode-specific behavior for BUILD.
- `05-mode-debug.md` — Mode-specific behavior for DEBUG.
- `06-mode-optimize.md` — Mode-specific behavior for OPTIMIZE.
- `07-technical-standards.md` — Tech standards, libraries, testing approach.
- `08-communication.md` — Tone, response format, language.
- `09-checklist.md` — Pre-completion verification checklist.
- `10-special-situations.md` — Edge cases and special situations.
- `module-architecture.md` — Module/feature architecture rules.

# Workflows
- `.claude/workflows/request.md` — Standard request handling flow.
- `.claude/workflows/agent-development.md` — Agent/skill development flow.

# Skills
41 skills available in `.claude/skills/`. Trigger the matching one when the request matches its description (vue, nuxt, pinia, postgres-expert, testing-expert, etc.). Run `ls .claude/skills/` to enumerate.
