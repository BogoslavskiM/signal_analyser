---
name: orchestrator-workflow
---
# Orchestrator Workflow

Обязательный workflow Orchestrator: прямой user request проходит user-intake
один раз; затем все последующие циклы берут работу только из unified task
registry через backlogging. Далее: выбор queued task → model selection →
декомпозиция → numbered handoffs → review отчётов → закрытие task → E2E
handoff → review E2E report → user report → backlogging → новая разработка.
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
- Engee User получает только Engee function comparison и bug evidence.
- E2E получает отдельный regression handoff после каждой завершённой task,
  `analysis_regression` при переходе к пустому actionable backlog и все явно
  запрошенные deployment handoff.

Если результат требует изменения в нескольких ownership-зонах, Orchestrator
создаёт отдельные handoff для владельцев и явно фиксирует контракт между ними.
Пограничные вопросы решаются по месту изменения authoritative behavior:
backend для source of truth и API, frontend для presentation and interaction.

## Обязательный E2E dispatch

Сразу после перевода task в `done` создай и отправь один E2E handoff с
глобальным `type: task`. Не создавай отдельную registry task только ради этого
запуска: свяжи handoff с завершённой task, чтобы E2E-проверка не порождала
бесконечную цепочку post-task запусков.

Перед dispatch проверь `related_handoffs` завершённой task. После dispatch
добавь туда E2E handoff ID; наличие post-task E2E handoff для этой task
запрещает повторную автоматическую отправку того же gate.

- Для новой пользовательской функциональности выбери
  `e2e_mode: new_functionality_regression`. Этот режим включает написание
  новых E2E tests и обязательный quick regression.
- Для любой другой завершённой task выбери
  `e2e_mode: quick_regression`.
- Укажи production target link. Если runnable target отсутствует, всё равно
  отправь handoff с явным `target_status: unavailable`; E2E обязан вернуть
  blocker report без devhub/fallback.

Новой пользовательской функциональностью считается task, acceptance criteria
которой добавляют новый наблюдаемый пользователем workflow или действие. Чистая
архитектура, refactor, docs, test-only и bugfix tasks используют quick mode.
Первая строка regression handoff — точный `e2e_mode`; далее укажи
`trigger_task`, `target_status`, `target_link` и planned scope.

Quick regression считается operational при `success_rate >= 75%`, где
`success_rate = passed / planned * 100`. Failed, skipped, timed-out и not-run
planned checks не входят в passed. Доступность приложения обязательна даже при
формальном проценте выше порога. Результат ниже 75% или недоступность runtime
порождает follow-up functional task; результат выше порога не стирает
оставшиеся findings.

Если backlogging подтверждает, что нет открытых actionable backlog items,
`queued` или `in_progress` work, один раз отправь
`e2e_mode: analysis_regression`. Повторяй idle-анализ только после следующей
завершённой task, материального изменения backlog или явного запроса
пользователя.

После analysis report:

1. дождись, пока E2E исправит test-owned defects в `test/playwright/**` и
   повторит suite;
2. если после исправления тестов остаются runtime/product failures, создай
   role-owned functional-fix tasks и handoffs;
3. если все tests зелёные, но есть подтверждённые slow paths, создай
   optimization tasks и handoffs;
4. если tests зелёные и performance findings нет, зафиксируй clean report.

Task со статусом `done` не открывается заново по E2E finding: исправление
всегда получает новую task и новый handoff.

## Deployment routing

Все роли адресуют deployment только E2E. Orchestrator сохраняет отдельный
`type: task` handoff с явным deployment mode, production target и точным
списком выбранных файлов. Deployment нельзя объединять с E2E regression,
запускать автоматически после tests или направлять Engee User. E2E применяет
`e2e/genie-deploy` и возвращает отдельный deployment report.
Первая строка deployment handoff — `e2e_action: deployment`; поле
`e2e_mode` в нём не используется.

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
