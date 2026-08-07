---
id: HND-0266
type: task
from: orchestrator
to: e2e
title: Проверить production 10x10 и active-only после exact deploy
task_section: ../tasks/TASK-0066-layout-10x10-contract.md#acceptance-criteria
source_branch: neuro_signal_analyser_ui_refinement
evidence_status: unavailable
description: |
  Post-task browser verification is registered but cannot run against the old
  published revision. Execute after the feature revision is deployed: verify
  1x1, 4x4 and 10x10, active-only output requests, warning behavior and exact
  final state. Do not accept the current recovery target as feature evidence.
acceptance_criteria:
  - Exact deployed feature revision is attested before mutation.
  - 10x10 and active-only browser behavior pass without maintenance/runtime loss.
requested_skills:
  - e2e/e2e-workflow
  - e2e/visual-analysis
---
