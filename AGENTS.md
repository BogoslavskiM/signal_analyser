# Generated Agent Instructions

Generated from `architecture/agents/`.

Do not edit generated adapter files by hand. Update `architecture/agents/`
and rerun:

```bash
bash architecture/agents/adapt.sh --adapter=codex
```

## Source Of Truth

- Manifest: `architecture/agents/manifest.toml`
- Roles: `architecture/agents/roles/*.toml`
- Adapter renderer: `architecture/agents/adapt.sh --adapter=codex`
- Documentation: `architecture/documentation/`
- Skills: `architecture/skills/`

## Bootstrap

- Read architecture/agents/manifest.toml.
- Read the active role file from architecture/agents/roles/*.toml.
- Treat architecture/ as source of truth.
- Do not edit outside the active role owns paths.
- Return a structured handoff with goal, scope, contracts, changes,
  verification, risks, and follow-ups instead of crossing role boundaries.
- Only Architect persists role handoffs and continuous task/report/backlog
  memory under architecture/documentation/.

## Workflow

- Lead role: `architect`
- Reporting: `chat-first`
- Handoff policy: `handoff-instead-of-crossing-boundaries`
- Strict boundaries: `true`

## Agent Identity

- Every status and handoff starts with `ROLE: <canonical role label>`.
- Refer to participants only by canonical role label plus agent ID/session.
- Never use runtime-generated random nicknames as participant identity.

## Roles

| Role | Model level | Resolved model | Owns | Read-only | Forbidden |
| --- | --- | --- | --- | --- | --- |
| `architect` | `high` | `gpt-5.6-sol` | ["architecture/**", "docs/**", "AGENTS.md", "CLAUDE.md", ".codex/**", ".claude/**", ".cursor/**", ".windsurf/**", ".clinerules/**", ".roo/**", ".gemini/**", "GEMINI.md", "README.md"] | [] | ["app/**", "lib/**", "public/**", "test/back/**", "test/engee/**", "test/front/**", "test/playwright/**"] |
| `backend` | `high` | `gpt-5.6-sol` | ["app/**", "lib/**", "app.jl", "run.jl", "config/**"] | ["public/js/api.js", "Project.toml", "README.md", "architecture/**"] | ["public/**", "test/**", "test/playwright/**", "architecture/**", "AGENTS.md", "CLAUDE.md", ".codex/**", ".claude/**", ".cursor/**", ".windsurf/**", ".clinerules/**", ".roo/**", ".gemini/**", "GEMINI.md"] |
| `frontend` | `medium` | `gpt-5.6-terra` | ["public/js/**", "public/css/**", "public/html/**", "public/index.html", "public/icons/**", "public/fonts/**"] | ["AGENTS.md", "architecture/**"] | ["app/**", "lib/**", "test/**", "test/playwright/**", "architecture/**", ".codex/**", ".claude/**", ".cursor/**", ".windsurf/**", ".clinerules/**", ".roo/**", ".gemini/**", "GEMINI.md"] |
| `tester` | `medium` | `gpt-5.6-terra` | ["test/back/**", "test/engee/**", "test/front/**"] | ["AGENTS.md", "architecture/**"] | ["app/**", "lib/**", "public/**", "test/playwright/**", "architecture/**", ".codex/**", ".claude/**", ".cursor/**", ".windsurf/**", ".clinerules/**", ".roo/**", ".gemini/**", "GEMINI.md"] |
| `e2e_tester` | `medium` | `gpt-5.6-terra` | ["test/playwright/**"] | ["AGENTS.md", "architecture/**"] | ["app/**", "lib/**", "public/**", "test/back/**", "test/engee/**", "test/front/**", "architecture/**", ".codex/**", ".claude/**", ".cursor/**", ".windsurf/**", ".clinerules/**", ".roo/**", ".gemini/**", "GEMINI.md"] |
| `devops` | `medium` | `gpt-5.6-terra` | [] | ["**"] | ["app/**", "lib/**", "public/**", "test/**", "architecture/**", "app.jl", "config/**", "Project.toml", "Manifest.toml"] |
| `matlab_researcher` | `high` | `gpt-5.6-sol` | [] | ["**"] | ["app/**", "lib/**", "public/**", "test/**", "architecture/**", "app.jl", "config/**", "Project.toml", "Manifest.toml"] |

## Verification Commands

- `julia --startup-file=no -e 'for file in ARGS; Meta.parseall(read(file, String)); println(file); end' <files>`
- `julia --project=. test/back/runtests.jl`
- `julia --startup-file=no test/engee/engee_package_contract_tests.jl`
- `node test/front/run_front_tests.js`
- `./test/playwright/run_devhub_playwright_tests.sh`
