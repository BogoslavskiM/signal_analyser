---
id: HND-0093
type: task
from: orchestrator
to: e2e
title: Quick regression production Genie runtime routing
task_section: ../tasks/TASK-0039-expose-production-genie-runtime.md#verification-and-results
description: |
  e2e_mode: quick_regression
  trigger_task: TASK-0039
  target_status: available_with_known_deferred_finding
  target_link: https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/
  runtime_revision: 18cfe33b4cf170547adba23c76c744c9e79b42ed
  planned_scope: Launch and close an independent browser. Verify external root,
  product DOM, title, /api/status and a minimal visible UI smoke covering the
  toolbar, Display area, Settings and Inspector/Signals area. Report exact
  planned/passed/failed/not-run counts and evidence. The known /api/state
  EngeeDSP behavior belongs to deferred TASK-0038: it may be recorded, but must
  not trigger dependency-file inspection or changes, deploy, devhub/fallback,
  or reopening terminal TASK-0039.
acceptance_criteria:
  - Report contains exact target/revision, availability and visible product evidence.
  - Success rate uses passed/planned with mandatory availability and 75 percent threshold.
  - Product findings become follow-up candidates and do not reopen terminal TASK-0039.
  - Project.toml and Manifest.toml remain untouched and unused.
requested_skills: []
---
