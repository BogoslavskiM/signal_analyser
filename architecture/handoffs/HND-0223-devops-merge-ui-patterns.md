---
id: HND-0223
type: task
from: orchestrator
to: devops
title: Интегрировать технически принятую UI patterns feature в neuro_dev
task_section: ../tasks/TASK-0014-engee-signal-analyser-ui-parity.md#verification-and-results
devops_request: merge_feature
feature_slug: signal_analyser_ui_patterns
source_branch: neuro_signal_analyser_ui_patterns
target_branch: neuro_dev
integration_gate: passed
integration_evidence: [TASK-0014, HND-0221, HND-0197, HND-0220]
documented_external_blockers: []
description: |
  Squash-merge completed feature into neuro_dev before opening the next feature
  branch. Source revision is 38d4134ea962b264ebabe0e7e9814c48368a975c;
  production and required E2E gates are recorded in the linked evidence.
  Preserve every existing uncommitted user change. The workspace contains a
  user-provided agents/skills update; do not stage, commit, discard or rewrite
  it. Use an isolated temporary Git worktree if the dirty checkout prevents a
  safe merge. By explicit user instruction, do not read, modify, stage, sync or
  otherwise use Project.toml or Manifest.toml in this request.
acceptance_criteria:
  - neuro_signal_analyser_ui_patterns is squash-merged into current neuro_dev.
  - Resulting neuro_dev SHA is pushed to origin and reported.
  - Existing dirty user changes remain byte-for-byte untouched and unstaged.
  - Project.toml and Manifest.toml are untouched and no environment sync runs.
requested_skills: []
---
