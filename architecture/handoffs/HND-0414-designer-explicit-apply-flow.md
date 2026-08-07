---
id: HND-0414
type: design_task
from: orchestrator
to: designer
title: Design explicit Apply calculation states on accepted design v2
task_section: ../tasks/TASK-0080-design-explicit-apply-flow.md#scope
design_mode: autonomous
required_states: [pristine, dirty, invalid, applying, pending, ready, stale, error, retry]
required_viewports: [1024x768, 1280x720, 1440x900]
required_overlay_combinations: [settings_validation_with_help, applying_with_passive_toast, stale_error_with_retry]
description: |
  Extend accepted design v2 rather than replacing its composition. Define a
  visible explicit Apply state machine for calculation-affecting settings while
  presentation-only actions remain immediate. Preserve analytical-dense
  geometry, local Roboto/assets, responsive unlimited growth, document scroll
  below minima, Plotly area integrity and existing overlay priority/focus rules.
  Do not add a separate visible dirty/not-applied badge: draft state is expressed
  by field content and Apply availability. Apply flushes pending valid field
  updates; locally unparseable numeric drafts block it, backend semantic errors do not.
acceptance_criteria:
  - Versioned DESIGN.md and local clickable prototype cover every required state.
  - Interaction map proves input does not calculate and Apply is the only commit.
  - UI profile, assets, proportions, page sizing and overlay contracts are complete.
  - Screenshots and walkthrough evidence cover all three viewports.
requested_skills: [designer/designer-workflow, designer/data-entry-and-inspection, designer/output-and-visualization, designer/application-composition, designer/visual-system, designer/page-sizing-contract]
---
