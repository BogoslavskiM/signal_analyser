---
id: HND-0424
type: task
from: orchestrator
to: frontend
title: Implement Vue explicit-Apply frontend state machine
task_section: ../tasks/TASK-0082-frontend-explicit-apply-state-machine.md#scope
source_branch: neuro_signal_analyser_ui_refinement
design_ref: ../design/TASK-0080-explicit-apply-flow/DESIGN.md
design_version: 1
description: |
  Implement accepted DESIGN v1 and HND-0423. Migrate the changed settings,
  Apply and active-output ownership boundary to one root Vue 3 production-global
  app using project-local assets and direct scripts; do not blindly rewrite
  unaffected shell/layout/inspector behavior or stable selectors. Calculation
  input/change updates local draft immediately and schedules one typed
  POST /api/settings after exactly 150 ms; it must not dispatch applied output
  state, poll or calculate. Apply synchronously flushes all pending locally
  valid updates in order, then sends exact {state_revision,display_id} with no
  settings snapshot. Handle applying, pending, ready, semantic/network error,
  retry and stale revisions while preserving draft and last-good Plotly.

  Locally unparseable numeric drafts disable Apply; backend-semantic values do
  not. Dirty has no badge/caption. After accepted Apply, request only current
  active output, enter pending only from backend pending evidence, reject stale
  replies and never auto-retry. Presentation-only controls remain immediate.
  Plotly remains project-local, latest-only/rAF and browser performs no DSP.

  Vendor local Vue 3.5.41 production global from the existing licensed local
  source `/Users/makar/work/Genie_Tests/modalanalysis/public/vendor/vue/3.5.41/vue.global.prod.js`
  (166624 bytes, SHA-256 45c5186437878319a4b86339f475e8e2f0b27e1752f9e6387ebb15854425847f),
  preserving its MIT header. No CDN, npm, bundler, TypeScript or second root app.
allowed_paths:
  - public/index.html
  - public/js/api.js
  - public/js/app.js
  - public/js/layouts.js
  - public/js/settings.js
  - public/js/components/**
  - public/css/**
  - public/vendor/vue/3.5.41/**
acceptance_criteria:
  - One local Vue 3 production root owns the changed settings/Apply/output state and no second root exists.
  - Calculation field input produces one trailing 150 ms draft update and zero Apply/output polls; blur/Enter flush without duplicates.
  - Apply flushes valid pending drafts, sends no settings snapshot and implements accepted visible states with stale rejection.
  - Only the active pane is requested after accepted Apply; inactive panes remain cold and last-good Plotly remains mounted through error/stale.
  - Local invalid blocks Apply, backend semantic error preserves editable draft, and no separate dirty badge exists.
  - Existing overlays, accessibility, responsive sizing, stable selectors and local Plotly behavior remain intact.
  - Relevant frontend syntax/static checks pass; no local application runtime is started.
requested_skills: [frontend/frontend-workflow, frontend/task-analysis, frontend/zone-structure-api, frontend/design-implementation, frontend/frontend-project-structure, frontend/settings-controls, frontend/output-loading-flow, frontend/graph-output-zone]
evidence_refs: [HND-0422, HND-0423]
---
