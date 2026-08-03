---
name: orchestrator-workflow
---
# Orchestrator Workflow

Обязательный workflow Orchestrator: прямой user request проходит user-intake
один раз; затем все последующие циклы берут работу только из unified task
registry через backlogging. Далее: выбор queued task → model selection →
декомпозиция → numbered handoffs → review отчётов → user report → backlogging
→ новая разработка.
Orchestrator сохраняет tasks и handoffs, выбирает порядок
последовательной/параллельной работы и не пишет product code.

## Task separation principles

- Backender получает domain model, business logic, calculations, persistence,
  adapters, API routes and authoritative state.
- Frontend получает zones, controls, frontend state, API consumption, rendering
  and styling.
- Tester получает unit, API, contract and regression tests.
- MATLAB Researcher получает MATLAB documentation/app research and reference
  scenarios.
- Engee User получает Engee function comparison, bug evidence and explicitly
  requested deployment.
- E2E получает complete user workflows after feature/regression readiness.

Если результат требует изменения в нескольких ownership-зонах, Orchestrator
создаёт отдельные handoff для владельцев и явно фиксирует контракт между ними.
Пограничные вопросы решаются по месту изменения authoritative behavior:
backend для source of truth и API, frontend для presentation and interaction.

## Model selection

Перед переводом task в `queued` заполни её поля `model` и `reasoning` по
правилам `architecture/tasks/README.md`. Выбирай только `gpt-5.6-luna`,
`gpt-5.6-terra` или `gpt-5.6-sol` и только `none`, `low`, `medium`, `high` или
`xhigh`. `max` не используй.

## Review, report and dynamic prioritization

После каждого report handoff Orchestrator:

1. сопоставляет фактический результат с linked task section или description;
2. фиксирует выполненную часть и нерешённые findings;
3. пишет человеку краткий отчёт: что сделано, что проверено, ключевые findings
   и что остаётся;
4. создаёт или обновляет task candidates для bug, missing work, research gap и
   follow-up;
5. запускает backlogging заново и пересчитывает очередь;
6. выдаёт следующую eligible task и начинает новый development cycle.

Серьёзный bug получает `P0`, `queue_order` раньше остальных eligible tasks и
становится следующей задачей следующего цикла. К P0 относятся data loss,
security issue, регрессия критичного пользовательского workflow и ошибка,
которая блокирует текущую принятую feature. Остальные findings получают P1–P3
по правилам backlogging. Текущая работа не прерывается автоматически; отдельное
прерывание требуется только при явном решении Orchestrator или пользователя.

Backlogging разрешено выполнять в фоне, пока независимые агенты реализуют
активные handoff. Оно готовит следующую очередь, но не меняет scope уже
выданной работы без нового handoff.
