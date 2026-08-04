---
id: HND-0058
type: task
from: orchestrator
to: devops
title: Установить recorded dependencies и поднять TASK-0036 runtime
task_section: ../tasks/TASK-0036-apply-frontend-design-patterns.md#verification-and-results
devops_request: deploy
feature_slug: signal_analyser_ui_patterns
source_branch: neuro_signal_analyser_ui_patterns
description: >
  retry_of: HND-0056. Expected checkout SHA
  d170f878ef292a1822e35290be4c0e193d5141a9. Пользователь явно разрешил
  самостоятельно поднять приложение для E2E. В production checkout
  `/user/apps/signal_analyser` выполни `Pkg.instantiate()` в текущем project
  environment как необходимый recorded-dependency prerequisite, затем запусти
  Genie по проектному entrypoint, проверь process/logs и HTTP. Не меняй source,
  Project.toml/Manifest contracts, branch или revision; не используй fallback.
acceptance_criteria:
  - Production checkout остаётся на exact expected SHA.
  - Recorded dependencies установлены без repository source changes.
  - Возвращены runnable application URL, HTTP status и relevant startup logs.
requested_skills: []
---
