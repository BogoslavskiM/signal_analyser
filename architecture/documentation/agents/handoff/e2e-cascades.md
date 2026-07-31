# E2E Tester handoffs: Signal Analyser cascades

Internal durable handoff record.

canonical_role: E2E Tester  
agent_id_or_session: `019fb7f1-4bbf-75d2-9279-d8dedede56c5`  
status: active
current_task: Cascade 3 P0 snapshot UI scenario and timing logging
next_queued_task: Cascade 4 peaks scenario design
blocker_or_no_eligible_work: runtime execution waits for a deployed P0 target
last_handoff: Cascade 2 prod E2E 7/7 at runtime SHA `2eba776`

Earlier ephemeral threads became unavailable after completion. Future E2E
Tester work must resume the persistent canonical ID above.

## Cascade 2

goal: Add user-level visibility/multi-trace/placeholder regression coverage.  
scope: `test/playwright/**`.  
contracts: checkbox/row independence, minimum one visible, selected fallback,
visible line legends/colors, selected heatmaps, live Plotly hosts, no visible
`Подготовка графика…` after ready, and fixed 2×2.  
changes: Added selector prefixes, support helpers/assertions,
`visibility_cascade.test.js`, support contract updates and coverage row
`SA-VIS-07`.  
verification: Support contract PASS; JS syntax, shell syntax, diff and spec-load
checks PASS in role handoff. Runtime E2E not run because CDP was unavailable and
the second cascade was not deployed.  
risks: Runtime requires at least two seed signals and a target containing the
current product diff.  
follow-ups: Run `PLAYWRIGHT_SPEC=signal_analyser/visibility_cascade` against the
updated target. Use background CDP when possible; otherwise coordinate with
MATLAB Researcher before browser Space/focus/window actions and record
`browser_workspace_setup` without moving or closing MATLAB.

browser_workspace_setup: pending runtime run; required evidence fields are CDP
background mode or separate Chrome macOS Space/desktop, fullscreen fallback,
MATLAB Researcher coordination result and confirmation MATLAB was unchanged.

## MATLAB SA-UI-001 follow-up

- Cover row selection independently of display visibility/membership.
- Confirm multiple visible traces only for Time/Spectrum and selected-only
  heatmaps in the fixed 2×2 Genie contract.
- Do not encode MATLAB layout/docking or assume multi-signal
  Time-Frequency/Persistence.
- Duplicate import overwrite becomes an E2E task only when a product import
  workflow is in scope.

## Pending prod bundled Plotly scenario

On the deployed target capture network and DOM/Plotly state: exactly four ready
plot hosts, zero visible `.plot-placeholder`, and zero CDN Plotly request when
the local vendored artifact succeeds. Record `browser_workspace_setup`. Do not
mark deployed/verified before this scenario passes.

## Maintenance shell evidence contract

При `Server maintenance` / «Ведутся технические работы» E2E record сохраняет
base/auth availability, target HTTP status, final URL, title/body evidence и API
probe. Затем запрашивает у DevOps process status и log tail. HTTP 200 shell при
доступных base/auth классифицируется как target app/proxy failure. После
start/redeploy E2E повторяет target probe и исходный scenario.

portable_behavior: Checkbox changes plotted visibility; row selection remains
independent and enables selected-signal operations.  
matlab_layout_specific: MATLAB docking and multi-layout are reference-only and
must not replace the Genie fixed 2×2 layout.

## Cascade 3 P0 assignment — 2026-07-31

goal: Cover snapshot-backed raw statistics through bottom tabs.
scope: `test/playwright/**`.
contracts: Default `Сигналы`; local `Измерения` switch without API mutation;
selected visible name and exact minimum/maximum/mean rows; row selection and
hidden-selected fallback update UI; no measurements endpoint, peaks or loading
placeholder.
performance_evidence: Sufficient temporary timing logging is mandatory during
scenarios. E2E Tester chooses implementation, placement and format, then uses
the logs to analyze performance, hangs, retries and timeout suitability. A
material issue produces an evidence-backed Architect handoff; no universal
metric list or fixed threshold is prescribed.
browser_workspace_setup: background CDP preferred; interactive actions retain
the existing MATLAB coordination guardrail.
next_task_candidates: Cascade 4 specialized peaks scenario after its API/state
contract is accepted.
