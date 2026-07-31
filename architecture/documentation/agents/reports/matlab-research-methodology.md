# MATLAB research methodology for Signal Analyser

Internal research coordination report.

Status: active decision  
Owner: Architect  
Permanent researcher: MATLAB Researcher
`019fb7d3-32b4-77a0-bfa2-14f4d72dd983`

## Decision

Official MathWorks documentation is researched through ordinary internet tools
outside MATLAB. It supplies `docs_sources` and `documented_direction`, but is
not treated as an exhaustive UI specification. MATLAB Add-On Explorer is never
opened or used.

Clicker is limited to workspace/Command Window and Signal Analyzer app. It must
add actual undocumented controls/defaults/transitions/workflows/edge cases and
visual outcomes, then report `docs_vs_app_delta`, actionable `product_tasks` and
saved `e2e_scenarios`.

## Input and mouse preconditions

- Every Command Window command repeats: focus, pre-input Enter for fresh prompt,
  English/ASCII, type, visual verify, execution Enter.
- Text fields outside Command Window use English/ASCII and verification without
  pre-input Enter.
- Corrupted input is cleared and retyped, never executed.
- Native double-click uses a stable center, two fast LMB clicks within system
  interval without movement, then visual verification.
- Drag-and-drop uses stable center, held mouseDown, move, pause, mouseUp, then
  visual verification. Click-click is not a substitute.

## Layout classification

- `portable_behavior`: user intent and observable behavior suitable for Genie,
  such as checkbox visibility and row selection.
- `matlab_layout_specific`: docking, placement and multi-layout details. Record
  these as evidence, but do not copy them into the fixed 2×2 product.

## Required research handoff

Each material handoff contains `docs_sources`, `documented_direction`,
`clicker_setup`, `observed_undocumented_behavior`, `docs_vs_app_delta`,
`product_tasks`, and `e2e_scenarios`, plus canonical role and agent/session ID.
