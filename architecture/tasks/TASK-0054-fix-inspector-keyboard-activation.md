---
id: TASK-0054
kind: task
title: Исправить Enter/Space активацию Inspector Info
status: done
priority: P1
queue_order: 50
model: gpt-5.6-terra
reasoning: medium
owner: orchestrator
assignees: [frontend]
parent: TASK-0053
depends_on: [TASK-0053]
blocks: []
source_handoffs: [HND-0189]
related_handoffs: [HND-0190, HND-0191, HND-0192, HND-0193, HND-0194, HND-0195, HND-0196, HND-0197]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_patterns
ui_impact: covered
design_mode: autonomous
design_ref: architecture/design/TASK-0040-detailed-current-layout/DESIGN.md
design_version: 1
---

# Fix Inspector keyboard activation

## User value

Focused Info button одинаково раскрывает/скрывает metadata через pointer, Enter
и Space, сохраняя focus и корректный aria state.

## Source evidence

HND-0189 на production: Tab фокусирует native button, pointer работает, но Enter
и Space снимают focus и оставляют `aria-expanded=false`.

## Scope

Локализовать конкретный global/local keyboard handler или re-render path,
нарушающий native button activation. Исправить без double activation и без
ручной подмены стандартной семантики там, где достаточно снять конфликтующий
guard. Сохранить pointer, actions, expanded geometry, focus ring and no API mutation.
Добавить deterministic real-browser Enter/Space and repeat-toggle regression.

## Out of scope

Visual redesign, backend/session/API, dependency files, Git/deploy и изменение
остальных keyboard shortcuts.

## Acceptance criteria

- [x] Root keyboard event/focus cause подтверждён.
- [x] Enter and Space each toggle exactly once and retain focus.
- [x] Pointer behavior, aria/label/geometry and no API mutation remain intact.
- [x] Other signal-row keyboard shortcuts have no regression.
- [x] Focused/full frontend and real-browser tests pass.

## Queue decision

P1 accessibility failure in the just-completed Inspector workflow.

## Verification and results

Frontend fix выдана как `HND-0190`.

Frontend report `HND-0191`: delegated row keydown incorrectly intercepted native
button Enter/Space, prevented click, POSTed view and rerendered focus away. Guard
now excludes `input,button` with no synthetic click. Browser 28/28, focused
1117/1117 and full 1464/1464 PASS; Orchestrator reviewed diff, repeated full 6/6
and independently ran browser 28/28. Tester verification выдана как `HND-0192`.

Tester report `HND-0193`: exact contract fully covered with no additional changes.
Focused 1117/1117, full 1464/1464, browser 28/28 and V8 77.39% PASS.
Exact four-path deployment выдано as `HND-0194`.

DevOps report `HND-0195`: exact four paths deployed as
`a2320652445725678629ad24b325211d3100e275`; local/private/production revisions
match, runtime is RUNNING, root/status/state/app.js return HTTP 200 and external
app.js byte-matches the commit. Mandatory production E2E issued as `HND-0196`.

E2E report `HND-0197`: production revision
`a2320652445725678629ad24b325211d3100e275` passed 28/28 at 1440x900,
1280x720 and 1024x768. Native pointer/Enter/Space, exact toggle/focus/ARIA,
geometry, zero-mutation Info, inert ArrowRight, one-request row Enter and exact
session/layout restoration all pass. TASK-0054 is complete.
