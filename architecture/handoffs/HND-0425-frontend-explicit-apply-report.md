---
id: HND-0425
type: implementation_report
from: frontend
to: orchestrator
title: Vue explicit Apply frontend state machine implemented
task_section: ../tasks/TASK-0082-frontend-explicit-apply-state-machine.md#scope
applied_skills: [frontend/frontend-workflow, frontend/task-analysis, frontend/zone-structure-api, frontend/design-implementation, frontend/frontend-project-structure, frontend/settings-controls, frontend/output-loading-flow, frontend/graph-output-zone]
skipped_requested_skills: []
changed_paths: [../../public/index.html, ../../public/js/api.js, ../../public/js/settings.js, ../../public/js/layouts.js, ../../public/js/components/explicit-apply.js, ../../public/css/layouts.css, ../../public/css/settings.css, ../../public/vendor/vue/3.5.41/vue.global.prod.js]
vue_version: 3.5.41
vue_sha256: 45c5186437878319a4b86339f475e8e2f0b27e1752f9e6387ebb15854425847f
result: implemented_pending_tester_and_e2e
description: |
  Added one project-local Vue production root as coordinator for the changed
  settings/Apply/active-output boundary. Calculation fields retain local typed
  drafts, use the exact 150 ms field-update path without dispatching applied
  output state, and synchronously flush pending valid writes before exact
  snapshot-free Apply. The coordinator implements applying, pending,
  error/stale/retry and ready transitions with preserved draft and last-good
  Plotly. Accepted Apply refreshes only active output; ready comes only from an
  authoritative active-output success. Presentation controls remain immediate;
  Plotly remains local and under the existing rAF/latest-only owner.

  Vue 3.5.41 was vendored from an existing licensed local source with matching
  SHA-256 and no CDN/npm/bundler/TypeScript/second root. JavaScript syntax checks
  passed. The existing frontend suite reaches the known responsive select-offset
  assertion after earlier files pass. Independent Tester/E2E lifecycle and
  design verification remain required; the Vue root is an additive coordinator
  over the retained imperative catalog renderer rather than a wholesale rewrite.
tester_contract: |
  Verify one root/load order, exact Apply payload, 150 ms coalescing and ordered
  flush, zero Apply/output request from input, local-invalid/backend-semantic
  distinction, pending busy fields, error/stale draft preservation, active-only
  output fetch, ready/stale revision guard, no autoretry, last-good Plotly,
  stable selectors/accessibility/design sizing and absence of browser DSP/CDN.
---
