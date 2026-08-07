---
id: HND-0429
type: implementation_report
from: frontend
to: orchestrator
title: Remove browser-side Time normalization
task_section: ../tasks/TASK-0082-frontend-explicit-apply-state-machine.md#scope
source_handoffs: [HND-0423, HND-0425, HND-0426]
applied_skills: [frontend/frontend-workflow, frontend/task-analysis, frontend/output-loading-flow, frontend/graph-output-zone, frontend/design-implementation]
skipped_requested_skills: []
design_ref: unchanged
design_status: no_visible_or_layout_change
changed_paths: [../../public/js/app.js]
evidence_status: focused_static_and_behavior_checks_passed_full_frontend_suite_blocked_by_obsolete_tester_assertions
---

# Frontend report: backend-authoritative Time payload

## Implemented scope

`public/js/app.js` no longer calculates or remaps Time graph values in the
browser. The Time rendering path removes `traceScale`, `normalizedValues`, the
per-trace affine normalization of `y`, and analysis-source scaling of peak
marker values. It now forwards the backend-provided trace arrays unchanged and
maps backend peak item coordinates directly.

Consequently the Julia-prepared real/imaginary trace ordering and independent
per-trace min-max values (including the constant-zero case) remain
authoritative at the Plotly boundary. The existing Vue coordinator, local
Plotly/latest-only renderer ownership, active-output lifecycle, stable
selectors and presentation-control state were not changed.

This is a technical data-path repair only: no DOM, geometry, assets,
page-sizing contract, required visual state, or viewport changed. The pinned
design package therefore requires no revision.

## API and test contract

Consumed contract remains the HND-0423 active-output/Time payload: backend
returns ready graph data, including ordered real/imaginary Time traces and the
presentation-projected min-max `y` arrays. Browser code must pass those arrays
through, with no DSP or derived graph normalization. Peak coordinates also
remain backend payload values.

Tester must verify the absence of browser-side Time min-max/DSP math and that
backend real/imaginary order plus normalized and constant trace values are
unmodified. Relevant stable selectors remain `active-plot-host`,
`normalize-y-checkbox`, `show-markers-checkbox`, and the `peak-marker-trace`
metadata selector.

## Verification

- `node --check public/js/app.js` — passed.
- Focused source scan for `normalizedValues`, `traceScale`, and
  `analysis-source-affine` in `public/js/app.js` — passed (no matches).
- `node test/front/public/js/app.behavior.test.js` — passed.
- `git diff --check -- public/js/app.js` — passed.

`node test/front/run_front_tests.js` runs
`test/front/public/js/app.behavior.test.js` successfully, then stops in
`test/front/public/js/app.static.test.js` at lines **285-290**. In particular,
line **286** requires the removed `traceScale` and `normalizedValues` terms;
line **288** requires client-side Time normalization; line **289** requires
browser scaling of peak markers; and line **290** requires the obsolete
`analysis-source-affine-unclipped` metadata. These assertions contradict the
accepted backend-owned math contract in HND-0423 and the Tester update task
HND-0426.

## Routing and remaining work

No tests were edited or weakened. Route the static expectation migration to
Tester under **HND-0426**: replace legacy required browser-normalization terms
with assertions that forbid them and prove pass-through of authoritative
backend Time payloads, then rerun the complete frontend suite.
