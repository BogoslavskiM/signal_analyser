# Workflow skills

Каждый skill хранится в формате Engee MCP:

```text
<role>/<skill-name>/
  manifest.yaml
  SKILL.md
  reference/       # только при наличии справок, примеров или шаблонов
```

У каждой роли есть обязательный workflow skill. Он читает
`requested_skills`, выбирает дополнительные trigger-matched subskills и
фиксирует реально использованные skills в report handoff. Нерелевантные skills
не загружаются «на всякий случай», а ни один skill не расширяет ownership.

Минимальные группы:

- `orchestrator/` — intake, task separation, review, reporting;
- `backender/` — backend architecture, API contract, math, implementation;
- `designer/` — visual system, composition, native templates, local prototype
  and versioned design delivery;
- `frontend/` — production modules, API/state integration and pinned design
  implementation;
- `tester/` — backend unit/API и frontend static/behavior regression;
- `matlab-researcher/` — browser/docs/clicker research и evidence-backed
  critical scenario coverage;
- `engee-user/` — required functionality analysis, persistent Engee contract
  tests, localization и bug evidence;
- `e2e/` — browser regression scenarios, overlay-stack/visual evidence и
  runtime reports;
- `devops/` — repository lifecycle, Engee-only production deployment,
  sanitized diagnostics в `architecture/logs/**` и узкая post-readiness
  синхронизация Engee `Project.toml` + `Manifest.toml`.

Каждый `manifest.yaml` использует schema 1 из `engee_skill_create` и содержит
только поля этой схемы. Имя совпадает с именем папки, версия хранится только в
manifest, а `SKILL.md` начинается сразу с заголовка без YAML-frontmatter.

Каждый файл из `reference/` перечисляется в `reference-files`; неиспользуемые
справки и дублирующие templates не хранятся. Межскилловые зависимости задаются
workflow-router и role catalog, а не дополнительными полями manifest.
