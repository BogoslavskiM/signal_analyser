---
task: TASK-0044
title: Signal Analyzer multi-layout UI
design_ref: architecture/design/TASK-0044-multilayout-ui/DESIGN.md
design_version: 2
design_status: ready
design_mode: autonomous
base_design: architecture/design/TASK-0040-detailed-current-layout/DESIGN.md@v1
revision_task: TASK-0047
revision_handoff: HND-0136
required_viewports: [1440x900, 1280x720, 1024x768]
required_states: [default, hover, focus, active, disabled, loading, empty, error, warning, success, conflict]
---

# TASK-0044 — Multi-layout UI

## Outcome

Version 2 preserves the complete v1 interaction and visual contract and corrects
only inherited 1024 px geometry: TASK-0040 defines a 42 px Display tab row at
width ≤1080, not 48 px. A Display owns a canonical `rows × columns` plot grid
(1–4 each, maximum 16 panes), a zone-local layout selector, and one explicit
active pane. Plot type and ordered signal bindings belong to each pane
independently. The right Settings panel and Signals checkboxes always expose
their active-pane context.

Status is **ready** for TASK-0030 frontend implementation. The package is a
mock-only design reference; it does not define a new API or production state.

## Sources and precedence

Choices were resolved in the required order:

1. HND-0115 and TASK-0044 scope/acceptance.
2. TASK-0029 factual backend contract and final backender handoff; TASK-0030 UI
   scope; ready TASK-0040 current-layout v1.
3. Canonical local designer templates and references.
4. Corporate Engee Apps Figma — unavailable in this environment and retained as
   a lower-priority unavailable source. No acceptance item depends on it.
5. Autonomous decisions documented below.

Backend facts take precedence over mock interactions. In particular, the
selector exposes the 16 canonical row/column combinations only; it does not
invent extra topology variants.

## Applied skills

Applied to the bounded v2 revision:

- `designer/designer-workflow` — package structure, autonomous self-review,
  revision/version/evidence discipline.
- `designer/visual-system` — TASK-0040 v1 tokens, 32 px controls, focus rings,
  overlay layers, semantic status colors, and inherited 42 px breakpoint row.
- `designer/application-composition` — TASK-0040 shell row arithmetic and
  unchanged toolbar/main/bottom IA.
- `designer/output-and-visualization` — corrected 1024 plot-grid/pane geometry
  and affected visual evidence.

Retained v1 provenance, not reapplied for the bounded v2 change:

- `designer/data-entry-and-inspection` — active-pane Settings context, typed
  controls, per-pane checkbox context and table behavior remain unchanged.

No HND-0136 requested skill was skipped. `designer/data-entry-and-inspection`
and `designer/dialog-and-file-flows` were not loaded for v2 because no
form/table or dialog/file behavior is revised.

## Information architecture

The TASK-0040 shell remains canonical:

1. Global toolbar — unchanged.
2. Main stage:
   - Display workspace and Display tabs;
   - anchored layout trigger in the Display strip;
   - plot pane grid inside the selected Display;
   - right Settings panel scoped to the active pane.
3. Bottom zone — unchanged tabs/table composition, with an added binding-context
   label between the tabs and add action.

The layout trigger is adjacent to Add Display because it changes only the
selected Display. It is not promoted into the global toolbar. The right panel
heading reads `Pane N · <type>`. The Signals strip reads
`Bindings for Pane N · <type> — Checkboxes affect this pane only`.

## Visual system

TASK-0040 v1 remains the visual base:

| Token | Value |
|---|---|
| App background / surface | `#f4f6f8` / `#ffffff` |
| Text / muted | `#202938` / `#697386` |
| Line / strong line | `#dfe4ea` / `#c9d1da` |
| Accent / accent soft | `#1676e6` / `#eaf4ff` |
| Danger / soft | `#b42318` / `#fff1f0` |
| Warning / soft | `#8b5e1a` / `#fff8e7` |
| Success / soft | `#137333` / `#edf8f0` |
| Radius | 5 px controls/panes; 8 px overlays |
| Standard control height | 32 px |
| Popover layer | `z-index: 50000` |

Active pane uses a 2 px accent border, accent-soft header, and `Active` badge
where space permits. The border remains the primary cue when the badge is hidden
in the 1024 px 4×4 stress layout. Hover uses a lighter blue border/shadow and is
never confused with active.

## Exact responsive geometry

The app keeps the v1 rows:
`64px minmax(300px, 1fr) clamp(270px, 36vh, 324px)`. Main-stage Settings widths
are 370/340/300 px. Workspace padding and gap are 6/8 px, 6/8 px, and 4/6 px at
the three viewports. The inherited Display tab row is 48 px above 1080 px and
42 px at width ≤1080. There is no document-level overflow.

Measured browser geometry (CSS pixels, DPR 1):

| Viewport | Main stage | Workspace | Settings | Bottom zone | Plot grid |
|---|---:|---:|---:|---:|---:|
| 1440×900 | 1440×512 | 1050×500 | 370×500 | 1428×318 | 1032×434 |
| 1280×720 | 1280×386 | 920×374 | 340×374 | 1268×264 | 902×308 |
| 1024×768 | 1024×427.53 | 710×419.53 | 300×419.53 | 1016×272.47 | 696×363.53 |

Pane geometry:

| Viewport | 1×1 pane | 2×2 pane | 4×4 pane | Header 1×1/2×2 | Header 4×4 |
|---|---:|---:|---:|---:|---:|
| 1440×900 | 1032×434 | 512×213 | 253.5×104 | 36 | 28 |
| 1280×720 | 902×308 | 447×150 | 221×72.5 | 36 | 28 |
| 1024×768 | 696×363.53 | 345×178.77 | 169.5×86.38 | 36 | 28 |

Rules:

- Grid tracks use `repeat(rows/columns, minmax(0, 1fr))`.
- Display tab row is 48 px at 1280/1440 and 42 px at width ≤1080; the reclaimed
  6 px belongs to the plot-grid height, not to main-stage or bottom-zone rows.
- Gap is 8 px at 1280+ and 6 px at 1024 and for all 4×4 layouts.
- Grid and panes never create page scroll. Plot canvases resize to their pane.
- 4×4 switches to a 28 px compact header and 9 px select copy. The existing
  full plot-type values remain in the menu and are not replaced by icons.
- The right Settings body owns vertical scrolling; Signals owns table scrolling.
- At 1024 the second Display tab and long Display tab are hidden/overflowed as in
  the base composition; the layout action stays visible.

## Pane model and active context

Each visible pane exposes:

- stable server ID as secondary copy in normal density;
- pane ordinal as the user-facing label;
- its own plot-type select (`Time`, `Spectrum`, `Spectrogram`, `Persistence`);
- plot output and pane-local state overlay;
- click/focus target for activation.

Selecting a pane updates only active context. It does not change type or
bindings. Changing type through either the pane header or the active Settings
panel targets that pane only. The prototype demonstrates four independent types
in 2×2 and repeated independent values in 4×4.

Signals checkboxes show bindings for the active pane only. A checked row means
the signal ID is in that pane's ordered bindings. Checking appends the signal;
unchecking removes it while preserving the order of survivors. Other panes are
unchanged. Header checkbox uses checked/unchecked/indeterminate for the active
pane only. A short pending/disabled state belongs to the changed binding, not to
the entire page.

## Layout selector

### Geometry

- Trigger: minimum 82×32 px, grid icon + authoritative current label + chevron.
- Popover: 372 px wide; 354 px at 1024; viewport margin 8 px; trigger gap 6 px.
- Maximum height: viewport minus 16 px; body scrolls if necessary.
- Preferred placement is below/end-aligned. It flips above if needed and shifts
  horizontally/vertically to remain inside the viewport.
- The popover stays above plot/table surfaces at layer 50000.

### Draft lifecycle

1. Open copies authoritative current rows/columns into local draft.
2. Rows and Columns are two segmented controls (1–4); together they cover all
   16 canonical variants. Arrow keys, Home and End move within a segment.
3. Preview, `Draft R×C`, pane count, preserve copy and drop warning update without
   changing visible panes.
4. Apply is disabled when draft equals current, while applying, or after a 409
   until recovery is acknowledged by re-editing.
5. Apply disables draft controls and reads `Applying…`; visible panes remain the
   authoritative current layout until the response.
6. Success closes the popover, updates panes from returned server state, returns
   focus to the trigger and shows a non-modal success toast.
7. Cancel, close button, Escape and outside dismiss discard draft and restore
   focus to the trigger. During Apply these exits are disabled.

The prototype opens a changed 3×2 draft from 2×2 to make Apply/Cancel measurable.
It contains no API call; Apply is a timed mock transition.

### Focus and collision

Focus order is: trigger → close → Rows 1–4 → Columns 1–4 → Cancel → Apply. While
open, Tab/Shift+Tab cycle inside the popover. Escape is equivalent to Cancel.
Each pane is focusable; Enter/Space activates it. A visible 2 px focus ring is
used for keyboard focus. Native select keyboard behavior is retained.

The popover is an anchored non-modal dialog. Plot menus and selector must not be
open simultaneously in production; opening one closes the other. Resize/scroll
recomputes placement. It must not cover its trigger after flip/shift, clip under
the Display workspace, or escape the 8 px viewport boundary.

## Authoritative preserve/drop behavior

Resize uses the TASK-0029 ordered-prefix contract:

- `preserved = min(old_count, new_count)`;
- panes `1…preserved` retain server IDs, plot types and ordered bindings;
- only the old ordered suffix can be dropped;
- new panes are returned by the server as empty Time panes with never-reused
  `pane-N` IDs;
- the client never predicts or allocates pane IDs;
- active pane survives if preserved; otherwise returned state activates Pane 1.

On shrink, warning copy names the exact dropped suffix and active fallback. The
4×4 → 2×2 evidence says `Panes 5–16 … will be dropped` and
`Active pane falls back to Pane 1`. On growth, preview says that new pane IDs are
assigned after Apply; draft UI never labels them with guessed IDs.

## Error, conflict and recovery

- **422 invalid request:** keep the popover open, retain draft, show inline danger
  message, re-enable controls and allow retry/cancel.
- **409 stale state:** consume the returned current layout as authoritative,
  discard the stale draft, keep the popover open, show conflict banner, reset
  controls to returned rows/columns, and disable Apply until the user creates a
  fresh draft. Never merge by guessed pane ID.
- **Pane plot error:** isolate the danger overlay to that pane; Settings and other
  panes remain usable.
- **Binding/type 409:** same server-snapshot recovery principle; active context is
  resolved against returned panes and falls back to the returned active pane.

## Session behavior

Session v1 reload restores rows/columns, ordered panes, pane IDs, active ID,
allocator, per-pane types and ordered bindings exactly. The UI shows the restored
active pane and checkbox context after one authoritative render. Legacy display
data without layout appears as canonical 1×1 `pane-1`, retaining the active plot,
visible signals and typed settings. No migration prompt is added.

## State contract

| State | Required visual/behavior |
|---|---|
| default | 2×2 representative layout; Pane 2 active; four independent plot types/bindings. |
| hover | Layout trigger, Pane 3 and one Signals row use hover treatment without changing selection. |
| focus | Open selector; selected Rows option has 2 px focus ring; keyboard scope is visible. |
| active | Pane 4 active; Settings and Signals labels/checkboxes switch to Pane 4 only. |
| disabled | Layout/Settings/binding controls disabled; plots remain readable. |
| loading | Active pane alone has spinner overlay and its controls are disabled; other panes remain usable. |
| empty | Active pane has no bindings; its plot shows an instructional empty state and all context checkboxes are clear. |
| error | Pane 3 shows isolated plot error and danger toast; other panes/settings remain intact. Selector can retain 422 draft error when opened. |
| warning | 4×4 → 2×2 draft; exact preserve/drop warning and active-pane fallback; pane-local stale-data warning remains visible behind popover. |
| success | Current layout and preserved IDs are acknowledged with a success toast; focus returns to trigger after Apply. |
| conflict | 409 banner; returned 2×2 is authoritative; stale draft reset/discarded; Apply disabled until a fresh edit. |

## Prototype

Open [`prototype/index.html`](prototype/index.html) directly. It has only local
HTML/CSS/JS and mock data. No backend, polling, business validation,
`data-testid`, dependencies or product code are present.

Query controls are deterministic:

- `layout=1x1|2x2|4x4`
- `state=default|hover|focus|active|disabled|loading|empty|error|warning|success|conflict`
- `popover=open|none`
- `chrome=0` hides prototype controls for evidence capture.

The visible prototype controls exercise layout, state, draft editing,
Apply/Cancel, pane activation, independent type changes and active-pane signal
bindings.

## Evidence plan

Reference screenshots use:
`signal-analyzer--<scenario>--<viewport>.png`.

Evidence set:

- layouts `layout-1x1`, `layout-2x2`, `layout-4x4` at all three viewports;
- selector `popover-draft` at all three viewports;
- every required state at all three viewports;
- DOM measurement audit records 1×1/2×2/4×4 pane geometry and no body overflow.

For v2, all fifteen 1024×768 files were refreshed because the 42 px tab row
moves the grid top by 6 px and increases every pane canvas. The fifteen
1440×900 and fifteen 1280×720 files remain byte-for-byte v1 evidence because
their 48 px tab row and all resulting geometry are unchanged.

The screenshot directory is the implementation reference; QA-only temporary
captures are not part of the final evidence set.

## Autonomous decisions

1. Keep the selector in the Display strip and preserve the rest of IA.
2. Treat rows/columns as the full topology chooser because TASK-0029 defines no
   additional variant taxonomy.
3. Use an anchored, focus-contained non-modal dialog rather than a page-blocking
   modal because the action is local and draftable.
4. Use Pane 2 as the representative active pane in 2×2 so context switching is
   visible without implying Pane 1 is permanently special.
5. Compact 4×4 headers instead of introducing pane scrollbars or hiding the
   existing plot-type menu.
6. Replace stale drafts on 409 instead of attempting a visual merge; this is the
   only behavior compatible with server-owned IDs and revision state.
7. Do not show guessed IDs for growth previews.

## Gaps and non-goals

- Corporate Figma is inaccessible and therefore not used; this is a documented
  lower-priority source gap, not a readiness blocker.
- Plot SVGs are visual mock data, not a plot-engine specification.
- Real API latency, browser-native select rendering and live plot performance
  remain frontend verification concerns.
- No architecture handoff, product, test, runtime, dependency or Git file is
  created/changed by this package.

## Change log

- `v2` / TASK-0047 / HND-0136: corrected only width ≤1080 Display tab row from
  48 px to inherited 42 px; updated 1024 grid/pane dimensions and refreshed the
  fifteen affected 1024×768 screenshots. Behavior and 1280/1440 evidence are
  unchanged.
- `v1` / TASK-0044 / HND-0115: initial ready multi-layout package.

## Ready checklist

- [x] Separate versioned package, v2, status ready.
- [x] TASK-0040 IA and visual system retained.
- [x] TASK-0040 42 px Display tab row inherited at width ≤1080.
- [x] Exact 1×1, 2×2 and 4×4 geometry at 1440×900, 1280×720, 1024×768.
- [x] Draft/Apply/Cancel and collision/focus/keyboard rules.
- [x] Stable active pane and independent type/bindings.
- [x] Signals checkbox context is explicit.
- [x] Preserve/drop, active fallback and server-owned ID behavior.
- [x] 422/409/loading/empty/error/warning/success states.
- [x] Session v1 reload and legacy 1×1 migration behavior.
- [x] Local interactive mock and complete screenshot evidence.
