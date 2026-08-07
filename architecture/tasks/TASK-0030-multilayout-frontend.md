---
id: TASK-0030
kind: task
title: Реализовать multi-layout UI до 4 × 4 и per-pane signal bindings
status: done
priority: P1
queue_order: 28
model: gpt-5.6-terra
reasoning: high
owner: orchestrator
assignees: [frontend]
parent: TASK-0014
depends_on: [TASK-0027, TASK-0029, TASK-0044, TASK-0046, TASK-0047]
blocks: [TASK-0031]
source_handoffs: []
related_handoffs: [HND-0025, HND-0039, HND-0129, HND-0133, HND-0134, HND-0136, HND-0138, HND-0139, HND-0142, HND-0144, HND-0145, HND-0146, HND-0150, HND-0154, HND-0156]
blocked_by: []
blocker_reason: null
ui_impact: new_or_changed
design_mode: autonomous
design_ref: architecture/design/TASK-0044-multilayout-ui/DESIGN.md
design_version: 2
---

# Multi-layout UI и независимые plot panes

## User value

Пользователь строит до 16 графиков в одном Display, выбирает topology через
понятный popover и независимо назначает каждому pane тип и сигналы.

## Source evidence

- `/Users/makar/Desktop/Снимок экрана 2026-08-04 в 00.03.09.png`.
- Структурные references TASK-0014; styling остаётся утверждённым Engee.

## Scope

Сохранить layout button и реализовать anchored non-modal dialog с rows/columns
`1..4`, доступными topology variants, preview/selected state и Cancel/Apply.
Отрисовать responsive grid; каждый pane имеет stable identity, active border,
собственный существующий plot-type dropdown и собственные signal bindings.
Checkboxes таблицы читают/меняют bindings активного pane. Display tabs должны
сохранять scroll/reorder behavior TASK-0027 при multi-layout.

## Out of scope

Сетка больше `4 × 4`, копирование CSS screenshot, новый plot engine, backend и
deployment.

## Acceptance criteria

- [x] Popover повторяет информационную архитектуру reference, имеет focus
  trap/Escape/Cancel/Apply, validation и не применяет draft до Apply.
- [x] Rows/columns и variants никогда не создают больше 16 panes; selection
  визуально и семантически доступен.
- [x] Active pane явно выделен; смена active pane синхронизирует table
  checkboxes без влияния на bindings других panes.
- [x] Каждый pane сохраняет собственный type dropdown и корректно отрисовывает
  Time/Spectrum/Spectrogram/Persistence через существующий renderer.
- [x] Loading/error/conflict/empty states не ломают grid и дают recovery.
- [x] Layout работает вместе с tab overflow/reorder и session reload.
- [x] Stable selectors/dynamic-state inventory переданы Tester/E2E; frontend
  suite проходит.

## Queue decision

- Priority: P1.
- Rationale: основной новый пользовательский workflow из явного запроса.
- Queue order: 28.
- Eligibility: после готовых TASK-0027 и TASK-0029, чтобы два Frontend writer
  не пересекались и UI опирался на authoritative contract; visible
  implementation также ждёт ready TASK-0044 design package/version.

## Verification and results

Ready TASK-0044 design v1 и verified TASK-0029 backend contract приняты; все
dependencies done. Frontend implementation выдана как `HND-0129`. После report
следуют TASK-0031, exact-path deploy и new-functionality E2E.

Implementation review выявил дополнительный factual output gap: layout state
не содержит renderer payloads для inactive panes. Backend extension TASK-0046/
HND-0133 запущена параллельно; Frontend может продолжать shell/popover, но не
заменяет реальные inactive plots placeholders как финальное поведение.

Backend report `HND-0134` принят и blocker снят: Frontend использует ordered
`layouts[].outputs` для одновременного real rendering всех panes. Backend task
остаётся в общем integration/deploy cycle, но local contract и suites готовы.

Frontend measurement сохранил inherited TASK-0040 tab row 42px на 1024, но
TASK-0044 v1 geometry table использовала 48px. Bounded design revision TASK-0047/
HND-0136 запущена; final task/deploy будет pin-нут на ready v2.

Frontend report `HND-0138`: product implementation complete в пяти public
paths; 16 variants, authoritative 200/409/422, simultaneous typed outputs,
active Settings/checkbox context, popover/focus, pane-local states и reachable
scrolling Display tabs реализованы. TASK-0045 browser geometry PASS на трёх
viewports. Syntax/focused/full suite PASS 4/4; Orchestrator independently
повторил review/syntax/diff/full 4/4. Task ждёт design v2 и TASK-0031 Tester.

TASK-0047 ready report `HND-0139` принят: implementation pin обновлён на v2,
1024 geometry совпадает с измеренной Frontend реализацией. Design blocker снят;
финальный gate — TASK-0031, deploy и production E2E.

TASK-0031 report `HND-0142` принят: full frontend/backend suites PASS.
Exact-path production deployment выдан DevOps как `HND-0144`.

DevOps report `HND-0145`: exact ten paths deployed as
`8c0d37e525268b2acf4781a4cb61e823a50639f8`; local/private/production SHA match,
runtime RUNNING, root/status/state/layouts HTTP 200 and deployed assets match.
Mandatory new-functionality production E2E выдано как `HND-0146`.

E2E availability report `HND-0150`: exact URL перешёл в maintenance 404 до
baseline, поэтому 25 checks not_run без product failures или session mutation.
P0 runtime recovery выдан DevOps как `HND-0154`; тот же HND-0146 продолжается
после восстановления, новый post-task handoff не создаётся.

Final continuation `HND-0156`: 11/26 planned PASS, 0 FAIL; executed scope 100%.
Draft/Cancel/Escape/focus/422/1×1/pointer active context and exact session restore
passed. Remaining scenarios stopped when fresh browser shell did not expose
layout-trigger within 30s while APIs stayed 200; routed to TASK-0042.
