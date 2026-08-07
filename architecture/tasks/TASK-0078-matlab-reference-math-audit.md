---
id: TASK-0078
kind: task
title: Проверить текущую математику по MATLAB reference application
status: done
priority: P0
queue_order: 1
model: gpt-5.6-sol
reasoning: xhigh
owner: orchestrator
assignees: [matlab_researcher]
parent: TASK-0077
depends_on: []
blocks: [TASK-0081, TASK-0083]
source_handoffs: [HND-0412]
related_handoffs: [HND-0412, HND-0415, HND-0416, HND-0417]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_refinement
ui_impact: none
---

# Scope

Inventory and verify MATLAB Signal Analyzer behavior for supported time,
spectrum, spectrogram and persistence paths, including defaults, units,
normalization, one/two-sided and complex conventions, axes, limits, leakage,
overlap, resolution and edge cases. Return a critical scenario matrix and map
math/compatibility cases to Engee User and visible scenarios to E2E.

## Acceptance criteria

- [x] Catalog provenance and critical requirement inventory are explicit.
- [x] Each supported calculation has inputs/defaults/formula or documented
  function behavior, units/conventions and expected observable result.
- [x] Gaps and contradictions are separated from confirmed facts.
- [x] `all_critical_scenarios_covered` uses only the required scoped verdict.

## Result

Accepted HND-0415. The audit is complete, but strict catalog coverage is
`0/17` and `all_critical_scenarios_covered: false`; this is evidence for
follow-up Engee/E2E work, not a MATLAB parity pass.
