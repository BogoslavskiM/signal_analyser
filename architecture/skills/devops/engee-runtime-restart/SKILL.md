# Engee Runtime Restart

Выполняй отдельное восстановление runtime только по явному DevOps handoff и
только на project-locked production Engee target. Не запускай Git pipeline,
не меняй branch/revision и никогда не запускай приложение локально. Единственное
Git-исключение — обязательный remote-only dirty-worktree preflight из
`devops/devops-workflow`; локально его выполнять запрещено.

## Вход

```yaml
devops_request: restart_application | restart_engee
restart_reason: <наблюдаемый системный симптом или явный запрос пользователя>
app_path: <absolute or relative production Engee app.jl path>
log_file: <absolute or relative production Engee log path>
expected_revision: <exact checkout SHA>
healthcheck_url: <optional exact production application URL>
```

`restart_reason`, `app_path`, `log_file` и `expected_revision` обязательны.
Один handoff содержит ровно один режим. Не включай credentials в handoff или
report.

## Общие правила

1. Используй только production `https://engee.com`; devhub и fallback
   запрещены.
2. До runtime operation вызови `engee_status`. Не полагайся на auto-start.
3. Проверь, что Engee checkout существует и имеет ожидаемый origin. Только на
   production pod выполни preflight из `devops/devops-workflow`: проверь
   `git status --porcelain`, при dirty выполни `git add .`, затем `git stash`,
   и потребуй чистый status. Локально эти команды не выполняй никогда.
4. После cleanup проверь соответствие HEAD `expected_revision`. Restart не
   выполняет fetch, pull, branch checkout, commit или push; созданный remote
   stash автоматически не восстанавливает и не удаляет.
5. Выполни не более одного restart-цикла на handoff. Повторяющийся restart без
   новой диагностики запрещён.
6. После операции проверь pod readiness, application readiness, production URL
   и обслуживаемую revision.
7. При любом неуспехе примени
   `devops/engee-deployment-diagnostics`, сохрани очищенные logs/evidence в
   `architecture/logs/**` и верни evidence-based owner routing.

## `restart_application`

Используй при живом и ready pod, когда завис, не отвечает или находится в
некорректном состоянии именно Genie application process, а repository revision
не менялась.

1. Если pod остановлен, выполни `engee_start` и дождись ready; здоровый pod не
   останавливай.
2. Проверь exact checkout SHA.
3. Повторно выполни встроенную production-команду
   `engee.genie.start(app_path, log_file=log_file)`. Абсолютные и относительные
   пути разрешены. Канонический пример:
   `engee.genie.start("/path/app.jl", log_file="/path/app_log.log")`.
4. Дождись application readiness и проверь URL/revision.

Не запускай `julia app.jl`, локальный Genie server или localhost. Не
останавливай pod в этом режиме.

## `restart_engee`

Используй при системной неисправности pod/session/runtime, явном запросе
пользователя либо когда application restart не может восстановить runtime и
evidence указывает на pod-level состояние.

1. Вызови `engee_status`.
2. Если pod running, вызови только production pod tool `engee_stop`; не путай
   его с Julia `engee.stop()`, которая управляет simulation. Явный
   `restart_engee` является разрешением на потерю несохранённого in-memory
   состояния; содержимое `/user` должно сохраниться.
3. Если pod уже stopped, отметь stop как `not_needed`.
4. Вызови `engee_start` и дождись ready result.
5. Проверь persisted checkout и exact SHA, затем восстанови приложение через
   `engee.genie.start(app_path, log_file=log_file)`.
6. Проверь application readiness, URL и revision. Не расширяй этот режим
   до автоматических повторных stop/start циклов.

## Отчёт

Верни:

```text
request/restart reason:
expected/actual revision:
pod status before:
pod stop: performed | not_needed | blocked | not_run
pod start: performed | not_needed | blocked | not_run
pod status after:
pod worktree status before:
pod worktree cleanup: performed | not_needed | blocked
pod worktree status after:
application restart: performed | not_needed | blocked | not_run
application start command:
app path/log file:
application URL/readiness/revision:
diagnostics: performed | not_needed | blocked
failure owner:
diagnosis ref/log refs:
```

Добавь `devops/engee-runtime-restart` в `applied_skills`. Успех разрешён только
после readiness exact revision. Failed restart без diagnostics и log refs либо
явного evidence status `missing|unreadable|blocked` запрещён.
