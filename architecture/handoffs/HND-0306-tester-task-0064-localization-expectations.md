---
id: HND-0306
type: task
from: orchestrator
to: tester
title: Align deterministic localization expectations with Russian product copy
task_section: ../tasks/TASK-0064-localize-interface-russian.md#acceptance-criteria
description: |
  Own test/front/** only. Update the seven exact behavior expectations that
  still require `Некорректная структура snapshot сервера.` so they assert the
  accepted Russian product string `Некорректная структура состояния сервера.`.
  Preserve the strict localization inventory audit and all Plotly lifecycle,
  interaction, overlay and behavior assertions. Run the focused behavior file
  and the complete frontend corpus. Do not change public, backend,
  architecture, dependency files or start a local application.
acceptance_criteria:
  - No deterministic test expects the superseded mixed-language copy.
  - Focused behavior and strict localization audits pass.
  - Full frontend corpus passes with Plotly interaction contracts intact.
requested_skills: [tester/tester-workflow, tester/frontend-static-behavior-testing]
---
