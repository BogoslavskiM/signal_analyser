# Workflow skills

Каждый skill хранится в формате Engee MCP:

```text
<role>/<skill-name>/
  manifest.yaml
  SKILL.md
```

У каждой роли есть обязательный workflow skill. Он читает
`requested_skills`, выбирает дополнительные trigger-matched subskills и
фиксирует реально использованные skills в report handoff. Нерелевантные skills
не загружаются «на всякий случай», а ни один skill не расширяет ownership.

Минимальные группы:

- `orchestrator/` — intake, task separation, review, reporting;
- `backender/` — backend architecture, API contract, math, implementation;
- `frontend/` — zoning, API connection, styling;
- `tester/` — backend unit/API и frontend static/behavior regression;
- `matlab-researcher/` — browser/docs/clicker research и evidence-backed
  critical scenario coverage;
- `engee-user/` — required functionality analysis, persistent Engee contract
  tests, localization и bug evidence;
- `e2e/` — browser regression scenarios, visual evidence и runtime reports;
- `devops/` — repository lifecycle и explicit production deployment.

Каждый `manifest.yaml` обязан использовать schema 2 и хранить версию только в
manifest. Frontmatter `SKILL.md` содержит только `name`.
