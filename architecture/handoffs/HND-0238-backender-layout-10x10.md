---
id: HND-0238
type: task
from: orchestrator
to: backender
title: Расширить layout state/API/session contract до 10×10
task_section: ../tasks/TASK-0066-layout-10x10-contract.md#scope
description: |
  Work on neuro_signal_analyser_ui_refinement. Implement the explicit user
  override from max 4×4 to max 10×10 in backend-owned validation/state/session/
  API paths. Preserve pane identity, active pane, type and bindings and avoid
  eager inactive calculations/payloads. Backend accepts all allowed layouts;
  recommendation warning is non-blocking UI behavior. Run source/backend tests
  without local application start. Do not read/modify dependency files or touch
  frontend/tests/user skill updates. Return changed paths, contract/report and
  applicable FYIs with applied skills.
acceptance_criteria:
  - Boundary 1/10 accepted and 0/11 rejected for rows/columns.
  - 10×10 round-trip and existing layouts are deterministic/backward-compatible.
  - Inactive panes do not trigger eager calculations or payloads.
  - Backend checks pass without local runtime or dependency access.
requested_skills:
  - backender/state-model
  - backender/api-contract-planning
  - backender/calculation-planning
---
