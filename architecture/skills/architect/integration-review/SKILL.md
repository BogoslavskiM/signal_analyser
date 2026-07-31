---
name: integration-review
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
4. Проверь каталог skills штатным валидатором:
   `ruby architecture/skills/validate_skills.rb`. Он подтверждает schema 2,
   `requires-skills`, единственный источник версии в manifest и stable optional
   capability ids.
5. Проверь, что каждый `requires-skills` подключает только core contract
   зависимости. Optional capabilities зависимости включаются отдельно и явно.
6. Если менялись bundled frontend assets, запусти
   `node architecture/skills/frontend/validate_vanilla_assets.js`.
7. Запусти parse/validation для изменённых TOML, Julia, shell или markdown-файлов, если применимо.
8. Зафиксируй оставшиеся risks и handoff.

## Guardrails
- Не исправляй продуктовую реализацию вместо владельца роли.
- Не скрывай чужие незавершённые изменения в git status.
- Не считай задачу завершённой, если старые ссылки указывают на удалённые пути.
- Не считай asset пригодным для копирования, если его validator противоречит
  действующему core contract скилла.

## Reference
- `architecture/agents/manifest.toml`
- `architecture/agents/roles/*.toml`
- `architect/agent-handoff-plan`
