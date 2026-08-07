---
id: TASK-0052
kind: task
title: Исправить healthy-API layout bootstrap, остающийся в loading
status: done
priority: P0
queue_order: 47
model: gpt-5.6-terra
reasoning: high
owner: orchestrator
assignees: [frontend]
parent: TASK-0042
depends_on: [TASK-0030, TASK-0042]
blocks: []
source_handoffs: [HND-0167, HND-0168]
related_handoffs: [HND-0169, HND-0172, HND-0173, HND-0174, HND-0175, HND-0176, HND-0177, HND-0178]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_patterns
ui_impact: covered
design_mode: autonomous
design_ref: architecture/design/TASK-0044-multilayout-ui/DESIGN.md
design_version: 2
---

# Fix healthy-API layout bootstrap

## User value

При валидных state/layout API приложение всегда выходит из loading, создаёт
pane grid и не показывает ложный toast ошибки загрузки.

## Source evidence

HND-0167 на exact production SHA воспроизвёл 3/3: page/status 200, canonical
layouts envelope и GET/POST/409 contracts PASS, но UI остаётся `Loading layout...`,
pane roots 0, trigger `—`, Settings/bindings loading и виден error toast.

## Scope

Зафиксировать exact bootstrap request/exception/order transition с browser
console/network instrumentation. Исправить минимальный frontend-owned sequencing,
validation или initialization defect. Добавить deterministic delayed/out-of-order
healthy API regression, гарантирующий accepted state/layout publication and busy/
toast cleanup. Сохранить authoritative server state и design v2.

## Out of scope

Backend/API contract changes, visual redesign, runtime lifecycle/SSL, dependency
files, Git/deploy и speculative retries hiding invalid payloads.

## Acceptance criteria

- [x] Root cause подтверждён exact exception/request/order evidence.
- [x] Healthy canonical state/layout responses materialize trigger and pane roots.
- [x] Busy/loading/error state clears only after authoritative publication.
- [x] Delayed/out-of-order and failure paths have focused regression.
- [x] Full frontend suite passes; dependency files remain untouched.

## Queue decision

P0 core-screen product failure reproduced 3/3 under healthy API availability.

## Verification and results

Frontend diagnosis/fix выдана как `HND-0169`.

Frontend report `HND-0172`: exact null-control exception локализована и исправлена
permanent runtime-node references плюс monotonic parallel state/layout bootstrap.
Добавлены delayed/stale/out-of-order/async/sync failure/recovery regressions.
Syntax 5/5, focused 846/846, full frontend 1449/1449 и deterministic Chromium
5/5 PASS. Orchestrator independently reviewed complete diff and repeated syntax/
full suite 6/6. Tester verification выдана как `HND-0173`.

Tester report `HND-0174`: root-cause regression и all ordering/recovery/failure
paths verified; добавлены 2 assertions для coalesced revisions. Focused 848/848,
full 1451/1451, V8 function coverage 77.23% (+0.90pp). Orchestrator independently
повторил syntax/full 6/6. Exact five-path deploy выдан как `HND-0175`.

DevOps report `HND-0176`: exact five paths committed/deployed as
`17482dc4aef3d86e79815a36ae950045f74fd142`; local/private/production SHA match,
runtime RUNNING, root/status/state/layouts HTTP 200 and changed assets byte-match.
Exactly one post-task production E2E issued as `HND-0177`.

E2E report `HND-0178`: 27/27 PASS on exact deployed SHA. Three clean
bootstraps, delayed layouts, out-of-order state, intentional 503→Retry, API
GET/200/409 parity, sixteen 4×4 real Plotly hosts with all types/bindings,
reachable tab/actions and 1440/1280/1024 no-overflow geometry all pass. Console/
page errors absent; session and layouts restored exact hash.
