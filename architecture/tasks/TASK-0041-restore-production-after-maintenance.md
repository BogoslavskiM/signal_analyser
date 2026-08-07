---
id: TASK-0041
kind: task
title: Восстановить exact production Signal Analyzer после maintenance 404
status: done
priority: P0
queue_order: 39
model: gpt-5.6-terra
reasoning: medium
owner: orchestrator
assignees: [devops]
parent: null
depends_on: []
blocks: [TASK-0042]
source_handoffs: [HND-0098]
related_handoffs: [HND-0099, HND-0100, HND-0101, HND-0120]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_patterns
ui_impact: none
---

# Восстановить production runtime после maintenance

## User value

Подтверждённый Signal Analyzer снова доступен по внешнему production URL, а
post-task E2E может завершить layout API regression.

## Scope

DevOps проверяет platform/application status, verified checkout branch/SHA,
listener и релевантные logs; безопасно обновляет/restarts existing production
Genie application на exact SHA
`18cfe33b4cf170547adba23c76c744c9e79b42ed`, если это требуется. Возвращает
внешний URL, SHA и HTTP evidence product DOM + `/api/status`.

## Out of scope

Product/test/architecture changes, dependency resolution, использование или
изменение `Project.toml`/`Manifest.toml`, devhub/fallback и feature merge.

## Acceptance criteria

- [ ] Checkout branch/SHA и application process/status проверены.
- [ ] Exact production URL возвращает product DOM, `/api/status` — HTTP 200.
- [ ] Pipeline stages и logs задокументированы без credentials.
- [ ] Dependency files не используются и не меняются.
- [ ] После report повторно выдан layout quick regression.

## Queue decision

- P0: mandatory production availability заблокировала post-task E2E.
- Queue order 39, eligible immediately; Designer/Backender work продолжается
  параллельно.

## Stage matrix

| Stage | Decision | Reason |
|---|---|---|
| DevOps deploy/runtime | required | Нужно восстановить exact target. |
| Product/tests/design | not_applicable | Source contract не меняется. |
| E2E | required_after_devops | Повторить HND-0096 scope. |

## Expected handoff result

`HND-0099` возвращает exact production URL/SHA/status и stage report.

## Verification and results

DevOps report `HND-0100`: production checkout clean на branch
`neuro_signal_analyser_ui_patterns`, local/remote/production SHA совпадают —
`18cfe33b4cf170547adba23c76c744c9e79b42ed`. Managed application и listener
отсутствовали, поэтому root/status отдавали maintenance 404. Выполнен только
restart; итоговый registry status `RUNNING`, root возвращает Signal Analyzer
DOM HTTP 200, `/api/status` — JSON HTTP 200. Source/Git/dependency changes не
выполнялись. Post-task recovery/layout regression выдан как `HND-0101`.

E2E report `HND-0120`: exact recovery revision доступна; 7/7 checks PASS.
Product DOM/status, authoritative initial/no-op layout, malformed 422, stale
409 и отсутствие partial mutation подтверждены; final snapshot равен initial.
