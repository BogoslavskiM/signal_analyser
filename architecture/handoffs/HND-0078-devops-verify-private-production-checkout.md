---
id: HND-0078
type: task
from: orchestrator
to: devops
title: Проверить private GitHub checkout в production Engee apps
task_section: ../tasks/TASK-0038-restore-engeedsp-project-contract.md#verification-and-results
devops_request: clone_repo
repository_url: https://github.com/BogoslavskiM/signal_analyser.git
repository_name: signal_analyser
engee_apps_dir: /user/apps
git_username: BogoslavskiM
credential_source: protected_github_pat
source_branch: neuro_signal_analyser_ui_patterns
description: |
  После перехода repository в private mode подтвердить production checkout
  `/user/apps/signal_analyser`. Если target существует, только проверить exact
  normalized origin, private access, current requested feature branch и SHA;
  переиспользовать его лишь при полном совпадении repository. Не
  перезаписывать, не удалять и не переключать mismatched/non-Git/non-empty
  target. Использовать PAT только через временный non-interactive protected
  mechanism, удалить authentication material и не выводить credential.
  Это bootstrap verification; не stage/commit/push local workspace, не
  restart application и не менять production branch/revision без необходимости.
acceptance_criteria:
  - Verified clone target, normalized origin, requested branch and exact SHA are returned.
  - Private fetch/access succeeds without persisted or reported credentials.
  - Existing matching checkout is reused; mismatched target is reported without mutation.
  - All pipeline stages are reported as performed, not_needed, blocked or not_run.
requested_skills: []
---
