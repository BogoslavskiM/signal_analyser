# Current application design

- Task: `TASK-0111 / TASK-0112 / TASK-0113 / TASK-0114 / TASK-0115 / TASK-0116 / TASK-0117 / TASK-0118 / TASK-0119 / TASK-0124 / TASK-0126 / TASK-0130 / TASK-0132 / TASK-0134 / TASK-0135 / TASK-0138 / TASK-0139 / TASK-0140 / TASK-0141 / TASK-0142`
- Design mode: `autonomous`
- Design status: `ready`
- Design version: `46`
- Canonical UI profile: `analytical-dense`
- Prototype entry: `prototype/index.html`
- Frontend source root: `frontend-source/`
- UI contract: `ui-contract.yaml`
- Transfer manifest: `transfer-manifest.yaml`

## Scope

V46 is the current integration-safe package for the accepted Signal Analyser
visual baseline v28. It preserves the
analytical workspace, right settings panel,
lower multi-tab inspector, automatic settings persistence and existing import/save toolbar seams.
It contains the four previously accepted user-valued surfaces plus the narrow
TASK-0130 graph-cursor extension:

1. Spectrum extrema, independent frequency/magnitude plot sliders, independent
   screen links and separate frequency/magnitude limits.
2. Persisted display/pane names with rename controls and monotonic default
   ordinals that do not shift when a display is deleted.
3. First settings tab `Сигнал`, backend-authored summary, `Значения` focus
   action and a dynamic, lazily loaded sample table named after `main_signal`.
4. One signal-operation dialog next to Duplicate, with six built-ins plus a
   user operation body executed by the Engee backend provider with
   `init_signal` available as its input binding.
5. Two existing-style pane-menu choices, `Курсор` and `Два курсора`, controlling
   mutually exclusive pane-local draggable X cursors for ready Time/Spectrum plots.
6. Corrected selected palette-swatch geometry: an exact 24×24 border-box color
   square inside the unchanged 32×32 target, uniform 4px selection halo and an
   optically centered proportional tick.
7. Existing dynamic sample table now uses a bidirectional sliding row window:
   500-row provider batches, at most 1000 DOM rows and boundary prefetch at 100.
8. The same table has an exact point-number server jump and TIME-only projection
   of a current same-signal extrema marker into the point-number cell.
9. The Values table keeps `№ точки / Время / Значение` always visible and exposes
   provider-authored `Модуль / Квадрат / Корень из модуля × знак` as independent,
   initially hidden eye-menu columns. The `Корень` calculated column is absent.
10. The point-search row has no standalone search action: Enter submits the point
    search, successful loads leave no persistent status, and the existing standard
    vertical-three-dot action occupies the single final slot for column visibility.
11. `FFT` is absent from the signal-operation selector; backend support may remain.
12. Accepted pane-type and valid Area-settings output mutations immediately cover
    the exact pane until its current output is ready, empty or error. Layout add/
    remove/rows/columns mutations instead cover the display canvas with one loader
    through accepted layout and all initial output terminal states.
13. Those scoped loaders continuously rotate through the existing defined
    `loader-rotate` keyframes. Double-click autoscale restores only the clicked
    Time, Spectrum, Spectrogram or Persistence pane to the baseline of its
    current accepted output, preserving current units and linear/log semantics.
14. Every visible applicable Area/Screen range endpoint remains editable outside
    a true busy state. Min and Max validate independently with per-input red
    borders, one Min-first local Russian message and no raw internal error copy.

The exact DSP math, Engee/EngeeDSP call selection, API endpoints, revision
transaction implementation, Plotly payloads, sample API endpoint mechanics and
session serialization remain outside Designer ownership.

V32 preserves the production-faithful shell and all accepted v31 surfaces. It
adds the approved compact signal-color popover and corrects two missing
TASK-0119 states: plot-type selection always routes the right panel to
`Область`, and the populated `main_signal` sample tab exists automatically.
`Значения` only selects/focuses that existing tab. Signal sampling remains an
editable metadata field labelled `Дискретизация, Гц`; only strict positive
finite dot-decimal values pass UI validation and autosave persists it.

V33 removes the general settings Apply action. Valid Signal, Area and Screen
changes save through one debounced revision-safe queue; invalid or hidden fields
do not publish. The contextual settings footer is visible for `Сигнал` with
`Значения` and for `Экстремумы` with `Рассчитать`; the latter saves a valid
changed extrema configuration before starting a missing/stale calculation or
focusing its current values.

V35 keeps the v34 shell and adds only the requested content/state rules:
Signal `Сводка` exposes every measurement column even when the lower table hides
it; `Значения` deterministically opens the populated named sample table; display
and pane drafts preview in their tab/header immediately; editable fields opt out
of browser history/profile suggestions; numeric limits use the currently chosen
axis units while canonical state remains seconds/Hz; automatically assigned
colors and the picker use the restored original eight-color list; extrema calculate inside the
active plot's current visible X interval; signal-table and Engee-catalog
checkboxes remain mounted and checked through pending operations.

V31 changed only TASK-0117 interaction semantics. Plain LMB on the non-control row
surface makes that signal `main_signal` and ensures its checkbox is ON; it can
never hide a signal. Direct checkbox interaction changes only active-pane graph
visibility and never changes `main_signal`, including when the hidden signal is
the current main. Blue emphasis therefore remains independently bound to the
single `main_signal` row. The dynamic samples tab now has a deterministic
cursor fixture whose second page appends visible rows across all five columns.

V29 changed no approved product surface. It corrected the transfer boundary and
the review harness: production `public/index.html`, shell/module identities,
component CSS and existing `[data-pane-host]` Plotly hosts are authoritative.
`prototype/index.html` is now a direct `file://` snapshot of that production
DOM/CSS/component base with deterministic local state/data adapters. The older
zone mock modules remain design-only reference files and are not the prototype
entry baseline or production transfer inputs.

## Key approval surfaces

| # | Surface | Approval decision | Evidence |
|---:|---|---|---|
| 1 | First `Сигнал` tab | Metadata first, then compact two-column `Сводка`; one `Значения` action | `screenshots/v31--standalone-production-signal--1440x900.png` |
| 2 | Dynamic samples tab | Tab label is current `main_signal.name`; three fixed base columns plus three independently visible provider-authored calculated columns; 244px eye menu opens from the search-row three dots | `screenshots/v41--values-column-visibility-menu--1440x900.png` |
| 3 | Spectrum extrema | Markers overlay the spectrum, lower table uses Magnitude + projected Frequency | `screenshots/v31--standalone-production-spectrum-extrema--1440x900.png` |
| 4 | Spectrum Area settings | Frequency/magnitude slider checkboxes; independent local magnitude limits | `screenshots/v31--standalone-production-spectrum-area--1440x900.png` |
| 5 | Screen spectrum links | Four independent checkboxes; linked frequency limits appear as a separate group | `screenshots/v31--standalone-production-screen-links--1440x900.png` |
| 6 | Operation selector | Six operations use the existing shared `SignalAnalyserValueSelect`, including inline search and modal-owned options popup; FFT is absent | `screenshots/v31--standalone-production-operation-menu--1440x900.png` |
| 7 | User operation body | Editor shows only the body written by the user and a neutral Engee/`init_signal` hint | `screenshots/v31--standalone-production-operation-custom--1440x900.png` |
| 8 | Engee operation states | Backend execution error, busy and success remain inside the same dialog context | `screenshots/v31--standalone-production-operation-{error,progress}--1440x900.png` |
| 9 | Signal table emphasis | Exactly one `main_signal` row is blue; other checked rows stay white and ordinary hover is grey | `screenshots/v31--main-signal-only-and-hover--1440x900.png` |
| 10 | Row click | LMB on an already checked row keeps it checked and makes it the sole blue `main_signal` | `screenshots/v31--row-click-main-signal--1440x900.png` |
| 11 | Direct checkbox | Unchecking the current main removes its graph trace but leaves the same row blue/main | `screenshots/v31--checkbox-hides-current-main--1440x900.png` |
| 12 | Signal disclosures | `Основное` and `Сводка` use standard settings disclosures; collapsed summary and `Дискретизация, Гц` are visible | `screenshots/v31--signal-settings-collapsed--1440x900.png` |
| 13 | Screen context after create | Display selection/creation selects the `Экран` settings page and updates its heading context | `screenshots/v31--screen-focus-after-display-add--1440x900.png` |
| 14 | Automatic sample tab | `radarPulse` exists before `Значения` and opens a populated five-column first page | `screenshots/v32--automatic-main-signal-samples--1440x900.png` |
| 15 | Signal color | Compact 284px anchored popover; HEX, the restored eight swatches, selected tick and draft-only footer | `screenshots/v32--jet-color-picker--1440x900.png` |
| 16 | Pane type context | Selecting another type while `Сигнал` is open selects `Область`; Signal content cannot remain under the Area page | `screenshots/v32--pane-type-change-focuses-area--1440x900.png` |
| 17 | Operation overwrite row | Standard visible 16px checkbox followed by the full label `Затирать сигнал с таким именем` | `screenshots/v32--operation-overwrite-checkbox--1440x900.png` |
| 18 | Graph cursor modes | Existing menu rows select one or two snapped vertical X cursors; readout overlays the graph and never calls backend/DSP | `screenshots/v36--spectrum-{single,dual}-cursor--1440x900.png` |
| 19 | Cursor menu inventory | `Курсор` and `Два курсора` appear before `Управление графиком` with the existing icon/check columns | `screenshots/v36--pane-menu-cursor-options--1440x900.png` |
| 20 | Area/Screen bounds | Applicable endpoints stay enabled; each invalid endpoint has only its own red border and one Min-first local message | `evidence/interaction-regression-v46-task0142.json` |

## Autonomous decisions

- The user-facing labels are `Связать частоты` and `Связать магнитуды`; they
  are independent from time/amplitude links.
- Time/amplitude/frequency/magnitude limits use one identical component:
  units where applicable, empty Min/Max fields, and a horizontal dual-thumb
  slider. Only the owning scope (`Область` or `Экран`) changes.
- `auto` is the first available time/frequency unit; explicit units remain
  selectable. Empty Min/Max always remain placeholders and mean full range.
- Frequency and magnitude sliders can be enabled independently or
  simultaneously. For spectrum, their visibility is exposed both by the
  existing pane menu and the Area `Параметры` checkboxes. Both projections
  read/write one active-pane draft and update each other immediately.
- Spectrum extrema are expressed as `Магнитуда` and `Частота`; marker numbering
  is shared between graph and table. Unit projection is provider-authored.
- Display and pane rename inputs live in `Экран → Основное` and
  `Область → Основное`; stable IDs never appear as labels.
- `Значения` does not create a second dialog: it guarantees/selects/focuses the
  dynamic lower tab, expands a collapsed inspector and starts missing page 1,
  preserving the graph and settings context.
- The operation dialog is `660px` wide (a documented deviation from the
  standard `560px` analytical dialog) because the custom operation body
  needs a readable editor. Built-in form remains compact; the menu-open state
  uses a viewport-positioned shared popup so all seven options remain visible.
- Custom operation UI sends only the user's operation body through
  `signal-operation-provider`. Backend owns the `engee.genie.recv` execution
  envelope, temporary `init_signal` binding and cleanup. UI neither constructs
  nor displays those mechanics.
- The Operation field is not a bespoke dialog dropdown. It is the production
  `SignalAnalyserValueSelect`: readonly selected-value input while closed; the
  same editable input with placeholder `Поиск` while open; 24px flipping arrow;
  options-only popup, exact anchor width, 34px options and selected check.
- Existing native Engee import/save interaction remains behind the v26 toolbar
  provider seam and is not visually redesigned by these tasks.
- Signal membership and main-signal selection are distinct states. Checkbox
  checked means the signal is shown in the active pane; the one
  `[data-main-signal=true].is-main-signal` row alone uses persistent blue.
- Plain LMB on a non-control part of a signal row always makes that signal
  `main_signal` and ensures membership/visibility is ON. Clicking a checked row
  never turns it off. Direct checkbox interaction changes only membership/
  visibility and never changes `main_signal`; consequently a hidden current
  main remains the sole blue row and remains the Signal settings context.
- “Focus settings” means selecting the matching right-panel page and updating
  its screen/pane context: pane → `Область`; display tab or Add display →
  `Экран`. It does not mean forcing browser keyboard focus away from the click.
- The sample tab for the current `main_signal` is structural, not an action
  result. It is created/rebound and its first cursor page is requested whenever
  a valid main signal exists. `Значения` also recovers a missing/stale first
  page, selects/focuses the tab and expands the lower inspector.
- The signal color popover follows Figma node `1779:11344` geometry but contains
  only `HEX`, the restored eight-swatch application palette and `Отмена / Применить`.
  Palette scheme, line,
  marker, fill and interpolation controls are intentionally absent.
- The selected palette target remains exactly 32×32. Its color square is an
  exact 24×24 border-box at 4px from every target edge; the selected background
  is therefore a uniform 4px halo on all four sides. The existing local tick
  keeps its intrinsic 10:8 proportion and is optically centered over the color
  square; selected, hover and focus do not change geometry.
- `Дискретизация, Гц` is editable Signal metadata, not summary output. Comma
  decimals, non-finite values, zero and negatives are invalid; dot-decimal and
  exponent notation are accepted only when finite and strictly positive.
- Signal `Сводка` is a single-column list and is not coupled to the lower Measurements visibility menu. It
  always includes counts/type/duration, ROI start/end, min/max with positions,
  mean, median, peak-to-peak range and RMS.
- Display/pane name drafts immediately project into the selected screen tab or
  active pane title and settings context; the existing debounced autosave remains
  authoritative and does not delay this preview.
- Every text/search/numeric entry surface opts out of browser autocomplete,
  spellcheck, autocapitalization and semantic profile field names. Native
  browser profile/history suggestions are not an application overlay.
- Selected time/frequency units own the visible Min/Max numbers. Canonical state
  and requests remain seconds/Hz; empty bounds stay empty instead of being
  materialized from a full range.
- The restored eight original swatches are the only automatic signal-color source and the
  picker inventory. Pending signal membership or Engee catalog operations keep
  the same checkbox nodes and checked state visible, applying only disabled and
  `aria-busy` in place.
- `Рассчитать` scopes extrema to the active graph's current visible X interval:
  optional `visible_range` is `{min_s,max_s}` for time or `{min_hz,max_hz}` for
  spectrum; absence means full domain and Y zoom is intentionally ignored.
- Graph cursor mode is exactly one of `off | single | dual` per pane runtime key.
  Selecting the already active menu item toggles back to `off`; selecting the
  other item switches mode without a transient backend state.
- Cursor lines are vertical Plotly-sibling overlays constrained to the current
  visible X domain. Pointer drag and Arrow/Home/End movement snap to the nearest
  available X sample/bin. They consume only their own pointer gesture and do
  not initiate Plotly zoom, pan, slider movement or linked-axis propagation.
- Single mode reports X and the nearest value of every visible trace. Dual mode
  reports X1, X2, ΔX and Y1/Y2 for every visible trace. There is no interpolation,
  DSP recalculation, API call, state revision or session persistence.
- Time and Spectrum use the same component. Spectrogram, loading, empty, error
  and no-visible-trace panes disable both menu actions. Axis linking can change
  a pane's visible domain and therefore clamp its own cursor, but never copies
  cursor mode or positions to another pane.
- Sample point search accepts only an exact nonnegative integer in
  `0..total-1`. Enter or the icon action requests one 500-row page at
  `clamp(target - 250, 0, total - 500)`, replaces the current DOM window, then
  focuses and scrolls the target row into view. Clearing alone does nothing;
  explicit Enter/icon action on empty resets to the first 500 rows and top.
- A point cell receives a marker only from the exact active display/pane's
  successful, calculated TIME extrema record whose row `signal_name` matches
  the selected signal through existing `signalNameMatches` (exact fallback) and
  has provider `sample_index`. Color comes from `row.signal_color`. Spectrum
  bins are never mapped to raw samples.
  For multiple matches the lowest finite `graph_number` wins, with provider
  response order breaking ties.
- The point cell stays left aligned with point number first and marker after.
  Auto table layout gives it `width: 1%` and exact `min-width: 112px`, sufficient
  for one eight-digit 100m-scale number plus unchanged marker. Other columns and
  row styles remain unchanged.
- The sample Values table has exactly three non-optional base columns in fixed
  order: `№ точки`, `Время`, `Значение`. They never appear in the visibility menu.
  Four deterministic provider-authored columns follow in fixed order:
  `Модуль`, `Квадрат`, `Корень`, `Корень из модуля × знак`. All four are visible
  by default and can be toggled independently without an API request, revision,
  row-window reset, scroll reset or table selection change.
- The visibility preference is one frontend-only application-lifetime map shared
  by dynamic Values tabs. A main-signal rebind does not reset it; a full reload
  may. The UI displays only provider fields and never calculates a derived value.
- `Умножить` and `Пользовательское` are intentionally absent from the ready menu:
  their multiplier/body, naming, scope and lifecycle are still product decisions.
  `FFT` is excluded explicitly by the user. No placeholder parameter UI or fake
  calculated column is introduced.
- The three-dot trigger is the final fixed 32px action in the current point-search
  row. Its body-portal popup copies the production Signal table pattern: 244px,
  title `Видимость столбцов`, 28px `menuitemcheckbox` rows, `eye.svg` for visible
  and `eye-off.svg` for hidden. A toggle keeps the menu open and restores focus
  to the same row; Escape restores the trigger, outside click closes without
  stealing focus, and Arrow/Home/End use roving focus.

## Exact delta v27 → v28

- Changed only the Operation field and custom-operation copy/provider contract.
- Replaced the v27 bespoke operation dropdown with the existing production
  `SignalAnalyserValueSelect` source and its exact trigger/popup interaction.
- Replaced the restricted-DSL wording with `Тело операции` and one neutral
  Engee/`init_signal` result-vector hint.
- Custom submit now exposes a provider payload field `body`; mock evidence uses
  an Engee-authored error and the same busy/success visuals.
- Added v28 screenshots/evidence only for the changed operation states.
- Unchanged: application shell, all tabs/tables/graphs, spectrum settings and
  sliders, limits/link groups, naming controls, Apply, dimensions, tokens,
  typography, lower inspector, import/export and all v27 viewport evidence.

## Exact delta v28 → v29

- No visual, layout, token, geometry, text or interaction redesign.
- Removed every whole-shell/module copy instruction from the transfer manifest;
  `copy_as_is` is intentionally empty.
- Marked `frontend-source/index.html`, mock zone HTML/CSS/JS, mock Plot/SVG
  renderer, providers, icons/fonts copies and prototype as design-only.
- Added exactly two production integration fragments: one additive feature CSS
  fragment for existing `public/css/app.css`, and the approved signal-operation
  dialog markup as a runtime singleton under `document.body`.
- Pinned existing production hosts for settings tabs/content/autosave lifecycle,
  inspector tabs/body/rows, row actions, pane menu, `[data-pane-host]` Plotly
  nodes and the body modal portal.
- Clarified that spectrum slider visibility has two synchronized projections:
  existing pane-menu actions and Area settings checkboxes. They share one draft.
- Pinned projected spectrum extrema and cursor-based signal sample pagination to
  provider methods added through existing `public/js/api.js` and consumed by
  existing `public/js/app.js`; endpoints remain Frontend/Backend-owned.
- Replaced the unusable fetch-partial prototype entry with a production-faithful
  `file://` snapshot: four nonempty zones, no server and no network requests.
- Pinned the exact rendered production baseline and hashes in
  `evidence/production-baseline-v29.json`.
- Re-ran the complete production-component walkthrough as 18/18 with zero
  runtime/CORS errors in `evidence/interaction-walkthrough-v29-standalone.json`.

## Exact delta v29 → v30

- No shell, layout, sizing, typography, toolbar, graph, dialog, tab or table
  geometry changed.
- Replaced signal-row selected-color semantics with one explicit
  `.is-main-signal` state; checked visibility alone has no persistent row fill.
- Added plain-row LMB membership/main interaction while excluding checkbox,
  row actions, links, form controls and Plotly modebar descendants.
- Converted Signal `Основное` and `Сводка` headers to the existing
  `.settings-group-title` disclosure contract; both start expanded and preserve
  their state during the active editor lifetime.
- Replaced the sampling label with exact text `Дискретизация, Гц`.
- Routed pane clicks to `Область` and display-tab/add-display clicks to `Экран`.
- Kept the standalone prototype on actual production DOM/CSS/JS. Mock code
  supplies only deterministic data and provider responses; it contains no
  parallel TASK-0116 UI behavior.
- Re-ran the full walkthrough as 23/23 with zero HTTP(S), CORS, console or page
  errors in `evidence/interaction-walkthrough-v30-standalone.json`.

## Exact delta v30 → v31

- No visual, layout, sizing, typography, color, graph, dialog, settings, tab or
  table geometry changed.
- Replaced the shared row/checkbox toggle with two independent UI intents:
  row surface = ensure visibility ON + select main; checkbox = visibility only.
- Preserved blue emphasis from `main_signal` even when that signal's visibility
  checkbox is OFF.
- Added an exact UI-only intent fragment for Frontend integration and a
  prototype-only bridge over the real production DOM/API modules.
- Corrected the standalone samples response to the real paginated provider
  shape and added three deterministic pages; page 2 appends real five-column
  rows during the walkthrough instead of leaving the table body empty.
- Re-ran the full walkthrough as 26/26 with zero HTTP(S), CORS, console or page
  errors in `evidence/interaction-walkthrough-v31-standalone.json`.

## Exact delta v31 → v32

- Added the approved anchored 284px Signal color popover from exact Figma node
  `1779:11344`, retaining HEX, swatch targets, selected tick and equal footer
  buttons; replaced only the Figma Parula contents with exactly 15 Jet swatches
  by explicit user request.
- Kept color selection draft-only inside the popover. Popover `Применить`
  updates the Signal metadata draft and starts its existing autosave lifecycle;
  `Отмена`, Escape and outside click restore the opening color.
- Plot-type selection while any other settings page is open selects `Область`
  after the authoritative pane mutation is accepted.
- The dynamic tab named after `main_signal` is now present and first-page loaded
  automatically. `Значения` no longer creates it and only focuses/selects it.
- Confirmed editable `Дискретизация, Гц` dot-decimal validation and the exact
  unclipped standard overwrite checkbox row in the operation dialog.
- Preserved spectrum Extrema settings, bottom tab, calculated frequency rows and
  Plotly markers for spectrum; both tabs are hidden for spectrogram.

## Exact delta v33 → v34

- No shell, spacing, typography, control, table, graph, dialog or overlay style
  changed; the accepted production appearance remains the visual baseline.
- Expanded Signal `Сводка` to the complete measurement inventory independent of
  the lower table's visible-column choices.
- Strengthened `Значения` from focus-only to a deterministic expand/ensure/
  select/focus/load-first-page interaction over the existing dynamic tab.
- Added same-frame display/pane name preview while preserving debounced autosave.
- Added a browser input-history opt-out contract to settings and dialog inputs.
- Defined selected-unit projection for limits with seconds/Hz canonical state,
  including the invariant that empty automatic bounds remain empty.
- Made the picker palette and automatic color allocation one exact 15-entry Jet
  sequence.
- Scoped extrema calculation to the current visible X/frequency interval.
- Added stable-row/checkbox busy projection for the Signals table and Engee add
  catalog: disabled plus `aria-busy`, never removal/recreation or checked loss.

## Exact delta v34 → v35

- Restored the original eight Signal Analyser colors for automatic allocation
  and made the picker expose the identical ordered palette.
- Changed Signal `Сводка` from two columns to one vertical column.
- Moved `Значения` from the Summary body into the contextual settings footer;
  the footer shows `Значения` for `Сигнал` and `Рассчитать` for `Экстремумы`.

## Exact delta v35 → v36

- Added only two existing-style pane-menu rows before `Управление графиком`:
  `Курсор` and `Два курсора`, each with the established checkbox/tick semantics.
- Added one reusable Plotly-sibling overlay for mutually exclusive single/dual
  X cursors on ready Time/Spectrum panes. No application shell, plot layout,
  settings, inspector, dialog, table, signal color or backend surface changed.
- Cursor drag/keyboard movement is constrained to the visible X domain and
  snaps to the nearest available sample/bin; dual mode adds X1/X2/ΔX and
  per-visible-trace values. Repeat selection toggles the active mode off.
- Added deterministic `file://` interaction evidence: 8/8 passed, zero API/
  HTTP resources and zero console/page errors.

## Exact delta v36 → v37

- Corrected only the existing cursor snap comparator: a finite nearest sample
  at `X = 0` remains the current best candidate while heterogeneous visible
  traces are compared. Only explicit `null` or non-finite candidates mean that
  no valid best value exists.
- No menu, cursor overlay, plot, settings, table, dialog, sizing or visual state
  changed; visual baseline and all v36 screenshots are carried forward.
- Added a deterministic local regression with candidates `0` and `0.7` for a
  target of `0`; the controller returns `0` with zero runtime errors.

## Exact delta v38 → v39

- Added only the UI row-window controller for the existing dynamic main-signal
  samples table; no CSS, markup, column, footer placement, Values behavior,
  empty/error/loading visual or other application surface changes.
- Fixed constants are batch `500`, DOM cap `1000` and bidirectional prefetch
  within `100` rows. Provider `start_offset/end_offset` are authoritative
  zero-based half-open offsets; the footer is exactly `{start}–{end} из {total}`
  in real one-based inclusive row numbers.
- Downward third batch produces `501–1500` and returns `-500` compensation rows;
  upward prepend returns `1–1000` and `+500` rows. Frontend multiplies by the
  measured rendered row height before restoring `scrollTop`, keeping the same
  visible record fixed.
- Stable signal/token guards ignore stale responses, same-direction requests
  deduplicate and totals above 100 million never allocate a full array.

## Exact delta v39 → v40

- Added the existing-style 32px search row with placeholder
  `Введите номер точки`, inline typed status and Enter/icon activation.
- Added a token-guarded 500-row replacement request centered around the target;
  v39 bidirectional 500/1000/100 sliding resumes from replacement offsets.
- Added only TIME same-signal `sample_index` marker projection using the existing
  `.extrema-table-marker`; Spectrum extrema never project into raw samples.
- Changed only the first sample-table column to auto `1%`, exact `112px`
  minimum, left alignment and number-before-marker order.
  Shell, inspector dimensions, other columns, footer, Values action and existing
  loading/empty/error visuals are unchanged.

## Exact delta v40 → v41

- Added one 32px three-dot trigger to the existing sample point-search row and
  one fixed body-portal menu using the already accepted production
  `Видимость столбцов`/eye pattern. No shell, inspector, search-input, footer,
  row-window, marker, graph, settings or dialog geometry changed.
- `№ точки / Время / Значение` remain always visible. `Модуль / Квадрат /
  Корень / Корень из модуля × знак` are provider-authored, initially visible,
  independently toggleable and always render in that order.
- Visibility toggles are frontend-only and immediately reflow the table while
  preserving rows, current window offsets, footer and scroll. The table owns
  horizontal overflow as its min-width changes from 612px to 1182px.
- Recorded exact trigger/menu selectors, eye/eye-off state, keyboard, outside,
  Escape/focus restoration, body-portal stacking and narrow viewport flip/clamp.
- `Умножить` and `Пользовательское` remain unresolved product dependencies and
  are not rendered. `FFT` is explicitly excluded.

## Exact delta v41 → v42

- Removed the standalone right-side point-search action from the dynamic Values
  search row. Enter on `sample-point-search-input` is the only submit gesture;
  explicit empty Enter still resets the first server page.
- Removed persistent loading/success copy such as `Показано начало сигнала.`.
  Successful replacement returns to `ready` with no message; only compact
  validation/provider errors may render inline as an assertive alert.
- Reused the existing `.inspector-action` control with `more-vertical.svg` as
  the one final 32px row action. It opens the unchanged 244px
  `Видимость столбцов` eye/eye-off menu from v41.
- Mock/render contracts now use authoritative `start_offset`, `end_offset`,
  `next_cursor` and `total` page fields; legacy camelCase cursor aliases are not
  required. Multiply/Custom remain absent and FFT remains excluded.

## Exact delta v42 → v43

- All optional Values columns now start hidden. The menu contains only
  `Модуль`, `Квадрат` and `Корень из модуля × знак`; `Корень` is absent from
  headers, cells, menu, mock state and the transferable UI inventory.
- `Операция над сигналом` omits only `FFT`; backend capability is unchanged.
- Reused the existing loader surface, accent and 64px spinner without new visual
  tokens. Pane type or valid Area settings that starts output refresh mounts one
  pointer-blocking overlay on the exact `[data-pane-id]` before the mutation.
  Only the matching current `ready | empty | error` terminal removes it.
- Layout add/remove/rows/columns starts one overlay on the active display
  `plot-grid` canvas before mutation. It stays through accepted layout and every
  initial pane output terminal, suppressing pane overlays beneath it. Workspace
  title/tabs/actions, Settings and Inspector are never covered. Stale completions
  cannot dismiss either overlay.
- Applied skills: `designer/designer-workflow`,
  `designer/data-entry-and-inspection`, `designer/output-and-visualization` and
  `designer/application-composition`. Skipped `designer/visual-system` and
  Engee Apps research because the accepted loader/menu styles and composition
  are reused unchanged; Figma reference status is `not_required`. Page sizing
  is unchanged because no zone geometry or resize behavior changed.

## Exact delta v43 → v44

- Corrected only the scoped-loader animation reference from the undefined
  `ui-spinner-rotate` name to the production-defined `loader-rotate` keyframes.
  Normal motion remains `800ms linear infinite`; reduced motion remains visibly
  rotating at `1600ms linear infinite`. Geometry, color and overlay ownership do
  not change.
- Defined one authoritative double-click reset for every ready plot type. The
  baseline is captured after each matching current `Plotly.react`: an explicit
  provider range wins, otherwise the rendered automatic full-domain range is
  retained. Log ranges remain Plotly coordinates and are never linearly
  reprojected from raw frequency values.
- `updateLayout` preserves default range/signature state for every still-current
  signal-bearing Time/Spectrum/Spectrogram/Persistence pane. Slider state remains
  eligible only for Time/Spectrum. Removed, cleared, stale or type-changed output
  identities cannot supply a reset baseline.
- Reset relayouts only the clicked pane. It does not propagate linked axes,
  publish settings/revisions, call backend/DSP, change `main_signal`, or reset
  Spectrogram/Persistence heatmap color ranges.
- Applied skills: `designer/designer-workflow` and
  `designer/output-and-visualization`. Skipped visual-system, Figma, Engee Apps,
  composition and sizing skills: the accepted loader/plot visuals and all
  geometry are unchanged. Figma reference status is `not_required`.

## Exact delta v44 → v45

- Screen labels are exactly `Связать частоты` and `Связать магнитуды`.
- Frequency linking applies only to ready Spectrum and Persistence panes in the
  active display. Their displayed linear/log coordinates and selected units are
  converted through canonical Hz before projection. Spectrogram frequency is
  intentionally excluded; its existing Time link remains unchanged.
- Magnitude linking applies Spectrum magnitude ↔ Persistence power only while
  each participating pane is in dB. Linear panes, hidden fields, Spectrogram
  power and Persistence density are ignored. A linked screen draft therefore
  never overwrites a noneligible local field.
- Every visible range field on `Область` reuses the exact existing Screen
  dual-handle component and interaction: Time X/Y; Spectrum frequency/magnitude;
  Spectrogram time/frequency/power; Persistence frequency/power/density. The
  component is active-pane scoped. Each empty endpoint stays empty/auto until
  that endpoint's field or thumb is changed; unit projection remains seconds/Hz
  at the provider boundary and double-click clears both endpoints.
- Spectrogram and Persistence heatmaps receive the Plotly `Jet` colorscale from
  Backend/provider output. Frontend passes it through unchanged; it adds no
  palette UI, override or signal-color change.
- The unchanged 224px pane menu remains a body portal, anchored to the clicked
  `[data-pane-menu]`. Its fixed position is clamped to the intersection of the
  application shell and viewport with 8px inset, flips above/left as needed,
  repositions on capture scroll/resize, and closes with focus restoration when
  the anchor disconnects or leaves that boundary. Escape/outside-click and
  arrow-key behavior are preserved.
- Backend/provider authors only a newly created display as 2×2 with four empty
  named panes and the first pane active. Frontend renders the accepted layout
  and stable IDs without creating follow-up panes. Existing/imported displays
  are never migrated.
- Transfer helper: `frontend-source/integration/js/task-0141-linked-axes-area-sliders.js`.
- Evidence: `evidence/interaction-regression-v45-task0141.json` and
  `evidence/transfer-audit-v45.json`. No new screenshot is required because all
  visible components, Jet and menu geometry are exact accepted reuse.
- Applied skills: `designer/designer-workflow`,
  `designer/data-entry-and-inspection`, `designer/output-and-visualization` and
  `designer/application-composition`. Skipped `designer/visual-system`, Figma,
  Engee Apps research and page sizing: no new component/style, composition or
  zone geometry is introduced. Figma reference status is `not_required`.

## Exact delta v45 → v46

- Applicable visible Min/Max inputs on both `Область` and `Экран` stay enabled
  in automatic mode and regardless of plot-slider/link state. A range is hidden
  when truly inapplicable and disabled only during its current settings mutation.
- Each endpoint owns its validator and `aria-invalid`. Invalid Min and Max each
  receive their own 2px danger border; the pair wrapper, settings row and group
  never receive a shared red border. Existing 32px geometry and error tokens are
  reused, so border changes do not move adjacent controls.
- Exactly one inline message is shown below the pair. If both endpoints are
  invalid, the Min message is shown while both inputs remain red. After Min is
  fixed, the Max message becomes visible if Max is still invalid.
- Local Russian messages are explicit for number, finite, domain, order and unit
  reasons. Raw Backend/provider/internal exception text is never used as a field
  error; a publication failure remains the existing sanitized non-field status.
- Empty untouched endpoints remain valid automatic placeholders. Unit projection,
  double-thumb sliders, double-click reset and autosave ownership are unchanged.
- Transfer files:
  `frontend-source/integration/js/task-0142-range-boundary-validation.js` and
  `frontend-source/integration/css/task-0142-range-boundary-validation.css`.
- Evidence: `evidence/interaction-regression-v46-task0142.json` and
  `evidence/transfer-audit-v46.json`. No screenshot/Figma read is required: this
  revision reuses the accepted field/error visuals and changes only state projection.
- Applied skills: `designer/designer-workflow` and
  `designer/data-entry-and-inspection`. Skipped visual-system, Figma, Engee Apps,
  composition, output and sizing skills because no new style, layout, graph or
  viewport decision is introduced. Figma reference status is `not_required`.

### V46 field/state matrix

| Endpoint state | Min border | Max border | One visible message | Enabled |
|---|---|---|---|---|
| Both valid/blank auto | default | default | none | yes |
| Min invalid | danger | default | Min reason | yes |
| Max invalid | default | danger | Max reason | yes |
| Both invalid | danger | danger | Min reason only | yes |
| Min fixed, Max still invalid | default | danger | Max reason | yes |
| Current settings mutation busy | unchanged | unchanged | current validation message | no |
| Truly inapplicable | not rendered | not rendered | none | not applicable |

## Sources

- `architecture/application-spec.yaml`.
- `architecture/tasks/TASK-0111-screen-linked-axis-settings.md`.
- `architecture/tasks/TASK-0112-spectrum-extrema-linked-axes.md`.
- `architecture/tasks/TASK-0113-stable-display-pane-names.md`.
- `architecture/tasks/TASK-0114-main-signal-settings-samples.md`.
- `architecture/tasks/TASK-0115-derived-signal-operations.md`.
- User TASK-0116 brief for signal-row state, collapsible signal groups, sampling
  label and settings context routing.
- User TASK-0117 correction separating row-click main selection from direct
  checkbox graph visibility.
- Approved TASK-0118 Signal color picker and TASK-0119 corrections from user
  chat on 2026-08-19.
- User TASK-0126 corrections from chat on 2026-08-20 for complete summary,
  immediate names, input-history opt-out, restored color identity, unit-aware limits,
  zoom-scoped extrema, deterministic Values and checkbox continuity.
- User TASK-0142 corrections from chat on 2026-08-24 for enabled applicable
  Area/Screen bounds, independent endpoint validators/borders, Min-first message
  priority and local error copy without raw internal exceptions.
- User TASK-0130 request from chat on 2026-08-20 for one- or two-cursor graph
  modes in the existing pane menu.
- User TASK-0132 screenshot and correction from chat on 2026-08-24 for the
  selected palette swatch halo and tick alignment.
- Approved TASK-0134 contract from 2026-08-24 for the existing samples table
  bidirectional sliding row window.
- Approved TASK-0135 request from 2026-08-24 for exact point jump, TIME extrema
  marker projection and compact point cell.
- User TASK-0138 screenshots from 2026-08-24 for the calculated-column inventory
  and the existing production Signal-table `Видимость столбцов` eye menu.
- Read-only current selectors/geometry in `public/index.html`,
  `public/css/app.css`, `public/js/app.js`, `public/js/settings.js`.
- Canonical local `designer/visual-system`, application composition, settings,
  output, dialog and page-sizing references.

### Skills for v36 revision

- Applied: `designer/designer-workflow` for complete-current publication and
  `designer/output-and-visualization` for graph overlay ownership, ready/
  unavailable states and overlay priority.
- Skipped: `designer/visual-system` because TASK-0130 reuses the already accepted
  pane-menu rows, tick, accent and graph-overlay surface without a new visual
  decision; Figma reference status is `not_required`. Engee Apps research,
  application composition, page sizing, data-entry and dialog skills were also
  skipped because composition, sizing, forms and dialogs do not change.

### Skills for v37 revision

- Applied: `designer/designer-workflow` for complete-current revision and
  `designer/output-and-visualization` for the graph cursor interaction contract.
- Skipped: `designer/visual-system`, Engee Apps research, application
  composition, page sizing, data-entry and dialog skills because this revision
  changes only finite candidate semantics inside the accepted cursor controller;
  Figma reference status is `not_required`.

### Skills for v38 revision

- Applied: `designer/designer-workflow` for complete-current publication,
  `designer/visual-system` for the selected-state discrepancy audit and
  `figma-design-to-code` for read-only verification of exact ColorPicker node
  `1779:11344`.
- Skipped: Engee Apps research, application composition, page sizing,
  data-entry, output and dialog skills because the popover inventory,
  dimensions, layout, provider seam and all unrelated zones remain unchanged.
- Figma reference status for v38: `available`; the exact node was read
  successfully on 2026-08-24.

### Skills for v39 revision

- Applied: `designer/designer-workflow` for complete-current publication and
  `designer/data-entry-and-inspection` for the existing table window/state and
  footer contract.
- Skipped: `designer/visual-system`, Engee Apps research, application
  composition, page sizing, output and dialog skills because v39 changes no
  visual geometry, composition, sizing, graphs or overlays.
- Figma reference status for v39: `not_required`.

### Skills for v40 revision

- Applied: `designer/designer-workflow`, `designer/data-entry-and-inspection`
  and `designer/visual-system` for changed search/first-cell geometry and reuse
  of the canonical extrema marker.
- Skipped: Engee Apps research, application composition, page sizing, output
  and dialog skills because shell, zone proportions, graphs and overlays do not
  change.
- Figma reference status: `unavailable`. Exact nodes
  [Search Bar 1175:50910](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=1175-50910&p=f)
  and [Table 317:778](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=317-778&p=f)
  returned `You currently have nothing selected`; v40 therefore copies the
  accepted production search and marker patterns without inventing a style.

### Skills for v41 revision

- Applied: `designer/designer-workflow` for complete-current publication and
  `designer/data-entry-and-inspection` for the table inventory, canonical
  eye/eye-off semantics, roving focus, immediate reflow and scroll ownership.
- Skipped: `designer/visual-system` because v41 copies the current production
  Signal-table column menu and local exact assets without changing the visual
  component; Figma reference status is `not_required`. Engee Apps research,
  application composition, page sizing, output and dialog skills were skipped
  because composition, zone minima, graphs and dialogs do not change.

### Skills for v42 revision

- Applied: `designer/designer-workflow` for complete-current publication and
  `designer/data-entry-and-inspection` for Enter submission, compact error-only
  feedback, standard action reuse and unchanged eye-menu semantics.
- Applied narrowly: `designer/visual-system` to confirm that v42 introduces no
  token, icon, size or menu variant: it reuses the already accepted local
  `.inspector-action`, `more-vertical.svg`, 244px menu and eye assets exactly.
  A Figma reload is not required for this exact current-component reuse;
  `figma_reference_status: not_required`.
- Skipped: Engee Apps research, application composition, page sizing, output
  and dialog skills because no composition, geometry, graph or dialog changes.

### Skills for v32 revision

- Applied: `designer/designer-workflow` for the complete-current revision,
  `designer/visual-system` plus `figma-design-to-code` for the exact color-picker
  node, `designer/data-entry-and-inspection` for Signal metadata/sample table,
  and `designer/application-composition` for the pane-type context transition.
- Skipped: page-sizing, output and dialog skills because v32 does not change
  shell/zones/graph geometry or the operation-dialog pattern.
- Figma reference status for v32: `available`; exact node was read successfully
  on 2026-08-19.

### Used visual references

| Screenshot/template | Extracted pattern or measurement | Explicitly ignored app-specific content |
|---|---|---|
| `/Users/makar/Desktop/Снимок экрана 2026-08-24 в 10.03.47.png` | Production defect evidence: selected halo is visibly uneven and the check glyph is off-center at enlarged/DPR rendering | Graph trace and background application content outside the picker |
| `/Users/makar/Desktop/Снимок экрана 2026-08-24 в 12.43.38.png` | Exact requested calculated-column labels/order: `Модуль`, `Квадрат`, `Корень`, `Корень из модуля × знак`; FFT excluded | Multiply/Custom parameter semantics and the source menu's selected-operation state |
| `/Users/makar/Desktop/Снимок экрана 2026-08-24 в 12.47.22.png` | Existing production `Видимость столбцов` title, compact rows and right-aligned eye icons | Signal-table-specific column labels |
| `architecture/design/TASK-0080-explicit-apply-flow/screenshots/v25--tabs-and-measurements--1440x900.png` | 44px toolbar, 32px three-paint-stack tabs, 3px selected indicator, workspace/settings/inspector density | Old three-tab inventory and task-specific values |
| `architecture/design/TASK-0080-explicit-apply-flow/screenshots/v25--values-ready--1024x768.png` | Full-width lower table, fixed settings footer, compact column rhythm | Time-only extrema semantics |
| `architecture/design/TASK-0106-native-engee-session-io/screenshots/v26--import-parent-default--1024x768.png` | 12px modal radius, 48px titlebar, 56px actions, backdrop | Import fields and destructive copy |
| `architecture/skills/designer/data-entry-and-inspection/reference/settings-controls.*` | 32px fields, 40px rows, collapsible group rhythm | Showcase-only fields |
| `architecture/skills/designer/data-entry-and-inspection/reference/inspector-ui.*` | 32px table rows, sticky headers, hover actions | Showcase data |
| `architecture/skills/designer/output-and-visualization/reference/graph-output-zone.*` | White graph canvas, output-local controls, overlay legend | Reference graph data |
| `architecture/skills/designer/dialog-and-file-flows/reference/dialog-system.*` | Blocking modal stack, fixed title/actions, body scroll | File-browser capabilities |
| `architecture/skills/designer/visual-system/reference/source-derived-ui-spec.md` | Analytical-dense token values and proportions | Form-workbench geometry |

### Engee Component Library access

The exact required Signal ColorPicker node was re-read successfully on 2026-08-24:

| Category | Exact Figma URL / node ID | Status | Extracted decision | User override |
|---|---|---|---|---|
| Signal ColorPicker | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=1779-11344&p=f&m=dev / `1779:11344` | available | 284px surface, radius 8px, `0 2px 8px #2121211A`, Roboto 14, 16px padding, exact 32px target with a 24px swatch at 4px on every side, separate centered persistent tick layer, two equal 32px footer buttons | Palette contents are the restored original eight application colors. Scheme dropdown plus line/marker/fill/interpolation are omitted. |

The broader v31 audit below records the earlier 2026-08-18 reader limitation
and remains provenance for inherited, unchanged components. Those rows do not
override the successful v32 node-specific read above.

| Category | Exact Figma URL / node ID | Status | Intended variants | Applied decision / exact failure |
|---|---|---|---|---|
| Colors | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=2-3&p=f / `2:3` | unavailable | semantic interface/chart palette | Local `theme.css`; URL rejected as unsafe |
| Typography | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=316-3459&p=f / `316:3459` | unavailable | body/headings | Local Roboto Regular/Medium; URL rejected |
| Buttons | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=316-9479&p=f / `316:9479` | unavailable | primary/secondary/icon states | Canonical local button states; URL rejected |
| Checkboxes | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=321-6953&p=f / `321:6953` | unavailable | checked/hover/focus/disabled | Canonical 16px local checkbox; URL rejected |
| Color picker | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=1770-3965&p=f / `1770:3965` | unavailable | swatch/selected/picker | Existing swatch + textual color field; URL rejected |
| Inputs/dropdowns | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=316-38487&p=f / `316:38487` | unavailable | input/select/error/menu | Canonical 32px local controls; URL rejected |
| Modal | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=316-42563&p=f / `316:42563` | unavailable | sizes/title/actions/busy | Local analytical modal + explicit 660px deviation; URL rejected |
| Sliders | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=321-7202&p=f / `321:7202` | unavailable | track/thumb/hover | Existing pane slider visual + local dual-thumb settings pattern; URL rejected |
| Tabs | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=11-674&p=f / `11:674` | unavailable | first/second level active/overflow | Existing 32px/3px application tab stack; URL rejected |
| Table | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=317-778&p=f / `317:778` | unavailable | header/body/selected/focus | Local analytical table; URL rejected |
| Text editor | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=677-33107&p=f / `677:33107` | unavailable | code/text editor states | Local mono editor inside canonical field shell; URL rejected |
| Page containers | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=316-4693&p=f / `316:4693` | unavailable | windows/modules/toolbars | Existing production shell geometry; URL rejected |
| Engee Apps composition | https://www.figma.com/design/0kCdLEKmTC9S15mNJEJSE0/%F0%93%83%91-Engee-Apps?node-id=1-69750&p=f&m=dev / `1:69750` | unavailable | application examples | Current production and canonical screenshots; URL rejected |

## Screens and zones

| Screen | Zone | Parent/slot | Purpose | Production host / design mock | Scroll owner/axes | Collapse | Viewports |
|---|---|---|---|---|---|---|---|
| Main | Toolbar | root/toolbar | Global application actions | Existing `.application-toolbar`; mock `html/zones/toolbar/**` is design-only | none | false | all |
| Main | Plot workspace | main-stage/workspace | Screen tabs, panes, plots, sliders, markers | Existing `[data-testid=display-workspace]` and `[data-pane-host]`; workspace SVG is mock-only | display tabs/x | false | all |
| Main | Settings | main-stage/settings | Four pages; Signal/Area/Screen autosave and Extrema `Рассчитать` | Existing settings tabs/content/footer; mock `html/zones/settings/**` is design-only | body/y; sticky header/tabs/footer | false | all |
| Main | Inspector | root/inspector | Signals, measurements, extrema, samples | Existing `.inspector-tabs`, `[data-inspector-content]`, `[data-signal-rows]`; mock zone is design-only | body/both; sticky tabs/headers/footer | manual three-state | all |
| Main | Signal operation | body/dialog | Derived signal form and states | Runtime singleton from `integration/html/dialogs/signal-operation.fragment.html` | body/y; fixed title/actions | false | 1024×768, 1440×900; document clip forbidden |

## Navigation and content map

- Settings tab order is exactly `Сигнал / Область / Экран / Экстремумы`.
- `Сигнал` is hidden only when no main signal exists for the active pane.
- `Экстремумы` is visible for time and spectrum, hidden for inapplicable pane
  types rather than disabled or stubbed.
- Lower tabs are `Сигналы / Измерения / Экстремумы` plus a dynamic tab named
  after `main_signal`; the tab exists automatically whenever main signal exists.
- A dynamic sample tab is not a second signal selection source; it shows the
  current pane's main signal and closes/rebinds through provider state.
- Display tabs render persisted `display.name`; pane headers render persisted
  `pane.name`. Ordinals are not recomputed from array indexes.
- The signals table has two independent projections: checkbox = active-pane
  membership; blue row = one active-pane `main_signal`. They never share a CSS
  selected state.
- Signal `Основное` and `Сводка` are independently user-collapsible and start
  expanded. The settings page remains the vertical scroll owner.

## Interaction and state matrix

| Element | Trigger | Visible result | States | Resize/scroll rule |
|---|---|---|---|---|
| Settings tab | click/keyboard | One page selected; footer remains shared | default, hover, pressed, selected, focus-visible, hidden-inapplicable | fixed 32px row, horizontal overflow only |
| Link checkbox | change | Corresponding limits group moves Area ↔ Screen immediately | unchecked, hover, checked, focus-visible, disabled | settings body owns vertical scroll |
| Limits fields/slider | type/select unit/drag/double-click | Visible numbers use selected units; canonical seconds/Hz persist; empty means auto; double-click clears both bounds | default, hover, focus, drag, dirty, invalid | no geometry change between scopes |
| Plot slider pane-menu item or Area checkbox | change | Both controls synchronize immediately and the slider preview changes without remount; autosave persists the same pane draft | unchecked, checked, focus | pane-local, both sliders may coexist |
| `Курсор` / `Два курсора` menu row | click/keyboard | Selects one mutually exclusive pane-local mode; clicking the active row turns it off | default, hover, focus-visible, checked, disabled | menu closes; no API, autosave or cross-pane state |
| Graph cursor line | pointer drag / Arrow / Home / End | Snaps to nearest visible X sample/bin and updates the overlaid X/ΔX/trace readout | default, hover, focus-visible, dragging, clamped | constrained to current Plotly plot rectangle; consumes only its own gesture |
| Graph relayout/refresh with cursors | zoom/pan/linked-axis relayout | Existing cursor is retained or clamped to nearest sample inside the new visible X range | ready, clamped, unavailable | no cursor position/mode propagation to linked panes |
| Display/pane name | input | Draft appears in tab/header/context in the same frame; autosave persists it; stable id unchanged | pristine, dirty, invalid, applying, applied | ellipsis in tabs/header |
| Signal row | plain LMB outside controls/actions | Makes row `main_signal`; ensures checkbox ON; never toggles it OFF | white, grey-hover, main-blue, checkbox-checked/unchecked, busy | fixed 32px row; no geometry shift |
| Signal checkbox | direct click/change | Adds/removes only that graph trace; never changes `main_signal`; pending keeps the same visible node and checked state, disabled in place | unchecked, checked, disabled, busy; row blue remains independent | fixed 16px control; no row geometry shift |
| Signal settings group | click title/keyboard | `Основное` or `Сводка` body independently hides/shows using standard disclosure arrow | expanded, hover, pressed, focus-visible, collapsed | settings body remains y-scroll owner |
| Plot pane | plain LMB outside controls/modebar | Active pane updates and right panel selects `Область` | inactive, hover, active, loading | Plotly host identity unchanged |
| Pane type dropdown | select option | Exact pane loader appears before authoritative mutation; right panel selects `Область`; loader ends only for matching ready/empty/error output | closed, open, selected, loading, empty, error | Same pane/Plotly host identity; stale output cannot dismiss current loader |
| Valid Area setting | autosave commit that schedules output refresh | Exact active-pane loader appears before commit/output request and remains through current ready/empty/error | dirty, applying, loading, ready, empty, error | Invalid draft and settings without output refresh do not start a loader |
| Screen layout mutation | add/remove pane or apply rows/columns | One active display-canvas loader covers all pane slots until accepted layout and every initial output terminal | layout-loading, ready, empty, error | Pane loaders are suppressed; workspace header/tabs, Settings and Inspector remain usable/uncovered |
| Scoped loader spinner | pane/display loading state | Existing 64px spinner rotates continuously with defined `loader-rotate` keyframes | normal, reduced-motion | 800ms normal; 1600ms reduced-motion; static state forbidden |
| Plot autoscale | double-click ready graph surface | Restore authoritative current-output X/Y baseline for clicked Time/Spectrum/Spectrogram/Persistence pane | zoomed, reset, linear, log | No other pane/settings/main/backend change; heatmap color range retained |
| Display tab / Add display | click/keyboard | Active/new display updates and right panel selects `Экран` | default, selected, creating, error | tab row remains horizontal-only |
| Automatic sample tab | main signal exists/changes | One tab named after `main_signal` exists and loads its first page without changing inspector focus | absent-without-main, loading, ready, error | table owns x/y scroll when selected |
| Signal `Значения` | click | Ensure/select/focus populated main-signal tab, expand inspector and request missing first page | default, hover, focus, loading, ready, error | table owns x/y scroll |
| Dynamic sample row window | scroll within 100 rows of top/bottom boundary | Fetch 500 upward/downward; retain at most 1000 rows; keep visible record fixed through measured-height compensation | loading-up, loading-down, ready, end-of-data, error, stale-ignored | existing table/scroll owner/footer geometry unchanged |
| Sample point search | type, Enter | Validate exact `0..total-1`, replace with centered server page and focus target; empty Enter resets first page; successful loads leave no persistent copy | pristine, typing, invalid, loading, ready, error-only | 32px row; clearing alone sends no request; no standalone action |
| Sample column menu | three-dot click/Enter/Space/ArrowDown; item click/Enter/Space; Arrow/Home/End; Escape/Tab/outside | 244px `Видимость столбцов`; all three items start eye-off; eye toggle shows one optional provider column immediately and stays open; Escape restores trigger | closed, trigger-hover/focus/expanded, row-hover/focus, visible-eye, hidden-eye | `Корень` absent; fixed body portal at dropdown layer; table remains x/y owner |
| TIME extrema in point cell | render current samples | Keep number first, then canonical marker when exact active display/pane successful same-signal TIME extrema has `sample_index` | absent, marker-ready, duplicate-resolved | auto 1%/min 112px left-aligned first column; Spectrum never maps |
| Signal color trigger | click/keyboard | 284px anchored non-modal popover opens with HEX and the restored eight swatches | closed, open, hover, selected-draft, invalid, busy | fixed overlay; flips/clamps to viewport, no settings scroll ownership change |
| Color popover Apply/Cancel | click/Escape/outside | Apply writes Signal color draft; Cancel paths restore opening color | draft, busy, committed-to-page-draft, cancelled | focus returns to color trigger |
| Signal sample rate | type | Editable dot-decimal metadata autosaves after validation | pristine, focus, dirty, invalid, applying | inline error does not shift adjacent controls |
| Spectrum/time extrema `Рассчитать` | click | Valid changed settings save first; calculate only in active visible X interval, then lower Extrema table receives focus | absent, loading, ready, error, stale | graph remains visible; Y zoom ignored |
| Operation row icon | click | Blocking operation dialog opens with source signal | default, hover, focus, modal-open | icon occupies reserved row-action width |
| Operation selector (`SignalAnalyserValueSelect`) | click/type/keyboard | Closed readonly value becomes same-field search; external modal-owned options popup | closed, open/search, hover, active, selected, focus | popup width equals 32px anchor border-box; viewport clamp only |
| Operation submit | click | User body goes to Engee provider; busy blocks close, then inline success or recoverable Engee error | default, busy, error, success | title/actions fixed, body scrolls |
| Engee catalog checkbox | refresh/add pending | Same visible checkbox node and checked state remain; list/dialog gets `aria-busy` and controls disable in place | unchecked, checked, disabled, busy | fixed 16px control; no list replacement/flicker |

## Prototype walkthrough

`prototype/index.html` is a standalone `file://` harness copied from the current
production document structure. It loads the actual local production theme,
application CSS, shared value selector, settings renderer and UI-only app
renderer. `prototype/mock-fetch.js` intercepts provider calls before they reach
the browser network stack and supplies deterministic state, plot and table
fixtures. The prototype performs no HTTP(S) request and needs no local server.
The harness remains design-only and is not a production transfer input.

| Step | Stable hook | User action | Expected state | Screenshot |
|---:|---|---|---|---|
| 1 | `[data-testid=settings-tab-signal]` | Open prototype via `file://` | Four production zones are nonempty; Signal is first/selected; no network/CORS errors | `v31--standalone-production-signal--1440x900.png` |
| 2 | `[data-bottom-tab=samples]` then `[data-testid=signal-values-action]` | Open automatic tab, then click Values | Existing `radarPulse` tab has populated five-column page; Values only focuses it | `v32--automatic-main-signal-samples--1440x900.png` |
| 3 | `[data-testid=settings-tab-display]` | Click | Two synchronized spectrum slider toggles and local magnitude limits | `v31--standalone-production-spectrum-area--1440x900.png` |
| 4 | `[data-testid=settings-tab-screen]` | Click | Four links; linked frequency limits include units/fields/slider | `v31--standalone-production-screen-links--1440x900.png` |
| 5 | `[data-testid=extrema-values]` | Click | Spectrum markers and frequency table aligned by marker number | `v31--standalone-production-spectrum-extrema--1440x900.png` |
| 6 | `[data-testid=signal-operation-radarPulse]` | Click | Production-styled operation dialog | `v31--standalone-production-operation-default--1440x900.png` |
| 7 | `[data-testid=signal-operation-select-input]` | Click | Shared same-field search, seven options, exact anchor width | `v31--standalone-production-operation-menu--1440x900.png` |
| 8 | shared option index `6` | Select `Пользовательское` | Only user body editor and neutral Engee/`init_signal` hint are visible | `v31--standalone-production-operation-custom--1440x900.png` |
| 9 | `[data-signal-operation-submit]` | Submit invalid then valid body | Engee error, blocking busy, then success | `v31--standalone-production-operation-{error,progress}--1440x900.png` |
| 10 | `[data-testid=app-shell]` | Resize to 840×620 | Production canvas remains 920×680 and document scrolls | `v31--standalone-production-undersized--840x620.png` |
| 11 | display close/add hooks | Delete `Экран 1`, add display | `ВЧ-контроль` unchanged; new default is `Экран 4` | JSON evidence |
| 12 | `[data-signal-rows]` | Hover checked `echoComplex` | Only `radarPulse` remains blue; hovered checked row is grey | `v31--main-signal-only-and-hover--1440x900.png` |
| 13 | `[data-testid=signal-row-echoComplex] td` | Plain LMB on checked row | Checkbox stays ON and `echoComplex` becomes sole blue `main_signal` | `v31--row-click-main-signal--1440x900.png` |
| 14 | `echoComplex [data-visible-signal]` | Direct uncheck | Signal is hidden; `echoComplex` stays blue and remains `main_signal` | `v31--checkbox-hides-current-main--1440x900.png` |
| 15 | `echoComplex` row, then `noiseFloor` checkbox | Row click, direct check | Row restores echo visibility/main; noise visibility changes without main switch | JSON evidence |
| 16 | `[data-signal-settings-group-toggle=summary]` | Click | Summary collapses; `Основное` stays expanded; label is `Дискретизация, Гц` | `v31--signal-settings-collapsed--1440x900.png` |
| 17 | `[data-testid=plot-pane-pane-time]` | Plain LMB | `Область` page selected with `Импульс во времени` context | JSON evidence |
| 18 | display tab then `[data-testid=add-display]` | Click each | `Экран` page selected for existing and newly created display | `v31--screen-focus-after-display-add--1440x900.png` |
| 19 | `[data-signal-metadata=sample_rate_hz]` | Type `2048.5` | Valid editable metadata autosaves; comma form is rejected | `v32--editable-sample-rate--1440x900.png` |
| 20 | `.color-swatch-button` | Open, choose a swatch, Apply | 284px picker, eight original swatches, tick; page draft changes only after popover Apply | `v32--jet-color-picker--1440x900.png` |
| 21 | `[data-signal-operation-overwrite]` | Open operation dialog | 16px checkbox and full exact label are visible without clipping | `v32--operation-overwrite-checkbox--1440x900.png` |
| 22 | pane type ValueSelect | While `Сигнал` open, select another type | Settings page and content owner switch to `Область` | `v32--pane-type-change-focuses-area--1440x900.png` |
| 23 | spectrum pane type | Calculate, then show values | Spectrum settings+bottom Extrema tab, frequency rows and markers use frequency positions | `v32--spectrum-extrema-settings-values--1440x900.png` |
| 24 | spectrogram pane type | Switch the same pane to spectrogram | Unsupported settings and lower Extrema tabs are both hidden | `v32--spectrogram-hides-extrema-tabs--1440x900.png` |
| 25 | Signal `Сводка` | Open Signal settings | All 13 summary measurements remain present regardless of table-column visibility | v34 contract audit |
| 26 | `[data-testid=signal-values-action]` | Click from a collapsed/missing-page state | Inspector expands; named tab selects/focuses; page 1 loads | v34 contract audit |
| 27 | `display.name` / `pane.name` | Type one character | Screen tab or pane title plus context changes before autosave resolves | v34 contract audit |
| 28 | settings/dialog text inputs | Focus fields | `autocomplete=off`; no browser profile/history popup | v34 contract audit |
| 29 | time/frequency limits | Choose units and edit bounds | Visible values/labels use selected units; empty bounds remain empty | v34 contract audit |
| 30 | new signals + color picker | Inspect default colors/palette | Every default is one of the exact same restored eight values | v35 contract audit |
| 31 | Extrema `Рассчитать` | Zoom X, then click | Optional canonical `visible_range` matches current X interval; Y ignored | v34 contract audit |
| 32 | Signals/Engee checkboxes | Start a pending mutation | Same node remains visible/checked and becomes disabled under `aria-busy` | v34 contract audit |
| 33 | `[data-testid=pane-menu-cursor]` | Select, drag, reopen menu | One vertical snapped cursor, X + visible-trace values, checked row and zero provider calls | `v36--spectrum-single-cursor--1440x900.png` |
| 34 | `[data-testid=pane-menu-dual-cursor]` | Switch from single to dual | Two lines plus X1/X2/ΔX and Y1/Y2 per visible trace | `v36--spectrum-dual-cursor--1440x900.png` |
| 35 | active cursor menu row | Select again; then enable on time pane | Active pane returns off; time pane gains its own cursor without restoring spectrum cursor | `v36--time-single-cursor--1440x900.png` |

Walkthrough result: complete inherited walkthrough
`evidence/interaction-walkthrough-v31-standalone.json`, `26 passed / 0 failed`,
`runtime_errors: []`. The gate explicitly verifies four nonempty zone slots,
`file:` protocol, zero HTTP(S) resource entries, zero CORS/console/page errors,
the actual production `app.css` base, shared selector geometry and every state
listed above. V32 delta result is
`evidence/interaction-walkthrough-v32-standalone.json`, `9 passed / 0 failed`,
with `runtime_errors: []`; baseline hashes are in
`evidence/production-baseline-v32.json`.
V34 adds no visual geometry and therefore carries screenshots forward. Its
behavior/transfer audit is `evidence/interaction-contract-v34.json`; no
redundant screenshots are required for the unchanged appearance.
V36 cursor delta is `evidence/interaction-walkthrough-v36-graph-cursors.json`,
`8 passed / 0 failed`, `runtime_errors: []`, with zero HTTP resources. It covers
menu inventory/checks, single/dual readouts, snapped drag, repeat-off and
pane-local Time/Spectrum independence.
V37 zero-snap regression is
`evidence/interaction-regression-v37-zero-snap.json`, `1 passed / 0 failed`,
`runtime_errors: []`; across heterogeneous traces, a valid nearest `X = 0`
remains selected over the farther candidate `0.7`.
V39 adds no visual geometry and carries all screenshots forward. Its deterministic
controller regression is `evidence/interaction-regression-v39-sample-row-window.json`,
`1 passed / 0 failed`; it covers exact constants, both shift directions,
authoritative offsets/footer, scroll compensation, guards and total `100000001`.
V40 adds no screenshots. Its deterministic regression is
`evidence/interaction-regression-v40-sample-search-markers.json`, `2 passed / 0
failed`; it covers centered server jump/validation/reset/focus, resumed v39
sliding, token guards, active TIME marker eligibility, duplicate resolution,
Spectrum exclusion and exact first-column CSS.
V41 regression is `evidence/interaction-regression-v41-values-columns.json`,
`3 passed / 0 failed`, with zero runtime/network errors. It click-tests the
seven-column default, exact four-row eye menu, immediate hide/reflow while the
menu remains open, Escape focus restoration and the production-faithful
`file://` harness. The menu-open state is captured in
`screenshots/v41--values-column-visibility-menu--1440x900.png`.
V42 bounded source/controller regression is
`evidence/interaction-regression-v42-sample-search-row.json`, `4 passed / 0
failed`. It verifies Enter-only submission, absence of the standalone button and
success copy, reuse of the standard final three-dot action, unchanged 244px menu
contract and authoritative mock page offsets. V42 intentionally adds no browser
screenshot because shell/menu geometry is inherited unchanged from v41.

## Transfer contract

- Manifest: `transfer-manifest.yaml`
- Source root: `frontend-source/`
- Target root: `public/`
- Mode: additive integration only; `copy_as_is` contains only the already
  identical local icon inventory, while feature fragments integrate in place.

| Design source | Existing production target/host | Mode | Constraint |
|---|---|---|---|
| `integration/css/task-0112-0115-additions.css` | `public/css/app.css` | append once | Exact rules; do not overwrite existing CSS |
| `integration/css/task-0116-refinements.css` | matching signal-row selectors in `public/css/app.css` | replace selector bodies | Exact final selectors; remove the previous `.is-selected` row/color state |
| `integration/js/task-0117-signal-row-intent.js` | signal row/checkbox branches in `public/js/app.js` | integrate exact intent split | Do not install the prototype bridge; preserve existing revision/provider flow |
| `integration/css/task-0118-color-picker.css` | `public/css/app.css` | append once | Exact 284px Jet popover geometry/states |
| `integration/js/task-0118-color-picker.js` | `public/js/app.js` boot/import | integrate UI-only popover unchanged | Use existing Signal draft/input event; no API call from popover |
| `integration/js/task-0119-context-and-samples-intent.js` | pane type/sample tab branches in `public/js/app.js` | integrate exact intent | Preserve provider/revision flow; do not install prototype bridge |
| `integration/js/task-0126-summary-units-continuity.js` | existing settings/summary/extrema/catalog renderers | integrate named inventories/helpers | Preserve existing DOM/queues; do not install prototype bridge |
| `integration/css/task-0130-graph-cursors.css` | `public/css/app.css` | append once | Exact existing-menu/check and Plotly-sibling overlay styles |
| `integration/js/task-0130-graph-cursors.js` | pane menu + plot lifecycle branches in `public/js/app.js` | integrate controller unchanged | Frontend-only map; install rows, attach after react, update after relayout, clear with pane; never install prototype bridge |
| `integration/js/task-0134-sample-row-window.js` | existing sample state/loader/renderer/scroll branches in `public/js/app.js` | integrate controller unchanged | Keep the existing visible-column table and provider transport; apply returned compensation using measured rendered row height |
| `integration/css/task-0135-sample-search-markers.css` | `public/css/app.css` | append once | Existing 32px search pattern plus auto 1%/min 112px left point cell; other columns unchanged |
| `integration/js/task-0135-sample-search-markers.js` | samples render/search/provider branches in `public/js/app.js` | integrate helper unchanged | Server-only centered jump, token replacement, center focus and exact active TIME marker projection |
| `integration/css/task-0138-values-columns.css` | `public/css/app.css` | append once after TASK-0135 sample rules | Exact final search-row action, 244px eye menu and dynamic table min-width; preserve all existing row/window states |
| `integration/js/task-0138-values-columns.js` | samples renderer/menu/event branches in `public/js/app.js` | integrate helper unchanged | UI projects provider fields only, fixed base/optional order, frontend visibility map, no API call or calculation |
| `integration/js/task-0139-ui-inventory.js` | sample visibility initialization + signal-operation inventory in `public/js/app.js` | integrate helper unchanged | Three optional columns all hidden; no square_root UI; filter FFT only from operation selector |
| `integration/css/task-0139-loading-overlays.css` | `public/css/app.css` | append once | Existing loader tokens; exact-pane and display-canvas anchors; layout overlay suppresses pane overlays |
| `integration/js/task-0140-plot-autoscale.js` | existing plot default capture/cleanup/double-click branches in `public/js/app.js` | integrate helper unchanged | Preserve current baseline for all four signal-bearing plot types; relayout clicked host only |
| `integration/js/task-0139-loading-overlays.js` | settings/layout/output lifecycles in `public/js/app.js` | integrate controller unchanged | Begin before mutation, settle current token only at ready/empty/error; sync after workspace render |
| `integration/html/dialogs/signal-operation.fragment.html` | `public/js/app.js` runtime template → `document.body` | integrate unchanged singleton | Never edit `public/index.html` |
| Mock shell/zones/renderers/providers/prototype | none | design-only | Never transfer |

Production selectors are fixed: `[data-testid=settings-tabs]`,
`[data-settings-content]`, `[data-testid=settings-footer]`, `.inspector-tabs`,
`[data-inspector-content]`, `[data-signal-rows]`, `.signal-row-actions`,
`[data-testid=display-overflow-menu]`, `[data-plot-range-slider]`,
`[data-plot-amplitude-slider]`, `[data-plot-cursor-mode]`,
`[data-pane-host]`, `.plot-canvas` and `document.body`.
Features extend those hosts; they do not replace their parents or bootstrap.

### Integration seams

| Seam | UI contract | Mock | Frontend production owner |
|---|---|---|---|
| `workspace-state-provider` | Stable displays/panes/names and active context | `mock/mock-provider.js` | `public/js/api.js` → existing `public/js/app.js` |
| `settings-autosave-provider` | Serialized autosave for Signal, Area and Screen; Extrema calculation remains explicit | same | existing `public/js/settings.js` + `public/js/app.js` |
| `pane-slider-visibility` | One active-pane draft projected into pane menu and Area checkboxes; both synchronize immediately | UI mock | existing `public/js/app.js` + inventory in `public/js/settings.js` |
| `pane-graph-cursors` | Existing menu gains single/dual check rows; pane-local off/single/dual controller snaps and clamps overlay cursors, preserving finite `X = 0` as a valid nearest candidate | v37 UI fragment + bridge | existing `public/js/app.js` menu sync/click + Plotly react/relayout/clear lifecycle |
| `linked-axis-draft` | Immediate scope relocation, values retained | UI mock | existing `public/js/app.js` + `public/js/settings.js` |
| `projected-spectrum-extrema` | Ready/loading/error rows and marker coordinates already projected into selected units; UI does no DSP | mock | `public/js/api.js` → existing `public/js/app.js` Plotly queue |
| `signal-summary-provider` | Backend-authored summary view model | mock | `public/js/api.js` → existing `public/js/app.js` |
| `signal-samples-pagination` | 500-row bidirectional batches plus exact centered point jump, 1000-row DOM window, footer/compensation; never full vector | v39/v40 controller regressions | `public/js/api.js` → existing `public/js/app.js` inspector renderer |
| `sample-time-extrema-markers` | Exact active display/pane, successful TIME rows filtered by `signal_name` and `sample_index`; `row.signal_color`; lowest finite graph number; never Spectrum bins | v40 helper regression | existing extrema state → existing sample renderer |
| `signal-sample-calculated-columns` | Three fixed base columns plus three provider-authored optional columns, all hidden initially; existing 244px eye menu; no square_root UI | v43 UI helper + bridge | `public/js/api.js` row fields → existing `public/js/app.js` sample renderer/menu events |
| `scoped-output-loading` | Exact-pane loader for pane type/valid Area output refresh; single display-canvas loader for layout reconciliation with stale guards and layout priority | v43 controller + bridge | existing settings/layout/output branches in `public/js/app.js` |
| `pane-plot-autoscale` | Current provider/default or rendered full-domain X/Y baseline; Plotly-native log coordinates; clicked-pane isolation | v44 helper + bounded regression | existing `Plotly.react`, updateLayout cleanup and graph double-click branches in `public/js/app.js` |
| `signal-operation-provider` | UI sends operation metadata and user body only; provider executes via Engee and owns hidden envelope/binding/cleanup | mock | `public/js/api.js` → existing `public/js/app.js` body portal |
| `signal-membership-main` | Checkbox owns pane membership; one explicit main signal owns row emphasis and Signal settings context | deterministic mock state/API | existing `public/js/app.js` + existing layout/view providers |
| `settings-context-routing` | Pane selects Area page; display selection/creation selects Screen page | actual production UI in file harness | existing `public/js/app.js` event delegation |
| `pane-type-context-routing` | Accepted plot-type mutation selects Area and rerenders only Area content | v32 prototype | existing `public/js/app.js` pane ValueSelect/postLayout path |
| `signal-color-draft` | HEX/Jet draft preview; popover Apply updates Signal draft and triggers metadata autosave | v32 UI fragment | existing Signal editor autosave |
| `legacy-import-export-provider` | Preserve existing v26 actions/dialogs | none | `public/js/native-session-io.js` |

No integration fragment contains endpoint paths, DSP math, polling,
authoritative revision state or Engee function names. `public/index.html`,
existing JS module identities, shell geometry and Plotly host identity are
invariants. `[data-pane-host]` may be updated only through existing Plotly
react/relayout and the existing amplitude-slider overlay path; host DOM
replacement is forbidden. Cursor UI is appended only as a sibling inside the
same `.plot-canvas` and reads Plotly data/fullLayout without altering them.

## Page sizing contract

```yaml
page_sizing_contract:
  application_min_width: 920
  application_min_height: 680
  layout_invariant_on_resize: true
  undersized_viewport_behavior: document_scroll
  structural_max_sizes: none
  zones:
    - id: toolbar
      min_width: 920
      min_height: 44
      width_growth_ratio: 1
      height_growth_ratio: 0
      scroll_owner: none
      scroll_axes: none
      sticky_parts: []
      collapse_allowed: false
    - id: plot-workspace
      min_width: 612
      min_height: 440
      width_growth_ratio: 3
      height_growth_ratio: 4
      scroll_owner: none
      scroll_axes: none
      sticky_parts: [titlebar, display-tabs]
      collapse_allowed: false
    - id: display-settings
      min_width: 300
      min_height: 440
      width_growth_ratio: 1
      height_growth_ratio: 4
      scroll_owner: settings-scroll
      scroll_axes: y
      sticky_parts: [heading, tabs, footer]
      collapse_allowed: false
    - id: lower-inspector
      min_width: 920
      min_height: 180
      width_growth_ratio: 1
      height_growth_ratio: 1
      scroll_owner: inspector-body
      scroll_axes: both
      sticky_parts: [tabs, table-header, samples-footer]
      collapse_allowed: true
    - id: signal-operation-dialog
      min_width: 660
      min_height: 300
      width_growth_ratio: 0
      height_growth_ratio: 0
      scroll_owner: dialog-body
      scroll_axes: y
      sticky_parts: [titlebar, actions]
      collapse_allowed: false
  fixed_template_controls:
    - {id: toolbar-icon-button, width: 36, height: 32}
    - {id: settings-input-select, width: intrinsic, height: 32}
    - {id: tab-row, width: intrinsic, height: 32}
    - {id: checkbox, width: 16, height: 16}
```

At `920×680`, minima meet exactly. Additional width is distributed
workspace:settings `3:1`; additional stack height is distributed main:inspector
`4:1`. At `840×620`, the canvas remains `920×680`, without hide/reorder/stack,
and the document owns both scroll axes. Verified screenshots cover 920×680,
1024×768, 1440×900 and 840×620.

## Visual contract

### Typography, colors and menus

- Local Roboto Regular 400 and Medium 500 only; all headings use Medium 500.
- Tokens resolve only from the existing production `public/css/theme.css`;
  the design-package theme copy is mock-only.
- Controls are 32px high, radius 6px; panels radius 8px; dialog radius 12px.
- Settings/table tabs are 32px with one visible 3px selected indicator.
- Settings dropdown items are 34px and share one surface/border/shadow system.
- Checkboxes are 16×16px; plot/settings slider handles have persistent focus.
- Graph canvas is white; legends overlay inside the plot and hover labels are
  absent. Extrema markers use signal/accent color and do not alter plot layout.
- Cursor menu rows are the same 28px compact `menuitemcheckbox` rows as plot
  sliders. A 16px line icon occupies the existing icon column and the existing
  tick appears only for the active pane-local mode.
- Cursor 1 uses a 2px solid accent line, cursor 2 a 1px dashed accent line; both
  have 14px numbered drag handles and persistent focus halo. The white 92%
  readout uses the existing menu border, radius and shadow over the upper-left
  plot interior, while the legend remains over the upper-right.
- Hover/pressed/selected/focus never changes component geometry.
- Signal color popover is 284px, 8px radius and `0 2px 8px #2121211A`;
  palette grid uses 32px targets/24px swatches and exactly the restored eight
  colors. The 24px square includes its border and sits at uniform 4px insets;
  the proportional tick is centered without changing target geometry. No
  palette selector, line, marker, fill or interpolation appears.
- The sample-column popup reuses the production `.menu.inspector-menu`:
  244px wide, 4px padding, 1px line, 6px radius, existing dialog shadow,
  32px title, 28px rows and exact 16px `eye/eye-off` at the right edge.

### Proportion contract

| Component | Canonical reference | Preserved | Required change | Allowed deviation |
|---|---|---|---|---|
| Toolbar | analytical-dense | 44px, 36×32 actions, 32px logo | none | none |
| Settings | analytical-dense | 40px rows, 140-ish label/control split, 32px fields | four tabs and new groups | label column is 132px at 300px panel minimum |
| Tabs | v25/current | 32px row, 3px indicator | add Signal and dynamic sample tab | horizontal scroll, never vertical |
| Plot | current | white canvas, local controls, overlay legend | two independent spectrum sliders, markers and pane-local cursor layer | cursor readout overlays upper-left without changing plot margins |
| Tables | analytical-dense | 32px rows, sticky header, left point/name/color, fixed optional order | lazy samples table with three base and zero-to-four optional columns | dynamic min-width 612–1182px; existing inspector owns horizontal scroll |
| Dialog | analytical modal | 48px title, 56px actions, 12px radius | code editor and seven operations | width 660px; menu-open height 500px |
| Signal color popover | Figma `1779:11344` | 284px, radius 8px, 16px padding, 32px targets with exact 24px inner squares, uniform 4px halo, centered tick, equal footer buttons | Original eight swatches only | Palette content follows the explicit restored-color requirement |

### Overlay priority

| Combination | Bottom → top | Pointer owner | Focus owner | Restore after close |
|---|---|---|---|---|
| Plot + legend/sliders/cursors | Plotly graph → legend/sliders → cursor lines → cursor readout | cursor handle only while hovered/focused/dragged; Plotly elsewhere | focused cursor or Plotly graph | pane menu trigger after mode choice |
| Application + operation dialog | app → backdrop → dialog | dialog | first form control | originating row operation button |
| Dialog + operation menu | app → backdrop → dialog → menu | menu | active option | operation selector |
| Settings + Signal color popover | app → settings → color popover | popover | HEX then swatches/actions | Signal color trigger |
| Inspector + sample column menu | app → inspector/table sticky header → body-portal column menu | menu inside; table/search outside | roving menu row; trigger after Escape | trigger on Escape; outside click keeps clicked target focus |
| Dialog busy | app → backdrop → dialog → busy state | none until completion | dialog status | submit on error or success acknowledgement |

Backdrop clicks do not close. Escape/close/Cancel close only a non-busy dialog.
Lower dropdowns/tooltips are suppressed by the blocking modal. Closing the
top menu restores selector focus; closing the dialog restores the row action.

## Local asset inventory

V32 transfers no new asset. Production already contains every required icon and
font; package copies below remain visual-harness inputs only.

| Asset | Existing production path | Package mock reference | Used by |
|---|---|---|---|
| Roboto Regular/Medium Cyrillic/Latin | `public/css/fonts/roboto/*.ttf` | `frontend-source/css/fonts/roboto/*.ttf` | whole application |
| Engee logo | `public/icons/engee-logo.svg` | `frontend-source/icons/engee-logo.svg` | toolbar |
| Import/save/help | `public/icons/{import,save,help-circle}.svg` | corresponding mock icons | toolbar |
| Plus/close/more | `public/icons/{plus,close,more-vertical}.svg` | corresponding mock icons | tabs/panes/dialog |
| Copy/function/trash | `public/icons/{copy,function,trash}.svg` | corresponding mock icons | signal row actions |
| Search/chevron/spinner | `public/icons/{search,chevron-down-fill-16,Spinner}.svg` | corresponding mock icons | inspector/select/busy |
| Tick | `public/icons/tick-figma.svg` | `frontend-source/icons/tick-figma.svg` | selected palette swatch and existing checked states |
| Eye/eye-off | `public/icons/{eye,eye-off}.svg` | `frontend-source/icons/{eye,eye-off}.svg` | sample optional-column visible/hidden state |

## States and validation

- Visible parameters alone participate in validation. Hidden inapplicable
  spectrum/time settings are absent from the page and ignored.
- Visible applicable Area/Screen range endpoints are enabled in automatic mode
  and irrespective of slider/link state; only the current settings busy state
  disables them. Each endpoint owns an independent invalid flag and 2px danger
  border. The pair/row/group never receives an error border. One inline message
  follows Min-first priority, then Max after Min is fixed. The only allowed
  reasons are number, finite, domain, order and unit, rendered through the local
  Russian copy in `ui-contract.yaml`; raw internal exceptions are forbidden.
- Empty Min/Max is not replaced by a concrete number. Full range is represented
  by placeholders and the slider's full domain.
- Signal summary supports ready/loading/empty/error through its provider seam.
- Sample table supports loading-up/down, ready, end-of-data and recoverable
  error. It prefetches within 100 rows, retains at most 1000 rows, suppresses
  duplicate directional requests and ignores stale signal/token responses; the
  full vector is never placed in UI state or DOM.
- Sample tab is automatically present/loading/ready for a valid main signal;
  `Значения` only changes focus. No main signal is the only absent state.
- Signal color is a nested draft. Invalid HEX disables popover Apply; Cancel,
  Escape and outside restore the opening color. Popover Apply dirties the page
  draft but never calls the backend directly.
- `Дискретизация, Гц` accepts only positive finite dot-decimal/exponent input;
  it is editable metadata and is persisted by autosave.
- Operation error preserves all inputs. Busy disables close, Cancel and submit.
  Success keeps the dialog until explicit acknowledgement in production.
- Custom execution errors are returned by the Engee provider and shown without
  exposing the hidden execution envelope, temporary binding or cleanup.
- Cursor actions are disabled for loading/empty/error/Spectrogram/no-visible-
  trace states. A ready Time/Spectrum plot supports off, single, dual, hover,
  focus-visible, dragging and clamped-after-relayout states. Cursor state is
  discarded when its pane is cleared/removed and is not session-persisted.
- Pane output loading blocks only the matching pane and settles at current
  ready/empty/error. Display layout loading blocks only the plot-grid canvas,
  outranks/suppresses pane loaders and settles after all initial outputs reach a
  terminal state. Neither loader is dismissed by stale mutation output.
- Pane/display reconciliation spinners use the defined `loader-rotate` keyframes
  and keep rotating under reduced motion at the slower accepted duration.
- Double-click autoscale is available for all four ready plot types. Each pane's
  baseline is keyed to its current output identity and reset is strictly local;
  linked-axis state, settings, signals and heatmap color ranges remain unchanged.

## Acceptance

- Complete current package paths exist and are local.
- Prototype remains the accepted visual harness and is wholly design-only.
- Inherited 35/35 walkthrough checks plus TASK-0130 delta 8/8, v37 zero-snap
  regression 1/1, v38 selected-swatch geometry 1/1, v39 row-window regression
  1/1, v40 search/marker regression 2/2, v41 calculated-column/menu regression
  3/3, v42 bounded search-row source/controller regression 4/4 and the current
  transfer audit; zero reported regression failures.
- Transfer audit confirms icon-only direct copy plus exact additive fragments,
  immutable
  production document/shell/module/Plotly-host identities and zero mock paths
  mapped to production.
- Four link flags and four limits groups are independent and scope-correct.
- Spectrum sliders can coexist; pane-menu actions and settings checkboxes stay
  synchronized, and spectrum extrema are visible in graph/table.
- Signal metadata, summary, dynamic samples and operation surfaces are covered.
- Stable ordinal behavior is click-tested: after deleting `Экран 1`,
  `ВЧ-контроль` remains unchanged and the next default is `Экран 4`.
- Independent row/main and checkbox/visibility behavior, both Signal disclosures, exact sampling
  label and pane/display settings routing are click-tested against production
  UI code rather than a parallel mock renderer.
- Automatic populated samples, Values-only focus, pane-type→Area routing,
  editable sampling draft, color draft/apply and unclipped overwrite row are
  click-tested against the production-faithful file harness.
- Exact Figma ColorPicker node access and the palette override are both
  recorded; inherited unavailable-reference rows remain historical provenance.
- Selected palette evidence confirms 32×32 target, 24×24 border-box square,
  equal 4px insets on all sides and a centered proportional tick at 2× DPR.
- Sample-window evidence confirms `1–500 → 1–1000 → 501–1500 → 1–1000`,
  strict 1000-row cap, ±500-row compensation, stable guards and totals above
  100 million without a full-array allocation.
- Complete Summary inventory, deterministic Values table focus/loading,
  same-frame names, history-free inputs, selected-unit bounds, restored color default
  identity, zoom-scoped extrema and stable busy checkboxes are explicit seams.
- Pane menu contains exactly `Курсор` and `Два курсора` before graph help; modes
  are mutually exclusive and repeat-toggle off. Time/Spectrum lines snap inside
  visible X, dual readout includes ΔX and per-trace values, and no API/DSP,
  state revision or cross-pane cursor link occurs.
- Values opens with only the three base columns; its menu has exactly three
  eye-off optional calculations and no `Корень`. Signal operation UI has no FFT.
- V43 source/interaction evidence covers hidden defaults, UI inventory removal,
  stale-token pane loading and display-layout priority; the canonical package
  validator passes.
- V44 bounded evidence covers defined continuous loader rotation plus Time,
  Spectrum, Spectrogram and Persistence default/full-domain reset semantics,
  log-coordinate preservation and pane-local isolation.
- V45 bounded evidence covers Spectrum/Persistence axis links, Area slider
  parity, Jet provider ownership, pane-menu anchoring and new-display 2×2.
- V46 bounded evidence covers enabled applicable endpoints, independent Min/Max
  borders, Min-first single-message priority, all five local reason messages,
  preserved blank auto semantics and zero raw internal field-error copy.

## Backend integration boundary

The user operation body is an Engee backend integration seam. UI sends the body
unchanged with the selected source/target metadata. Backend executes it through
`engee.genie.recv`, owns the hidden execution envelope, temporary `init_signal`
binding and cleanup, and returns busy/error/success. Frontend must not generate,
render or leak the wrapper mechanics.

## Change log

- `v27`: complete current analytical-dense package for spectrum extrema/linked
  axes, stable persisted names, Signal settings/samples and derived-signal
  operations; 12/12 clickable evidence at 920×680, 1024×768, 1440×900 and
  undersized 840×620.
- `v28`: approved narrow amendment only: Operation selector now copies the
  shared production `SignalAnalyserValueSelect` contract; custom copy is an
  Engee-executed user operation body over `init_signal`; execution wrapper,
  temporary binding and cleanup are provider-owned and invisible. No other
  layout, token, geometry or existing application surface changed.
- `v29`: integration and evidence correction. The production document, shell,
  existing JS module identities and Plotly hosts are explicit invariants;
  additive transfer remains limited to two exact fragments. The prototype was
  rebuilt from the current production DOM/CSS/components as a standalone
  network-free `file://` fixture and passed 18/18 real-browser checks.
- `v30`: TASK-0116 narrow correction. Only main signal is blue; other rows are
  white with grey hover; plain row LMB updates membership/main, Signal groups
  collapse by the standard component, sampling is labelled
  `Дискретизация, Гц`, and pane/display actions route to Area/Screen settings.
  The production-faithful `file://` walkthrough passed 23/23 with zero runtime,
  CORS or network errors.
- `v31`: TASK-0117 interaction correction. Row surface selects main and ensures
  visibility ON; direct checkbox changes visibility only, even for the current
  main. The cursor fixture visibly appends a second samples page. Production-
  faithful `file://` walkthrough passed 26/26 with zero runtime, CORS or network
  errors; visual baseline remains v28.
- `v32`: merged the approved compact ColorPicker using exact Figma node
  `1779:11344`, with palette contents explicitly changed to 15 Jet swatches;
  made the populated main-signal sample tab automatic and Values focus-only;
  routed pane-type changes to Area; specified editable strict dot-decimal
  sampling metadata and verified the standard operation overwrite checkbox row.
- `v33`: removed the general Apply button and made valid Signal/Area/Screen
  changes autosave through one serialized revision-safe queue; Extrema retained
  the sole explicit `Рассчитать` action.
- `v34`: preserved all visuals and added the complete summary/sample-table,
  immediate-name, no-history-input, selected-unit-limit, exact-Jet-default,
  visible-range-extrema and stable-checkbox continuity contracts for TASK-0126.
- `v35`: restored the original eight-color identity, changed Summary to one
  column and moved Values into the contextual settings footer.
- `v36`: added only the existing-style `Курсор` / `Два курсора` menu rows and
  pane-local snapped Time/Spectrum cursor overlay. The production-faithful
  `file://` delta walkthrough passed 8/8 with no API, HTTP or runtime errors.
- `v37`: corrected the cursor nearest-X comparator so finite zero is not treated
  as an absent best candidate. The heterogeneous-trace zero-snap regression
  passed 1/1 with no runtime errors; all visual evidence remains unchanged.
- `v38`: corrected only the selected palette-swatch CSS. The inner square now
  includes its border in the exact 24×24 geometry at uniform 4px insets, and
  the unchanged local tick asset is rendered proportionally with optical
  centering. Popover, palette, buttons and all unrelated UI remain unchanged;
  the 2× DPR geometry regression passed 1/1.
- `v39`: added the no-redesign bidirectional sliding controller for the existing
  dynamic samples table: batches 500, DOM cap 1000, prefetch threshold 100,
  authoritative offsets, exact real range footer, scroll anchoring and stale/
  duplicate guards. Deterministic controller regression passed 1/1.
- `v43`: TASK-0139 hides all remaining optional Values columns by default,
  removes the `Корень` column and FFT operation option, and adds scoped existing-
  style loaders for pane output and display layout reconciliation. No unrelated
  visual, geometry or backend change.
- `v44`: TASK-0140 fixes scoped-loader rotation through the existing keyframes
  and makes double-click autoscale type-correct and pane-local for all four plot
  types by preserving current-output baselines beyond non-Time layout cleanup.
  No visual, geometry, settings, backend or identity behavior changes.
- `v45`: TASK-0141 shortens link labels, links Spectrum/Persistence frequency
  and dB magnitude/power, reuses Screen range sliders in Area, passes through
  provider Jet, anchors the pane menu and defines provider-owned new-display 2×2.
- `v46`: TASK-0142 keeps applicable Area/Screen bounds editable, gives Min/Max
  independent validation and red borders, shows only the first left-to-right
  local message and forbids pair borders and raw internal field-error text.
