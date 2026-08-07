---
id: HND-0383
type: report
from: devops
to: orchestrator
title: Final UI revision serves production after stale-runtime reconciliation
task_section: ../tasks/TASK-0076-fix-production-live-plotly-and-design-v2-gaps.md#acceptance-criteria
source_branch: neuro_signal_analyser_ui_refinement
revision: e0d1253433505943569c2a6b5e07555d5504be0b
applied_skills: [devops/devops-workflow, devops/engee-deployment-diagnostics]
skipped_requested_skills: []
description: |
  DevOps stopped only the exact stale SignalAnalyser registration with the
  supported Engee lifecycle API and performed one absolute-path start. The
  unrelated RadarCalculate processes were preserved. Production checkout and
  served runtime now both use e0d1253; root and status return HTTP 200 with
  ready=true and ok=true. No source or dependency file changed during runtime
  reconciliation.
acceptance_criteria:
  - Production runtime revision is e0d1253433505943569c2a6b5e07555d5504be0b.
  - Exactly one supported SignalAnalyser registration was started after stop.
  - Root/status readiness passes and unrelated processes remain intact.
---
