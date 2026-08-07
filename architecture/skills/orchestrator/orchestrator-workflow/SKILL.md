# Orchestrator Workflow

## Назначение и вход

Обязательный workflow Orchestrator: прямой user request проходит user-intake
один раз; затем все последующие циклы берут работу только из unified task
registry через backlogging. Далее: выбор queued task → model selection →
parallel MATLAB/Engee/design evidence → Engee contract gate для Backend →
декомпозиция → numbered handoffs → review отчётов → Engee-only deploy → E2E
handoff → automatic integration gate → merge в `neuro_dev` → user report →
backlogging → новая разработка. Неразрешённые вопросы проходят product gate.
Orchestrator сохраняет tasks и handoffs, выбирает порядок
последовательной/параллельной работы и не пишет product code.

Используй как вход прямой запрос пользователя, актуальный task registry,
связанные handoff/reports и manifest ролей. Явные требования пользователя
выше значений по умолчанию этого workflow; изменение ownership всегда оформляй
новым решением архитектуры, а не неявным расширением handoff.

## Task separation principles

- Backender получает domain model, business logic, calculations, persistence,
  adapters, API routes and authoritative state.
- Designer получает screen/zone composition, visual system, all visible states,
  page/application sizing contract, local prototype and versioned design
  evidence.
- Frontend получает production DOM/modules, frontend state, API consumption,
  accessibility semantics and implementation утверждённого design package.
- Tester получает backend unit/API и frontend static/behavior regression tests.
- MATLAB Researcher получает MATLAB documentation/app research and reference
  scenarios.
- Engee User получает required-functionality research, persistent Engee
  contract tests, discrepancy localization и bug evidence.
- E2E получает отдельный regression handoff после каждой завершённой task,
  а также `analysis_regression` при переходе к пустому actionable backlog.
- DevOps получает один из семи requests: первичный clone repository в Engee
  apps, новая ветка крупной feature, deploy, merge прошедшей integration gate
  feature в `neuro_dev`, получение production logs, отдельный restart
  приложения или полный restart Engee pod. Первые четыре запускают
  полный применимый pipeline с explicit pod status/start gate; `get_logs`
  поднимает pod для доступа к evidence и запускает диагностическую ветку без
  application start. Restart requests запускают только runtime-recovery без Git
  stages.
  Условное package-environment recovery и post-readiness TOML sync остаются
  внутренними этапами одного DevOps deploy, а не новым intake request.

Если результат требует изменения в нескольких ownership-зонах, Orchestrator
создаёт отдельные handoff для владельцев и явно фиксирует контракт между ними.
Пограничные вопросы решаются по месту authoritative behavior: backend для
source of truth/API, Designer для visible result, Frontend для production
state and interaction implementation.

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
| Engee contract lane | scope использует Engee function/runtime | Engee User немедленно, параллельно с MATLAB и Designer |
| Design package | новый/изменённый UI либо существующий дизайн не покрывает scope | Designer |
| Backend implementation | меняется authoritative state, math или API | Backender; для Engee-dependent scope только после Engee contract report |
| Data-heavy performance | есть signals/graphs/heavy outputs | Backender: calculation/apply/API; Frontend: loading/settings/graph; Tester проверяет оба |
| Product ambiguity | один релевантный skill не разрешил scope/default/visible behavior/priority | Orchestrator `orchestrator/product-question-resolution` |
| Frontend implementation | меняются production UI, frontend state или interaction | Frontend после ready design package |
| Backend/frontend tests | меняется соответствующий product contract | Tester |
| Initial Engee checkout | checkout repository отсутствует или его origin не подтверждён | DevOps `clone_repo` до deploy/update |
| Feature branch | начинается новый крупный feature-cycle | DevOps `new_feature_branch` до первой repository mutation |
| Runtime publication/deployment | E2E target должен содержать новую revision | DevOps `deploy` |
| Runtime restart | system/runtime problem без изменения revision | DevOps `restart_application` для Genie process или `restart_engee` для pod/session |
| Deployment diagnostics | start/readiness неуспешен или нужны production logs | DevOps `get_logs`; failed deploy запускает его автоматически |
| Package environment recovery/sync | diagnostics подтвердил stale/unmaterialized environment либо явно нужен post-start sync | DevOps автоматически внутри `deploy`, после readiness переносит TOML-пару |
| Feature integration | автоматический технический gate Orchestrator прошёл | DevOps `merge_feature` в `neuro_dev` |
| E2E regression | post-task или idle regression trigger | E2E |

Независимые evidence stages запускай параллельно. Designer, MATLAB Researcher
и Engee User стартуют одновременно: Designer и research lanes не ждут Backend.
Для Engee-dependent scope Backend является зависимым stage и стартует только
после backend-consumable Engee contract report с persistent test evidence.
Для scope без Engee dependency Backend может стартовать сразу. Остальные
зависимые stages запускай только после достаточного контракта: ready/pinned design до visible Frontend
implementation, backend API до зависимого frontend, implementation reports до
tests, DevOps runtime report до E2E проверки новой revision. Для каждого пропущенного stage
зафиксируй `not_applicable` и причину в task review; это защищает от забытого
этапа без создания лишних handoff.

В начале project session примени `orchestrator/product-question-resolution` и
его optional ai_manager bootstrap. Любой вопрос субагента может стать
продуктовым только после попытки одного наиболее релевантного skill. При
доступном ai_manager используй установленный `$ask-to-ceo`; иначе autonomous
mode решает Orchestrator, а interactive mode останавливает зависимую работу и
задаёт один вопрос пользователю в чате.

## Design gate

На intake классифицируй `ui_impact`:

- `none` — UI не меняется, Designer не нужен;
- `covered` — существующий ready package полностью покрывает scope; pin его
  `design_ref` and `design_version`;
- `new_or_changed` — отправь Designer `design_task` до visible Frontend work.

Design handoff содержит `design_mode: autonomous|review`, scope, user
scenarios, required screens/states/viewports and factual constraints. Для
нового/изменённого application page, shell или zone layout явно запроси
`designer/page-sizing-contract`. В
autonomous mode Designer принимает visual decisions сам; проверяй package
completeness, не заменяя его judgment. В review mode передавай пользователю
только конкретный material decision при `user_decision_required`.

Ready package обязан содержать `DESIGN.md`, local mock prototype, version,
source-derived UI profile, state/viewport matrix, prototype entry/interaction map, proportion contract,
local asset inventory, used visual-reference list and screenshots. Каждый
required state достигается реальным click/focus/keyboard action; Designer
обязан прокликать map до report. Заголовки используют local Roboto Medium,
colors/settings menus, exact dimensions/radii/states и component proportions
следуют выбранному canonical profile без смешивания profiles,
column visibility использует eye/eye-off без checkmark. Если overlays могут сосуществовать,
package также обязан содержать overlay inventory, bottom-to-top priority,
pointer/focus owner и restoration order. Передавай Frontend pinned reference.
Для page-layout scope package также обязан содержать `page_sizing_contract` с
application/zone minima, invariant composition, growth ratios без structural
maxima и document scroll при undersized viewport. Передай этот контракт
Frontend и затем E2E без пересказа или самостоятельной коррекции.
Frontend может напрямую сформировать `design_revision`; сохрани этот handoff и
ответ Designer, обнови pinned version and forbid silent visual deviation.
Factual MATLAB context может уточнить task, но MATLAB Researcher не выбирает
design.

## Performance gate для data-heavy UI

Когда scope содержит signals, spectra, spectrograms, ambiguity functions или
другие тяжёлые outputs, зафиксируй обязательный cross-role contract:

1. Backender применяет calculation planning, Apply flow и API planning: Julia
   выполняет DSP и готовит Plotly payload; `/api/state-lite` не содержит graph
   arrays; `plot_cache` и `need_update_pages` рассчитывают только active page;
   heavy task работает в фоне; pending лёгкий; `state_revision` защищает
   frontend snapshots, `calculation_revision` — publication.
2. Frontend начинает со `state-lite`, не загружает inactive outputs, settings
   debounce равен 150 ms, noncritical UI-state debounce — 350 ms, semantic
   actions не задерживаются. Local Plotly грузится лениво; render использует
   rAF, one-in-flight, latest-only queue, `Plotly.react` и coalesced resize.
   Vue 3 используется в production build, код разделён по zones.
3. Tester закрепляет cache hit/miss, active-only CPU/network, lightweight
   pending, revisions/races, exact debounce, lazy Plotly/render serialization,
   local assets и отсутствие browser DSP/runtime CDN.

Cold local bundle load и размер больших arrays считаются измеряемыми residual
risks; они не разрешают CDN или перенос DSP в browser.

## Немедленный Engee contract lane

При intake каждого Engee-dependent product/feature scope сразу создай Engee
User handoff и отправь его одновременно с MATLAB research и Designer. Не жди
Backend implementation или готовых call sites. Передай planned functionality,
expected public behavior, известные MATLAB references и потребуй
`engee-user/required-functionality-analysis` вместе с
`engee-user/engee-contract-testing`.

Принятый report обязан содержать backend-consumable public function,
signature, defaults, documented и observed behavior, persistent test path и
точный execution result. Создай для dependent Backend task явную dependency на
этот report; без него Backend не получает implementation handoff. Если report
возвращает blocker или неподтверждённый contract, исправляй evidence lane, а
не разрешай Backend угадывать behavior. Scope без Engee dependency отмечай
`not_applicable` и не создавай искусственный gate.

## Подтверждённый Engee-блокер

Только Engee User может подтвердить Engee bug. Для разрешения product stub его
report обязан содержать `status: confirmed`, `stub_authorization: true`, ссылку
на `architecture/engee_bugs/**`, persistent `test/engee/**` regression и
affected public function/call site. `suspected`, deployment symptom или
environment failure не разрешают stub; они остаются handoff Engee User для
локализации.

При подтверждённом блокере создай согласованный набор handoff:

1. Backender — в точном call site оставить реальный Engee call
   закомментированным рядом с явным typed unavailable stub. Stub возвращает
   failure/code/blocker reference и никогда не выдаёт fake result или success.
2. Frontend — сохранить предусмотренную кнопку/action видимой; вызывать обычную
   Backend API ручку и показать design-defined unavailable state. Frontend не
   вызывает Engee и не подменяет вычисление.
3. Tester — закрепить API unavailable contract, отсутствие fake result и
   Frontend action/state. Contract defect продолжает проверять Engee User.
4. Создать recovery task с `blocked_by` Engee bug. Её единственный unlock —
   pass того же persistent contract test; затем Backender раскомментирует call
   и удаляет adjacent stub без изменения Frontend API contract.

Не считать такой blocker устранённым. Он может стать документированным внешним
исключением integration gate только если bug, failing regression, stub call
site, visible UI state, Tester/E2E evidence и recovery task связаны между собой.

## Первичное клонирование repository в Engee

`devops_request: clone_repo` — отдельный bootstrap intake. Вызывай его, когда
production Engee ещё не содержит checkout нужного repository, существующий
checkout не имеет подтверждённого origin либо пользователь прямо запросил
первичное размещение repository. Если DevOps ранее вернул тот же clone target,
origin и SHA, повторный clone не отправляй.

Handoff содержит только безопасный routing context:

```yaml
devops_request: clone_repo
repository_url: https://github.com/<owner>/<repository>.git
repository_name: <optional; derived from URL>
engee_apps_dir: /user/apps
git_username: <GitHub login>
credential_source: protected_github_pat
source_branch: neuro_dev
```

Значение PAT запрещено записывать в task, handoff или report. Orchestrator
указывает только protected credential source и ждёт DevOps report с exact
`/user/apps/<repository_name>`, verified origin, branch и SHA. До успешного
report checkout считается недоступным; последующие deploy/E2E не должны
подменять его локальной или старой revision.

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
5. После implementation, tests и required E2E автоматически проверь feature
   integration gate. Он проходит только когда все child tasks завершены,
   требуемые design/Tester/Engee contract reports приняты, exact feature SHA
   развёрнут и проверен, нет feature-blocking P0/P1 findings и blockers.
   Подтверждённый внешний Engee blocker допустим только как исключение по
   протоколу выше и записывается в `documented_external_blockers`. Зафиксируй
   `integration_gate: passed` и evidence IDs, затем отправь:

   ```yaml
   devops_request: merge_feature
   feature_slug: <same slug>
   source_branch: neuro_<feature_slug>
   target_branch: neuro_dev
   integration_gate: passed
   integration_evidence: [<task/handoff IDs>]
   documented_external_blockers: [<optional confirmed Engee bug refs>]
   paths: <optional final scope>
   ```

6. Отдельная пользовательская приёмка не запрашивается и не требуется. Явный
   user pause, rejection или scope change останавливает auto-merge. Feature
   считается integrated только после report с resulting `neuro_dev` SHA. Merge
   conflict или missing integration evidence создаёт blocker; не меняй target
   и не обходи DevOps.

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
`trigger_task`, `target_status`, `target_link` и planned scope. Для
UI-affecting task также передай `design_ref`, implemented design version,
   UI profile, prototype entry/interaction map, proportion contract,
   page sizing contract, asset inventory,
   used visual references, required states/viewports and reference screenshots.
   E2E запускает один foreground worker в установленном Google Chrome с
   `headless: false`, выводит активную вкладку на передний план, затем открывает
   local static prototype через `file://`, прокликивает map и анализирует
   screenshots/geometry, после чего повторяет путь в production Engee.
   Hidden/background browser не является evidence. Prototype не является
   application runtime evidence. При сосуществующих
   overlays передай inventory/priority/focus/restoration contract и потребуй
   `elementFromPoint`, pointer/focus blocking, close restoration и screenshots.
   Implementation mismatch маршрутизируй Frontend; incomplete/ambiguous visual
   contract — Designer.
   E2E обязан запомнить pre-existing Chrome pages и в `finally` закрыть только
   tabs/pages, созданные текущим run, даже при timeout/failure. Пользовательские
   вкладки и shared browser process сохраняются; report содержит opened/closed
   counts и `tab_cleanup_status`.

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
technical integration → production pod status/start → Engee update → restart.
Ненужные этапы возвращаются как `not_needed`; blocker останавливает дальнейшие
этапы без rollback.

- `clone_repo` используется для первичного checkout private repository в
  `/user/apps` с PAT из protected credential source;
- `new_feature_branch` обязателен один раз при старте крупного feature-cycle;
- `deploy` используется, когда Engee/E2E должен получить current feature или
  `neuro_dev` revision;
- `merge_feature` обязателен сразу после прохождения автоматического
  технического gate Orchestrator и всегда вливает feature в `neuro_dev`;
- `get_logs` используется для отдельного получения production evidence и не
  запускает Git/application stages;
- `restart_application` используется при здоровом pod и системной проблеме
  Genie process; он повторяет только production `engee.genie.start` и
  readiness;
- `restart_engee` используется при явном запросе или evidenced
  pod/session/system problem; он разрешает DevOps выполнить production
  `engee_stop` → `engee_start`, затем восстановить приложение.

Для обоих restart requests передавай `restart_reason`, exact
`expected_revision`, `app_path`, `log_file` и
`requested_skills: [devops/engee-runtime-restart]`. Если pod ready и проблема
локализована в application process, сначала выбирай `restart_application`.
Полный pod restart не является диагностикой сам по себе и не должен
повторяться циклом; при неуспехе DevOps возвращает logs и owner classification.
Не маршрутизируй эти requests Engee User.

Не создавай отдельный request для package environment recovery. При
подтверждённой diagnostics проблеме DevOps сам загружает
`devops/engee-project-environment-sync`, один раз выполняет доступный только в
production Engee `geniepkg_instantiate`, повторяет start/readiness и после
успеха скачивает exact `Project.toml` и `Manifest.toml` в локальный корень.
Явно запрашивай этот subskill в `requested_skills` только если нужен post-start
sync без recovery. Обычный успешный deploy его не запускает; после TOML copy
DevOps не начинает новый add/commit/push/deploy loop.

Для clone передавай URL без credentials, `/user/apps`, Git username, branch и
только имя protected PAT source. Передавай optional `paths`, если Git add нужно
ограничить конкретными файлами или папками. Для deploy передай branch/expected
scope, `app_path` и `log_file`; для merge — source feature branch,
`integration_gate: passed` и непустой `integration_evidence`. Если E2E
должен проверить новую revision, сначала получи DevOps report с URL и exact
SHA, затем отправь E2E handoff. При отсутствии актуального runtime передай
`target_status: unavailable`; E2E вернёт blocker, а не проверит старую
revision.

Приложение запускает только DevOps и только внутри production Engee встроенной
командой `engee.genie.start(app_path, log_file=log_file)`; app path может быть
абсолютным или относительным. Локальный `app.jl`, локальный Genie server и
localhost запрещены. Перед remote Engee operation DevOps обязан вызвать
`engee_status`, при необходимости `engee_start` и дождаться ready. Только
explicit `restart_engee` разрешает `engee_stop`; Julia `engee.stop()` не
останавливает pod. После failed pod/application start/restart/readiness DevOps автоматически
собирает sanitized bounded evidence в `architecture/logs/**`, классифицирует
`failure_owner` и отправляет `deployment_failure` владельцу с `diagnosis_ref`
и `log_refs`, плюс FYI Orchestrator. Backend evidence идёт Backender, frontend
bootstrap evidence — Frontend, а любой suspected/confirmed Engee bug — Engee
User. Для `mixed` нужны отдельные handoff; при `undetermined` нельзя угадывать.
Package/environment failure маршрутизируется дальше только после того, как
узкий автоматический DevOps recovery оказался неприменим или неуспешен.

Если E2E или browser probe показывает экран технических работ, не создавай
Engee blocker по названию страницы. Передай symptom DevOps: он применяет
`devops/technical-maintenance-screen-diagnostics`, фиксирует main-document HTTP
status и сопоставляет его с pod, `engee.genie.start`, readiness и application
logs. HTTP 500/failed backend bootstrap направляется Backender. Maintenance,
pod/ingress и platform availability failures не направляются Engee User:
DevOps исправляет свой pipeline, а неясный случай возвращается Orchestrator как
`undetermined`. Engee User получает только конкретный Engee function/package
contract issue, явно найденный в application evidence.

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

## Проверка и завершение цикла

Перед завершением review проверь, что каждый применимый stage из matrix имеет
handoff/report либо записанное `not_applicable` с причиной; requested skills
принадлежат адресату, а reports содержат `applied_skills`. Зафиксируй фактические
проверки, blockers, branch/revision и follow-ups в task registry. Затем дай
пользователю краткий итог и только после этого пересчитай backlog. Отдельный
reporting/documentation skill для этого не загружай.
