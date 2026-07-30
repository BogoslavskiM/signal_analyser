---
name: integration-review
version: 0.1.0
---
# Integration Review

## When to Use
- Изменение затронуло несколько ролей, workflow rules или архитектурные файлы.
- Файлы переносились между папками, менялись команды запуска или ownership.
- Нужно завершить cross-role работу без потери verification evidence.

## When NOT to Use
- Нужно реализовать продуктовую деталь внутри backend/frontend/tester зоны.
- Изменение локальное и уже проверяется role-specific skill.

## Workflow
1. Прочитай `architecture/agents/manifest.toml` и затронутые role-файлы.
2. Проверь, что каждый изменённый путь принадлежит ожидаемому owner.
3. Проверь, что переносы файлов обновили команды, ссылки и документацию.
4. Проверь, что skills лежат в формате `manifest.yaml` + `SKILL.md`.
5. Запусти parse/validation для изменённых TOML, Julia, shell или markdown-файлов, если применимо.
6. Зафиксируй оставшиеся risks и handoff.

## Guardrails
- Не исправляй продуктовую реализацию вместо владельца роли.
- Не скрывай чужие незавершённые изменения в git status.
- Не считай задачу завершённой, если старые ссылки указывают на удалённые пути.

## Reference
- `architecture/agents/manifest.toml`
- `architecture/agents/roles/*.toml`
- `architect/agent-handoff-plan`
