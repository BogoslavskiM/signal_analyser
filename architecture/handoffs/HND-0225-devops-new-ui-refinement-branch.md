---
id: HND-0225
type: task
from: orchestrator
to: devops
title: Открыть общую feature branch UI refinement cycle
task_section: ../tasks/TASK-0055-ui-refinement-2026-08-05.md#queue-decision
devops_request: new_feature_branch
feature_slug: signal_analyser_ui_refinement
source_branch: neuro_dev
target_branch: neuro_signal_analyser_ui_refinement
description: |
  Create neuro_signal_analyser_ui_refinement from exact integrated neuro_dev
  SHA cac83c5f445352a50f04aeeeb269b47007766d79 and make it the active branch
  of the original workspace for all child agents. Preserve every existing
  uncommitted user change and do not stage, commit, discard, rewrite or stash
  it. The current old-feature tree is content-equivalent to integrated
  neuro_dev; stop if switching cannot be done safely. By explicit user
  instruction, do not read, modify, stage, sync or use Project.toml or
  Manifest.toml. Do not run application, deploy or environment sync.
acceptance_criteria:
  - Branch is based on exact neuro_dev SHA cac83c5f445352a50f04aeeeb269b47007766d79.
  - origin/neuro_signal_analyser_ui_refinement exists and original workspace is on it.
  - All uncommitted user changes remain intact and unstaged.
  - Project.toml/Manifest.toml and runtime are untouched.
requested_skills: []
---
