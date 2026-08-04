---
name: devops-workflow
---
# DevOps Workflow

DevOps получает один из трёх intake requests и самостоятельно проводит весь
Git → Engee pipeline. Orchestrator не дробит его на branch, commit, push и
deployment handoffs.

## Branch model

- Постоянная основная ветка автономной разработки: `neuro_dev`.
- Каждая крупная feature получает ветку `neuro_<feature_slug>`.
- Feature branch всегда создаётся от актуальной `neuro_dev`.
- Принятая крупная feature всегда squash-merge в `neuro_dev`.
- Feature branch после merge автоматически не удаляется.
- Обычная работа внутри крупной feature продолжается в её feature branch; для
  каждой внутренней task новую ветку не создавай.

## Intake

Handoff содержит ровно один `devops_request`:

```yaml
devops_request: deploy | new_feature_branch | merge_feature
feature_slug: <required for new/merge feature>
source_branch: <optional; defaults to current/derived feature branch>
target_branch: <optional for deploy; merge target is always neuro_dev>
paths: # optional
  - app/
  - public/
accepted_by_user: true # required for merge_feature
```

Если `paths` задан, Git add ограничен только этими файлами/папками. Если список
не задан, DevOps сначала перечисляет все изменения и может включить только те,
которые однозначно принадлежат текущей feature. Любое чужое или неясное
изменение блокирует add/commit; его нельзя stash, discard или присвоить feature
по предположению.

## Единый автономный pipeline

Для каждого request последовательно оцени все этапы. Каждый получает статус
`performed`, `not_needed`, `blocked` или `not_run`.

1. **Resolve and checkout**
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
2. **Add**
   - при наличии относящихся к request изменений выполнить add;
   - при `paths` stage только этот scope;
   - перед продолжением показать staged files и проверить отсутствие соседних
     изменений.
3. **Commit**
   - создать commit только при непустом staged diff;
   - сообщение кратко описывает feature/result на русском языке;
   - существующие commits не переписывать без отдельного требования.
4. **Push**
   - push нужен для новой remote feature branch, новых commits, merge commit
     или отсутствующего upstream;
   - feature branch публикуется до deploy/merge;
   - новая пустая feature branch также получает upstream.
5. **Integrate accepted feature**
   - только для `merge_feature`: после source push перейти на `neuro_dev`,
     обновить её fast-forward способом, выполнить squash merge source branch,
     создать integration commit и push `neuro_dev`;
   - для остальных requests этап `not_needed`.
6. **Update Engee checkout**
   - при `deploy` переключить Engee checkout на requested branch и обновить до
     exact pushed SHA через fetch/checkout и fast-forward pull, затем проверить
     фактический HEAD;
   - при `merge_feature` после push обновить Engee checkout до нового SHA
     `neuro_dev` тем же способом;
   - при одном только `new_feature_branch` этот этап обычно `not_needed`.
7. **Restart application**
   - restart выполнить, если приложение не запущено, явно запрошен restart,
     изменились backend/runtime/config/dependencies либо текущий process не
     обслуживает обновлённую revision;
   - для frontend-only update допускается `not_needed`, если running Genie в
     development mode гарантированно отдаёт новые static files;
   - после решения проверить status, URL и logs.

При blocker останови pipeline: завершённые шаги остаются в отчёте, текущий шаг
получает `blocked`, последующие — `not_run`. Не выполнять rollback
автоматически.

## Request semantics

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
для следующего E2E handoff.

### `devops_request: merge_feature`

Запускается Orchestrator после явного принятия крупной feature пользователем.
DevOps завершает add/commit/push source feature branch, синхронизирует
`neuro_dev`, выполняет squash merge, создаёт итоговый commit, push
`neuro_dev`, обновляет Engee checkout и restart application при необходимости.
Target нельзя заменить другой веткой. Merge conflict не исправлять: вернуть
blocker Orchestrator. Feature branch не удалять автоматически.

## Report

```text
request:
feature/source/target:
paths policy:
checkout: performed | not_needed | blocked | not_run
add: performed | not_needed | blocked | not_run
commit: performed | not_needed | blocked | not_run
push: performed | not_needed | blocked | not_run
integration: performed | not_needed | blocked | not_run
engee_update: performed | not_needed | blocked | not_run
restart: performed | not_needed | blocked | not_run
source SHA:
result SHA:
Engee SHA/URL/status:
logs/findings:
```

`applied_skills` всегда содержит только `devops/devops-workflow`: DevOps
subskills отсутствуют.

## Guardrails

- DevOps не пишет и не исправляет source/tests/config/architecture.
- `merge_feature` без `accepted_by_user: true` запрещён.
- Нельзя создать feature branch не от `neuro_dev` или merge feature в другую
  ветку.
- Нельзя force-push, reset, clean, stash, разрешать merge conflict или удалять
  feature branch автоматически.
- Engee target только production; devhub/fallback запрещены.
- Credentials не записывать в repository, handoff, commands или logs.
