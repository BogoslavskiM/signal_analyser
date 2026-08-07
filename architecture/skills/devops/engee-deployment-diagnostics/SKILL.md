# Engee Deployment Diagnostics

## Назначение и вход

Применяй автоматически после failed pod start, deploy, `engee.genie.start` или
readiness, при появлении экрана технических работ, а также по
`devops_request: get_logs`. Работай только с project-locked
production Engee target и exact revision. Вход содержит применимые
`app_path`, `log_file`, `expected_revision`, `log_scope`, `line_limit`,
`patterns` и linked deploy handoff.

Не запускай приложение локально и не используй localhost, локальный Genie или
локальный `app.jl` как evidence.

## Сбор evidence

1. Подтверди production target, результаты `engee_status`/`engee_start`, pod
   readiness, checkout branch/SHA, фактические `app_path` и `log_file`,
   переданные в `engee.genie.start`.
2. Найди следующий глобальный `LOG-XXXX` и создай один каталог
   `architecture/logs/LOG-XXXX-<deploy-slug>/`; существующие каталоги не
   перезаписывай.
3. Получи remote application log. По умолчанию сохрани последние 500 строк и
   контекст `ERROR`, `Exception`, `Stacktrace`, `LoadError`, `syntax` и
   readiness failures. Уважай более узкие handoff-параметры.
4. Перед записью удали PAT, Authorization/Cookie headers, credential-bearing
   URLs, temporary auth helper paths и другие secrets. Один evidence-файл не
   должен превышать 1 MiB; отметь truncation/redaction.
5. Сохрани очищенный snapshot как `application.log`. Если Backend readiness
   прошёл, но UI bootstrap неуспешен, выполни минимальный production browser
   probe и при наличии evidence добавь `browser-console.log` и
   `network-errors.log`. Не изменяй и не запускай Playwright suite.
6. Если browser показывает экран технических работ или аналогичную generic
   maintenance/error page, автоматически примени
   `devops/technical-maintenance-screen-diagnostics`. Сохрани screenshot,
   main-document HTTP status/redirect evidence и classification рядом с
   application log. Такой экран является симптомом, а не доказательством бага
   Engee: он часто соответствует HTTP 500 из-за неуспешного application
   start/backend bootstrap.
7. Создай `SUMMARY.md` по `reference/SUMMARY.template.md` с относительными
   ссылками, exact SHA, временным диапазоном, start/readiness status и
   sanitization result.

Если remote log отсутствует или недоступен, всё равно создай `SUMMARY.md` со
статусом `missing|unreadable|blocked`; отсутствие логов не превращай в pass.

## Классификация владельца

Сначала отдели pipeline/runtime ownership от product failure:

- `devops`: неверный checkout/branch/SHA, app/log path, launch request,
  repository update, pod не был поднят перед remote operation или pipeline
  action. Сюда же отнеси подтверждённое
  неразвёрнутое/устаревшее package environment, если его можно восстановить
  одним Engee `geniepkg_instantiate` без изменения dependency intent. Исправь
  только этот класс и повтори проверку в пределах исходного request.
- `backender`: Julia parse/include/load error, необъявленная или несовместимая
  product dependency, backend bootstrap, Genie start/readiness,
  route/runtime exception и HTTP 500 до успешной UI загрузки. Экран
  технических работ при failed application start/500 и соответствующем log
  evidence маршрутизируй Backender, а не Engee User. Не относить сюда stale
  materialized environment до автоматической DevOps recovery attempt.
- `frontend`: Backend start/readiness и базовый HTTP прошли, но static asset,
  JavaScript/module/Vue bootstrap или browser initialization неуспешны.
- `engee_user`: только application log/reproducer указывает на конкретную
  вызываемую Engee функцию или package contract, требующие contract
  localization. Не направляй сюда pod, ingress, maintenance screen, platform
  availability или общий runtime outage.
- `mixed`: независимое evidence подтверждает несколько product owners.
- `undetermined`: evidence недостаточно; не угадывай владельца.

Значение `frontend` не выводи только из отсутствия readiness. Для Frontend
нужно подтверждение успешного Backend start/readiness и browser/static error.
Экран технических работ, pod/ingress failure и platform availability не входят
в Engee User ownership. Если они не классифицированы как product или DevOps
pipeline failure, используй `undetermined` и передай решение Orchestrator.
Engee User допустим только для конкретного Engee function/package contract,
обнаруженного в application evidence независимо от вида browser fallback.

Если signature указывает на package/environment materialization, сначала
примени `devops/engee-project-environment-sync`. Он может один раз выполнить
`geniepkg_instantiate` только в production Engee, повторить
`engee.genie.start` и после успешного readiness скачать пару `Project.toml` и
`Manifest.toml` в локальный корень. При успешном recovery не создавай
`deployment_failure`; верни DevOps recovery report. При неуспехе сохрани новые
log refs и переклассифицируй причину по фактическому evidence.

## Handoff routing

Для `backender`, `frontend` или `engee_user` сформируй
`type: deployment_failure` handoff одному диагностированному владельцу:

```yaml
source_branch: <branch>
revision: <exact SHA>
failure_owner: <backender|frontend|engee_user>
evidence_status: <collected|missing|unreadable|blocked>
diagnosis_ref: ../logs/LOG-XXXX-<slug>/SUMMARY.md
log_refs:
  - ../logs/LOG-XXXX-<slug>/application.log
acceptance_criteria:
  - Устранена диагностированная причина в ownership получателя
  - Приложение локально не запускалось
  - Возвращён report Orchestrator для повторного deploy
```

Отдельно отправь FYI Orchestrator с теми же refs. Для `mixed` создай отдельный
handoff каждому подтверждённому владельцу. Для `undetermined` отправь report
Orchestrator. Не редактируй product/tests/Engee bug report самостоятельно.

## Report

Верни request, target, branch/SHA, app/log paths, evidence status, diagnosis,
`failure_owner`, `diagnosis_ref`, `log_refs`, redaction/truncation и созданные
handoff IDs. Укажи `applied_skills` с
`devops/engee-deployment-diagnostics`; при package recovery также укажи
`devops/engee-project-environment-sync`, а при generic technical-work screen —
`devops/technical-maintenance-screen-diagnostics`. Не вставляй большой лог в handoff:
передавай ссылки на файлы.
