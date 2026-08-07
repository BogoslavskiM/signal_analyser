---
id: HND-0263
type: FYI
from: backender
to: frontend
title: Layout API is active-only and preserves typed output failures
task_section: ../tasks/TASK-0070-fix-active-only-pane-output.md#scope
description: |
  GET/POST /api/layouts and 409.current preserve their request/response fields.
  The active Display returns exactly one output for active_pane_id; inactive
  Displays return outputs=[]. Provider failure stays inside output with
  isready=true, success=false, error and typed empty data. Frontend should keep
  mounted live Plotly instances and update accepted active payloads through the
  pinned latest-only Plotly.react queue.
applied_skills: [backender/api-contract-planning, backender/calculation-planning]
skipped_requested_skills: []
---
