---
id: HND-0062
type: task
from: orchestrator
to: devops
title: Заменить hung Genie process с явным production host/port
task_section: ../tasks/TASK-0036-apply-frontend-design-patterns.md#verification-and-results
devops_request: deploy
feature_slug: signal_analyser_ui_patterns
source_branch: neuro_signal_analyser_ui_patterns
description: >
  retry_of: HND-0060. Expected SHA d170f878ef292a1822e35290be4c0e193d5141a9.
  Read-only contract check подтвердил: run.jl defaults 127.0.0.1:8000, production
  ingress требует 0.0.0.0:8080. Если PID 416 всё ещё является единственным
  exact-checkout `julia --startup-file=no --project=. run.jl`, precompile
  workers завершены, port не слушает и log пуст, gracefully terminate только
  этот hung PID. Затем один раз запусти штатный run.jl с
  GENIE_HOST=0.0.0.0 GENIE_PORT=8080 и stdout/stderr в diagnostic log. Bounded
  monitor до HTTP readiness или terminal process exit. Не меняй source/config/
  revision/dependencies, не создавай duplicate process и не fallback.
acceptance_criteria:
  - Exact checkout SHA сохранён и production worktree clean.
  - Старый PID заменён только после повторной проверки guard conditions.
  - Возвращены new PID, captured logs, HTTP status и runnable URL либо terminal error.
requested_skills: []
---
