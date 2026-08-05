---
name: orchestrator-workflow
---
# Orchestrator Workflow

Обязательный workflow Orchestrator: прямой user request проходит user-intake
один раз; затем все последующие циклы берут работу только из unified task
registry через backlogging. Далее: выбор queued task → model selection →
background MATLAB research → декомпозиция → numbered handoffs → review
отчётов → закрытие task → E2E
handoff → review E2E report → user report → backlogging → новая разработка.
Orchestrator сохраняет tasks и handoffs, выбирает порядок
последовательной/параллельной работы и не пишет product code.

## Task separation principles

- Backender получает domain model, business logic, calculations, persistence,
  adapters, API routes and authoritative state.
- Frontend получает zones, controls, frontend state, API consumption, rendering
  and styling.
- Tester получает backend unit/API и frontend static/behavior regression tests.
- MATLAB Researcher получает MATLAB documentation/app research and reference
  scenarios.
- Engee User получает required-functionality research, persistent Engee
  contract tests, discrepancy localization и bug evidence.
- E2E получает отдельный regression handoff после каждой завершённой task,
  а также `analysis_regression` при переходе к пустому actionable backlog.
- DevOps получает один из четырёх полных pipeline requests: первичный clone
  repository в Engee apps, новая ветка крупной feature, deploy или merge
  принятой feature в `neuro_dev`.

Если результат требует изменения в нескольких ownership-зонах, Orchestrator
создаёт отдельные handoff для владельцев и явно фиксирует контракт между ними.
Пограничные вопросы решаются по месту изменения authoritative behavior:
backend для source of truth и API, frontend для presentation and interaction.

## Subskill routing и полнота запуска

Каждый агент всегда начинает с обязательного workflow skill. В role-specific
handoff указывай только применимые `requested_skills` из `available_subskills`
получателя. Не перечисляй весь каталог на всякий случай. Агент может добавить
trigger-matched subskill самостоятельно, но обязан вернуть фактический список
в `applied_skills`; неприменимый явно запрошенный skill сопровождается причиной
в `skipped_requested_skills`.

Перед dispatch зафиксируй stage matrix задачи:

| Stage | Когда нужен | Получатель |
|---|---|---|
| MATLAB research | MATLAB-derived scope или неизвестное reference behavior | MATLAB Researcher |
| Engee functionality analysis | backend зависит от функции/контракта Engee | Engee User |
| Backend implementation | меняется authoritative state, math или API | Backender |
| Frontend implementation | меняются UI, frontend state или interaction | Frontend |
| Backend/frontend tests | меняется соответствующий product contract | Tester |
| Engee contract tests | используется или меняется Engee contract | Engee User |
| Initial Engee checkout | checkout repository отсутствует или его origin не подтверждён | DevOps `clone_repo` до deploy/update |
| Feature branch | начинается новый крупный feature-cycle | DevOps `new_feature_branch` до первой repository mutation |
| Runtime publication/deployment | E2E target должен содержать новую revision | DevOps `deploy` |
| Accepted feature integration | пользователь принял крупную feature | DevOps `merge_feature` в `neuro_dev` |
| E2E regression | post-task или idle regression trigger | E2E |

Независимые stages запускай параллельно. Зависимые stages запускай только после
получения достаточного контракта: Engee analysis до Engee-dependent backend,
backend API до зависимого frontend, implementation reports до tests, DevOps
runtime report до E2E проверки новой revision. Для каждого пропущенного stage
зафиксируй `not_applicable` и причину в task review; это защищает от забытого
этапа без создания лишних handoff.

## Первичное клонирование repository в Engee

`devops_request: clone_repo` — отдельный bootstrap intake. Вызывай его, когда
production Engee ещё не содержит checkout нужного repository, существующий
checkout не имеет подтверждённого origin либо пользователь прямо запросил
первичное размещение repository. Если DevOps ранее вернул тот же clone target,
origin и SHA, повторный clone не отправляй.

```yaml
devops_request: clone_repo
repository_url: https://github.com/<owner>/<repository>.git
repository_name: <optional; derived from URL>
engee_apps_dir: /user/apps
git_username: <GitHub login>
credential_source: protected_github_pat
source_branch: neuro_dev
```

PAT запрещено записывать в task, handoff или report. Orchestrator указывает
только protected credential source и ждёт report с target, origin, branch и
SHA; до этого checkout считается недоступным.

## Lifecycle крупной feature

`neuro_dev` — постоянная основная ветка автономной разработки. Крупной feature
считай registry group или пользовательский scope, который объединяет несколько
связанных implementation/test tasks и принимается как единый результат.

1. При старте нового крупного цикла, до первого изменения repository, создай
   один DevOps handoff:

   ```yaml
   devops_request: new_feature_branch
   feature_slug: <stable slug>
   paths: <optional initial scope>
   ```

2. Дождись report с `neuro_<feature_slug>` и base SHA `neuro_dev`. Зафиксируй
   branch в group/task context и выдавай все subtasks этой feature в неё.
3. Не создавай новую branch для каждой task, bugfix или test внутри feature.
4. Для runtime/E2E проверки feature отправляй `devops_request: deploy`; DevOps
   сам выполняет необходимые add/commit/push/update/restart stages.
5. После implementation, tests, required E2E и явного принятия feature
   пользователем отправь:

   ```yaml
   devops_request: merge_feature
   feature_slug: <same slug>
   source_branch: neuro_<feature_slug>
   target_branch: neuro_dev
   accepted_by_user: true
   paths: <optional final scope>
   ```

6. Feature считается integrated только после report с resulting
   `neuro_dev` SHA. Merge conflict или missing acceptance создаёт blocker; не
   меняй target и не обходи DevOps.

## Немедленный background MATLAB research

При intake каждого нового MATLAB-derived product/feature scope сразу создай
один `type: research` handoff с `background_research: true`. Свяжи его со scope
task/group через `related_handoffs` и отправь до или одновременно с первым
implementation handoff. Research выполняется параллельно и не становится
dependency обычной разработки.

Перед отправкой проверь активный research lane. Если MATLAB Researcher уже
работает, добавь новый scope в тот же lane; второй MATLAB GUI writer запрещён.
Повторный автоматический запуск для того же scope запрещает уже записанный
background handoff ID.

Research handoff обязан требовать:

- `matlab-researcher/critical-scenario-coverage`;
- чтение сохранённого scenario catalog из matlab_clicker API или канонического
  read-only catalog fallback;
- независимый critical requirement inventory, snapshot/provenance и coverage
  matrix;
- downstream mapping: UI → E2E, math/compatibility → Engee User, mixed → оба;
- scoped boolean `all_critical_scenarios_covered`.

Положительный verdict принимается только для
`verdict_scope: matlab_reference_scenario_catalog` и не означает, что E2E,
Engee comparison или production regression выполнены. Поздний research finding
не меняет молча выданный scope: создай новый handoff или follow-up registry
task через backlogging.

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

## DevOps routing

Все роли адресуют Git/runtime requests только DevOps через Orchestrator. DevOps
не получает цепочку микрозадач: один request запускает полный conditional
pipeline clone into Engee apps → checkout/create → add → commit → push →
accepted integration → Engee update → restart.
Ненужные этапы возвращаются как `not_needed`; blocker останавливает дальнейшие
этапы без rollback.

- `clone_repo` используется для первичного checkout private repository в
  `/user/apps` с PAT из protected credential source;
- `new_feature_branch` обязателен один раз при старте крупного feature-cycle;
- `deploy` используется, когда Engee/E2E должен получить current feature или
  `neuro_dev` revision;
- `merge_feature` обязателен сразу после явного принятия крупной feature и
  всегда вливает её в `neuro_dev`.

Для clone передавай URL без credentials, `/user/apps`, Git username, branch и
только имя protected PAT source. Передавай optional `paths`, если Git add нужно
ограничить конкретными файлами или папками. Для deploy передай branch/expected
scope; для merge — source feature branch и `accepted_by_user: true`. Если E2E
должен проверить новую revision, сначала получи DevOps report с URL и exact
SHA, затем отправь E2E handoff. При отсутствии актуального runtime передай
`target_status: unavailable`; E2E вернёт blocker, а не проверит старую
revision.

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
