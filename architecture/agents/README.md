# Контракты ролей

Манифест и TOML-файлы ролей — единственный источник runtime-инструкций.
`architecture_0/` и `architecture_1/` содержат архивы только для исторической
сверки.

Каждый межагентный запрос или результат — handoff. Его обязательные поля:
`id`, `type` (`task`, `report`, `research` или `FYI`), `from`, `to`, `title`.
`task_section`, `description`, `acceptance_criteria`, `requested_skills`,
`applied_skills` и `skipped_requested_skills` опциональны.

Generated-файлы (`AGENTS.md`, `.codex/`) не редактируются вручную:

```bash
bash architecture/agents/adapt.sh --adapter=codex --force
```
