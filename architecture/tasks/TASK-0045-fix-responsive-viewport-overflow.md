---
id: TASK-0045
kind: task
title: Устранить document overflow на 1280×720 и 1024×768
status: done
priority: P1
queue_order: 42
model: gpt-5.6-terra
reasoning: medium
owner: orchestrator
assignees: [frontend]
parent: TASK-0014
depends_on: [TASK-0027]
blocks: []
source_handoffs: [HND-0130]
related_handoffs: [HND-0130, HND-0132, HND-0138, HND-0142, HND-0144, HND-0145, HND-0148, HND-0152, HND-0154, HND-0158]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_patterns
ui_impact: covered
design_mode: autonomous
design_ref: architecture/design/TASK-0040-detailed-current-layout/DESIGN.md
design_version: 1
---

# Responsive viewport overflow

## User value

Приложение целиком доступно в обязательных desktop viewports без document-level
scroll и обрезания toolbar, Settings или sticky actions.

## Scope

Минимально исправить конфликтующие base minima: вертикальный `min-height:768px`
не должен растягивать документ при 1280×720, а desktop `min-width:1180px` должен
сниматься на обязательном 1024 breakpoint. Сохранить внутренние scroll owners,
table minimum и responsive Settings/grid contract. Реализовать в том же
Frontend write-lane, что TASK-0030, до общего Tester/deploy/E2E.

## Out of scope

Редизайн, backend, tests в product handoff, dependencies, Git/deployment и
viewport ниже 1024.

## Acceptance criteria

- [x] На 1280×720 document scrollHeight не превышает innerHeight.
- [x] На 1024×768 document/stage scrollWidth не превышает innerWidth.
- [x] Toolbar, Settings, table/action column и add controls остаются доступны.
- [x] 1440×900 geometry и внутренние table/settings/tab scroll owners сохранены.
- [x] Full frontend suite проходит; browser regression включён в общий deploy cycle.

## Queue decision

P1 actual post-task E2E finding. Выдан немедленно тому же Frontend как bounded
CSS correction без отдельного concurrent writer; TASK-0030 не deploy-ится до
закрытия этой задачи.

## Verification and results

Источник — `HND-0130`: functional 9/9 PASS; visual failures локализованы в base
min-height/min-width. Implementation addendum — `HND-0132`.

Frontend report `HND-0138`: document dimensions равны viewport на 1440×900,
1280×720 и 1024×768; Settings/table/tab внутренние scroll owners и retained
controls доступны. Финальное закрытие после TASK-0031/deploy/E2E.

TASK-0031 full suites PASS по `HND-0142`; общий exact-path deploy выдан как
`HND-0144`. Production responsive E2E остаётся финальным gate.

DevOps report `HND-0145`: responsive product deployed at exact SHA
`8c0d37e525268b2acf4781a4cb61e823a50639f8`. Mandatory production viewport
regression выдано как `HND-0148`.

`HND-0152`: 20 viewport checks not_run, потому что exact URL отдавал maintenance
404 до product DOM; это availability blocker без responsive failures. Тот же
HND-0148 продолжится после recovery `HND-0154`.

Final continuation `HND-0158`: geometry 0/20 FAIL 0, not_run 20 because fresh
browser shell failed before viewport phase while APIs remained 200. No responsive
failure observed; browser bootstrap investigation moved to TASK-0042.
---
