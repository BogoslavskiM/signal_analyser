---
id: TASK-0082
kind: task
title: Перевести frontend на draft/Apply/revision state machine
status: done
priority: P0
queue_order: 1
model: gpt-5.6-terra
reasoning: high
owner: orchestrator
assignees: [frontend]
parent: TASK-0077
depends_on: [TASK-0080, TASK-0081]
blocks: [TASK-0083]
source_handoffs: [HND-0424]
related_handoffs: [HND-0422, HND-0423, HND-0424, HND-0425, HND-0428]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_refinement
ui_impact: new_or_changed
design_mode: autonomous
design_ref: ../design/TASK-0080-explicit-apply-flow/DESIGN.md
design_version: 1
---

# Scope

Replace calculation-affecting reactive dispatch with local draft presentation,
typed debounced field-update requests that only persist backend draft, and one
explicit Apply request over that stored draft. Use immutable revisioned
state-lite snapshots, stale rejection, active-output-only fetch and the pinned
design state machine. Presentation-only actions remain immediate; browser
performs no DSP.
Align the changed settings/output path with `frontend-project-structure`: one
root Vue 3 production global app, project-local runtime assets, modules by
zone/control, direct scripts without npm/bundler/TypeScript, and a minimal root
coordinator. Do not rewrite unaffected behavior blindly; migrate the settings,
Apply and active-output ownership boundary first and preserve stable selectors.

## Acceptance criteria

- [x] Input/change updates local and backend draft only and causes no math,
  output invalidation or API Apply call.
- [x] Apply sends no settings snapshot and handles applying/pending/ready/error/stale.
- [x] Drafts survive validation/network/stale errors and context switches safely.
- [x] Existing live Plotly, overlays, accessibility and responsive design remain intact.
- [x] The changed path runs through one local Vue 3 production root and
  registered settings/output modules; no runtime CDN, browser DSP or second root app.

## Result

HND-0425 implementation is accepted. HND-0428 removed the legacy
selector-specific 1080px settings reflow; the base 140px settings-row contract
remains authoritative. The full frontend suite now passes 15/15 files.
Cross-layer backend and Engee regression completion remains TASK-0083.
