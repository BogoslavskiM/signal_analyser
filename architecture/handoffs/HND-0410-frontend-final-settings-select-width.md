---
id: HND-0410
type: task
from: orchestrator
to: frontend
title: Fix final 1024px Display-settings plot-type width
task_section: ../tasks/TASK-0076-fix-production-live-plotly-and-design-v2-gaps.md#acceptance-criteria
description: |
  HND-0407 proves that `settings-view-select` renders only “В” at 1024×768.
  Make the smallest responsive CSS-only correction in `public/css/layouts.css`
  so the Russian selected value is readable at 1024 while preserving the
  standard label/value row, 1440 geometry, full-page shell, Plotly and overlay
  behavior. Do not redesign or touch JS/HTML/dependency files. Prefer a scoped
  `max-width:1080px` override that reduces the legacy left offset and gives the
  select the remaining panel width without overflow or wrapping.
allowed_paths:
  - public/css/layouts.css
acceptance_criteria:
  - At 1024 the settings select has at least 130 CSS px content-box width and remains inside the panel.
  - Label and control remain aligned and readable without overlap.
  - 1440 geometry is unchanged.
  - Existing frontend corpus passes.
requested_skills: [frontend/frontend-workflow, frontend/design-implementation]
---
