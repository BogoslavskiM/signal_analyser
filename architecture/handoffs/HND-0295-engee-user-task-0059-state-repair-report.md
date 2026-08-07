---
id: HND-0295
type: report
from: engee_user
to: orchestrator
title: Production baseline selection state repaired revision-safely
task_section: ../tasks/TASK-0059-profile-frontend-stalls.md#verification-and-results
expected_revision: cac83c5f445352a50f04aeeeb269b47007766d79
description: |
  Attested exact production SHA and ready/ok status, then preserved the raw
  revision-64 layout response. It exactly matched the HND-0279 corruption:
  authoritative root order [A,B], Display/pane order [B,A], row selection A and
  analysis/selected B. Issued exactly one guarded POST /api/view with revision
  64 and canonical Time/A/[A,B] projection. It returned HTTP 200 revision 65;
  no 409 and no replay. Postcondition GET is canonical at root, Display, pane
  bindings and plot payload; all selection fields are A, active pane is ready,
  successful and contains two ordered 512-point line traces. No deployment,
  files, dependencies, localhost/devhub/fallback or application start was used.
applied_skills: [engee_user/engee-user-workflow]
skipped_requested_skills: []
---
