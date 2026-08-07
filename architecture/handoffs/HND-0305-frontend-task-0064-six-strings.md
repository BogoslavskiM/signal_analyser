---
id: HND-0305
type: task
from: orchestrator
to: frontend
title: Localize six remaining product-owned strings
task_section: ../tasks/TASK-0064-localize-interface-russian.md#acceptance-criteria
description: |
  Own only public/index.html, public/js/app.js and public/css/layouts.css.
  Replace the six exact HND-0304 strings with natural Russian product copy:
  raw-массивов, snapshot, both Display phrases, Prominence and Updating….
  Preserve API/test identifiers and no runtime translator. Do not change tests,
  backend, architecture or dependency files and do not start a local app.
acceptance_criteria:
  - Strict localization inventory passes with no broader allowlist.
  - Full frontend suite passes.
  - Plotly interaction and graph lifecycle code are unchanged.
requested_skills: [frontend/frontend-workflow, frontend/design-implementation]
---
