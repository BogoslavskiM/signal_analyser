---
id: TASK-0047
kind: task
title: Согласовать multi-layout v2 с 42px tab row на 1024
status: done
priority: P1
queue_order: 44
model: gpt-5.6-sol
reasoning: medium
owner: orchestrator
assignees: [designer]
parent: TASK-0044
depends_on: [TASK-0040, TASK-0044]
blocks: [TASK-0030]
source_handoffs: [HND-0127, HND-0129]
related_handoffs: [HND-0136, HND-0139, HND-0140, HND-0143]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_patterns
ui_impact: new_or_changed
design_mode: revision
design_ref: architecture/design/TASK-0044-multilayout-ui/DESIGN.md
design_version: 2
---

# Multi-layout 1024 geometry revision

## User value

Утверждённый design package и фактическая responsive реализация используют одну
измеримую геометрию без скрытой 6px разницы.

## Scope

TASK-0040 v1 задаёт Display tab row `42px` при width ≤1080. TASK-0044 v1
наследует этот base design, но таблица 1024 plot-grid/pane geometry рассчитана
как при `48px`. Проверить implementation measurement `696×363.53` и обновить
TASK-0044 package до v2: DESIGN metadata/tables/rules и только затронутое 1024
evidence, если визуальные pixels действительно отличаются. Все остальные IA,
states, viewports и behavior остаются неизменными.

## Out of scope

Product/backend/tests, redesign, dependency files, Git/runtime и изменение
TASK-0040 v1.

## Acceptance criteria

- [x] v2 явно наследует 42px Display tab row at ≤1080.
- [x] 1024 plot-grid and 1×1/2×2/4×4 pane dimensions match measured implementation.
- [x] Affected screenshot evidence is refreshed or proven unchanged.
- [x] Other viewports/states/behavior remain v1-compatible.
- [x] Ready design report lists exact changed files/evidence and no product changes.

## Queue decision

P1 design-revision gate found during Frontend review. Runs in the free Designer
lane while Tester preparation may continue; TASK-0030 final acceptance/deploy
pins v2 after report.

## Verification and results

Designer ready report `HND-0139` принят. Package v2 наследует 42px Display tab
row at ≤1080 и фиксирует измерения 1024: plot grid/1×1 `696×363.53`, 2×2
`345×178.77`, 4×4 `169.5×86.38`. Обновлены DESIGN.md, prototype CSS и ровно
15 screenshot evidence 1024×768; 30 файлов 1280/1440 и behavior/IA остаются
v1-compatible. Orchestrator независимо проверил JS syntax, diff integrity,
45 PNG, размеры всех 15 обновлённых evidence и визуально просмотрел 1×1, 4×4,
popover draft и conflict. Post-task package regression выдан как `HND-0140`.

E2E report `HND-0143`: 93/104 PASS, 0 FAIL, package threshold 89.42%.
Readability/dimensions 45/45, geometry 6/6, 1280/1440 v1 hash compatibility
30/30 и interactions 8/8. Четыре representative 1024 screenshots визуально
проверены; оставшиеся 11 декодированы и размерно валидны, но не просмотрены
вручную в bounded window. Package defects отсутствуют.
---
