---
id: HND-0229
type: task
from: orchestrator
to: e2e
title: Воспроизвести и профилировать production frontend stalls
task_section: ../tasks/TASK-0059-profile-frontend-stalls.md#scope
description: |
  e2e_mode: analysis_regression
  Profile only exact production Engee target
  https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/ at
  runtime revision 38d4134ea962b264ebabe0e7e9814c48368a975c. Use installed
  Google Chrome foreground-visible, headless:false, one sequential worker and
  bring the page to front before every scenario. Reproduce the unacceptable
  stalls across settings edits, plot-type changes, active-pane/layout changes,
  signal checkbox bindings and opening the main add flow. Capture deterministic
  scenario, P50/P95 interaction latency, long tasks, scripting/render/layout/
  paint, request waterfall and payload sizes, Plotly calls, DOM/render counts
  and backend/API wait. Attribute evidence among frontend, backend calculation,
  Plotly and platform shell. Restore persistent state after profiling. You may
  add bounded profiling/regression artifacts only under test/playwright/** on
  neuro_signal_analyser_ui_refinement. Never start a local application, use
  localhost/devhub/fallback, deploy, manipulate Git or access dependency files.
acceptance_criteria:
  - Deterministic scenario and repeat matrix reproduce or disprove the stall.
  - P50/P95 and long-task/network/render evidence identify the root layer.
  - Concrete budgets and backend/frontend remediation contract are returned.
  - Browser channel, foreground visibility, headless:false, worker count,
    target and revision are reported with applied skills.
requested_skills:
  - e2e/visual-analysis
browser_channel: chrome
headless: false
browser_visibility: foreground
worker_count: 1
expected_revision: 38d4134ea962b264ebabe0e7e9814c48368a975c
---
