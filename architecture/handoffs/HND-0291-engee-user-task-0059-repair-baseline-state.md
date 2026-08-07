---
id: HND-0291
type: task
from: orchestrator
to: engee_user
title: Repair corrupt production baseline selection state revision-safely
task_section: ../tasks/TASK-0059-profile-frontend-stalls.md#verification-and-results
expected_revision: cac83c5f445352a50f04aeeeb269b47007766d79
description: |
  On production Engee only, preserve a bounded raw GET /api/layouts response
  and current readiness/revision evidence. If and only if the live state is
  still revision 64 with the HND-0279 invalid selection projection, issue the
  minimal revision-guarded POST /api/view recovery specified by HND-0288:
  active_plot=time; row_selected_signal, analysis_signal and selected_signal
  equal `Гармонический сигнал`; visible_signals in authoritative order
  [`Гармонический сигнал`, `Комплексный ЛЧМ-сигнал`]. Expect revision 65 and a
  functionally ready active plot. On 409 or any changed baseline, do not retry
  blindly; capture the new state and report. Do not deploy current local code,
  do not touch files/dependencies and do not use localhost/devhub/fallback.
acceptance_criteria:
  - Pre-mutation exact SHA, state revision and corrupt projection are evidenced.
  - At most one exact revision-guarded recovery mutation is attempted.
  - Success produces revision 65, valid canonical selection and ready active plot.
  - Conflict or mismatch leaves state untouched and returns precise evidence.
requested_skills: [engee_user/engee-user-workflow]
---
