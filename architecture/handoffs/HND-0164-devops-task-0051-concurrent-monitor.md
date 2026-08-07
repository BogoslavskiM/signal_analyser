---
id: HND-0164
type: task
from: orchestrator
to: devops
title: Monitor and keep exact runtime during coordinated E2E
task_section: ../tasks/TASK-0051-stabilize-production-runtime.md#scope
devops_request: deploy
feature_slug: signal_analyser_ui_patterns
source_branch: neuro_signal_analyser_ui_patterns
paths: []
description: |
  While E2E runs HND-0162/HND-0165, monitor exact production SHA
  8c0d37e525268b2acf4781a4cb61e823a50639f8 for up to twelve minutes. Probe root
  and lightweight /api/status every 20–30 seconds; attest managed status,
  process/listener and new log tail at least each minute. If the app disappears,
  capture pre-restart status/process/listener/log and outage timing first, then
  perform at most one managed restart and continue monitoring. Do not invoke
  heavy state/layout/session probes that compete with E2E. No source/Git changes,
  dependencies, devhub/fallback or credential persistence.
acceptance_criteria:
  - Timeline reports every probe and any lifecycle transition.
  - Any disappearance has pre-restart process/status/log evidence.
  - Runtime remains or is restored to exact SHA without source mutation.
requested_skills: []
---
