---
id: HND-0135
type: task
from: orchestrator
to: backender
title: Preserve inactive Spectrum axis scale in pane renderer output
task_section: ../tasks/TASK-0046-multilayout-pane-output-contract.md#scope
description: |
  Integration review found that derived Spectrum traces carry transformed data
  and limits but not the pane's authoritative frequency_scale. Active rendering
  reads that setting from active state; inactive panes cannot, so a stored log
  Spectrum would be plotted on a linear x axis. Add the minimal additive
  presentation metadata to each derived Spectrum trace (canonical
  frequency_scale linear/log) using the typed pane setting. Do not change the
  existing top-level output shape or active snapshot contract. Add a focused
  log-pane assertion and repeat focused/full backend suites. Work only the two
  active TASK-0046 backend/test paths; no frontend, architecture, dependency,
  Git or deployment changes.
acceptance_criteria:
  - Every nonempty derived Spectrum trace carries the pane's canonical frequency_scale.
  - Linear/log survives inactive pane/session-derived output and matches typed pane state.
  - Other renderer payloads and GET/200/409 parity remain unchanged.
  - Focused/full backend suites pass without dependency files.
requested_skills: [backender/api-contract-planning, backender/calculation-planning]
---
