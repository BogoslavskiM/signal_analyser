---
id: HND-0121
type: report
from: e2e
to: orchestrator
title: Detailed current-layout design package visual regression passed
task_section: ../tasks/TASK-0040-generate-detailed-current-layout-design.md#verification-and-results
applied_skills: [e2e/e2e-workflow, e2e/visual-analysis]
description: |
  Production baseline at exact revision
  18cfe33b4cf170547adba23c76c744c9e79b42ed was available at 1440x900,
  1280x720 and 1024x768. Planned/passed/failed/not-run 50/50/0/0, success
  100%. Pinned DESIGN.md v1, local prototype, all 10 required states, overlay
  matrix and aggregate overflow gate passed with no page errors. Existing
  production overflow at 1280x720 and 1024x768 was recorded as baseline, not
  as a v1 implementation defect. The run was read-only.

  Evidence: /private/tmp/e2e-hnd-0103-20260804-evidence/HND-0103-run.json
---
