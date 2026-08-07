---
id: HND-0289
type: task
from: orchestrator
to: tester
title: Independently verify canonical selection projection repair
task_section: ../tasks/TASK-0072-fix-layout-selection-projection.md#acceptance-criteria
description: |
  Independently run focused and full backend regression for HND-0288 without
  --project=. Verify reverse ordered pane bindings, canonical Display/root
  projection, corrupt-state rejection and same-layout repair revision rules,
  session import/round-trip atomicity and active-only outputs for inactive
  panes/Displays. Do not weaken tests or use Project.toml/Manifest.toml. Do not
  change product, frontend or architecture and do not start a local app.
acceptance_criteria:
  - Focused projection/session/layout tests pass independently.
  - Full backend suite passes and active-only provider counts remain exact.
  - Dependency files remain untouched and unused.
requested_skills: [tester/tester-workflow, tester/backend-unit-testing, tester/backend-api-testing]
---
