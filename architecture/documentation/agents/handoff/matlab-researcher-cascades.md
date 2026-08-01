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

## Autonomous cycle 2 saved partial scenario SA-UI-007 — 2026-07-31

goal: Prove active-display-only clear and preservation boundaries, with bounded
recovery attempts.
system_path: `/Users/makar/work/matlab_clicker/research_output/signal-analyzer-reference-scenarios/scenarios/SA-UI-007-active-display-clear-preservation.md`.
sha256: `330b48c08f88e647e7fed2b5a73f23de7bca4b792e3042bb7946918236788c7b`.
docs_sources: Official MathWorks `select-signals-to-analyze`, `explore-signals`
and `customize-signal-analyzer`; exact Clear Display transition is not stated.
clicker_setup: Healthy server after bootstrap refresh, existing PID, exclusive
mouse/restore and screenshot after every action. No Command Window text was
entered; one generic Right key was misrouted to a fresh prompt which stayed
empty.
observed_undocumented_behavior: One Clear Display action emptied only active
top-left plot, unchecked its membership and removed its statistics rows. The
inactive top-right plot, both imported timetable parents and all workspace
variables remained.
portable_behavior: Clear current page removes active-page memberships and
page-local measurement context without deleting global signals or inactive
pages.
uncertainty: Primary re-add was not confirmed after bounded click,
double-click and keyboard attempts; mutations stopped. Recovery is a proposed
product contract, not a MATLAB-observed claim.
product_delta: Current product forbids an empty visible set and forces selected
signal into membership. SA-UI-006/007 show that MATLAB row selection,
active-page membership and active measurement source can remain separate. This
requires a future explicit state-model cascade, not a silent P0 change.
matlab_layout_specific: Grid, toolbar placement and tree hit areas are excluded.
next_task_candidates: SA-UI-008 Time Limits locality/linkage; future typed
selection/membership/analysis-source design and Clear Display contract.

## Architect consumption of SA-UI-007 — 2026-07-31

status: consumed by Cascade 5 and DEC-012.
product_result: Global row selection, empty per-Display membership, nullable
analysis source and active-only Clear are implemented at product/test checkpoint
`8d480ac`. First re-add behavior is explicitly identified as a deterministic
product decision because MATLAB recovery was unconfirmed.
verification: Backend 649/649, frontend 2/2 and Clear Display Playwright
syntax/support/runner-help PASS. Runtime remains undeployed.
next_task: SA-UI-008 Time Limits locality/linkage continues independently; do
not reopen Add-On Explorer or use in-app documentation.

## Autonomous cycle 2 scenario SA-UI-008 — 2026-07-31

goal: Determine Time Limits locality, statistics recomputation, boundaries,
invalid transactions and empty-display Link Time behavior.
system_path: `/Users/makar/work/matlab_clicker/research_output/signal-analyzer-reference-scenarios/scenarios/SA-UI-008-time-limits-statistics-local-link.md`.
sha256: `ce7eeb83b43a2aaaae4cbc3df094cf76c6037e2ae165f3b309c7bd4adb73d5c0`.
observed: Right Display 3..9 produced min `-0.80902` at `8`, max `1` at `5`;
4..6 produced min `0.30902` at `4`, max `1` at `5`. Boundary 0..14 was
accepted. Invalid Min 15/Max 14 and Min 0/Max -1 silently restored last valid
state without dialog. Link Time did not propagate to an empty left Display.
portable_behavior: Limits are page-local by default and recompute Statistics
over the current ROI; invalid ordering preserves last valid state. Product may
surface clearer inline validation.
uncertainty: Link propagation between two populated Displays and repeated
equal-extrema tie behavior remain unconfirmed.
next_task: SA-UI-009 Normalize Y Axis/Show Markers is active.

## Autonomous cycle 2 scenario SA-UI-009 — 2026-07-31

goal: Observe Normalize Y Axis and Show Markers scope/restoration in MATLAB
Signal Analyzer R2024b.
system_path: `/Users/makar/work/matlab_clicker/research_output/signal-analyzer-reference-scenarios/scenarios/SA-UI-009-normalize-y-markers-scope-restoration.md`.
sha256: `4771e34016a7740d29e9b2c0c0f000a92019613f83605f521516309da232a968`.
observed: Normalize rendered raw extrema as 0/1 with auto Y -0.05..1.05 while
Statistics remained raw. Fifteen hollow markers matched fifteen samples.
Normalize was display-local/restored; Show Markers behaved cross-display and an
empty display could switch it. Spectrum-only removed Time controls.
portable_behavior: Normalize visible data only, raw analysis invariance,
actual-sample markers, Time-only availability and state restoration.
product_decision: Keep existing page-local Show Markers for deterministic
Display ownership instead of copying R2024b global asymmetry.
next_task: SA-UI-010 selectable Statistics and ROI.

## Autonomous cycle 2 scenario SA-UI-010 — 2026-07-31

goal: Observe exact Signal Statistics defaults, toggles, page scope and ROI
recomputation.
external_scenario_id: `SA-UI-010-signal-statistics-selection-page-local-roi`.
sha256: `da95228f1e960413d78a6ad8304f64b984e42cc783817634bdf8fb338973bffe`.
observed: Split-menu order is Minimum, Maximum, Mean, Median, Peak to peak,
RMS; defaults are first three. All six were enabled on the right Display, empty
left retained independent defaults/zero rows, and return restored all six.
ROI 4..6 retained raw min `0.30902 @ 4` and max `1 @ 5` under normalized
rendering. Table has one row per plotted signal.
formula_oracle_not_visual_claim: hidden clipped columns are expected mean
`0.5393446629`, median `0.3090169944`, P2P `0.6909830056`, RMS
`0.6300748648`; exact UI rounding/order was not observed.
portable_behavior: page-local metric set, exact defaults/order, zero-row empty
state, inclusive raw ROI recompute and restoration.
product_result: Consumed into frozen Cascade 8 and DEC-014.
next_task: SA-GRAPH-001 deterministic Spectrum defaults/units.

## Autonomous cycle scenario SA-GRAPH-001 — 2026-08-01

canonical_role: MATLAB Researcher
session: `/root/matlab_cycle`

goal: Establish deterministic Spectrum defaults, Time ROI recomputation,
displayed actual RBW and Normalize independence without treating UI position as
a numeric oracle.
external_scenario_id:
`SA-GRAPH-001-deterministic-spectrum-defaults-roi-rbw`.
sha256: `c22e0074fc3e8f17ca797052490583dcb0d1f8a552fdd5825023e14026d6d278`.
docs_sources: Official MathWorks Explore Signals, Spectrum Computation in Signal
Analyzer and `pspectrum` pages were researched directly on the web outside
MATLAB. Engee `pspectrum` and `enbw` pages supplied the provider map. MATLAB
Help, Documentation UI and Add-On Explorer were not used.
documented_direction: Signal Analyzer defaults Spectrum to dB, converts power
with `10*log10(power)`, supports linear/log frequency axes, recomputes over a
Time ROI, uses one-sided real and centered two-sided complex spectra, and does
not permit Log for complex. Leakage docs default to `0.5` in `[0,1]`.
clicker_setup: MATLAB R2024b/clicker health and the existing bounded GUI rules
were respected. The deterministic source was real with `Fs=1 Hz`, `N=15`.
No valid Command Window command was entered in this scenario. One accidental
unexecuted text insertion was immediately cleared and the clean prompt was
visually verified. Time-limit fields used the required English/ASCII and
before-commit visual guards. MATLAB was not stopped and Add-On Explorer was not
opened.
observed_undocumented_behavior: The app showed Hz, `0..0.5 Hz`, Linear
frequency scale, checked dB and Leakage at its midpoint. ROI `4..6 s` yielded a
flat Spectrum near `3.0102995 dB` and displayed actual RBW `855.5818 mHz`;
ROI `0..14 s` restored a peak near `0.2 Hz` and actual RBW `171.1164 mHz`.
Normalize Y Axis did not change Spectrum.
docs_vs_app_delta: Numeric Leakage `0.5` is docs-derived, not visually read
from the midpoint. Page locality was not established. Actual RBW was visible in
MATLAB but the prod EngeeDSP power probe returned empty `Any[]` as the third
output, so current product cannot claim that metadata.
product_tasks: Implement frozen Cascade 9 per-Display typed Spectrum settings,
raw-Time-ROI recomputation, real/complex topology, EngeeDSP provider boundary,
atomic complex/log guard and Display-panel native controls. Per-Display
locality is an explicit product decision matching existing page architecture.
e2e_scenarios: Verify defaults; one request/revision per setting; Leakage commit
on change; ROI-driven backend Spectrum recomputation independent of Normalize;
real linear/log axes; complex/log atomic rejection; A/B restoration; Clear
preservation; one-sample typed empty/two-sample support; exact cleanup.
risks: Page locality remains unobserved. Editable frequency limits, RBW/window
mode, actual RBW metadata, manual frequency units, mixed sample rates and
Spectrogram/Persistence refactor are not evidence-complete for C9.
product_result: Evidence consumed into frozen Cascade 9 and DEC-015; product
implementation and runtime verification are pending.
next_task_candidates: Bounded settings persistence and complex/log behavior,
without reopening in-app documentation or Add-On Explorer.

## Autonomous cycle scenarios SA-GRAPH-002/003 — 2026-08-01

canonical_role: MATLAB Researcher
session: historical `/root/matlab_cycle`; evidence consumed by replacement
coordination in `/root/matlab_c10_complex_log`.
goal: Preserve exact Frequency Scale and Spectrum dB/Linear transitions before
the Frequency Limits contract is frozen.
source_evidence:
- `SA-GRAPH-002-frequency-log-zero-bound-linear-restoration`, system path
  `/Users/makar/work/matlab_clicker/research_output/signal-analyzer-reference-scenarios/scenarios/SA-GRAPH-002-frequency-log-zero-bound-linear-restoration.md`,
  SHA-256 `464122ad97bdff115d9a1ea933de30dd903b734b6a08d30d89283b01620a6b71`.
- `SA-GRAPH-003-spectrum-db-linear-power-restoration`, system path
  `/Users/makar/work/matlab_clicker/research_output/signal-analyzer-reference-scenarios/scenarios/SA-GRAPH-003-spectrum-db-linear-power-restoration.md`,
  SHA-256 `03c9818bbd2e8b5e8cc8d7b0d2d47b141666754f6d4f9f61804bee042d4ecf38`.
docs_sources: Official public MathWorks Explore Signals, Signal Analyzer,
`pspectrum` and Spectrum Computation pages were used outside MATLAB. Help,
Documentation UI, Learn and Add-On Explorer were not opened.
documented_direction: Signal Analyzer offers Linear/Log frequency scale, does
not support Log for complex spectra, defaults Spectrum to dB and uses
`10*log10(power)` for the dB representation.
clicker_setup: Both durable scenarios used bounded native GUI actions and
screenshot verification. Neither typed Command Window text. The input
indicator remained ABC, MATLAB stayed open and the original state was restored.
observed_undocumented_behavior: For the real `Fs=1 Hz`, period-five cosine,
switching Linear to Log retained Min `0` and Max `0.5` without error; the
renderer alone selected an unexposed positive plotting floor. Returning to
Linear restored the zero-origin axis. Clearing Spectrum in dB changed the
label to `Power Spectrum` and exposed peak power `0.5`; re-enabling dB restored
approximately `-3.0103 dB` at the same frequency and preserved frequency state.
docs_vs_app_delta: Public docs do not describe zero-bound Log rendering or the
exact unchecked y-axis label. The app does not expose a numeric Log floor.
product_tasks: Preserve stored zero limits across Linear/Log; keep the current
implicit positive Plotly render floor; do not invent a floor field; preserve
the same provider power under dB/Linear presentation.
e2e_scenarios: Zero-bound Log succeeds without rewriting fields; returning to
Linear restores zero; dB/Linear preserves limits/peak frequency while `0.5`
maps to approximately `-3.0103 dB`.

## SA-GRAPH-004 partial attempt and bounded blocker — 2026-08-01

canonical_role: MATLAB Researcher
session: `/root/matlab_c10_complex_log`, replacement for unavailable
`/root/matlab_cycle`; status interrupted after the bounded mutation guard.
goal: Observe complex centered-spectrum frequency limits and Log eligibility.
docs_sources: Official public MathWorks Explore Signals and `pspectrum` pages
confirm centered two-sided complex spectra and unsupported Log scale. MATLAB
Help and Add-On Explorer were not used.
clicker_setup: Server bootstrap and `/health` initially succeeded. A real
Spectrum was safely switched Linear to Log with Min `0`, Max `0.5` preserved.
Command Window complex-signal creation followed the required intended cycle:
focus, pre-input Enter, English/ASCII, type, visual verify, execution Enter.
The clicker repeatedly dropped or truncated the tail before execution;
corrupted text was cleared and no damaged command ran. Subsequent `/run`
failed while activating MATLAB by AppleScript. Mutations then stopped.
observed_undocumented_behavior: Only the already durable real zero-bound Log
behavior was reconfirmed. No complex F min/F max values, disabled control or
runtime rejection was observed, and no SA-GRAPH-004 scenario was saved.
internal_artifacts: Passive diagnostics remain at
`/private/tmp/sa-c10-real-spectrum-log-before-complex.png` and
`/private/tmp/sa-c10-timeout-passive.png`. They are internal transient
evidence, not client documentation or numeric oracles.
docs_vs_app_delta: Complex behavior remains documentation-directed rather than
newly GUI-observed. This does not block the existing portable complex/Log rule.
product_tasks: Freeze Frequency Limits from official docs, provider evidence
and explicit product policy. Retry SA-GRAPH-004 only after clicker health is
restored; do not claim MATLAB-observed complex field lifecycle.
e2e_scenarios: No direct MATLAB scenario handoff is available. Product E2E may
test the frozen contract but labels complex/Log parity as docs-derived.
next_task_candidates: Recover clicker health without closing MATLAB, then retry
the bounded complex scenario or continue with SA-GRAPH-005 Frequency Units.

### Durable correction for SA-GRAPH-004 partial — 2026-08-01

The partial scenario was successfully persisted after the earlier coordination
snapshot. Authoritative external scenario ID:
`SA-GRAPH-004-complex-spectrum-log-partial`; system path
`/Users/makar/work/matlab_clicker/research_output/signal-analyzer-reference-scenarios/scenarios/SA-GRAPH-004-complex-spectrum-log-partial.md`;
SHA-256 `2c3455ff1ec9d6007faeecb3307a58eedcab542accc2c4fff8c88885ee13925e`.
The server save returned `ok=true`, `created=true`, `bytes=7469`, and a fresh
bootstrap exposed the same path/SHA. This corrects only the earlier statement
that no scenario had been saved; all uncertainty and the no-complex-observation
boundary remain unchanged. The E2E Tester received the direct path/SHA.

## External-docs-only Spectrogram/Persistence map — 2026-08-01

canonical_role: MATLAB Researcher
session: `/root/matlab_c10_complex_log`.
goal: Keep the research lane useful while MATLAB GUI activation is unsafe.
scope: Official public MathWorks pages only; no MATLAB GUI, Command Window,
server-state or repository mutation.
docs_sources: MathWorks Explore Signals, Spectrogram Computation in Signal
Analyzer, Persistence Spectrum in Signal Analyzer, `pspectrum`, and Signal
Analyzer Tips and Limitations.
documented_direction: Both time-frequency views accept one signal per Display;
real input is one-sided and complex input centered two-sided. Spectrogram uses
power from squared STFT, automatic segment length, 50% overlap and Kaiser
window; its color is power. Persistence is a normalized percentage histogram
over frequency/power bins, uses segments intersecting the visible Time ROI and
includes partially visible segments. `pspectrum` exposes time resolution,
overlap, leakage, limits, topology, threshold and reassignment; persistence
adds power-bin count with documented default 256.
observed_undocumented_behavior: None. This is explicitly docs-only and creates
no MATLAB oracle.
docs_vs_app_delta: Exact app defaults for limits/colormaps/density, settings
locality, second-signal rollback, Persistence Log control and detailed segment
boundary behavior remain unknown.
product_tasks: Future implementation should use a shared typed segmented
spectral provider pipeline with distinct spectrogram power-image and
persistence normalized-density projections; no hand-rolled substitute is
authorized before Engee capability evidence and a new ADR.
e2e_scenarios: Provisional `SA-GRAPH-TF-001` Spectrogram defaults/eligibility,
`SA-GRAPH-TF-002` Persistence defaults/eligibility and `SA-GRAPH-TF-003` shared
ROI/color semantics. They remain blocked on direct MATLAB and provider evidence.
next_task_candidates: Engee capability probe for `pspectrum` spectrogram and
persistence modes; later bounded GUI evidence after clicker recovery.

## C12 docs-only Spectrogram OverlapPercent recommendation — 2026-08-01

canonical_role: MATLAB Researcher
session: `/root/matlab_c11_docs`.
goal: Select the safest narrow setting after typed Spectrogram foundation.
scope: Official public MathWorks web documentation only. MATLAB GUI, workspace,
Command Window, Help/Add-On Explorer and clicker state were untouched.
docs_sources: Spectrogram Computation in Signal Analyzer, Explore Signals,
Customize Signal Analyzer, `pspectrum`, generated-script mapping and Signal
Analyzer reference pages.
documented_direction: Signal Analyzer uses Auto segment length and default 50%
overlap. Overlap is a percent of segment length, floors to sample count and is
valid in `[0,100)`. Segment grid stays fixed under pan/zoom; ROI selects cells
rather than resegmenting an arbitrary cropped array.
docs_vs_provider_delta: Standalone `pspectrum` omitted overlap depends on ENBW,
not the app's documented 50%. App parity therefore requires explicit
`OverlapPercent=50`. Leakage/Reassign provider defaults are not promoted to app
defaults. Power Limits are presentation, not `MinThreshold`.
product_tasks: Freeze an OverlapPercent-only ADR after Engee probes 0/50/75,
invalid -1/100/nonfinite/Bool, option ordering, segment counts/centers and
resource behavior. Include it in Display-local typed query/cache identity.
Keep TimeResolution, Leakage, Reassign, ROI, limits/scale/colormap outside.
e2e_scenarios: `[]`; docs-only evidence produced no MATLAB oracle.
risks: High valid overlap can cause large segment counts; any stricter cap is a
product policy. TimeResolution remains blocked by ENGEE-20260801-003.
next_task_candidates: C12 OverlapPercent probe/ADR; then independent Leakage or
Reassign research.

## C13 docs-only Spectrogram Leakage contract — 2026-08-01

canonical_role: MATLAB Researcher
session: `/root/matlab_c13_leakage`.
goal: Separate normalized provider Leakage from app slider presentation and
from Spectrum Leakage.
scope: Official MathWorks web documentation only. MATLAB GUI, Command Window,
Help and Add-On Explorer were untouched.
documented_contract: `pspectrum` uses normalized finite real Leakage `[0,1]`,
default `0.5`, with Kaiser `beta=40*(1-leakage)`. Endpoint 0 suppresses
sidelobes at resolution cost; endpoint 1 is rectangular and improves close-tone
resolution while masking weak neighbors. Leakage 0.85 approximates Hann.
independence: Signal Analyzer explicitly separates Spectrum Leakage from the
Leakage used to window Spectrogram segments. With Time Resolution and Overlap
fixed, Leakage changes frequency spreading/RBW but not outer segment centers or
count.
docs_vs_app_delta: The Signal Analyzer Spectrogram page does not formally state
the displayed slider scale/default. App examples indicate a non-normalized
display, while `labelSpectrogramOptions` uses a separate beta-style 0..40
quantity. Neither is proof of Signal Analyzer serialization. Product uses the
normalized provider value and does not claim pixel/scale parity.
verification: Official `pspectrum`, Signal Analyzer spectrogram computation,
function-comparison and generated-script pages inspected directly. Clicker
reported down; no server or GUI action was attempted.
risks: Never conflate UI slider display, normalized leakage and Kaiser beta.
follow-ups: Optional bounded GUI mapping only after the unsafe Command Window
state is explicitly recovered; it is not a C13 implementation gate.
next_task_candidates: Implement normalized independent C13 contract; later GUI
scale observation as a separate presentation parity task.

## C14 docs-only Spectrogram Reassign — 2026-08-01

canonical_role: MATLAB Researcher
session: `/root/matlab_c14_reassign_docs`.
scope: Official MathWorks web documentation only; MATLAB GUI/Command Window,
Help/Add-On and clicker untouched.
documented_contract: `pspectrum(...,"spectrogram",Reassign=Bool)` relocates
power estimates to energy centers and API-defaults false. Signal Analyzer has a
Spectrogram checkbox; an official two-display example enables it only on the
right, supporting independent runtime Display state. Generated script passes
explicit `Reassign` with Leakage/TimeResolution/OverlapPercent.
docs_delta: App checkbox default is inferred, not explicitly specified.
Lifecycle persistence and off-script omission remain unobserved. Spectrogram
is single-signal and complex remains centered two-sided.
verification: Official Explore Signals, pspectrum, reassigned-ridges and Share
Analysis pages cross-checked; no app/runtime evidence claimed.
risks: Docs capability cannot override prod Engee failure.
follow-ups: Optional GUI default mapping only after safe clicker recovery.
next_task_candidates: Consume prod NO-GO; research next safe slice.
