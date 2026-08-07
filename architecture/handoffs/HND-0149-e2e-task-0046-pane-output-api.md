---
id: HND-0149
type: task
from: orchestrator
to: e2e
title: Verify deployed per-pane output API contract
task_section: ../tasks/TASK-0046-multilayout-pane-output-contract.md#verification-and-results
description: |
  Run the one post-task production API regression on exact revision
  8c0d37e525268b2acf4781a4cb61e823a50639f8. Verify ordered layouts[].outputs
  for GET, successful POST and stale 409 current; identity/type/bindings,
  Time/Spectrum/Spectrogram/Persistence typed data, Spectrum frequency_scale,
  empty/error isolation and maximum sixteen panes. Prove reads do not mutate
  revision/active pane. Restore the exact initial state/session after mutations.
acceptance_criteria:
  - Report shape, type, parity, immutability and restoration totals separately.
  - Distinguish provider/data limitations from contract defects.
requested_skills: [e2e/e2e-workflow]
design_ref: ../design/TASK-0044-multilayout-ui/DESIGN.md
design_version: 2
---
