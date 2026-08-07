---
id: TASK-0065
kind: task
title: Реализовать backend performance architecture для тяжёлых графиков
status: done
priority: P0
queue_order: null
model: gpt-5.6-sol
reasoning: high
owner: orchestrator
assignees: [backender]
parent: TASK-0055
depends_on: [TASK-0059]
blocks: [TASK-0060, TASK-0061]
source_handoffs: [HND-0222]
related_handoffs: [HND-0310, HND-0312, HND-0320, HND-0321, HND-0327, HND-0328, HND-0331, HND-0332, HND-0337, HND-0338, HND-0339, HND-0340, HND-0341, HND-0342, HND-0343, HND-0350, HND-0351]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_refinement
ui_impact: none
---

# Backend performance architecture

## Scope

По production trace TASK-0059 реализовать Julia-owned DSP/Plotly preparation и
лёгкий state path: `/api/state-lite`, monotonic `state_revision`,
`calculation_revision`, `plot_cache`, `need_update_pages`, cache/context keys и
active-page-only background calculation. Apply инвалидирует только затронутые
страницы без eager calculation; inactive pages не потребляют calculation CPU и
не отдают graph arrays. Pending остаётся лёгким, stale/inactive work отменяется
cooperatively, публикация защищена revision/context key.

Существующий Engee/math contract не изменять и dependency files не читать и не
трогать. Новая Engee functionality или MATLAB-derived behavior не вводится.

## Acceptance criteria

- [x] `/api/state-lite` не содержит graph arrays и быстро возвращает state metadata.
- [x] Только запрос current active page запускает или переиспользует calculation.
- [x] Cache hit/miss, invalidation и `need_update_pages` детерминированы.
- [x] `state_revision` и `calculation_revision` исключают stale publication.
- [x] Inactive pages не создают heavy CPU/network work; pending payload лёгкий.
- [x] Existing calculations/results remain behavior-compatible.
- [x] Backend source/tests проходят без local application start и без изменений
  Project.toml/Manifest.toml.

## Queue decision

- Priority: P0 because unacceptable stalls require authoritative data-flow fix.
- Queue order: null until TASK-0059 evidence and feature branch are available.
- Eligibility: TASK-0059 done and development_branch recorded.

## Completion evidence

- Current dependency-independent backend corpus passes at product SHA
  `76cb9c6a360ed6d852203f9be0ed7a1a4003e156`.
- Focused and full persisted evidence is recorded in HND-0320, HND-0364 and
  production HND-0369; no remaining implementation gap was found in the
  2026-08-06 orchestration audit.
