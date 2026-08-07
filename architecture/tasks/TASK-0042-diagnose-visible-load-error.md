---
id: TASK-0042
kind: task
title: Диагностировать visible load-error при HTTP 200 API
status: done
priority: P1
queue_order: 40
model: gpt-5.6-terra
reasoning: high
owner: orchestrator
assignees: [frontend]
parent: null
depends_on: [TASK-0041]
blocks: []
source_handoffs: [HND-0097, HND-0156, HND-0157, HND-0158, HND-0159]
related_handoffs: [HND-0160, HND-0161, HND-0162, HND-0167]
blocked_by: []
blocker_reason: null
ui_impact: none
---

# Диагностировать visible load-error

## User value

Приложение не показывает ложную ошибку загрузки и пустой plot, когда
authoritative API уже ответили HTTP 200.

## Scope

После восстановления runtime воспроизвести frontend bootstrap/load sequence,
локализовать фактический rejected response/parse/render path и исправить
frontend-owned defect, если он подтверждён. Если source ошибки backend/runtime,
вернуть точный evidence report для нового owning-role task.

## Out of scope

Dependency files, EngeeDSP replacement, backend guessing, redesign, Git,
deployment и devhub/fallback.

## Acceptance criteria

- [x] Точный failing request/exception/state transition локализован.
- [x] Frontend-owned defect исправлен с focused/full frontend regression либо
  возвращён доказанный owning-role blocker без speculative changes.
- [x] Успешные API responses не оставляют ложный load-error/blank plot.
- [x] Project.toml и Manifest.toml не используются и не меняются.

## Queue decision

- P1: наблюдаемый defect основного экрана; зависит от TASK-0041 для
  воспроизводимого production target.
- Queue order 40; выдаётся после ready runtime и текущего design gate с учётом
  Frontend write conflicts.

## Expected handoff result

Frontend report с root cause, changed paths, tests and runtime evidence needs.

## Verification and results

Post-deploy E2E локализовал intermittent boundary: production root/APIs/assets
сначала 200 и часть UI flows проходит, но fresh browser shell затем не создаёт
`layout-trigger` за 30s при продолжающихся `/api/state` и `/api/session` 200.
Session восстановлена exact hash; product failures в completed scope нет.
Frontend diagnosis/fix выдана как `HND-0160`.

Frontend report `HND-0161`: 3/3 clean contexts получили root и status/state/
session/layouts maintenance HTTP 404 с идентичным 246-byte HTML; product HTML,
scripts и styles не загружались, поэтому frontend exception/state transition не
могли возникнуть. Source trace подтверждает, что layout-trigger создаётся после
valid state до Plotly. Node syntax 4/4, focused 141/141 и full frontend 6/6 PASS;
изменений нет. Root cause передан runtime TASK-0051; post-task healthy-bootstrap
E2E выдано как `HND-0162`.

Coordinated monitor removed the maintenance ambiguity. E2E `HND-0167` received
page/status HTTP 200 in 3/3 clean contexts and validated canonical layout APIs,
but product shell reproduced the visible failure 3/3: Loading layout, zero panes,
placeholder trigger and error toast. This distinct healthy-API product defect is
owned by follow-up TASK-0052 rather than retroactively changing this diagnostic.
