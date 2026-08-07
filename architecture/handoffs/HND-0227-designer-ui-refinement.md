---
id: HND-0227
type: design_task
from: orchestrator
to: designer
title: Создать полный reference-driven UI refinement design package
task_section: ../tasks/TASK-0057-ui-overlay-refinement-design.md#scope
design_mode: autonomous
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: null
design_status: partial
ui_profile: source-derived canonical analytical-dense or form-workbench
required_states: [default, hover, focus-visible, active, pressed, disabled, loading, empty, error, warning, success]
required_viewports: [1440x900, 1280x720, 1024x768]
required_overlay_combinations:
  - main dialog over application plus child dropdown or tooltip
  - nested confirmation over main dialog with stale transient overlay
  - settings or layout popover plus dropdown and passive toast
  - inspector overflow menu plus tooltip
description: |
  Work on branch neuro_signal_analyser_ui_refinement and only inside
  architecture/design/TASK-0057-ui-overlay-refinement/**. Produce the complete
  versioned, fully clickable design required by TASK-0055/TASK-0057. Cover all
  three Display settings pages and every current plot type; standard label→control
  rows, canonical selects and right-side checkbox controls; compact upper-right
  plot legends; direct `+` main dialog; canonical Engee emblem/template assets;
  inspector `+` next to vertical ellipsis with eye/eye-off column visibility
  inside its menu; no pane-binding caption, Info action or signal count; full
  Russian product/accessibility copy; 5–10 px table-zone reduction; exact
  borders/radii and every button state from updated canonical references.
  Define a single observable overlay priority/hit/focus/restoration contract.
  Use the explicit task requirements over older designs and screenshots. Read
  screenshots `/Users/makar/Desktop/Снимок экрана 2026-08-05 в 10.40.15.png`
  and `/Users/makar/Desktop/Снимок экрана 2026-08-05 в 11.30.48.png` only as
  requirement evidence, not as visual style. Build and click-test the complete
  interaction map; include local Roboto, only used canonical SVGs, exact
  profile/proportion tokens and screenshots. Incorporate any factual field→tab
  delta from TASK-0056 before reporting ready. Do not edit product/tests,
  dependency files or runtime and do not overwrite user skill changes.
acceptance_criteria:
  - DESIGN.md, prototype, interaction map, assets and screenshots are complete.
  - All three settings pages and required dynamic/overlay states are reachable.
  - UI profile, exact geometry/radii/states and component-reference matrix are pinned.
  - Overlay priority, hit/focus owner and close restoration are explicit.
  - Return design_report with version/status/evidence and applied_skills.
requested_skills:
  - designer/application-composition
  - designer/data-entry-and-inspection
  - designer/output-and-visualization
  - designer/dialog-and-file-flows
---
