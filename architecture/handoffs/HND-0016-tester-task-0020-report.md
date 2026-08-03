---
id: HND-0016
type: report
from: tester
to: orchestrator
title: TASK-0020 session export/import contract coverage passed
task_section: ../tasks/TASK-0020-test-session-persistence.md#verification-and-results
description: >
  Добавлен test/back/lib/signal_session_service_test.jl. Focused session
  contract passed 38/38. После повторного полного запуска
  julia --project=. test/back/runtests.jl завершился exit 0; regression pass.
  В тесте покрыты export envelope, complex samples, round trip, revision,
  cache clearing, stale/rollback, schema/version/parser/API envelopes.
---
