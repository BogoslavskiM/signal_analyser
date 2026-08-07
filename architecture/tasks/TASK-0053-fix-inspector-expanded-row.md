---
id: TASK-0053
kind: task
title: Исправить визуально обрезанный Inspector Info в строке сигнала
status: done
priority: P1
queue_order: 49
model: gpt-5.6-terra
reasoning: medium
owner: orchestrator
assignees: [frontend]
parent: TASK-0023
depends_on: [TASK-0027]
blocks: []
source_handoffs: [HND-0181]
related_handoffs: [HND-0182, HND-0183, HND-0184, HND-0185, HND-0186, HND-0187, HND-0188, HND-0189]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_patterns
ui_impact: covered
design_mode: autonomous
design_ref: architecture/design/TASK-0040-detailed-current-layout/DESIGN.md
design_version: 1
---

# Fix Inspector expanded-row clipping

## User value

Нажатие Info действительно показывает Samples, Sample rate, Duration и Type,
а повторное нажатие возвращает компактную строку без потери table density.

## Source evidence

HND-0181: `aria-expanded=true` и metadata DOM присутствуют, но row height остаётся
`41.78125px`; details визуально clipped. Screenshot подтверждён Orchestrator.

## Scope

Минимально исправить row/detail geometry и overflow для expanded Inspector state.
Сохранить compact collapsed rows, fixed actions, table horizontal/vertical scroll,
checkbox semantics, focus/aria-expanded и responsive viewports. Добавить static/
behavior regression для expanded/collapsed visibility and geometry contract.

## Out of scope

Редизайн таблицы, backend/session/API, новые Inspector fields, dependencies,
Git/deploy и viewport ниже 1024.

## Acceptance criteria

- [x] Expanded row visually exposes all four metadata values without clipping.
- [x] Collapsed row returns to compact density and metadata is not visible.
- [x] Actions, keyboard/focus and aria-expanded remain correct.
- [x] Table scroll owners and 1440/1280/1024 layout remain intact.
- [x] Focused/full frontend suites pass without dependency files.

## Queue decision

P1 user-visible Inspector failure found by final E2E; bounded Frontend fix with
no concurrent product writer.

## Verification and results

Frontend implementation выдана как `HND-0182`.

Frontend report `HND-0183`: absolute card/sticky-cell clipping root cause fixed
with explicit row disclosure state and expanded-only geometry. Browser 9/9 shows
41.78125→153.78125→41.78125px at all viewports; labels/actions/focus/scroll pass.
Full frontend 1455/1455 PASS; Orchestrator reviewed diff and repeated full 6/6.
Tester verification выдана как `HND-0184`.

Tester report `HND-0185`: all disclosure/no-mutation/actions/scroll contracts
verified; добавлен 1 focus-safe collapse assertion. Focused 1109/1109, full
1456/1456, V8 77.23% PASS. Orchestrator independently repeated full 6/6.
Exact four-path deployment выдано как `HND-0186`.

DevOps report `HND-0187`: exact four paths deployed as
`3871bca726d78f5d4011745cd5b8ecd80c2214e2`; local/private/production SHA match,
runtime RUNNING, root/status/state HTTP 200 and app.js/app.css byte-match. Exactly
one post-task production E2E issued as `HND-0188`.

E2E report `HND-0189`: visual/geometry/scroll/immutability scope PASS 33/35.
All three viewports measure 41.78125→153.78125→41.78125px, metadata is visible,
actions are 28px and sticky scrolling works. Two failures are a distinct native
Enter/Space activation defect routed to TASK-0054; no state mutation occurred.
