---
id: HND-0129
type: task
from: orchestrator
to: frontend
title: Implement authoritative multi-layout UI and independent panes
task_section: ../tasks/TASK-0030-multilayout-frontend.md#scope
description: |
  Implement TASK-0030 against ready design v1 and verified TASK-0029 contract.
  Use GET/POST /api/layouts as authoritative state: resize, select_pane and
  update_pane with current revision; never allocate pane IDs locally. Add the
  Display-local rows/columns draft selector, responsive 1x1..4x4 grid, explicit
  active pane, existing per-pane type selector/renderers and active-pane-only
  Signals bindings. Preserve TASK-0027 tab reorder/table/settings behavior.
  Apply returned 200 snapshots; on 409 consume current and discard stale draft;
  retain/retry 422 without partial UI mutation. Cover focus/Escape/Cancel,
  collision, pending, loading, empty, error, warning, success and session reload.
  Work only product frontend paths; do not modify tests, backend, architecture,
  deployment or dependency files. Report exact paths, selectors/state inventory,
  deviations, syntax/focused/full frontend results and Tester/E2E gaps.
acceptance_criteria:
  - Draft rows/columns supports all 16 variants and mutates only on Apply.
  - Server-owned pane IDs, ordered prefix preservation and active fallback are rendered authoritatively.
  - Pane type and ordered signal bindings remain isolated per pane.
  - Settings and Signals checkboxes always expose the active-pane context.
  - 409/422/pending/loading/empty/error/warning/success recover without stale residue.
  - TASK-0027 tab reorder and responsive geometry remain intact at all viewports.
  - Stable selectors, syntax/focused/full frontend suite and structured report are complete.
requested_skills:
  - frontend/design-implementation
  - frontend/multi-page-element
  - frontend/graph-output-zone
  - frontend/settings-controls
  - frontend/output-loading-flow
design_ref: ../design/TASK-0044-multilayout-ui/DESIGN.md
design_version: 1
design_status: ready
required_states: [default, hover, focus, active, disabled, loading, empty, error, warning, success, conflict]
required_viewports: [1440x900, 1280x720, 1024x768]
design_evidence:
  - ../design/TASK-0044-multilayout-ui/screenshots/
---
