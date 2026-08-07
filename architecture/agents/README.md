# Контракты ролей

Манифест и TOML-файлы ролей — единственный источник runtime-инструкций.
`architecture_0/` и `architecture_1/` содержат архивы только для исторической
сверки.

Каждый межагентный запрос или результат — handoff. Его обязательные поля:
`id`, `type` (`task`, `report`, `research`, `FYI`, `deployment_failure` или
design type), `from`, `to`, `title`.
`task_section`, `description`, `acceptance_criteria`, `requested_skills`,
`applied_skills`, `skipped_requested_skills`, versioned design fields и
diagnostic/log refs опциональны. Для `deployment_failure` обязательны exact
revision, evidence-based `failure_owner`, `diagnosis_ref` и `log_refs` либо
явный статус недоступности evidence.

Generated-файлы (`AGENTS.md`, `.codex/`) не редактируются вручную:

```bash
bash architecture/agents/adapt.sh --adapter=codex --force
```
