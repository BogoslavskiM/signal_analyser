---
id: HND-0262
type: FYI
from: backender
to: tester
title: Active-only pane output fix готов к независимому regression rerun
task_section: ../tasks/TASK-0070-fix-active-only-pane-output.md#acceptance-criteria
description: |
  Rerun pane_outputs, multilayout_integration and the full backend suite. The
  expected provider count sequence is Time 0/0/0, Spectrum 1/0/0,
  Spectrogram cumulative 1/1/0 and Persistence cumulative 1/1/1; inactive
  Displays remain 0/0/0. Each heavy-provider exception must return one typed
  failed active output. Do not use --project=. or access dependency files.
applied_skills: [backender/api-contract-planning, backender/calculation-planning]
skipped_requested_skills: []
---
