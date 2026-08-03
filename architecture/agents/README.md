# Контракты ролей

Манифест и TOML-файлы ролей — единственный источник runtime-инструкций.
`template/` содержит старую версию только для исторической сверки.

Каждый межагентный запрос или результат — handoff. Его обязательные поля:
`id`, `type` (`task`, `report`, `research` или `FYI`), `from`, `to`, `title`.
`task_section`, `description` и `acceptance_criteria` опциональны.

Generated-файлы (`AGENTS.md`, `.codex/`) не редактируются вручную:

```bash
bash architecture/agents/adapt.sh --adapter=codex --force
```
