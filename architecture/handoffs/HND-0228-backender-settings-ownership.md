---
id: HND-0228
type: task
from: orchestrator
to: backender
title: Зафиксировать authoritative ownership трёх settings pages
task_section: ../tasks/TASK-0056-settings-tab-ownership.md#scope
description: |
  Work on branch neuro_signal_analyser_ui_refinement. Inventory every current
  settings field, default, visibility condition and API/state owner. Produce a
  complete field→page/type matrix for Display, Time and Measurements, with the
  user-shown Options/Time units/X limits/Y limits block assigned to Time.
  Remove authoritative duplication and update backend-owned sections only if
  required. This is semantic ownership, not visual design. Send a precise FYI
  mapping to Designer/Orchestrator early enough for HND-0227, then return the
  implementation/contract report. Preserve existing math and Engee behavior.
  Do not read or modify Project.toml/Manifest.toml, do not start the application
  locally, and do not touch frontend/tests or user skill updates.
acceptance_criteria:
  - Complete field→page/type/default/visibility matrix exists.
  - Every setting has one semantic owner; duplicates and lost controls are absent.
  - Time screenshot block is assigned to Time.
  - Applicable backend checks pass without local runtime.
  - Report changed paths, FYI contract, applied and skipped skills.
requested_skills:
  - backender/state-model
  - backender/api-contract-planning
---
