---
id: HND-0358
type: report
from: tester
to: orchestrator
title: Design-v2 and overlay coverage added; selected option state missing
task_section: ../tasks/TASK-0074-restore-production-design-v2.md#acceptance-criteria
description: |
  Tester added strict five-zone, local-asset, overlay priority/focus/dismissal
  and no-Plotly-overlay-work coverage in design_v2.static.test.js. Eight of nine
  frontend files pass. The one confirmed product mismatch is the selected menu
  option state: settings.js emits aria-selected=true, but settings.css lacks the
  pinned #e6f5fc selected-state selector. No other product defect is established
  by the expanded static corpus.
acceptance_criteria:
  - Five-zone and complete overlay inventory coverage: implemented.
  - Full frontend corpus: 8/9, blocked by HND-0359 selected-state fix.
applied_skills: [tester/tester-workflow, tester/frontend-static-behavior-testing]
---
