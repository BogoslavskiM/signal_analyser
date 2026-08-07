---
id: HND-0404
type: task
from: orchestrator
to: devops
title: Publish final TASK-0060 debounce patch
task_section: ../tasks/TASK-0060-remediate-frontend-performance-architecture.md#acceptance-criteria
devops_request: new_feature_branch
feature_slug: signal_analyser_ui_refinement
source_branch: neuro_dev
paths:
  - public/js/settings.js
  - test/front/public/js/settings_debounce.behavior.test.js
  - test/front/public/js/settings_debounce.static.test.js
description: |
  Reuse the existing `neuro_signal_analyser_ui_refinement` feature branch and
  commit/push only the exact three product/test paths. Return the resulting
  exact SHA for a separate revision-pinned deploy request. Do not access the
  production checkout or runtime in this publish step. Do not read, stage,
  copy or touch Project.toml or Manifest.toml. Preserve all unrelated dirty
  architecture/skills/agent work.
acceptance_criteria:
  - Exact-path commit is pushed to the existing feature branch.
  - Resulting exact SHA and staged paths are reported.
  - No production runtime or dependency file is touched.
requested_skills: [devops/devops-workflow]
---
