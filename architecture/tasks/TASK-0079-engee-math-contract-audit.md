---
id: TASK-0079
kind: task
title: Зафиксировать Engee contracts и parity для поддерживаемой математики
status: done
priority: P0
queue_order: 2
model: gpt-5.6-sol
reasoning: xhigh
owner: orchestrator
assignees: [engee_user]
parent: TASK-0077
depends_on: []
blocks: [TASK-0081]
source_handoffs: [HND-0413]
related_handoffs: [HND-0413, HND-0420]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_refinement
ui_impact: none
---

# Scope

Derive backend-consumable public Engee function contracts for current time,
spectrum, spectrogram and persistence calculations, compare documented and
observed behavior with MATLAB-compatible expectations, and persist executable
tests under `test/engee/**` without changing product code.

## Acceptance criteria

- [x] Public function, module, signature, defaults and observed behavior are recorded.
- [x] Persistent tests cover representative real/complex and edge scenarios.
- [x] Exact production execution results and tolerances are reported.
- [x] Any discrepancy is localized; suspected behavior is not called confirmed.

## Result

Accepted HND-0420. Supported application-shaped EngeeDSP contracts passed
343/343 in the initialized production worker. Three separate expected-failure
regressions confirm provider input-validation defects that current product
dispatch cannot reach; no stub or fallback is authorized. TASK-0081 is
unblocked. Project-owned dependency drift remains a DevOps deployment risk.
