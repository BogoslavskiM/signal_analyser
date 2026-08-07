---
id: HND-0120
type: report
from: e2e
to: orchestrator
title: Restored runtime and authoritative layout API regression passed
task_section: ../tasks/TASK-0041-restore-production-after-maintenance.md#verification-and-results
applied_skills: [e2e/e2e-workflow]
description: |
  Exact revision 18cfe33b4cf170547adba23c76c744c9e79b42ed was available.
  Planned/passed/failed/not-run 7/7/0/0, success 100%. Root and /api/status
  returned HTTP 200; initial layout, no-op select, malformed 422 and stale 409
  all matched the authoritative contract without partial mutation. Final layout
  snapshot equalled the initial snapshot. An intermittent startup error toast
  remained visible but did not affect the tested API contract.

  Evidence: /private/tmp/e2e-hnd-0101-20260804-evidence/HND-0101-final-1440x900.png
---
