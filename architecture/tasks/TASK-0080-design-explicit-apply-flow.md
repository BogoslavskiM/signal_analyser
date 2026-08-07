---
id: TASK-0080
kind: task
title: Спроектировать explicit Apply и состояния расчёта по актуальным skills
status: done
priority: P0
queue_order: 3
model: gpt-5.6-sol
reasoning: xhigh
owner: orchestrator
assignees: [designer]
parent: TASK-0077
depends_on: []
blocks: [TASK-0082]
source_handoffs: [HND-0414]
related_handoffs: [HND-0414, HND-0422]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_refinement
ui_impact: new_or_changed
design_mode: autonomous
design_ref: ../design/TASK-0080-explicit-apply-flow/DESIGN.md
design_version: 1
---

# Scope

Produce a versioned additive design package based on accepted design v2 for an
explicit Apply calculation flow. Cover pristine/draft-invalid/dirty/applying/
pending/ready/stale/error/retry states, keyboard and focus behavior, page
sizing, overlays and three target viewports. Preserve the accepted analytical-
dense composition, local Roboto/assets and existing overlay priority.
The draft/dirty state must not add a separate “not applied” badge or caption;
it is expressed only through current field content and Apply availability.

## Acceptance criteria

- [x] DESIGN.md, clickable local prototype, interaction map and screenshots exist.
- [x] Apply enablement, validation, progress, stale/error recovery and draft
  preservation are explicit and click-tested.
- [x] No separate dirty indicator exists; locally unparseable numeric drafts
  block Apply, while backend semantic errors remain editable and Apply-validatable.
- [x] UI profile, proportion/page-sizing and overlay priority contracts are complete.
- [x] Package identifies exact changes relative to accepted design v2.

## Result

Accepted HND-0422: design v1 is ready. Local walkthrough passed 32/32 with 47
screenshots and zero browser errors across all required states and viewports.
