---
id: TASK-0085
kind: task
title: Исправить выявленные frontend-регрессии explicit Apply и 1024px settings
status: in_progress
priority: P0
queue_order: 1
model: gpt-5.6-terra
reasoning: high
owner: orchestrator
assignees: [frontend]
parent: TASK-0077
depends_on: [TASK-0082]
blocks: [TASK-0083]
source_handoffs: [HND-0427]
related_handoffs: [HND-0425, HND-0426, HND-0427]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_refinement
ui_impact: regression_fix
design_mode: autonomous
design_ref: ../design/TASK-0080-explicit-apply-flow/DESIGN.md
design_version: 1
---

# Scope

Fix exactly two Tester-evidenced frontend regressions without weakening tests:
semantic Apply rejection must release busy state while preserving a retryable
draft, and the 1024px settings select must remain at least 130px visible in a
300px panel through a scoped responsive override. Preserve explicit Apply v1,
page sizing/minimums and all unrelated UI behavior.

## Acceptance criteria

- [ ] Semantic Apply rejection passes the event-loop-safe behavior assertion.
- [ ] At <=1080px the settings select retains a computed width >=130px and no
  negative width/overflow while larger accepted geometry remains intact.
- [ ] Full frontend suite passes; tests are not weakened.
---
