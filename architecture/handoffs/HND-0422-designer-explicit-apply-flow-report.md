---
id: HND-0422
type: design_report
from: designer
to: orchestrator
title: Explicit Apply calculation flow design ready
task_section: ../tasks/TASK-0080-design-explicit-apply-flow.md#scope
applied_skills: [designer/designer-workflow, designer/data-entry-and-inspection, designer/output-and-visualization, designer/application-composition, designer/visual-system, designer/page-sizing-contract]
design_ref: ../design/TASK-0080-explicit-apply-flow/DESIGN.md
design_version: 1
design_status: ready
ui_profile: analytical-dense
prototype_entry: ../design/TASK-0080-explicit-apply-flow/prototype/index.html
evidence_ref: ../design/TASK-0080-explicit-apply-flow/evidence/interaction-walkthrough.json
walkthrough_records: 32
passed: 32
failed: 0
screenshots: 47
browser_errors: 0
result: accepted
description: |
  The additive package preserves accepted TASK-0057 design v2 and specifies
  pristine, dirty, local-invalid, applying, pending, ready, backend-error,
  stale and retry states at 1024x768, 1280x720 and 1440x900. Dirty has no
  standalone badge/caption: only edited field values and Apply availability
  expose it. Valid 150 ms field saves are flushed before snapshot-free Apply;
  field updates perform zero calculation. Old output remains mounted through
  dirty/applying/error/stale and only the active pane receives a pending layer.
  Local parse errors block Apply; backend semantic errors preserve editable
  draft, prior output and Retry. Exact sizing, growth ratios, focus behavior,
  overlay ordering, local Roboto/icons/Plotly and undersized document scrolling
  are pinned. Local walkthrough and static checks passed with no remote runtime
  dependency.
---
