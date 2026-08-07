---
id: HND-0201
type: report
from: devops
to: orchestrator
title: Production runtime revision source contract ready
task_section: ../tasks/TASK-0043-expose-runtime-revision.md#verification-and-results
devops_request: diagnose
feature_slug: signal_analyser_ui_patterns
source_branch: neuro_signal_analyser_ui_patterns
paths: []
description: |
  Inject SIGNAL_ANALYSER_RUNTIME_REVISION from the exact lowercase 40-hex SHA
  independently verified across source/local/private/production checkout before
  launch. The application must not recalculate or fall back to Git or committed
  metadata. Current managed pod-start interface exposes no command/env fields,
  so deployment requires an equivalent managed launcher wrapper and must stop
  fail-closed if such injection cannot be guaranteed.
applied_skills: [devops/devops-workflow]
design_ref: null
design_version: null
design_status: n/a
---
