---
id: HND-0335
type: report
from: tester
to: orchestrator
title: Eager Plotly tests modernized; first state-lite bootstrap gap isolated
task_section: ../tasks/TASK-0060-remediate-frontend-performance-architecture.md#acceptance-criteria
description: |
  Tester removed app-owned eager Plotly expectations, retained metadata
  quarantine, and moved stale/latest-only/lazy-load behavior to layouts.js.
  Seven of eight isolated files pass. The remaining deterministic gap is in
  layouts onAppRendered: detail.activeDisplayId is not assigned before
  acceptEnvelope, so liteOutputRecord compares the valid status display id with
  an empty activeDisplayId and rejects the first app-published snapshot. HND-0336
  owns the one-source bootstrap correction; tests must retain no-second-GET
  evidence.
acceptance_criteria:
  - Obsolete eager app Plotly expectations removed: passed.
  - Strict active-output lifecycle audit preserved: passed.
  - Full corpus: 7/8 isolated, blocked by HND-0336 bootstrap gap.
applied_skills: [tester/tester-workflow, tester/frontend-static-behavior-testing]
---
