---
id: HND-0369
type: report
from: e2e
to: orchestrator
title: Production design-v2 acceptance blocked by frontend render crash
task_section: ../tasks/TASK-0076-fix-production-live-plotly-and-design-v2-gaps.md#acceptance-criteria
description: |
  Production acceptance failed: no live Plotly was visible and settings/style
  surfaces remained mixed. The first E2E probe inspected legacy /api/state and
  incorrectly inferred an API mismatch. Orchestrator follow-up proved the actual
  state-lite and active-output contracts are healthy: active output became ready
  on poll three with a valid interactive Plotly payload. Foreground Chrome then
  captured the authoritative blocker: layouts.js syncContext throws while
  writing textContent to the absent design-v2 layout-trigger-label node. The
  exception aborts rendering before pane hosts and polling are created.
acceptance_criteria:
  - Production rejection and visual gap: confirmed.
  - Backend state-lite/active-output contract mismatch: disproved.
  - Exact frontend stack location: public/js/layouts.js syncContext.
  - Popup and Plotly gesture acceptance must rerun after redeploy.
applied_skills: [e2e/e2e-workflow, e2e/visual-analysis]
---
