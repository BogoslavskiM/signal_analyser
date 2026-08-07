---
id: HND-0169
type: task
from: orchestrator
to: frontend
title: Fix canonical healthy-API layout bootstrap loading failure
task_section: ../tasks/TASK-0052-fix-healthy-api-layout-bootstrap.md#scope
description: |
  Use HND-0167 evidence from exact SHA 8c0d37e525268b2acf4781a4cb61e823a50639f8.
  Reproduce/instrument app and layout bootstrap to capture the exact exception or
  ordering defect when page/status/state/layouts are canonical HTTP 200 but the
  shell remains Loading layout, zero panes, trigger placeholder and error toast.
  Inspect request payloads/response bodies and Promise/error transitions; do not
  infer from toast alone. Implement the minimal Frontend-owned fix and add focused
  delayed/out-of-order healthy API plus failure regressions. Preserve design v2
  and server authority. Own only necessary public frontend and test/front paths.
  No backend/architecture/dependency/Git/deploy edits; never inspect Project.toml
  or Manifest.toml. Return exact root cause, changed paths and test totals.
acceptance_criteria:
  - Exact failing line/order and canonical response evidence are documented.
  - Healthy bootstrap renders trigger/panes and clears busy/error deterministically.
  - Delayed/out-of-order and genuine failure cases remain safe and tested.
  - Focused and full frontend suites pass.
requested_skills:
  - frontend/frontend-workflow
  - frontend/task-analysis
  - frontend/output-loading-flow
  - frontend/design-implementation
  - frontend/frontend-project-structure
design_ref: ../design/TASK-0044-multilayout-ui/DESIGN.md
design_version: 2
design_status: ready
---
