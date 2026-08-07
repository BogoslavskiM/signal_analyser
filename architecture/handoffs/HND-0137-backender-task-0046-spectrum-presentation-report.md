---
id: HND-0137
type: report
from: backender
to: orchestrator
title: Inactive Spectrum frequency scale added to pane output
task_section: ../tasks/TASK-0046-multilayout-pane-output-contract.md#verification-and-results
applied_skills: [backender/api-contract-planning, backender/calculation-planning]
description: |
  Every nonempty derived Spectrum trace now adds canonical frequency_scale
  linear/log from typed pane settings. Top-level output, active snapshot,
  empty Spectrum and other renderer types remain unchanged. GET, POST 200 and
  409.current share the builder; session round-trip restores inactive log
  metadata. Cache/provider behavior is unchanged and metadata work is linear in
  trace count. Focused 4/4 testsets, 87/87 assertions; full backend 84/84
  testsets, 2149/2149 assertions. Orchestrator reviewed the delta and
  independently repeated syntax and focused 87/87. Dependency files untouched.
---
