---
id: HND-0356
type: task
from: orchestrator
to: tester
title: Lock design-v2 production zones and overlay behavior in frontend tests
task_section: ../tasks/TASK-0074-restore-production-design-v2.md#acceptance-criteria
description: |
  Own test/front/** only. Independently review HND-0357 public/** against pinned
  design v2 and add deterministic static/behavior coverage for the 44px toolbar,
  42px workspace title, 32px tabs/pane headers, three settings pages, compact
  inspector/table, local Roboto/SVG assets and absence of legacy duplicated
  catalog/English UI labels. Cover every popup layer explicitly requested by
  the user: layout/pane/inspector/settings menus, graph-help, tooltip, toast,
  primary dialogs, nested confirmation and screen-delete confirmation. Assert
  priority tokens, lower-surface inertness, focus trap/restoration, Escape and
  click-outside semantics, stale transient dismissal and no Plotly render/
  resize triggered by modeless overlay open/close. Preserve state-lite, active
  output, exactly-one mutation dispatch and live non-static Plotly tests. Do not
  edit product/backend/architecture/dependencies or start a local app. Run the
  complete frontend corpus.
acceptance_criteria:
  - All five design zones have deterministic source/behavior coverage.
  - Complete overlay inventory and priority/focus/dismissal contracts are covered.
  - Live Plotly/state-lite/mutation performance tests remain strict.
  - Complete frontend corpus passes; only test/front/** changes.
requested_skills: [tester/tester-workflow, tester/frontend-static-behavior-testing]
---
