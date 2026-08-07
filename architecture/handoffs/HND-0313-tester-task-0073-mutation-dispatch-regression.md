---
id: HND-0313
type: task
from: orchestrator
to: tester
title: Reproduce pane-host topology and verify mutation dispatch recovery
task_section: ../tasks/TASK-0073-fix-frontend-mutation-dispatch.md#acceptance-criteria
description: |
  Own test/front/** only. Add a deterministic behavior regression that removes
  or omits the legacy `display-plot-title` while retaining the pane-owned title
  topology observed in production. Prove plot-type change does not throw,
  queues exactly one intended product mutation, accepts its authoritative
  response and settles busy/disabled state. Cover confirmed screen deletion in
  the same topology with exactly one `/api/displays` mutation and completed
  confirmation lifecycle. Preserve all localization, overlay, latest-only
  Plotly.react and non-static interaction assertions. Do not weaken generic DOM
  helpers to hide null accesses. Run focused and complete frontend corpus.
  Do not change public/backend/architecture/dependencies or start a local app.
acceptance_criteria:
  - Missing legacy title reproducer no longer aborts either mutation path.
  - Exact request counts, paths and post-response state are asserted.
  - Full frontend corpus and existing Plotly/overlay contracts pass.
requested_skills: [tester/tester-workflow, tester/frontend-static-behavior-testing]
---
