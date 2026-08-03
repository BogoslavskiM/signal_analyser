# Workflow skills

Каждый skill хранится в формате Engee MCP:

```text
<role>/<skill-name>/
  manifest.yaml
  SKILL.md
```

У каждой роли есть обязательный workflow skill. Для роли с независимыми
режимами role-инструкция выбирает один обязательный mode skill. Затем перед
каждым этапом агент читает соответствующий stage skill и фиксирует его
применение в TS/handoff.

Минимальные группы:

- `orchestrator/` — intake, task separation, review, reporting;
- `backender/` — backend architecture, API contract, math, implementation;
- `frontend/` — zoning, API connection, styling;
- `tester/` — unit, contract, regression;
- `matlab-researcher/` — browser/docs/clicker research;
- `engee-user/` — function analysis and deployment;
- `e2e/` — feature scenario and runtime report.

Каждый `manifest.yaml` обязан использовать schema 2 и хранить версию только в
manifest. Frontmatter `SKILL.md` содержит только `name`.
