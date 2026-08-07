# DevOps Workflow

DevOps получает один из семи intake requests. Для Git/deploy requests он
самостоятельно проводит весь Git → Engee pipeline; перед любой remote Engee
операцией он явно проверяет и при необходимости поднимает production pod, а
затем только на этом pod очищает dirty exact checkout через обязательные
`git add .` → `git stash`.
`get_logs` запускает pod gate и диагностическую ветку, но не запускает
приложение. `restart_application` и `restart_engee` запускают отдельный
runtime-recovery subskill без Git pipeline. Package/environment recovery и перенос TOML-пары
выполняются узким subskill только по подтверждённому trigger. Orchestrator не
дробит pipeline на clone, branch, commit, push, application start и deployment
handoffs.

Перед началом проверь доступ к requested production target, а для существующего
checkout — Git repository, remote, current HEAD и worktree. Проверка и очистка
worktree по этому правилу выполняются только shell-командой внутри production
Engee pod; локальный cleanup запрещён. Явные `paths`
ограничивают scope и имеют приоритет над автоматическим определением изменений.

## Branch model

- Постоянная основная ветка автономной разработки: `neuro_dev`.
- Каждая крупная feature получает ветку `neuro_<feature_slug>`.
- Feature branch всегда создаётся от актуальной `neuro_dev`.
- Feature с прошедшим автоматическим `integration_gate` всегда squash-merge в
  `neuro_dev` без user approval.
- Feature branch после merge автоматически не удаляется.
- Обычная работа внутри крупной feature продолжается в её feature branch; для
  каждой внутренней task новую ветку не создавай.

## Intake

Handoff содержит ровно один `devops_request`:

```yaml
devops_request: clone_repo | deploy | new_feature_branch | merge_feature | get_logs | restart_application | restart_engee
repository_url: <required for clone_repo; HTTPS URL without credentials>
repository_name: <optional for clone_repo; derived from URL by default>
engee_apps_dir: /user/apps # optional; this is the default and only allowed root
git_username: <required for private HTTPS clone>
credential_source: <required protected PAT identifier; never the PAT value>
feature_slug: <required for new/merge feature>
source_branch: <optional; defaults to neuro_dev for clone_repo or current/derived feature branch otherwise>
target_branch: <optional for deploy; merge target is always neuro_dev>
paths: # optional
  - app/
  - public/
integration_gate: passed # required for merge_feature
integration_evidence: [<task/handoff IDs>] # required for merge_feature
documented_external_blockers: [] # optional confirmed Engee blocker refs
app_path: <absolute or relative Engee app.jl path; deploy/get_logs/restart requests>
log_file: <absolute or relative Engee log path; deploy/get_logs/restart requests>
expected_revision: <exact SHA; deploy/get_logs/restart requests>
restart_reason: <required for restart requests>
healthcheck_url: <optional exact production URL for restart requests>
remote_project_dir: <optional exact Engee project root; otherwise derive from app_path>
log_scope: tail # optional for get_logs
line_limit: 500 # optional for get_logs
patterns: [ERROR, Exception, Stacktrace] # optional for get_logs
requested_skills: # optional
  - devops/engee-project-environment-sync
```

Допустимые значения `devops_request`: `clone_repo`, `deploy`,
`new_feature_branch`, `merge_feature`, `get_logs`, `restart_application` и
`restart_engee`. Clone-поля применимы к `clone_repo` и к
другому request только когда его pipeline должен bootstrap отсутствующий Engee
checkout. PAT никогда не включается в handoff: передаётся только идентификатор
защищённого credential source, доступного DevOps во время исполнения.

Если `paths` задан, обычный feature Git add в локальном source checkout
ограничен только этими файлами/папками. Если список не задан, DevOps сначала
перечисляет локальные изменения, формирует explicit path list и может включить
только те paths, которые однозначно принадлежат текущей feature. Локально
никогда не выполняй literal `git add .` и никакую команду `git stash`; staging
разрешён только по explicit paths. Любое чужое или неясное локальное изменение
блокирует add/commit; его нельзя discard или присвоить feature по предположению.
Это ограничение не отменяет отдельный обязательный remote-only cleanup
production Engee checkout ниже.

## Обязательная очистка checkout на production pod

После подтверждения ready pod очисти worktree до любого
request-specific checkout/pull, чтения project files/logs или runtime restart.
Выполняй этот preflight только через shell на production Engee pod и только в
точном project checkout текущего handoff. Локально эти cleanup-команды не
выполняй никогда.

1. Разреши exact checkout path из проверенного clone target,
   `remote_project_dir` или `app_path`; перейди в его корень и проверь, что это
   Git repository ожидаемого origin. Не запускай команды в `/user`, `/user/apps`
   целиком, соседнем project или локальной рабочей копии.
2. Выполни `git status --porcelain` на pod.
3. Если output пуст, запиши `pod_worktree_cleanup: not_needed` и продолжай.
4. Если есть хотя бы одна строка, выполни на pod из exact repository root
   последовательно и без изменения scope:

   ```bash
   git add .
   git stash
   ```

   `git add .` намеренно включает все tracked и untracked non-ignored changes
   этого remote checkout, чтобы `git stash` полностью убрал их из активного
   worktree.
5. Повтори `git status --porcelain`. Продолжай только при пустом output и
   запиши `pod_worktree_cleanup: performed`.
6. Не выполняй автоматически `git stash pop`, `git stash apply`,
   `git stash drop` или `git stash clear`: stash остаётся сохранённым на pod,
   но не участвует в текущей task.
7. Если origin/path не подтверждены, `git add .`, `git stash` или финальная
   проверка неуспешны, установи `pod_worktree_cleanup: blocked`, останови
   request и не переходи к checkout/pull/logs/restart.

Этот preflight обязателен для каждого DevOps request, использующего уже
существующий Engee checkout, включая `deploy`, `new_feature_branch`,
`merge_feature`, `get_logs`, `restart_application` и `restart_engee`. Для нового
`clone_repo`, когда target ещё отсутствует, он получает `not_needed`; если
target существует и переиспользуется, сначала проверь origin, затем выполни
этот preflight.

## Единый автономный pipeline

Для Git/deploy/get-logs request последовательно оцени все этапы. Каждый получает статус
`performed`, `not_needed`, `blocked` или `not_run`.

Для `restart_application` и `restart_engee` после обязательного
remote-only worktree preflight не выполняй этапы 1–7 и 9: примени
`devops/engee-runtime-restart`; все branch/update/commit/push/sync этапы
получают `not_needed`.

0. **Ensure production Engee pod**
   - перед первым Engee MCP/shell/file/browser operation вызови `engee_status`
     на project-locked production target; это обязательная явная проверка, её
     нельзя заменять надеждой на auto-start другого tool;
   - если pod уже running и ready, stage получает `not_needed`; если stopped,
     starting или unavailable, вызови `engee_start` и дождись его ready result
     до продолжения pipeline;
   - не выполняй checkout, Engee update, чтение remote logs,
     `geniepkg_instantiate` или `engee.genie.start` до подтверждённого pod
     readiness;
   - если `engee_status`/`engee_start` завершается ошибкой или timeout, stage
     получает `blocked`: примени `devops/engee-deployment-diagnostics`, сохрани
     доступное pod-start evidence и классифицируй причину по фактам;
   - не вызывай `engee_stop` после работы и не путай pod lifecycle tool с Julia
     `engee.stop()`, который останавливает simulation, а не pod.

1. **Clone into Engee apps**
   - при `clone_repo` stage обязателен; для остальных requests выполняется
     только если требуемый Engee checkout отсутствует и clone context задан;
   - нормализовать HTTPS `repository_url` без credentials и вычислить exact
     target `/user/apps/<repository_name>`; другой root запрещён;
   - получить Git username и PAT из указанного protected credential source;
     отсутствие PAT возвращает `blocked`, но значение секрета не запрашивается
     через handoff и не попадает в report;
   - выполнить clone non-interactively с `GIT_TERMINAL_PROMPT=0` и временным
     askpass/environment helper; PAT запрещено включать в URL, argv, Git config
     или persisted credential store;
   - временный helper должен иметь минимальные permissions и быть удалён сразу
     после Git command как при успехе, так и при ошибке;
   - клонировать requested `source_branch`, по умолчанию `neuro_dev`, затем
     проверить `remote.origin.url`, фактический branch и HEAD SHA;
   - если target уже существует, ничего не перезаписывать: проверить, что это
     Git checkout того же origin; совпадающий checkout переиспользовать со
     статусом `not_needed`, mismatched origin, non-Git или непустой чужой
     target вернуть как `blocked`.
2. **Resolve and checkout**
   - определить current branch, HEAD, worktree и remote state;
   - если `neuro_dev` существует только remote — создать local tracking
     branch; если только local — подготовить её к push; если отсутствует везде
     — один раз создать от текущего unambiguous HEAD и опубликовать;
   - при `new_feature_branch` перейти на `neuro_dev`, обновить её только
     fast-forward способом и выполнить `checkout -b neuro_<feature_slug>`;
   - если ожидаемая feature branch уже существует и однозначно относится к
     тому же feature slug, переиспользовать её; collision/divergence не
     исправлять созданием скрытого suffix, а вернуть blocker;
   - при `deploy` использовать явно переданную branch либо текущую;
   - при `merge_feature` checkout source feature branch; переход на
     `neuro_dev` выполняется после source add/commit/push на integration stage.
3. **Add**
   - при наличии относящихся к request локальных изменений выполнить add только
     по explicit path list; literal локальный `git add .` запрещён;
   - при `paths` stage только этот scope; без `paths` сначала выведи точный
     attributable path list и передай его Git явно;
   - перед продолжением показать staged files и проверить отсутствие соседних
     изменений.
4. **Commit**
   - создать commit только при непустом staged diff;
   - сообщение кратко описывает feature/result на русском языке;
   - существующие commits не переписывать без отдельного требования.
5. **Push**
   - push нужен для новой remote feature branch, новых commits, merge commit
     или отсутствующего upstream;
   - feature branch публикуется до deploy/merge;
   - новая пустая feature branch также получает upstream.
6. **Integrate technically accepted feature**
   - только для `merge_feature`: после source push перейти на `neuro_dev`,
     обновить её fast-forward способом, выполнить squash merge source branch,
     создать integration commit и push `neuro_dev`;
   - для остальных requests этап `not_needed`.
7. **Update Engee checkout**
   - при `deploy` переключить Engee checkout на requested branch и обновить до
     exact pushed SHA через fetch/checkout и fast-forward pull, затем проверить
     фактический HEAD;
   - при `merge_feature` после push обновить Engee checkout до нового SHA
     `neuro_dev` тем же способом;
   - при одном только `new_feature_branch` этот этап обычно `not_needed`.
8. **Start or restart application in Engee**
   - launch выполнить, если приложение не запущено, явно запрошен restart,
     изменились backend/runtime/config/dependencies либо текущий process не
     обслуживает обновлённую revision;
   - для frontend-only update допускается `not_needed`, если running Genie в
     development mode гарантированно отдаёт новые static files;
   - приложение запускается только на production Engee встроенной командой
     `engee.genie.start(app_path, log_file=log_file)`; абсолютные и
     относительные пути разрешены, точные значения записываются в report;
   - канонический абсолютный пример:
     `engee.genie.start("/path/app.jl", log_file="/path/app_log.log")`;
   - `julia app.jl`, локальный Genie server, localhost и любой локальный
     application runtime запрещены;
   - после вызова проверить status, readiness, URL и exact revision;
   - при failed start/readiness автоматически применить
     `devops/engee-deployment-diagnostics` и сохранить evidence в
     `architecture/logs/**`;
   - если evidence подтверждает только неразвёрнутое или устаревшее package
     environment, автоматически применить
     `devops/engee-project-environment-sync`: один раз выполнить доступный в
     Engee `geniepkg_instantiate`, затем повторить Engee start/readiness;
   - если recovery не применим или не помог, классифицировать владельца и
     отправить адресный `deployment_failure` handoff со ссылками на файлы.
9. **Sync Engee project environment files**
   - этап выполняется только после успешного Engee start/readiness и только
     когда package recovery использовался либо subskill явно указан в
     `requested_skills`;
   - через `devops/engee-project-environment-sync` скачать непосредственно из
     exact production Engee project root оба файла `Project.toml` и
     `Manifest.toml`, проверить их и заменить ими одноимённую пару в корне
     локального проекта без ручного merge/edit;
   - отсутствие или невалидность одного remote файла оставляет оба local файла
     неизменными и даёт этапу `blocked`;
   - после переноса остановиться: не запускать новый add/commit/push/deploy
     цикл только ради синхронизированной TOML-пары;
   - при обычном успешном deploy без package recovery и explicit request этап
     получает `not_needed`.

При blocker останови pipeline: завершённые шаги остаются в отчёте, текущий шаг
получает `blocked`, последующие — `not_run`. Failed deployment нельзя вернуть
без диагностики, `failure_owner`, `diagnosis_ref` и `log_refs` либо явного
evidence status `missing|unreadable|blocked`. Не выполнять rollback
автоматически.

## Request semantics

### `devops_request: clone_repo`

Используется для первичного размещения repository checkout в production
Engee. `repository_url`, `git_username` и `credential_source` обязательны;
`repository_name` выводится из URL, `engee_apps_dir` по умолчанию `/user/apps`,
а `source_branch` — `neuro_dev`. DevOps создаёт `/user/apps`, если каталог
отсутствует, безопасно клонирует repository в
`/user/apps/<repository_name>`, проверяет origin, branch и exact SHA и
возвращает эти данные Orchestrator. Add, commit, push, integration, runtime
update и restart для чистого clone request обычно `not_needed`.

### `devops_request: new_feature_branch`

Запускается Orchestrator один раз перед первым изменением нового крупного
feature-cycle. DevOps синхронизирует `neuro_dev`, создаёт feature branch,
переносит только явно относящиеся к feature рабочие изменения при их наличии,
commit/push при необходимости и возвращает branch/base SHA. Engee update и
restart обычно не нужны.

### `devops_request: deploy`

DevOps подготавливает requested/current branch полностью: add → commit → push,
затем обновляет Engee checkout до exact SHA и restart application при
необходимости. Успешный report является единственным источником URL/revision
для следующего E2E handoff. Если diagnostics подтверждает materialization
package environment, DevOps самостоятельно выполняет одно Engee recovery через
`geniepkg_instantiate`, повторяет start и после успеха синхронизирует
`Project.toml` вместе с `Manifest.toml` в локальный корень. Этот recovery не
требует отдельного Orchestrator handoff.

### `devops_request: merge_feature`

Запускается Orchestrator после прохождения автоматического технического gate.
Handoff обязан содержать `integration_gate: passed` и непустой
`integration_evidence`; пользовательская приёмка не запрашивается и не
требуется.
DevOps завершает add/commit/push source feature branch, синхронизирует
`neuro_dev`, выполняет squash merge, создаёт итоговый commit, push
`neuro_dev`, обновляет Engee checkout и restart application при необходимости.
Target нельзя заменить другой веткой. Merge conflict не исправлять: вернуть
blocker Orchestrator. Feature branch не удалять автоматически.

### `devops_request: get_logs`

Выполни pod stage, если для evidence нужен remote Engee access. Не выполняй
clone/branch-update/commit/push/integration/application start,
package-environment recovery или TOML sync: эти этапы получают `not_needed`.
Обязательный remote-only `git status` → при dirty `git add .` → `git stash`
preflight выполняется до чтения logs и не считается feature Git stage.
Проверь production target и exact expected revision, затем примени
`devops/engee-deployment-diagnostics`. Сохрани очищенный bounded snapshot в
новом `architecture/logs/LOG-XXXX-<slug>/` и верни ссылки. Если запрос связан с
failed deploy, также классифицируй владельца и создай deployment-failure
routing; диагностический request не исправляет product code.

### `devops_request: restart_application`

Используй для отдельного перезапуска Genie application process при системной
проблеме runtime без изменения repository. Примени
`devops/engee-runtime-restart`: проверь/подними pod, сверь exact revision,
повторно выполни `engee.genie.start(app_path, log_file=log_file)` и проверь
readiness. Не останавливай здоровый pod и не выполняй Git stages.
Перед revision check выполни обязательный remote-only worktree preflight;
локальный `git add .` или `git stash` запрещён.

### `devops_request: restart_engee`

Используй для явного полного restart production pod при pod/session/system
problem. Примени `devops/engee-runtime-restart`: выполни
`engee_status`, при running pod — production `engee_stop`, затем `engee_start`
до ready, сверь persisted
checkout и заново запусти приложение через `engee.genie.start`. Не путай pod
stop с `engee.stop()` simulation и не выполняй Git stages.
После нового ready pod выполни обязательный remote-only
worktree preflight до revision check; локальный cleanup запрещён.

## Report

```text
request:
restart reason:
feature/source/target:
paths policy:
pod status check: performed | not_needed | blocked | not_run
pod stop: performed | not_needed | blocked | not_run
pod start: performed | not_needed | blocked | not_run
pod status before/after:
pod worktree status before:
pod worktree cleanup: performed | not_needed | blocked
pod worktree status after:
clone: performed | not_needed | blocked | not_run
clone source/target:
clone origin/branch/SHA:
checkout: performed | not_needed | blocked | not_run
add: performed | not_needed | blocked | not_run
commit: performed | not_needed | blocked | not_run
push: performed | not_needed | blocked | not_run
integration: performed | not_needed | blocked | not_run
engee_update: performed | not_needed | blocked | not_run
restart: performed | not_needed | blocked | not_run
package_environment_recovery: performed | not_needed | blocked | not_run
environment_sync: performed | not_needed | blocked | not_run
application start command:
app path/log file:
remote project dir:
remote/local TOML paths and checksums:
diagnostics: performed | not_needed | blocked
failure owner:
diagnosis ref/log refs:
source SHA:
result SHA:
Engee SHA/URL/status:
logs/findings:
```

`applied_skills` всегда содержит `devops/devops-workflow`; при failed deploy,
start/readiness или `get_logs` дополнительно содержит
`devops/engee-deployment-diagnostics`. При package environment recovery или
явной post-start TOML sync добавь
`devops/engee-project-environment-sync`. Для обоих restart requests добавь
`devops/engee-runtime-restart`.

Report считается успешным для `clone_repo` только после сверки target, origin,
branch и SHA; для requests с push — после сверки опубликованного branch/SHA; а
для deployment — после фактического подтверждения Engee checkout и
обслуживаемой revision. Не подменяй `blocked` или `not_run` успехом полного
pipeline.

## Guardrails

- DevOps не пишет и не исправляет source/tests/config/architecture. Единственное
  environment-исключение — точная проверенная замена корневой пары
  `Project.toml` + `Manifest.toml` remote content из production Engee через
  `devops/engee-project-environment-sync`.
- `merge_feature` без `integration_gate: passed` и непустого
  `integration_evidence` запрещён; user approval не является полем или gate.
- Нельзя создать feature branch не от `neuro_dev` или merge feature в другую
  ветку.
- Нельзя force-push, reset, clean, разрешать merge conflict или удалять feature
  branch автоматически. Единственный разрешённый stash — обязательные
  `git add .` → `git stash` внутри exact production Engee checkout на pod;
  локальный stash запрещён, а remote stash нельзя автоматически pop/apply/drop/
  clear.
- Engee target только production; devhub/fallback запрещены.
- Перед каждой remote Engee sequence обязателен `engee_status`; остановленный
  pod поднимается через `engee_start`, и pipeline ждёт ready. Не полагайся на
  неявный auto-start и не останавливай pod автоматически после request.
  Единственное разрешение остановить pod — явный `restart_engee` handoff.
- Application start только через
  `engee.genie.start(app_path, log_file=log_file)` в Engee; локальный запуск и
  localhost запрещены.
- Clone root только `/user/apps`; target не удалять и не перезаписывать.
- Failed deploy обязательно проходит diagnostics и получает evidence refs;
  suspected/confirmed Engee failure всегда маршрутизируется Engee User.
- `geniepkg_instantiate` разрешён только в production Engee, только после
  подтверждённой package/environment deployment problem и не является routine
  deploy stage. Локальный instantiate запрещён.
- DevOps пишет только sanitized evidence в `architecture/logs/**` и точную
  post-start TOML-пару в корне проекта; он не чинит Backend/Frontend/Engee
  product code и не редактирует dependency intent.
- Credentials не записывать в repository, handoff, commands, Git config,
  persisted credential stores или logs.
