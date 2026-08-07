---
id: HND-0357
type: report
from: frontend
to: orchestrator
title: Production frontend source aligned to design v2 with overlay priority
task_section: ../tasks/TASK-0074-restore-production-design-v2.md#acceptance-criteria
description: |
  Frontend updated public/** for the analytical-dense v2 shell: 44px toolbar,
  42px workspace title, 32px navigation/pane rows, compact settings/table
  geometry, three approved settings pages, local Roboto/SVG assets and canonical
  navigation controls. It retained state-lite startup, active-output polling,
  revisions, debounce, mutation dispatch and lazy latest-only Plotly. The shared
  overlay contract now covers layout/pane/inspector/settings menus, graph-help,
  tooltips, toasts, main dialogs, nested confirmation and screen deletion with
  inert lower surfaces, focus trapping/restoration and no graph-flow shift.
  Frontend corpus passes 8/8 and source/diff checks pass. Runtime evidence awaits
  the active-output pending fix, Tester coverage and redeployment.
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: 2
design_status: ready
ui_profile: analytical-dense
required_viewports: [1024x768, 1280x720, 1440x900]
applied_skills: [frontend/frontend-workflow, frontend/task-analysis, frontend/zone-structure-api, frontend/design-implementation, frontend/application-toolbar, frontend/settings-controls, frontend/inspector-ui, frontend/multi-page-element, frontend/graph-output-zone, frontend/output-loading-flow, frontend/dialog-system]
---
