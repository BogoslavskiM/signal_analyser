---
id: HND-0088
type: task
from: orchestrator
to: e2e
title: Visual quick regression после TASK-0036 UI patterns
task_section: ../tasks/TASK-0036-apply-frontend-design-patterns.md#verification-and-results
description: |
  e2e_mode: quick_regression
  trigger_task: TASK-0036
  target_status: available_with_known_deferred_finding
  target_link: https://engee.com/prod/user/demo54365638-bogoslm/
  runtime_revision: 3c06387ea5f4c6617b67a8081922fe52be22f381
  viewports: 1440x900, 1280x720, 1024x768
  zones: application toolbar, Display tabs, graph/output zone, Settings,
  Inspector/Signals table, dialogs and overlays.
  dynamic_states: default, hover, focus, active, disabled, busy/loading, error,
  success, empty and overflow where observable.
  planned_scope: Launch an independent browser; apply visual-analysis, capture
  deterministic screenshots and inspect semantic/interaction/geometry behavior
  for implemented UI patterns. If the known deferred `/api/state` finding
  prevents a state, classify it failed/not-run with evidence; do not edit
  dependency files, deploy or use devhub/fallback.
acceptance_criteria:
  - Report contains exact target/revision, screenshots and zone/state evidence.
  - Planned/passed/failed/not-run and 75 percent operational metric are explicit.
  - Durable Playwright assertions are added only for test-owned defects or stable visible behavior.
  - Findings create follow-up candidates and do not reopen terminal TASK-0036.
requested_skills:
  - e2e/visual-analysis
---
