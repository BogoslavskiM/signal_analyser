# MATLAB Researcher handoffs: Signal Analyser cascades

Internal durable handoff record.

canonical_role: MATLAB Researcher  
agent_id_or_session: `/root/matlab_cycle`
status: active autonomous cycle 2
current_task: statistics/peaks/pages/membership bounded research and saved scenarios
last_handoff: bounded cycle with workspace variables, three-signal Time display
and SA-UI-001 evidence; exact system paths available in role thread but not
relayed in this record

This is the persistent role thread and should be reused/resumed for future
MATLAB questions. It must not be closed after a single scenario.

Replacement note 2026-07-31: `/root/matlab_cycle` replaces stopped session
`019fb7d3-32b4-77a0-bfa2-14f4d72dd983`; MATLAB clicker server readiness was
reported by the user before cycle start.

## Current research handoff

goal: Establish MATLAB reference behavior for current and next cascades.  
scope: Official MathWorks internet research plus clicker activity limited to
workspace/Command Window and Signal Analyzer app.  
contracts: Handoff must contain the seven methodology fields below and classify
layout evidence as portable or MATLAB-specific.  
changes: No repository files; MATLAB workspace variables and actual plots are
being created in the permanent external thread.  
verification: User-relayed visual evidence confirms checkbox plots signal and
row selection enables operations. Saved scenario paths and full transition
evidence are still pending.  
risks: Current evidence is enough for cascade 2 visibility intent but not enough
to scope the next cascade without defaults, edge cases and saved artifacts.  
follow-ups: Continue the permanent research loop and stream each scenario to
E2E Tester and Architect.

docs_sources: Structured source list pending; known official directions are
Signal Analyzer exploration, spectrum, spectrogram and persistence docs.  
documented_direction: Signal visibility, row selection, operations and plot
outcomes.  
clicker_setup: Must confirm per-command Command Window cycle, English/ASCII,
native double-click/drag and visual verification.  
observed_undocumented_behavior: Signal-table checkbox directly controls plotted
visibility; row selection separately enables operations.  
docs_vs_app_delta: Documentation is directional; actual controls/defaults/state
transitions require clicker evidence.  
product_tasks: Cascade 2 visibility/multi-trace contract; next tasks pending
new delta.  
e2e_scenarios: Current Genie visibility scenario exists; MATLAB server-saved
scenario paths have not yet been handed off.

portable_behavior: Visibility checkbox and independent selected row behavior.  
matlab_layout_specific: Docking/multi-layout; record but do not copy into fixed
2×2 Genie UI.

## Dated handoff 2026-07-31 — bounded cycle SA-UI-001

goal: Establish real Signal Analyzer state transitions for workspace import,
display membership, selection and display types.  
scope: Workspace/Command Window and Signal Analyzer only; no Add-On Explorer.  
contracts: Separate facts, inferences and ambiguities; do not overstate command
screenshots; classify portable behavior versus MATLAB-layout-specific behavior.  
changes: MATLAB workspace now contains `sa_fs`, `sa_t`, `sa_multitone`,
`sa_complex_chirp`, `sa_noisy_tone` and three corresponding `*_tt`; Time plot
showed three signals. No repository changes.  
verification: Visual end-state evidence and SA-UI-001 are available in the
persistent role thread. Selection, display membership and active display were
observed as independent. Multi-signal Time-Frequency and Persistence controls
were disabled. Duplicate import requested overwrite.  
risks: Early variable-creation commands do not have a complete per-command
screenshot sequence; only the final guard command has full focus -> pre-input
Enter -> English/ASCII -> type -> visual verify -> execution Enter evidence.  
follow-ups: Researcher immediately resumed the next bounded cycle. Stream exact
server-returned scenario paths to E2E Tester and Architect; inspect overwrite
choices, single-signal TF/Persistence transitions, defaults and edge cases.  
docs_sources: Official Signal Analyzer/pspectrum directions; exact source list
remains required in the next structured role handoff.  
documented_direction: Workspace import, plotting, multi-signal comparison,
time-frequency and persistence representations.  
clicker_setup: Final command fully evidenced the required per-command guard;
earlier commands are supported only by final visible state and must not be
reported as individually screenshot-verified.  
observed_undocumented_behavior: Selection, display membership and active display
are independent; multi-signal Time-Frequency/Persistence disabled; duplicate
import prompts overwrite.  
docs_vs_app_delta: Docs allow broad representation comparison, while this app
state disabled multi-signal TF/Persistence; exact version/default conditions
remain ambiguous.  
product_tasks: Preserve independent row selection and visibility; keep
multi-trace Time/Spectrum; do not infer multi-signal heatmaps; consider explicit
duplicate-name import UX only in a future scoped cascade.  
e2e_scenarios: Add SA-UI-001-derived independence checks, selected-only
heatmaps, multi-visible Time/Spectrum and duplicate-name behavior when product
import exists. Exact MATLAB evidence paths are pending relay from the role
thread.

## Safety loop correction — 2026-07-31

current_task guard: Each GUI hypothesis has a default maximum of three
meaningful attempts. After every action compare actual and expected visual
state. Stop all repeated click/hotkey/drag mutation when state is unchanged or
the same screens alternate without new evidence. Check clicker status/health
and preserve the last confirmed screenshot; recover and bootstrap a down/stale
server before clicks. Fullscreen/empty cell gets one safe recovery, then save a
partial scenario and send Architect a postmortem/blocker before standby or a
new bounded task. Add-On Explorer and Command Window guards are unchanged.

## Autonomous cycle 2 saved scenario SA-UI-005 — 2026-07-31

goal: Establish deterministic Signal Statistics defaults and values, initial
Peaks dependency evidence, and correct the non-portable fixed-2x2 wording from
SA-UI-003 without rewriting the historical scenario.
system_path: `/Users/makar/work/matlab_clicker/research_output/signal-analyzer-reference-scenarios/scenarios/SA-UI-005-deterministic-statistics-peaks-correction.md`.
docs_sources: Official MathWorks `measure-signals`,
`select-signals-to-analyze`, `explore-signals`, `findpeaks` and
`customize-signal-analyzer` pages, reached directly through the internet; no
MATLAB Help, Documentation or Add-On Explorer.
documented_direction: Signal Statistics offers Minimum, Maximum, Mean, Median,
Peak to peak and RMS; defaults are Minimum/Maximum/Mean, results follow plotted
signal and time limits, and Peaks/Label Peaks are time-domain dependent.
clicker_setup: MATLAB R2024b and healthy clicker. The single Command Window
command followed focus → pre-input Enter → detected Russian → Cmd+Space →
visible ABC → ASCII type → start/tail visual verification → execution Enter →
fresh prompt. It created `sa5_*` variables and a 15-sample 1 Hz timetable.
Native drag imported the timetable; its child checkbox plotted the signal.
observed_undocumented_behavior: Import created an unplotted parent container
with a separately checkable child. Statistics menu had exactly six metrics;
defaults were Minimum/Maximum/Mean. Main toggle created a lower result region.
For ROI `0..14 s`, UI showed minimum `-2` at `12 s` and maximum `3` at `5 s`.
From the exact source array, formula-derived mean is `1/3`, median `0`,
peak-to-peak `5`, RMS `sqrt(25/15)`. Before Find Peaks, Find Peaks and Settings
were enabled while Label Peaks was disabled. Three Median attempts and two
Peaks Settings attempts did not confirm transitions and were stopped.
docs_vs_app_delta: Defaults matched documentation; narrow geometry clipped
later result columns. Peaks menu made time-domain scope and Label Peaks
dependency explicit. Click calibration is insufficient to claim Median or
Peaks Settings transactions. MATLAB grid/docking is layout-specific; current
product contract remains multiple Display pages, one active graph host and no
multi-layout editor.
product_tasks: Existing P0 Minimum/Maximum/Mean is directly supported. The
research scenario proposes selectable Median/peak-to-peak/RMS, ROI-sensitive
results and a time-domain Peaks state machine, but these are candidates for
separate accepted cascades, not changes to current P0. Preserve page-local
membership and do not copy MATLAB grid/docking.
e2e_scenarios: C5-01 deterministic defaults/min/max/mean; C5-02 selectable
derived statistics after scope acceptance, with formula oracles and explicit
MATLAB click uncertainty; C5-03 Peaks dependency only after a confirmed
Backend/EngeeDSP contract.
risks: Screenshots are not numeric oracles beyond visibly readable min/max and
times; derived values depend on the exact recorded array; narrow window clips
columns; popup coordinate selection remains blocked in this geometry.
next_task_candidates: SA-UI-006 separates portable selection/membership/page
semantics from MATLAB Display Grid; later retest derived metrics only with
stable targeting, and resume SA-UI-004A only after clicker calibration.

## Autonomous cycle 2 saved scenario SA-UI-006 — 2026-07-31

goal: Establish portable active-display selection and membership semantics
without adopting MATLAB grid geometry.
system_path: `/Users/makar/work/matlab_clicker/research_output/signal-analyzer-reference-scenarios/scenarios/SA-UI-006-selection-membership-active-display-portability.md`.
sha256: `b64d4f167242ce9d0181f6753163881b1d7044ad8c86688f8199f4df0302f78f`.
docs_sources: Official MathWorks `select-signals-to-analyze`, `explore-signals`
and `customize-signal-analyzer` pages, reached through external web only.
clicker_setup: Existing MATLAB R2024b Signal Analyzer, server bootstrap reread,
native drag, `exclusive_mouse=true`, `restore_mouse_after_run=true`, visible
verification after every meaningful action. No Command Window input occurred.
observed_undocumented_behavior: Imported secondary timetable remained unplotted
until its child checkbox was checked in the active empty cell. Primary
plot/statistics survived in the first cell; secondary survived in the second.
Returning to the first cell remapped checkboxes to that cell and restored its
measurement context. Row selection remained on secondary while it was unchecked
there, proving selection and membership independence.
docs_vs_app_delta: Docs describe selection, checkbox plotting to selected
display and multiple/customizable displays, but not exact checkbox remapping or
measurement restoration transitions.
portable_behavior: Keep selected signal, active Display page and
membership(page, signal) independent; derive table checkboxes from active page;
preserve inactive pages; measurements follow active page.
matlab_layout_specific: Fixed grid cells and docking remain comparison-only and
are not target requirements under DEC-009.
product_tasks: Current Display-page implementation must preserve page-scoped
membership, inactive-page plots, independent row selection and page-scoped
measurements; lifecycle add/close/fallback follows project contracts, not MATLAB
grid inference.
e2e_scenarios: Switch between two product Display pages with different members,
assert checkbox remapping, inactive-page preservation, independent selected row
and measurement scope restoration.
risks: MATLAB grid does not directly specify product page add/remove/rename or
active fallback semantics.
next_task_candidates: SA-UI-007 clears active membership, proves other display
and inventory preservation, then re-adds and verifies recovery.
