---
id: HND-0325
type: report
from: tester
to: orchestrator
title: Active-output audit found duplicate lifecycle ownership
task_section: ../tasks/TASK-0060-remediate-frontend-performance-architecture.md#acceptance-criteria
description: |
  Tester modernized legacy state-lite/lazy-Plotly expectations and added a
  strict lifecycle source contract, then stopped on product gaps. layouts.js
  contains duplicate definitions (normalizeEnvelope 2, acceptEnvelope 2,
  queuePaneRender 3, renderPanePlots 2, refresh 3, postLayout 2,
  onAppRendered 2), so hoisting makes race ownership ambiguous. app.js still
  retains an eager Plotly lifecycle competing with layouts.js. Lite snapshots
  without measurement_kinds also fail the canonical three-value Statistics
  default. Isolated corpus passed 5/8 and failed 3; sequential complete runner
  stopped on app.behavior. HND-0326 owns the product cleanup; Tester retains
  the modernized tests for rerun afterward.
acceptance_criteria:
  - Strict duplicate lifecycle audit: failed with exact Frontend gaps.
  - Product/test ownership preserved: passed.
  - Complete frontend corpus: blocked by HND-0326.
applied_skills: [tester/tester-workflow, tester/frontend-static-behavior-testing]
---
