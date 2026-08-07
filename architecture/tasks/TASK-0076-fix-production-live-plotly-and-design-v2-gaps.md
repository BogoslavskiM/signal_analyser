---
id: TASK-0076
kind: task
title: Исправить отсутствие live Plotly и неполную стилизацию production
status: in_progress
priority: P0
queue_order: 1
model: gpt-5.6-terra
reasoning: high
owner: orchestrator
assignees: [frontend]
parent: TASK-0074
depends_on: []
blocks: [TASK-0074, TASK-0060]
related_handoffs: [HND-0367, HND-0368, HND-0369, HND-0370, HND-0371, HND-0372, HND-0373, HND-0374, HND-0375, HND-0376, HND-0377, HND-0378, HND-0379, HND-0380, HND-0381, HND-0382, HND-0383, HND-0384, HND-0385, HND-0386, HND-0387, HND-0388, HND-0389, HND-0390, HND-0391, HND-0392, HND-0393, HND-0394, HND-0395, HND-0396, HND-0397, HND-0398, HND-0399, HND-0407, HND-0408, HND-0409, HND-0410]
development_branch: neuro_signal_analyser_ui_refinement
ui_impact: covered
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: 2
---

# Fix production live Plotly and remaining design-v2 gaps

## User value

Production revision eb4f81eb695ddafef032646aff6245f4f380c4f8 is not accepted:
the user confirms there is no live Plotly and multiple zones are only partially
styled, leaving a mixed legacy/design-v2 interface.

## Acceptance criteria

- [ ] The active graph leaves loading and renders live local Plotly with
  `_fullLayout`/`_fullData`; no image, raster or static placeholder is accepted.
- [ ] All five production zones use one complete design-v2 composition without
  legacy geometry, typography, controls or ad-hoc appended overrides.
- [ ] Application shell always fills the complete available browser tab or
  embedding container. Target viewports are regression checkpoints only, not
  hard canvas dimensions. Minimum readable dimensions are allowed, but the
  shell must expand with a larger viewport and never leave unused outer area.
- [ ] Every popup and dialog remains in the shared overlay stack and passes the
  pinned focus/hit/dismissal/restoration/no-plot-shift contract.
- [ ] Display settings, compact upper-right legend, screen close/plus/layout
  controls, table header checkbox and inline row actions match design v2 at all
  three viewports without overlap, drift or overflow.
- [ ] Signals inspector includes a Russian keyboard-operable local search that
  filters rows without mutating backend state or disturbing selection.
- [ ] Frontend corpus passes and production E2E verifies all three viewports.

## Final E2E finding 2026-08-06

- At 1024×768 the settings plot-type select is narrowed to one visible letter
  by the legacy `196px` offset rule. HND-0410/HND-0409 own the bounded responsive
  correction and regression; no redesign or further scope is authorized.
