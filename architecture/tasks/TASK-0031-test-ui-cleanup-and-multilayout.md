---
id: TASK-0031
kind: task
title: Покрыть multi-layout backend/frontend integration regression
status: done
priority: P1
queue_order: 29
model: gpt-5.6-terra
reasoning: medium
owner: orchestrator
assignees: [tester]
parent: TASK-0014
depends_on: [TASK-0027, TASK-0029, TASK-0044, TASK-0047]
blocks: []
source_handoffs: [HND-0134, HND-0137, HND-0138, HND-0139]
related_handoffs: [HND-0141, HND-0142, HND-0144, HND-0145, HND-0147, HND-0151, HND-0154, HND-0157]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_patterns
ui_impact: covered
design_mode: autonomous
design_ref: architecture/design/TASK-0044-multilayout-ui/DESIGN.md
design_version: 2
---

# Regression UI cleanup и multi-layout

## Scope

Добавить integration coverage topology `1 × 1`..`4 × 4`, invalid dimensions,
deterministic pane preservation, per-pane type/signal isolation, session
migration/round-trip, layout popup draft/apply/cancel и active-pane checkbox
synchronization. UI-cleanup regression закрепляется отдельно TASK-0033.

## Out of scope

Изменение product code, screenshot baselines, deployment и Playwright E2E.

## Acceptance criteria

- [x] Backend contract/session tests покрывают boundaries, validation,
  conflict и migration.
- [x] Frontend tests покрывают все новые controls и transient states.
- [x] Негативные assertions подтверждают удаление лишних UI элементов.
- [x] Existing backend/frontend suites проходят без regression.
- [x] Report перечисляет непокрываемые локально scenarios для E2E handoff.

## Queue decision

- Priority: P1.
- Rationale: новая stateful функциональность требует contract regression перед
  browser E2E.
- Queue order: 29.
- Eligibility: после всех product implementation tasks.

## Verification and results

Ожидается Tester report и post-task quick E2E handoff.

Implementation-ready backend/frontend reports и ready design v2 приняты;
Tester work выдана как `HND-0141`. Product code остаётся read-only для Tester.

Tester report `HND-0142` принят: добавлены три test-only файла и 438 assertions.
Focused frontend 141/141, focused backend 384/384, full frontend 1435/1435 и
full backend 2446/2446 PASS; V8 function coverage 76.33%, Julia executable-line
coverage 91.14%. Orchestrator просмотрел новые tests, подтвердил отсутствие
product/dependency изменений и независимо повторил syntax, full frontend 6/6
и full backend без failures. Browser-only geometry/focus/Plotly/tab-scroll gaps
передаются в production post-task E2E после общего deploy.

Deployment `HND-0145` готов; отдельный post-task browser-gap regression выдан
как `HND-0147` на exact production revision.

`HND-0151` зафиксировал 7/7 browser-gap checks как not_run из-за maintenance
404 до baseline; product failures и mutation отсутствуют. Продолжение того же
handoff ждёт P0 recovery `HND-0154`.

Final continuation `HND-0157`: focus wrap, Escape focus restoration, pointer
pane selection и exact state restoration PASS 4/7, 0 FAIL; 3 checks not_run at
the same browser-shell boundary and routed to TASK-0042.
