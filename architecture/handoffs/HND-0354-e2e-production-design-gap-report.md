---
id: HND-0354
type: report
from: e2e
to: orchestrator
title: Production is materially behind design v2
task_section: ../tasks/TASK-0074-restore-production-design-v2.md#acceptance-criteria
description: |
  Foreground Chrome 151 compared the pinned prototype and production at all
  three viewports. Production toolbar is 64px versus 44px; the 42px workspace
  title row is absent; tabs are 48px versus 32px; settings are duplicated,
  oversized and retain English labels; inspector starts at y=619 versus y=586
  and leaves about 108px for table content versus 162.5px. The production plot
  remained in «Обновление графика…» after 10 seconds with no _fullLayout,
  _fullData, SVG axes or traces, while the prototype exposed live Plotly panes.
  This is a P0 Frontend restore plus an authoritative active-output pending gap.
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: 2
design_status: ready
required_viewports: [1024x768, 1280x720, 1440x900]
design_evidence:
  - ../../test/playwright/artifacts/HND-0352/prototype-1440x900-initial.png
  - ../../test/playwright/artifacts/HND-0352/production-1440x900-initial.png
  - ../../test/playwright/artifacts/HND-0352/summary.json
applied_skills: [e2e/e2e-workflow, e2e/visual-analysis]
---
