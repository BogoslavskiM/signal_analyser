---
id: HND-0267
type: task
from: orchestrator
to: frontend
title: Реализовать pinned UI design v2 с живыми интерактивными Plotly graphs
task_section: ../tasks/TASK-0058-implement-ui-refinements.md#scope
design_mode: review
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: 2
design_status: ready
required_states: [default, loading, empty, error, overflow, overlay, confirmation, plot_zoom, plot_pan, plot_autoscale]
required_viewports: [1440x900, 1280x720, 1024x768]
prototype_entry: ../design/TASK-0057-ui-overlay-refinement/prototype/index.html
prototype_interaction_map: ../design/TASK-0057-ui-overlay-refinement/evidence/interaction-walkthrough.json
description: |
  Implement TASK-0058 in public/** from pinned design v2 and the confirmed
  TASK-0056/TASK-0066/TASK-0070 API contracts. Treat screenshots as review
  evidence only. Every pane must remain a live local Plotly DOM instance:
  render accepted payloads with a serialized latest-only Plotly.react queue,
  preserve LMB zoom, Shift+LMB pan and double-click autoscale after data/type/
  layout updates, and never use raster snapshots, background images, static
  SVG/Canvas or noninteractive fallback. Hide modebar/tools and do not reserve
  their container; this direct task/design requirement supersedes the old
  modebar paragraph in frontend/graph-output-zone. Do not copy prototype
  demo.js. Apply the complete Russian design copy so TASK-0064 can be audited
  immediately after implementation. Preserve product/backend behavior, use
  stable data-testid semantics, and do not modify tests, backend, architecture
  or dependency files. Do not start the app locally or use localhost evidence.
acceptance_criteria:
  - All TASK-0058 criteria and pinned design v2 are implemented in public/**.
  - Live Plotly gestures survive Plotly.react, pane type changes and layouts.
  - No image/static graph fallback or modebar/tool container exists.
  - TASK-0064 Russian copy inventory is implemented or exact gaps are reported.
  - Frontend static/behavior checks pass without local application runtime.
requested_skills:
  - frontend/frontend-workflow
  - frontend/task-analysis
  - frontend/zone-structure-api
  - frontend/design-implementation
  - frontend/frontend-project-structure
  - frontend/application-toolbar
  - frontend/settings-controls
  - frontend/graph-output-zone
  - frontend/output-loading-flow
  - frontend/inspector-ui
  - frontend/multi-page-element
  - frontend/dialog-system
---
