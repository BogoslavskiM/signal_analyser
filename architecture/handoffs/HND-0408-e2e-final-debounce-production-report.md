---
id: HND-0408
type: report
from: e2e
to: orchestrator
title: Exact-revision TASK-0060 production smoke accepted
task_section: ../tasks/TASK-0060-remediate-frontend-performance-architecture.md#acceptance-criteria
description: |
  Production at SHA `bba7f2528abccf14dcdd313681c8fd8bf538d40c`
  passes root and `/api/status`, reports ready/ok, serves the exact 150 ms
  settings asset and retains usable full-page shells at 1024×768 and 1440×900.
  No active graph existed in this bounded state, so this run did not produce
  current-revision live-Plotly evidence. No page exception or HTTP 500 occurred.
  The reversible numeric debounce browser probe was not applicable because no
  enabled visible numeric input existed in the bounded smoke. Chrome recorded
  one unidentified non-500 resource 404 without product impact.
evidence:
  - ../../test/playwright/artifacts/HND-0407/report.json
  - ../../test/playwright/artifacts/HND-0407/production-1024x768.png
  - ../../test/playwright/artifacts/HND-0407/production-1440x900.png
result: accepted_with_p95_and_active_graph_evidence_gaps
---
