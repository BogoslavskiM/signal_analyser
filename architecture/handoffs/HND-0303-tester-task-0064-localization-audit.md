---
id: HND-0303
type: task
from: orchestrator
to: tester
title: Audit complete Russian product-owned UI source contract
task_section: ../tasks/TASK-0064-localize-interface-russian.md#acceptance-criteria
description: |
  Own test/front/** only. Add a deterministic localization inventory audit over
  product-owned public HTML/JS excluding vendor assets. Prove visible,
  accessibility, validation, loading/error/success/menu/dialog/table/tooltip
  copy is Russian. Maintain a narrow explicit allowlist for API enum values,
  identifiers, user data placeholders and conventional units such as Hz, dB,
  RMS; do not allow broad English regex exceptions. Include dynamic strings
  and quarantine/error paths. Preserve the full seven-file/overlay corpus.
  Report any product strings requiring Frontend correction rather than using a
  runtime translator. Do not change public/backend/architecture/dependencies or
  start a local application.
acceptance_criteria:
  - Product-owned source has no English UI copy outside the explicit allowlist.
  - Dynamic/accessibility/error paths are included.
  - Full frontend suite remains green or exact Frontend gaps are reported.
requested_skills: [tester/tester-workflow, tester/frontend-static-behavior-testing]
---
