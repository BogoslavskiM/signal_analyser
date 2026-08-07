---
id: HND-0321
type: task
from: orchestrator
to: tester
title: Verify lightweight metadata and active-only output contracts
task_section: ../tasks/TASK-0065-backend-performance-architecture.md#acceptance-criteria
description: |
  Own test/back/** only. Update the four obsolete TASK-0031 route-source
  expectations from eager /api/layouts graph data to the accepted
  metadata/pending contract, then add deterministic unit/API coverage for the
  HND-0320 functions and routes. Verify state-lite/layout-lite contain no graph
  arrays; accepted mutation revision +1 and no-op +0; mutations create no task;
  active miss pending, duplicate poll task reuse, cache hit, inactive 409 with
  no CPU work, cancellation/stale publication rejection, last-good preservation
  on error and ordered ready Plotly records. Assert session serialization does
  not persist runtime tasks/cache. Preserve legacy /api/state compatibility.
  Do not change product/frontend/architecture/dependencies, do not read or use
  Project.toml/Manifest.toml and do not start a local application. Run focused
  and full backend corpus using dependency-independent commands only.
acceptance_criteria:
  - New deterministic contracts pass without weakening old semantics.
  - Full backend corpus passes with exact counts.
  - No inactive calculation or graph-array metadata path remains.
requested_skills: [tester/tester-workflow, tester/backend-unit-testing, tester/backend-api-testing]
---
