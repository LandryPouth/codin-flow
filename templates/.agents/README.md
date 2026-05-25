# Coding Flow Agent Skills

This directory mirrors `.claude/skills/` for Codex and other agents that do not automatically discover Claude Code project skills.

The mirror is intentionally physical rather than a symlink for compatibility with Windows, npm packages, archives, CI, and agents that do not follow symbolic links.

Useful commands:

```bash
ai-flow doctor
ai-flow doctor --fix
ai-flow list-skills
```

Rules:

- Treat `.claude/skills/` as the primary installed skill source.
- Keep `.agents/skills/` synchronized through `ai-flow doctor --fix`.
- Do not manually edit only one side of the mirror.
- Read `../AGENTS.md`, `../PROJECT_RULES.md`, and `../AGENT_RULES.md` before implementation work.
