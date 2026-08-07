---
id: HND-0353
type: task
from: orchestrator
to: frontend
title: Implement the complete pinned design v2 in production frontend
task_section: ../tasks/TASK-0074-restore-production-design-v2.md#acceptance-criteria
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: 2
design_status: ready
ui_profile: analytical-dense
prototype_entry: ../design/TASK-0057-ui-overlay-refinement/prototype/index.html
prototype_interaction_map: ../design/TASK-0057-ui-overlay-refinement/evidence/interaction-walkthrough.json
required_viewports: [1024x768, 1280x720, 1440x900]
description: |
  Own public/** only. The user explicitly rejects production revision
  c7e0f9a4bbe145be14a197c25d0c8700c0f205ee as an ancient, substantially wrong
  UI and prioritizes application of the new design plus frontend review. Treat
  pinned design v2 as the complete specification and perform a zone-by-zone
  implementation, not a cosmetic patch. Compare production DOM/CSS/assets to
  DESIGN.md and the local prototype across all required viewports; replace the
  legacy shell/composition with the approved toolbar, Display navigation,
  pane controls/plots, all three settings pages, inspector/table, menus,
  dialogs and overlay states. Apply exact analytical-dense geometry, local
  Roboto/SVG assets and canonical interaction tokens. Preserve the current
  state-lite, active-output, revision, debounce, exactly-one mutation dispatch
  and latest-only live Plotly architecture. Prototype demo.js is not production
  code and must not be copied. If a genuine technical constraint requires a
  visible deviation, issue a design_revision instead of inventing one. Run
  syntax/diff checks and the complete frontend corpus without local runtime.
  Incorporate HND-0352 measured gap evidence when it arrives; do not wait to
  begin the obvious zone-by-zone replacement. Do not edit tests/backend/
  architecture/dependencies or use CDN.
acceptance_criteria:
  - Production public/** implements every visible design v2 zone and state.
  - Exact proportions, assets, typography and interaction tokens match at all viewports.
  - Live Plotly and state-lite/performance/mutation contracts remain intact.
  - Complete frontend corpus and source checks pass.
requested_skills: [frontend/frontend-workflow, frontend/task-analysis, frontend/zone-structure-api, frontend/design-implementation, frontend/application-toolbar, frontend/settings-controls, frontend/inspector-ui, frontend/multi-page-element, frontend/graph-output-zone, frontend/output-loading-flow, frontend/dialog-system]
---
