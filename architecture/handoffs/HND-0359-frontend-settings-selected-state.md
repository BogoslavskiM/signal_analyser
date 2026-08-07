---
id: HND-0359
type: task
from: orchestrator
to: frontend
title: Add pinned selected state for settings menu options
task_section: ../tasks/TASK-0074-restore-production-design-v2.md#acceptance-criteria
description: |
  Own public/** only. HND-0358 confirms settings.js already emits
  aria-selected=true but settings.css has no visible selected option selector.
  Add the exact pinned #e6f5fc selected-state rule, preserving the 34px option
  geometry and distinct hover/pressed/focus/disabled states without layout
  shift. Do not change tests/backend/architecture/dependencies or local runtime.
  Run syntax/diff and the complete frontend corpus including the new ninth file.
acceptance_criteria:
  - aria-selected=true has the exact pinned selected background.
  - Other option states and geometry remain distinct and stable.
  - Complete nine-file frontend corpus passes.
requested_skills: [frontend/frontend-workflow, frontend/design-implementation, frontend/settings-controls]
---
