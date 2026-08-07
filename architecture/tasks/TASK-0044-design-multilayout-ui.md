---
id: TASK-0044
kind: task
title: Спроектировать multi-layout UI 1×1…4×4 и автономные plot panes
status: done
priority: P1
queue_order: 41
model: gpt-5.6-sol
reasoning: high
owner: orchestrator
assignees: [designer]
parent: TASK-0014
depends_on: [TASK-0029, TASK-0040]
blocks: [TASK-0030]
source_handoffs: [HND-0039, HND-0040]
related_handoffs: [HND-0115, HND-0127, HND-0128, HND-0131, HND-0136, HND-0139, HND-0140, HND-0143]
blocked_by: []
blocker_reason: null
ui_impact: new_or_changed
design_mode: autonomous
design_ref: architecture/design/TASK-0044-multilayout-ui/DESIGN.md
design_version: 2
---

# Multi-layout UI design

## User value

Пользователь выбирает сетку до 4×4, управляет каждым plot pane автономно и
однозначно понимает, к какому pane относятся table checkboxes и type selector.

## Scope

Создать versioned package `architecture/design/TASK-0044-multilayout-ui/` на
базе TASK-0040 v1 и authoritative TASK-0029 contract:

- layout trigger и anchored popover с rows/columns 1..4, topology preview,
  selected/draft/apply/cancel states и max 16 panes;
- responsive pane grid, stable active-pane affordance, header/control geometry
  и overflow для 1×1, representative 2×2 и stress 4×4;
- per-pane existing plot-type menu и independent loading/empty/error/warning;
- связь active pane с Signals checkboxes без изменения bindings других panes;
- behavior preserve/drop при resize, 409 conflict/recovery и session reload;
- focus order, keyboard navigation, collision/stacking/dismiss rules;
- required viewports 1440×900, 1280×720, 1024×768 and applicable states.

## Out of scope

Production frontend/backend/tests, новый plot engine, grid >4×4, изменение
TASK-0029 API, dependency files, Git/runtime и редизайн остальных зон вне
необходимой композиции.

## Acceptance criteria

- [x] Ready versioned DESIGN.md + local prototype + screenshots.
- [x] 1×1, 2×2 and 4×4 geometry/state is measurable at all required viewports.
- [x] Popover draft/apply/cancel, active pane and per-pane controls are complete.
- [x] Signals checkbox binding and preserve/drop/conflict/session states are unambiguous.
- [x] Report contains applied skills, decisions, evidence and ready ref/version.

## Queue decision

- P1: mandatory design dependency of already accepted TASK-0030.
- Queue order 41, dispatched immediately in free Designer lane while Frontend
  TASK-0027 runs independently.
- Model/reasoning gpt-5.6-sol/high for complex responsive visualization design.

## Expected handoff result

HND-0115 returns a ready pinned package for TASK-0030 Frontend implementation.

## Verification and results

Designer report `HND-0127` принят: ready v1 содержит DESIGN.md, local prototype,
local SVG и 45 PNG для 1×1/2×2/4×4, popover и 11 states в трёх viewports.
Orchestrator полностью прочитал DESIGN.md, выполнил JS syntax/banned-runtime
checks, подтвердил 50 package files, 45/45 PNG dimensions и визуально проверил
1×1 1440, 2×2 1280, 4×4 1024 и conflict 1024. Geometry, active context,
popover/focus, preserve/drop и conflict semantics однозначны. Post-task visual
quick regression выдан как `HND-0128`; TASK-0030 pin-нут на этот v1.

E2E report `HND-0131`: package regression 75/75 PASS — 45 screenshots,
1×1/2×2/4×4 geometry, 11 states и 8 interactive checks; prototype не имеет
document overflow/popover collision. Production differences не считались
дефектами до deployment TASK-0030.

Bounded revision TASK-0047/HND-0139 повышает package до ready v2: inherited
42px tab row при ≤1080 согласована с 1024 grid/pane geometry, 15 affected
1024 screenshots обновлены, 1280/1440 и interaction contract неизменны.

Post-revision E2E `HND-0143` прошёл package threshold 93/104 без failures:
45/45 PNG readable, geometry 6/6, 30/30 v1-compatible hashes и interactions
8/8; defects не обнаружены.
