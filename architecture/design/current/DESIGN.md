# Current application design

- Task: `TASK-0111 / TASK-0112 / TASK-0113 / TASK-0114 / TASK-0115 / TASK-0116 / TASK-0117 / TASK-0118 / TASK-0119 / TASK-0124 / TASK-0126 / TASK-0130 / TASK-0132 / TASK-0134 / TASK-0135 / TASK-0138 / TASK-0139 / TASK-0140 / TASK-0141 / TASK-0142 / TASK-0143 / TASK-0144 / TASK-0145 / TASK-0146 / TASK-0148 / TASK-0150 / TASK-0151 / TASK-0152 / TASK-0153 / TASK-0154 / TASK-0064 / V60 operation-selector icons revision / HND-0714 / HND-0716 / HND-0719 / HND-0731 / HND-0742 / HND-0752 / HND-0769 / HND-0787 / HND-0793 / HND-0796 / HND-0804 / HND-0818`
- Design mode: `autonomous`
- Design status: `ready`
- Design version: `70`
- Canonical UI profile: `analytical-dense`
- Prototype entry: `prototype/index.html`
- Frontend source root: `frontend-source/`
- UI contract: `ui-contract.yaml`
- Transfer manifest: `transfer-manifest.yaml`

## Scope

V70 is the current integration-safe package for the accepted Signal Analyser
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
4. One preprocessing-only signal-operation dialog with exactly ten
   PROD-confirmed Engee operations and a custom body executed by the Engee
   backend provider with `init_signal` available as its input binding.
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
11. `FFT`, the former module/square/root/signed-root/multiply operations,
    Denoise and Fill Missing KNN are absent from the operation selector.
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
15. One global bootstrap overlay blocks the application until accepted state-lite,
    active-display settings and the first committed render are all ready; failures
    become one sanitized Retry state. Pane outputs remain behind pane loaders.
16. Plot relayout, in-plot sliders and Area/Screen `Диапазоны` controls share one
    frontend-only active-pane viewport mirror with linked Plotly propagation and
    true double-click autorange; viewport numbers never publish settings.
17. The existing `Видимость измерений` eye menu is one flat list: existing
    measurement rows first, followed by initially hidden cursor-coordinate
    columns `X1 / Y1 / X2 / Y2 / ΔX / ΔY`. There is no redundant
    `Видимость столбцов` subgroup heading; eligibility remains bound strictly to
    the active Time/Spectrum pane's off/single/dual cursor mode.
18. The existing Graph section adds per-pane persisted `Подписывать оси`
    immediately after `Показывать легенду`; it toggles only semantic X/Y and
    applicable colorbar title text, defaulting on.
19. Native Plotly hover tooltip/popover and the custom cursor coordinate readout
    are absent for every plot type. Cursor lines, numeric badges, drag/keyboard
    and Measurements cursor columns remain interactive.
20. A dual-cursor Time pane exposes the canonical text-only Secondary MD
    `Обрезать` action before plot type/overflow. Its 480px standard modal selects
    an eligible signal from the active Time pane, suggests a Unicode-safe name
    and creates a rebased signal from the read-only inclusive cursor interval.
21. Graph-surface double-click is isolated to true autoscale, Settings `Экран`
    navigation remains available during background autosave, every applicable
    Area range owns a mounted dual-thumb slider, and contextual `Значения` /
    `Рассчитать` actions use the canonical blue Primary MD state.
22. A provider/runtime failure in `Операция над сигналом` ends busy and opens a
    standard stacked `alertdialog` with actionable Russian copy; the operation
    form and its values remain mounted and raw Engee/Julia/TypeError text is
    never rendered.
23. `Analyser → Предобработка` belongs to the external Engee host and dispatches
    `signal-analyser:host-command` on `window` with `detail.command =
    "preprocess"`. It and the existing in-app operation action resolve the same
    current accepted plain-LMB `main_signal` by stable id and open the same
    preprocessing-only singleton directly at `Полосовой фильтр`; no section
    selector or second in-app preprocessing button exists. The operation list
    comes from fresh PROD Engee evidence, not from the MATLAB screenshot alone.
24. Every product-owned visible settings/group/section/option/unit/readout and
    graph/colorbar title is Russian. Every visible `Auto` or `auto` is exactly
    `Авто`. Wire ids/values remain unchanged, and user signal names, custom code
    and numeric values are never translated. Physical unit presentation uses
    `Гц`, `с`, `дБ`, `%` and `отсчёты`.
25. The existing operation ValueSelect shows one operation-specific canonical
    icon before the selected text in its closed trigger and before the text of
    each of the ten expanded rows. Icons are decorative; operation text remains
    the accessible name. Dialog/control/popup/row geometry and all V59 behavior
    are unchanged.
26. Eligible `Обрезать` is the left cell of the existing 28px pane-header
    control cluster. It shares the selector divider, leaves only the outer-left
    radius, stays inside the 32px header at every state and changes neither
    trim eligibility nor dialog behavior.
27. Pane horizontal/vertical slider visibility is an independent explicit
    intent owned only by the matching pane-menu tool or Area checkbox. Settings
    numeric edits/Apply and graph double-click autoscale may update viewport
    values but never infer, enable or mount either pane slider.
28. The extrema action remains available after an error and after a
    successful or empty result. Error reads `Рассчитать ещё раз`; ready/empty
    reads `Пересчитать` with title `Пересчитать для актуальных диапазонов`; only the active pending
    request disables it. Every activation samples the current plot X viewport,
    while existing table rows, local error, settings validation and focus
    behavior remain mounted and unchanged.
29. Extrema calculation/polling belongs to the requested display/pane context,
    continues after leaving either extrema surface and never blocks Settings
    tabs. The inspector action occupies one compact cell immediately before the
    existing collapse controls and has no duplicate below the extrema table.
    The operation selector is one semantic button trigger containing a
    decorative icon, text and decorative arrow; it contains no readonly input
    or nested button while preserving the existing popup and keyboard flow.
30. Every current settings/pane/dialog select and toolbar/pane/column action
    menu now follows one audited dropdown contract. Searchable ValueSelects and
    the icon operation selector each own exactly one semantic trigger; trim
    source and operation enum fields migrate from native select without wire
    changes. Eligible icon-only, symbol-only, abbreviated and actually
    truncated controls receive the canonical white tooltip after 1500 ms on
    hover or keyboard focus. Obvious full-text buttons do not. Tooltips flip and
    clamp to the viewport, never shift geometry and are removed while a menu,
    foreign top modal, loader or newer overlay owns interaction.
31. Extrema results belong to a pane and are keyed by stable SignalId. Every
    plot reconstruction restores markers for graph traces that still exist,
    independently of the selected Settings/Inspector tab; zoom only clips them.
    A Secondary MD `Очистить` action sits immediately before the Primary
    calculate/recalculate action in both contexts, clears only the current pane
    without confirmation, and is disabled when there is no stored result or
    while that pane is calculating. Persisted extrema contain only `sample`,
    `x`, `y` and boolean `is_maximum`.
32. Pane-header `Обрезать`, plot-type selector and overflow are three independent
    28px cells. The selector keeps its ordinary `148..212px` track whether trim
    is absent or present; eligible trim adds its intrinsic `max-content` track
    on the left and only the ellipsized pane-title track yields. Selector focus
    and open emphasis are drawn inside the unchanged border box.
33. The 28px `Обрезать` grid item is vertically centered in the 32px pane
    header, leaving equal 2px top and bottom insets. The outer `.pane-select`
    is the sole visible border/radius/focus/open owner; its direct readonly
    combobox child remains full-size semantic content with transparent,
    borderless, radiusless and shadowless chrome in default, hover and
    focus-visible states.
34. Inspector Extrema actions are absent from the tab row. Ready/stale-ready
    results place one 64px final table-header cell containing exact 16px trash
    then refresh icons in two 32×31 targets. Idle, cleared, empty, error and
    pending show the same centered Primary `Рассчитать` on white; pending keeps
    it in place disabled with a light 16px loader. Secondary
    `Настроить расчёт` remains centered below and never replaces Calculate.
35. The derived filter `frequency_units` value remains in operation state and
    payload but has no rendered row. Its Russian unit is shown only in affected
    frequency-bound labels. Every single-line operation input and dropdown owns
    the same full-width 32px, 1px-border, 6px-radius outer track; a ValueSelect
    input is semantic content and never creates a second nested border.

The exact DSP math, Engee/EngeeDSP call selection, revision transaction
implementation, Plotly payload construction, sample API mechanics and session
serialization remain outside Designer ownership. TASK-0152 defines only the
required `/api/signals/crop` transport boundary and result semantics.

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
| 6 | Operation selector | Exactly ten PROD-confirmed preprocessing operations use the shared `SignalAnalyserValueSelect`; the closed selected value and every expanded row have mapped canonical decorative icons; the section selector, former math operations, FFT, Denoise and Fill Missing KNN are absent | `evidence/interaction-regression-v59-engee-preprocess-only.json`; `evidence/interaction-regression-v60-operation-icons.json` |
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
| 18 | Graph cursor modes | Existing menu rows select one or two snapped vertical X cursors with numeric badges; the former graph coordinate readout is absent and no backend/DSP call occurs | inherited v36 cursor-line baseline + v57 bounded source evidence |
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
- The operation dialog is the exact 480px MD modal. Its fixed title/footer stay
  visible while the body owns vertical overflow. All standard text/dropdown
  parameter controls are 32px; actions remain 32px Primary/Secondary MD.
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
- Extrema action presentation follows the active calculation context. Initial
  state is `Рассчитать`; error is enabled `Рассчитать ещё раз`; successful and
  empty results are enabled `Пересчитать` with title
  `Пересчитать для актуальных диапазонов`; pending is
  the only disabled state and reads `Рассчитывается…`. Each non-pending click
  reads the current viewport at activation time rather than reusing the range
  from the previous result. A failed attempt keeps existing extrema rows and
  local error visible; an accepted empty result keeps the valid empty table.
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
- The current operation menu is preprocessing-only and contains exactly the ten
  PROD-confirmed operations enumerated in the v59 delta. Former module, square,
  root, signed-root, multiply and FFT entries are absent. Denoise and Fill
  Missing KNN are absent rather than disabled because no public Engee function
  or object was confirmed for them. No placeholder operation or fake result is
  introduced.
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

## Exact delta v46 → v48

- Added one stable full-application bootstrap overlay over the existing shell.
  It starts before the initial state request and closes only after: accepted
  state-lite containing signals/displays/layout, accepted settings for the
  active display, and a requestAnimationFrame-confirmed initial render.
- Pane outputs, summaries, samples, measurements and extrema are excluded from
  this global barrier and retain their existing local loading states.
- Each 20-second attempt owns a token. Timeout or required-request failure shows
  only `Не удалось загрузить данные анализатора. Проверьте соединение и повторите попытку.`
  plus `Повторить`; retry creates a new token, so stale completions cannot close it.
  The shell is inert and `aria-busy` while loading; the overlay is one continuous
  node with polite status, assertive error and continuously rotating 64px spinner.
- All Area/Screen limit controls for the current plot context are now children
  of one expanded, user-collapsible `Диапазоны` group. Time and frequency unit
  selectors live in `Параметры`; v46 per-endpoint validation is unchanged.
- `plotly_relayouting` immediately projects the active/clicked pane viewport into
  settings fields/handles without publication. `plotly_relayout`, settings
  change/pointerup or keyboard commit starts one deduplicating 150ms settle; the
  existing serialized autosave then publishes canonical seconds/Hz once.
- Valid settings fields/sliders update the same plot at most once per animation
  frame, then use the existing four link queues for eligible panes. Log-axis
  Plotly exponents are decoded/encoded, never treated as linear values.
- Double-click on a settings range row/slider or its in-plot slider clears both
  explicit endpoint intents, applies Auto/full domain, synchronizes graph and
  settings and publishes one settled Auto value. Invalid v46 boundaries do not
  preview, link or publish.
- Applied skills: `designer/designer-workflow` and
  `designer/application-composition`. Existing range/settings/output patterns
  were audited directly; visual-system, Figma, Engee Apps and page sizing were
  skipped because no new tokens, component geometry, zone size or resize rule
  was introduced. Figma reference status: `not_required`.

## Exact delta v48 → v49

- Every busy/loading surface keeps the standard arrow cursor. The Signal color
  picker busy state, exact-pane loader, display-canvas loader and global
  bootstrap overlay now declare the standard cursor; transferable current
  sources contain no wait/progress cursor declarations.
- Spinner geometry, color, continuous rotation and reduced-motion duration are
  unchanged. Pointer blocking, inert application state, disabled controls,
  `aria-busy`, overlay priority, lifecycle tokens, loading/error copy and all
  request behavior are unchanged.
- Exact modified transfer sources are
  `frontend-source/integration/css/task-0118-color-picker.css`,
  `frontend-source/integration/css/task-0139-loading-overlays.css` and
  `frontend-source/integration/css/task-0143-bootstrap-loader.css`.
- Applied skill: `designer/designer-workflow`. Visual-system, Figma, Engee Apps,
  composition and sizing were skipped because this revision changes no visual
  component, geometry, overlay composition or viewport rule. Figma reference
  status: `not_required`.

## Exact delta v49 → v50

- Frontend transfer audit found one additional legacy production selector not
  previously represented in current: `.settings-apply.is-applying:disabled,
  .settings-apply.is-pending:disabled` still declared a wait cursor.
- `frontend-source/integration/css/task-0145-standard-busy-cursor.css` is the
  exact transfer source for replacing only that selector's cursor declaration
  with the standard cursor. It is a replacement instruction, not an appended
  duplicate override.
- Autosave state colors, opacity, disabled state, spinner/pseudo-element,
  serialized publication behavior and every other V49 surface remain unchanged.

## Exact delta v50 → v51

- The exact legacy settings-autosave busy selector remains mapped to
  `cursor: default`; every transferable busy/loading source therefore uses the
  standard cursor and contains no `wait` or `progress` declaration.
- A settings `Пределы X` drag updates the existing Plotly host only through
  in-place `Plotly.relayout`. It cannot rebuild/replace the host, resize the
  pane, write pane/plot width, height or overflow, or create a transient pane
  scrollbar.
- The exact range row, both numeric inputs, slider, handles and Plotly host are
  captured at generation start and retain node identity, visibility and geometry
  through drag preview, 150ms settled publication, accepted settings, output
  pending and ready. State is patched in place; settings rerender/remount is
  forbidden during this lifecycle.
- Settings gestures and graph relayouts use one monotonic per-range generation.
  Double-click creates the newest generation atomically, clears explicit draft
  and accepted intent, blanks both numeric inputs to Auto, restores handles to
  the full domain, applies autorange and publishes exactly one Auto payload.
  Provider/settings/output accepts must echo the generation; older accepts and
  explicit values arriving after the Auto generation are ignored.
- Manual graph zoom/pan stays an immediate selected-unit projection into the
  same settings nodes. It remains a viewport projection, not an explicit hard
  range after Auto reset; the reset's programmatic relayout cannot repin the
  previous interval. V46 endpoint validation, link scopes and Plotly log
  coordinate conversion are unchanged.
- Exact transferable controller:
  `frontend-source/integration/js/task-0146-range-lifecycle.js`. Deterministic
  regression covers DOM identity, no-overflow relayout, latest-reset-wins and
  live-zoom-after-Auto guards in
  `evidence/interaction-regression-v51-task0143-0146.json`.
- Applied skill: `designer/designer-workflow`. Visual-system, Figma, Engee Apps,
  composition and sizing were skipped because this is a lifecycle correction
  with unchanged components, tokens and geometry. Figma reference status:
  `not_required`.

## Exact delta v51 → v52

- Area/Screen numeric range fields and sliders are now only frontend mirrors of
  the active Plotly viewport. Input/drag changes use in-place Plotly relayout;
  Plotly zoom/pan projects back into the same nodes. They never call
  `settings.publishRange`, `/api/settings`, output invalidation/recalculation,
  DSP, `state_revision` or session persistence. Axis-link flags remain ordinary
  persisted settings, while linked viewport movement remains frontend relayout.
- The shared range generation and exact DOM identity contracts remain. A
  double-click ignores mirrored numbers, cancels older preview/settle work,
  requests true Plotly autorange/full domain and reprojects blank Auto inputs
  plus full-domain handles. With no backend range publication, an accepted
  settings/output response cannot restore the old viewport.
- The existing Measurements three-dot eye menu adds `X1`, `Y1`, `X2`, `Y2`,
  `ΔX`, `ΔY`; all six start hidden. Cursor off or an ineligible pane disables
  and hides all six. Single cursor enables only X1/Y1. Dual cursors enable all.
  When mode drops, newly ineligible visible columns disappear immediately while
  their pane-local frontend visibility intent is retained and restored if that
  pane returns to an eligible mode.
- Cursor columns update from the active pane controller on every cursor move.
  Each measurement row resolves its `legendgroup` group key and uses the first
  visible non-overlay trace with the exact same `legendgroup` in Plotly data
  order. Y1/Y2 use that trace's nearest sample to cursor X;
  `ΔX = X2 - X1` and `ΔY = Y2 - Y1`. Headers/cells use the current X/Y axis
  units and the existing seven-significant-digit/scientific numeric convention.
  No API, DSP, settings, session or revision state is involved.
- Disabled menu rows use the existing 28px eye-menu geometry, `eye-off.svg`,
  muted disabled state, native `disabled` plus `aria-disabled`; enabled rows
  retain the existing click/Enter/Space toggle, roving focus, Escape restoration
  and outside-close behavior. The table retains its current horizontal scroll.
- Exact sources are
  `frontend-source/integration/js/task-0148-measurement-cursor-columns.js`,
  `frontend-source/integration/css/task-0148-measurement-cursor-columns.css`,
  updated cursor subscription source
  `frontend-source/integration/js/task-0130-graph-cursors.js`, and the revised
  frontend-only viewport helpers for TASK-0144/0146.
- `Подписывать оси` is the exact per-pane persisted boolean field
  `display.show_axis_labels`, default `true` to preserve current behavior. It is
  the next checkbox after `display.show_legend` in the same `График` group.
  Checked restores provider-authored semantic titles: Time uses Time/Amplitude,
  Spectrum uses Frequency and the current magnitude/power contract, Spectrogram
  uses Time/Frequency plus its power colorbar, and Persistence uses
  Frequency/Power plus probability colorbar. Unchecked clears only
  `xaxis.title.text`, `yaxis.title.text` and applicable
  `colorbar.title.text`; axes, ticks, grid, colorbar, margins and data remain.
  The title change is relayout/restyle-only and persists without output/DSP
  invalidation.
- All accepted Plotly payloads and subsequently added overlay traces enforce
  `layout.hovermode=false`, `hoverinfo='skip'` and `hovertemplate=null`.
  Standard unified-X/closest hover labels therefore never appear on Time,
  Spectrum, Spectrogram or Persistence. This does not change dragmode, zoom,
  pointer capture, pane cursor lines/badges or Measurements projections; the
  former custom graph coordinate readout is intentionally absent in V57.
- Exact shared source and regression are
  `frontend-source/integration/js/task-0150-0151-axis-labels-hover.js` and
  `evidence/interaction-regression-v52-task0150-0151.json`.
- Applied skills: `designer/designer-workflow`,
  `designer/data-entry-and-inspection` and
  `designer/output-and-visualization`. Visual-system, Figma, Engee Apps,
  composition and sizing were skipped because the existing table, menu, icons,
  proportions, zones and viewports are unchanged. Figma reference status:
  `not_required`.

## Exact delta v52 → v53

- A pane header gains one existing compact icon-button immediately before the
  plot-type selector/overflow controls only when the active pane is Time, its
  cursor mode is dual, its main signal is valid and both snapped cursor X values
  are finite. Every ineligible state hides the action with no reserved width.
- The action reuses `function.svg` and the existing signal-operation dialog
  geometry. It opens `Обрезать сигнал по курсорам` with read-only source and
  sorted inclusive cursor interval, required empty `Имя нового сигнала`, the
  standard `Затирать сигнал с таким именем` checkbox, `Отмена` and `Создать`.
- Submit converts the sorted cursor interval from current Time-axis units to
  canonical seconds and sends the exact payload `{state_revision,
  source_signal_id, min_s, max_s, target_name, overwrite}` to
  `POST /api/signals/crop` through the revision-safe signal mutation queue.
  Sample-index resolution, validation/clamping, inclusive selection, retained
  sampling rate/data type and zero-based output time are backend-owned.
- Busy state keeps the same modal controls and values mounted, disables them in
  place and blocks close. Sanitized typed 400/404/409/422/provider failures stay
  recoverable in the dialog. Success closes only after the returned signal or
  authoritative inventory is accepted into `Сигналы`.
- Stable selectors and cleanup hooks are enumerated in `ui-contract.yaml` for
  fully visible E2E execution. Pane removal/type/main/mode invalidation hides the
  action, cancels/detaches pane state and rejects stale UI completion.
- Exact sources are
  `frontend-source/integration/js/task-0152-cursor-trim-signal.js`,
  `frontend-source/integration/html/dialogs/signal-trim.fragment.html` and
  `evidence/interaction-regression-v54-task0152.json`.
- Existing modal/button/icon patterns are reused; no new tokens, geometry or
  Figma decision is introduced. Figma reference status: `not_required`.

## Exact delta v53 → v54

- Corrected only the TASK-0152 provider seam to the accepted endpoint
  `POST /api/signals/crop`.
- The frontend request now contains exactly `state_revision`,
  `source_signal_id`, sorted canonical-second `min_s`/`max_s`, `target_name`
  and `overwrite`. Display/pane ids, selected-unit interval objects, sample
  indices and `time_origin` are absent.
- The backend owns range validation/clamping, inclusive sample resolution,
  metadata retention and time rebasing. UI wording, action eligibility, modal,
  busy continuity, typed errors, focus and cleanup remain unchanged.
- Corrected bounded evidence:
  `evidence/interaction-regression-v54-task0152.json`.

## Exact delta v54 → v55

- Double-click on a ready graph surface has one intent: true X/Y autoscale. It
  preserves the current time/frequency and amplitude slider visibility, does
  not open a slider or pane menu, and does not change the Settings page. A
  double-click on an already visible in-plot slider remains that slider's local
  reset; a Settings range-row/slider double-click remains field-local Auto.
- Visible Settings tabs are navigation, not mutation controls. `Экран`
  activates synchronously by pointer or keyboard even while a prior settings
  autosave is pending. The request finishes in the background; any late render
  is accepted only when its captured page activation token is still current.
- `Область → Диапазоны` always renders one mounted dual-thumb slider immediately
  after every applicable Time/Frequency/Magnitude/Power/Density range row.
  Axis-link flags control propagation only; they never hide a local Area range
  or its slider. Auto endpoints, selected units and stable-node lifecycle remain.
- `Значения` and `Рассчитать` are canonical Primary MD actions: 32px height,
  6px radius, accent background, white text and standard primary hover/pressed/
  disabled states. Their footer placement and action semantics are unchanged.
- Exact sources are
  `frontend-source/integration/js/task-0153-ui-regressions.js`,
  `frontend-source/integration/css/task-0153-ui-regressions.css`; bounded
  evidence is `evidence/interaction-regression-v55-task0153.json` (6/6).
- Applied skills: `designer/designer-workflow`, `designer/visual-system`,
  `designer/data-entry-and-inspection`, `designer/output-and-visualization` and
  mandatory `figma-design-to-code` for node context. Engee Apps research,
  composition and page sizing were skipped: no new zone, overlay or resize rule.
  Figma reference status: `available` for the exact component variants below.

## Exact delta v55 → v56

- Removed only the redundant `Видимость столбцов` subgroup title from the
  existing Measurements visibility popup. The sole menu title remains
  `Видимость измерений`.
- The popup is one flat list in exact order: all existing measurement rows,
  then `X1`, `Y1`, `X2`, `Y2`, `ΔX`, `ΔY`. No nested list or divider is needed.
- Existing 244px width, body portal, vertical overflow owner, eye/eye-off icons,
  cursor eligibility/disabled rules, toggle-without-close, roving focus and
  Escape/outside restoration are unchanged.
- Exact transferable source is
  `frontend-source/integration/js/task-0148-measurement-cursor-columns.js`;
  bounded evidence is
  `evidence/interaction-regression-v56-task0153-measurements-menu.json`.
- Applied skills: `designer/designer-workflow` and
  `designer/data-entry-and-inspection`. Visual-system, Engee Apps research,
  composition and page sizing were skipped because the accepted menu geometry,
  tokens, states and layout are preserved. Figma reference status:
  `not_required`.

## Exact delta v56 → v57

- The eligible pane-header trim action is now the standard text-only Secondary
  MD `Обрезать` button: 32px high, 12px horizontal padding, 6px radius, no
  unrelated function icon and no tooltip. Its visibility contract is unchanged.
- `Обрезать сигнал` is a canonical 480px modal. `Исходный сигнал` is a 32px
  dropdown containing only eligible signals in the active Time pane and starts
  at its current main signal. `Интервал курсоров` is one read-only contextual
  output; manual range fields are forbidden.
- `Имя нового сигнала` starts at `<source>_фрагмент`, then uses the lowest free
  `_2`, `_3`, … suffix. Unicode is preserved and inventory comparisons are NFC-
  normalized. Source change refreshes the suggestion only while the user has
  not edited the name. The overwrite checkbox is hidden until the current name
  conflicts; an unchecked conflict disables submit.
- The exact crop payload is unchanged, but `source_signal_id` now always maps
  from the current dropdown selection. No source, invalid name/interval,
  unchecked conflict and busy all disable `Создать сигнал`.
- The custom cursor coordinate readout card is removed without replacement in
  both single and dual modes. Vertical lines, numeric badges, pointer/keyboard
  interaction and Measurements `X1/Y1/X2/Y2/ΔX/ΔY` remain. Plotly native hover
  remains disabled.
- A signal-operation provider/runtime failure no longer renders an inline raw
  terminal block. Busy ends first; a standard 480px `role=alertdialog` titled
  `Операция не выполнена` opens above the preserved operation dialog. It maps
  status/stable code only to sanitized Russian guidance, traps focus, closes by
  `Понятно`, close button or Escape, then restores the first invalid field or
  operation submit. Raw message, stack, Engee, Julia and TypeError are forbidden.
- Exact sources are `integration/css/task-0154-trim-and-operation-error.css`,
  `integration/js/task-0152-cursor-trim-signal.js`,
  `integration/js/task-0154-operation-error-dialog.js`, both dialog fragments,
  and `evidence/interaction-regression-v57-task0154.json`.
- Applied skills: `designer/designer-workflow`, `designer/visual-system`,
  `designer/data-entry-and-inspection`, `designer/dialog-and-file-flows`,
  `designer/page-sizing-contract` and mandatory `figma-design-to-code` for exact
  component context. Engee Apps research was not needed because application
  composition is unchanged. Figma reference status: `available`.

## Exact delta v57 → v58

- Read-only production DOM audit confirms that `Analyser` is an external Engee
  host menu: the application toolbar owns only brand plus Import, Save and Help,
  and no `Analyser` menu or preprocessing entry exists in `public/index.html`.
  Therefore no in-app button or selector is introduced.
- `Analyser → Предобработка` dispatches the stable host seam
  `window` / `signal-analyser:host-command` / `{command: "preprocess"}`. The
  listener accepts only that command, ignores any host-supplied source id/name,
  resolves the current accepted `main_signal` by stable id at handling time and
  starts the existing singleton at `Предобработка / Полосовой фильтр`. Signal
  visibility checkbox changes do not change this selection; a hidden current
  main signal remains eligible. Without a valid main signal, the dialog stays
  closed and the existing sanitized notification says `Предобработка
  недоступна: выберите сигнал в таблице.` The row operation action continues at
  `Математическое преобразование / Модуль`.
- `FFT` stays absent. Existing `Модуль / Квадрат / Квадратный корень / Корень
  из модуля × знак / Умножение / Пользовательская операция` remain available;
  `Умножение` retains its multiplier and the custom operation retains its exact
  user body.
- The preprocessing inventory is based on MATLAB Signal Analyzer scenario
  `SA-UI-012-preprocess-function-parameter-inventory.md`. It is adapted only at
  the transaction boundary: MATLAB overwrites selected data, while this product
  creates a named derived signal and preserves the source.
- Phase A is `Полосовой фильтр / Полосно-заграждающий фильтр / Фильтр верхних
  частот / Фильтр нижних частот / Удаление тренда / Заполнение пропусков /
  Сглаживание / Огибающая`. `Подавление шума`, `Передискретизация` and
  `Пользовательская предобработка` remain visible but use explicit provider
  capability/compatibility states; unavailable options are disabled with a
  Russian reason instead of pretending to succeed.
- Blank automatic numeric parameters show placeholder `Авто` and serialize as
  `null`; zero is not blank. Only visible conditional fields validate or enter
  `parameters`. Field errors use only their own 2px red border and local copy.
  Compatibility is operation-level. Runtime/provider failure reuses the
  sanitized stacked alertdialog; raw Engee/Julia/TypeError copy remains banned.
- The operation modal is the exact Component Library LG 740px surface with
  40px dropdown/input fields, 32px Secondary/Primary MD footer actions, exact
  error input and exact disabled-checkbox state. Body scrolling never moves the
  titlebar or actions.
- All product-owned visible setting labels, group/section titles, options,
  readouts, axis titles, colorbar titles and physical units are Russian.
  Internal ids/values remain stable, and names/code written by the user are
  displayed byte-for-byte.
- Exact transferable sources are
  `integration/css/task-0157-preprocess-operation.css`,
  `integration/js/task-0157-preprocess-operation.js` and
  `integration/js/task-0158-russian-localization.js`. Bounded evidence is
  `evidence/interaction-regression-v58-preprocess-localization.json` (`15/15`).
- Applied skills: `designer/designer-workflow`, `designer/visual-system`,
  `designer/data-entry-and-inspection` and `designer/dialog-and-file-flows`.
  Engee Apps research was not used because the application composition is
  unchanged. Exact required Component Library nodes were available.

### Conditional preprocessing field matrix

| Operation | Always visible | Conditional fields | Automatic / availability rule |
|---|---|---|---|
| Полосовой / полосно-заграждающий фильтр | Units (read-only), lower/upper passband, steepness, stopband attenuation | none | Hz when sample rate exists; otherwise normalized `× π рад/отсчёт`; bounds are inside Nyquist and ordered |
| Фильтр верхних / нижних частот | Units (read-only), passband, steepness, stopband attenuation | none | Same unit/Nyquist rule |
| Удаление тренда | Method | Piecewise linear → breakpoints | Breakpoints are increasing sample numbers separated by commas |
| Заполнение пропусков | Method, end method | Constant → value; moving mean/median → window; KNN → K; autoregressive → order; constant end → end value | Only the chosen branch is sent |
| Сглаживание | Method, window specification | Duration → units + duration; factor → smoothing factor; Savitzky–Golay → polynomial degree | Window duration and degree may remain blank `Авто` |
| Огибающая | Side, method | FIR → order; RMS → units + window; Peak → units + maxima separation | Conditional numeric fields may remain blank `Авто`; complex input is incompatible |
| Подавление шума | Wavelet family/number, method, levels | Bayes → rule + noise estimate; BlockJS → none; FDR → noise estimate + Q; Minimax/SURE/Universal → soft/hard rule + noise estimate | Levels are `Авто`; option is disabled unless provider reports denoise capability |
| Передискретизация | Source-dependent | Uniform/rate → target Hz; uniform/factor → interpolation + decimation factors; nonuniform → target Hz + linear/PCHIP/spline | Missing time metadata blocks submit; provider capability required |
| Пользовательская предобработка | Body | none | Body is sent unchanged; never evaluated or wrapped in UI |

The v58 matrix above is retained only as the previous-version decision record.
It is superseded in full for the current dialog by v59 below.

## Exact delta v58 → v59

- The section selector is removed. Every entry opens the same preprocessing-only
  dialog at `Полосовой фильтр` for the current accepted signal selected by plain
  LMB. The source is read-only and host-supplied source ids/names are ignored.
- The visible selector contains exactly ten operations confirmed in PROD by
  Engee User: `Полосовой фильтр`, `Режекторный фильтр`, `Фильтр высоких
  частот`, `Фильтр низких частот`, `Удаление тренда`, `Заполнение пропущенных
  значений`, `Сглаживание`, `Огибающая`, `Передискретизация` and
  `Пользовательская операция`.
- Removed from the visible/API UI inventory: module, square, root, signed root,
  multiply, FFT and Denoise. `EngeeDSP.Functions.wdenoise`/`denoise` are absent
  public symbols, so Denoise is not shown even as a disabled row. Fill Missing
  KNN is also absent because no public Engee KNN/fillmissing function or object
  exists; the former manual implementation is forbidden.
- System-function mapping is exact: filters →
  `EngeeDSP.Functions.bandpass/bandstop/highpass/lowpass`; detrend → `detrend`;
  Fill Missing → `interp1/movmean/movmedian/fillgaps`; smoothing → `smoothdata`;
  envelope → `envelope`; resample → `resample`; custom → the existing
  `engee.genie.recv` execution boundary. Fresh PROD evidence passes 141/141
  supported assertions and 51/51 availability/inventory assertions.
- Four confirmed provider defects remain safe through mandatory adapter guards:
  filter result `vec` plus open bounds, detrend numeric degrees 0/1, smoothing
  factor strictly `0 < x < 1`, and resample time prevalidation plus right-domain
  clipping. These guards do not remove their operations.

### Current v59 field matrix

| Operation | Always visible/default | Conditional fields | Required rules |
|---|---|---|---|
| Bandpass / bandstop | readonly frequency units; low/high = 0.25/0.75 Nyquist; impulse response `Авто`; steepness 0.85; attenuation 60 дБ | none | `0 < low < high < Nyquist`, `0.5 ≤ steepness < 1`, attenuation > 0 |
| Highpass / lowpass | readonly frequency units; boundary = 0.5 Nyquist; impulse response `Авто`; steepness 0.85; attenuation 60 дБ | none | `0 < boundary < Nyquist`, same steepness/attenuation rules |
| Detrend | method `Линейный`; NaN policy `Учитывать пропуски` | piecewise → comma-separated breakpoints | positive 1-based, sorted, unique and inside source length; adapter uses numeric degree |
| Fill Missing | method `Постоянное значение`; boundary mode `Как основной метод` | constant → value 0; moving mean/median → positive window; autoregressive → positive order | KNN absent; window ≤ N; AR order < finite count; moving median real-only |
| Smooth | method moving mean; window sizing `Длительность`; blank duration = `Авто` | factor → 0.25; Savitzky–Golay → blank degree = `Авто` (=2) | duration > 0 if set; strict `0 < factor < 1`; degree ≥ 0 and below explicit window |
| Envelope | side `Верхняя`; method Hilbert | FIR → required positive order; RMS → units + required positive window; Peak → units + required positive distance | no `Авто` after FIR/RMS/Peak selection; real finite source only |
| Resample | uniform mode defaults to target rate; target rate blank | uniform factor → positive numerator/denominator; nonuniform → target rate + linear/PCHIP/spline | target rate has no fabricated default; time/Fs required; output 2…5,000,000 |
| Custom | body `init_signal` | none | required body; source immutable; frontend never evaluates or wraps code |

- Only visible fields validate and enter `parameters`. Invalid fields own their
  individual red border/message; provider/runtime failures use the existing
  stacked sanitized alertdialog. Busy, success, target default name and explicit
  overwrite behavior are preserved.
- Trim dialog is unchanged, including its full-width eligible-source dropdown.
- Applied skills: `designer/designer-workflow`,
  `designer/data-entry-and-inspection`, `designer/dialog-and-file-flows`.
  `designer/visual-system`, Figma and Engee Apps research were not required:
  V59 reuses the accepted V58 LG modal/components without a visual or composition
  decision. Figma reference status: `not_required` for this revision.
- Evidence: `evidence/interaction-regression-v59-engee-preprocess-only.json`,
  26/26 passed.

## Exact delta v59 → v60: operation selector icons only

V60 changes no field, state, option, provider seam or dialog geometry. It adds
an optional leading-icon projection to the existing shared ValueSelect. In the
operation field only, a 16×16 decorative image appears immediately before the
selected operation text in the closed trigger and immediately before each
operation label in the expanded list (after the existing selection-check slot).
Closed spacing is 8px left inset plus 4px icon-to-text gap; expanded rows retain
12px horizontal padding and use an 8px icon-to-text gap. The accepted 40px
operation control, exact popup width, 34px option height, search, keyboard,
focus restoration and selected check remain unchanged. Every icon is
`alt="" aria-hidden="true"`; Russian option text remains the accessible name.

| Operation wire id | Visible text | Local icon | Engee Component Library source |
|---|---|---|---|
| `bandpass` | Полосовой фильтр | `operation-filter.svg` | [Icons/Filter/16, `320:1830`](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=320-1830&p=f) |
| `bandstop` | Режекторный фильтр | `operation-filter.svg` | [Icons/Filter/16, `320:1830`](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=320-1830&p=f) |
| `highpass` | Фильтр высоких частот | `operation-filter.svg` | [Icons/Filter/16, `320:1830`](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=320-1830&p=f) |
| `lowpass` | Фильтр низких частот | `operation-filter.svg` | [Icons/Filter/16, `320:1830`](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=320-1830&p=f) |
| `detrend` | Удаление тренда | `operation-detrend.svg` | [Icon/Optimization/24, `320:3070`](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=320-3070&p=f) |
| `fill-missing` | Заполнение пропущенных значений | `operation-fill-missing.svg` | [Icon/Data/16, `320:2021`](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=320-2021&p=f) |
| `smooth` | Сглаживание | `operation-smooth.svg` | [Icon/Magic, `320:2365`](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=320-2365&p=f) |
| `envelope` | Огибающая | `operation-envelope.svg` | [Icon/Plot/Array Plot/16, `320:4109`](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=320-4109&p=f) |
| `resample` | Передискретизация | `operation-resample.svg` | [Icon/SampleRate/16, `393:1283`](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=393-1283&p=f) |
| `custom-preprocess` | Пользовательская операция | existing `function.svg` | [Icon/Function/16, `320:4991`](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=320-4991&p=f) |

The four filter rows intentionally share the canonical generic Filter glyph:
using one of the available response-shape graphics would falsely encode a
specific cutoff/band shape before the option text is read. Six new local SVGs
are exact Component Library glyphs; the already-identical local `function.svg`
is reused for the custom operation.

Component geometry was verified against [Action List parent `316:24742`](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=316-24742&p=f),
[default left-icon row `316:27122`](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=316-27122&p=f),
[hover left-icon row `927:6592`](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=927-6592&p=f),
[Inputs parent `316:38487`](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=316-38487&p=f),
[Dropdown icon typed `316:40182`](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=316-40182&p=f) and
[Dropdown icon open `2343:11971`](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=2343-11971&p=f).
The parent component-set nodes returned metadata but no direct selected variant;
the exact child variants above were accessible and supplied the implementation
geometry, so no required visual reference is blocked. Icon inventory provenance
starts at [Icons `320:607`](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=320-607&p=f).

Evidence: `evidence/interaction-regression-v60-operation-icons.json`, 12/12
passed. The unchanged V59 schema regression remains 26/26 passed.

## Exact delta v60 → v61: pane header cluster, explicit slider lifecycle and semantic operation selector

- `Обрезать` keeps its text, eligibility, action, focus semantics and dialog,
  but is no longer a standalone 32px Secondary MD button. It is the start cell
  of the existing `plot-control-cluster`: exact height `28px`, horizontal
  padding `12px`, `18px` text line, left outer radius `6px`, no right radius or
  right border. The adjacent plot-type selector becomes the middle cell with
  no left radius; its existing left border is the single shared divider. The
  existing overflow action remains the 32×28px end cell with only the outer
  right radius.
- The cluster remains vertically centered in the unchanged 32px pane header,
  leaving equal 2px top/bottom insets. Default, hover, pressed, focus-visible
  and disabled states retain exactly `28px` height and the same padding/borders.
  Hover and pressed change only background. Focus uses an inset 2px accent
  outline and cannot protrude. Disabled uses the existing muted surface/text
  and `0.72` opacity. Hidden/ineligible reserves no width and restores the plot
  selector's original outer-left radius through its pre-existing base rule.
- Pane-slider visibility is a separate frontend intent from range values and
  Plotly viewport. Only the matching explicit pane-menu tool or Area checkbox
  may change `xRangeSliderVisible` / `yRangeSliderVisible`. A Settings numeric
  edit or Apply updates the viewport/range projection while preserving both
  visibility bits. Graph double-click requests true autoscale and also preserves
  both bits. Therefore sliders initially off stay unmounted: numeric edit/Apply
  cannot mount the vertical pane amplitude slider and autoscale cannot mount the
  horizontal pane range slider.
- Settings `Диапазоны` dual-thumb controls are not pane sliders and remain
  mounted according to their existing applicable-range contract. Explicit pane
  slider toggles and existing slider-local reset interactions are unchanged.
- The Operation ValueSelect keeps its exact ten ids/labels, 40px height, popup,
  keyboard and focus behavior, but now has one uninterrupted outer border. Its
  16px icon is inline with the selected text (12px left inset, 8px text gap),
  with no detached icon cell or internal divider. Closed trigger and option row
  use the same mapped asset.
- Ten monochrome semantic SVGs distinguish the operations without color-only
  meaning: band pass = low edges/central plateau; band stop = high edges/central
  notch; high/low pass = rising/falling response; detrend = wave plus dashed
  trend; fill missing = broken wave plus bridge; smooth = noisy plus smooth line;
  envelope = carrier plus upper envelope; resample = sparse-to-dense samples;
  custom = `ƒ/f(x)`. All use one stroke system, at most two helper lines, and no
  axes, grid or text labels. HND-0718 supplies factual mathematical semantics;
  these are application-specific local SVGs and do not copy MATLAB artwork.
- Exact transferable sources:
  `frontend-source/integration/css/task-0154-trim-and-operation-error.css`,
  `frontend-source/integration/js/task-0152-cursor-trim-signal.js`,
  `frontend-source/integration/js/task-0153-ui-regressions.js`,
  `frontend-source/integration/css/task-0157-preprocess-operation.css`,
  `frontend-source/integration/js/task-0157-preprocess-operation.js` and the ten
  `frontend-source/icons/operation-*.svg` assets.
- Evidence: `evidence/interaction-regression-v61-header-selector-slider.json`.
  Applied skills: `designer/designer-workflow` and
  `designer/visual-system`. The existing analytical-dense pane cluster and its
  tokens are reused; no composition, dialog, sizing or Engee Apps research was
  needed. The previously accepted Secondary MD and Input references remain
  provenance; the user-specified 28px joined cluster is the explicit override,
  so no new Figma node is required.

## Exact delta v61 → v62: repeatable extrema calculation

- The existing Primary MD footer button is preserved in place; no new visual
  component, table layout, error treatment or settings geometry is introduced.
- The active extrema context exposes one settled state: `idle`, `error`,
  `ready`, `empty` or `pending`. Initial/unknown is enabled `Рассчитать`; error
  is enabled `Рассчитать ещё раз`; ready and empty are enabled
  `Пересчитать для актуальных диапазонов`; pending is the only disabled state
  and reads `Рассчитывается…` with `aria-busy=true`.
- State projection mutates the existing `[data-testid='extrema-values']` node
  in place. It never replaces the footer, table, local error or settings form,
  and it never clears validation or moves focus by itself.
- Every non-pending activation calls the existing viewport reader at click time
  and submits that current canonical TIME/SPECTRUM X interval. A previous
  calculation range is never reused. Pending activation is ignored without a
  viewport read or duplicate provider call.
- A provider error leaves any previously accepted rows and its local error
  available while enabling retry. An accepted empty result is not an error and
  leaves the table in its existing empty state while enabling recalculation.
  Signals with no samples in the selected interval contribute zero rows; they
  do not invalidate rows produced for other signals.
- Exact transferable source:
  `frontend-source/integration/js/task-0162-extrema-retry.js`.
- Evidence: `evidence/interaction-regression-v62-extrema-retry.json`, 8/8.
  Applied skills: `designer/designer-workflow`,
  `designer/data-entry-and-inspection` and
  `designer/output-and-visualization`. Skipped `designer/visual-system`, Engee
  Apps research, composition, page sizing and dialog skills because V62 changes
  only content/state semantics of accepted controls and outputs. Figma
  reference status is `not_required`.

## Exact delta v62 → v63: background extrema, header action and one-element operation trigger

- Settings tabs stay pointer- and keyboard-interactive in every extrema state.
  Their selected page changes immediately and does not create, cancel, own or
  await an extrema request.
- The production provider owns POST/poll timing for each immutable
  `display_id + pane_id` request context. Leaving `Экстремумы`, switching to
  `Сигнал / Область / Экран` or collapsing the inspector does not stop that
  provider flow. A terminal current-token result is stored in its context and
  projected without page reload; navigation state is never rewritten by that
  completion.
- The inspector header keeps its accepted 32px track and tab order. One compact
  Primary action is inserted immediately before `.inspector-state-controls`.
  It is visible only on the inspector `Экстремумы` tab: idle `Рассчитать`,
  error `Рассчитать ещё раз`, ready/empty `Пересчитать`, pending
  `Рассчитывается…`. Pending alone disables it. Ready/empty `title` and
  `aria-label` are `Пересчитать для актуальных диапазонов`. No action is
  rendered below the extrema table.
- The Settings footer retains its existing contextual action and receives the
  same short ready/empty label and full title; this is a different zone and not
  a duplicate inside the inspector table body.
- Only `signal-operation-type` opts into `buttonTrigger`. Its closed/open
  trigger is exactly one semantic `<button role="combobox">` containing the
  existing decorative 16px operation icon, one text span and one decorative
  arrow span. It contains no `<input>` and no nested `<button>`. The existing
  body-portal popup, ten option buttons/icons, active/selected semantics,
  ArrowUp/ArrowDown/Home/End/Enter/Space/Escape/Tab behavior, outside close and
  focus restoration to the trigger remain unchanged. Other ValueSelects retain
  the searchable input trigger.
- Transfer sources: updated
  `frontend-source/js/ui/components/value-select.js`,
  `frontend-source/integration/js/task-0162-extrema-retry.js`,
  `frontend-source/integration/css/task-0163-extrema-background-header-selector.css`
  and `frontend-source/integration/html/inspector-extrema-header-action.fragment.html`.
- Evidence:
  `evidence/interaction-regression-v63-extrema-background-header-selector.json`,
  6/6. Applied skills: `designer/designer-workflow` and
  `designer/data-entry-and-inspection`. Skipped `designer/visual-system`,
  Engee Apps research, application composition, page sizing, output,
  dialog/file-flow and MATLAB research because V63 reuses accepted V62 visual
  components, header track, popup, assets, overlay stack and application
  geometry. Figma reference status is `not_required`.

## Exact delta v64 → v65: pane-owned extrema markers and clear action

- The Settings extrema footer and Inspector extrema header each contain one
  adjacent two-button cluster: white Secondary MD `Очистить` first, existing
  blue Primary MD calculate/recalculate second. Both keep the existing footer
  and 32px header tracks; no confirmation overlay is introduced.
- `Очистить` is enabled only when the current pane owns a stored extrema result
  and no calculation for that pane is pending. Success clears the current pane
  table and markers together, restores idle `Рассчитать`, and does not change
  another pane or its queue position.
- Plot marker projection reads the current pane dictionary keyed by stable
  SignalId on every initial render, Plotly reconstruction, unit projection,
  navigation return and layout resize. Active tabs never gate it. Removing one
  graph removes only its projected markers; zoom clips without deleting data.
- One item is `sample / x / y / is_maximum::Bool`; width, prominence and a
  persisted kind string are absent. Existing numbered triangle/color styling is
  reused, with the boolean selecting maximum/minimum direction.
- Transfer sources: `task-0165-pane-extrema-clear.css`,
  `task-0165-pane-extrema-clear.js` and the updated extrema action fragments.
  Focused evidence: `interaction-regression-v65-pane-extrema-clear.json`, 8/8.
  Applied skills: `designer/designer-workflow` and
  `designer/output-and-visualization`. Visual-system, Engee Apps research,
  composition, sizing, form and dialog skills were skipped because V65 reuses
  existing buttons, header/footer geometry, marker style and overlay stack.
  Figma reference status is `not_required`.

## Exact delta v65 → v66: pane-header control geometry

- The 32px pane header is one four-track grid: yielding pane title,
  intrinsic-width `Обрезать`, plot-type selector `minmax(148px, 212px)` and
  fixed 32px overflow. The existing cluster wrapper uses `display: contents`,
  so each control is an independent header cell without markup relocation.
- Ineligible/hidden trim collapses only its `max-content` track to zero. When it
  becomes eligible, that track is added immediately left of the selector; the
  selector and overflow tracks retain exactly the same widths and right edge.
  The title is the only flexible track and truncates first at explicit `0px`
  content minimum, with a persistent 6px separation from the control group.
- Trim, selector and overflow are exact 28px border boxes in default, hover,
  pressed, focus, open and disabled states. Selector content and arrow inherit
  `height: 100%`; focus/open use a 2px inset accent outline with no outer shadow.
- Boundaries remain single: trim owns no right border, selector owns both of its
  borders, and overflow owns no left border. Trim keeps only the outer-left
  radius; selector has no left radius while trim is visible; overflow keeps only
  the outer-right radius.
- Exact transferable source is the V66 block in
  `frontend-source/integration/css/task-0154-trim-and-operation-error.css`.
  Eligibility, labels, dropdown behavior, modal, actions and every unrelated
  surface are unchanged.
- Visual references were rechecked at
  [Buttons `316:9479`](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=316-9479&p=f)
  and [Inputs `316:38487`](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=316-38487&p=f): both exact
  component families are available. The user-specified 28px joined header is an
  explicit application override of the standard sizes; no new colors, radii,
  typography or assets are introduced.
- Focused prototype evidence:
  `evidence/interaction-regression-v66-pane-header-geometry.json`, 8/8. Applied
  skills: `designer/designer-workflow`, `designer/visual-system`,
  `designer/application-composition` and `designer/page-sizing-contract`.
  Engee Apps research and other pattern skills were skipped because this is a
  local control-track correction, not a new application composition or flow.
  Figma reference status is `available`; no required links are unavailable.

## Exact delta v66 → v67: centered trim and single selector chrome

- The existing 28px trim grid item now overrides its inherited stretch with
  `align-self: center`; inside the unchanged 32px header this yields exact 2px
  top and bottom insets. Width, padding, label and eligibility are unchanged.
- Only the direct readonly pane-selector input is neutralized with the scoped
  selector `.pane-select > .select-trigger-input[data-dropdown-trigger][role="combobox"]`.
  It stays `width/height: 100%`, `min-height: 0`, `border: 0`, `border-radius: 0`,
  transparent, without outline or shadow in default, hover and focus-visible.
  The outer `.pane-select` retains the visible border, radius and inset
  focus/open emphasis; popup, DOM, ARIA and keyboard behavior are unchanged.
- V66 tracks remain exact: `minmax(0, 1fr) max-content minmax(148px, 212px) 32px`.
  No markup, UI JavaScript, provider seam, asset, sizing or overlay contract is
  changed. The exact transferable delta is
  `frontend-source/integration/css/task-0167-pane-header-nested-dropdown.css`,
  appended after the V64 canonical dropdown rules.
- Visual verification used the current Component Library
  [Inputs `316:38487`](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=316-38487&p=f)
  and its exact
  [SM selector Default `316:39454`](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=316-39454&p=f).
  Both are available and confirm one 28px outer selector chrome owner. The
  existing application-specific joined radii and header tracks remain explicit
  inherited deviations; no new token or asset is introduced.
- Focused evidence:
  `evidence/interaction-regression-v67-pane-header-nested-dropdown.json`, 10/10.
  Applied skills: `designer/designer-workflow`, `designer/visual-system` and
  `designer/application-composition`. Engee Apps research, sizing and other
  pattern skills were skipped because V67 changes neither composition, page
  dimensions, data-entry flow, visualization nor dialogs. Figma reference
  status is `available`; no required links are unavailable.

## Exact delta v67 → v68: extrema actions in table or centered no-table state

- The Extrema tab row contains no clear/calculate action cluster. Its tabs,
  collapse controls, 32px track, ARIA and keyboard behavior remain unchanged.
- A ready or stale-ready table with rows appends one final right 64×32 header
  cell. Inside it, trash is left and refresh is right in two exact 32×31
  icon-only targets with one shared divider, square transparent chrome and 16px
  local icons. Accessible names and 1500ms tooltip copy are respectively
  `Очистить экстремумы` and `Пересчитать для актуальных диапазонов`.
- Idle, cleared, empty, error and pending do not mount a table. They mount one
  full white surface with the Primary MD `Рассчитать` centered in both axes and
  Secondary `Настроить расчёт` centered below. Calculate stays enabled in every
  settled no-table state. Pending preserves the same label, node and position,
  adds the canonical light 16px loader and disables activation so a duplicate
  submit cannot occur. Configure never replaces or hides Calculate.
- Table columns, body rows, marker/pagination projection, Settings footer action,
  display/pane request identity and all provider/API fields are unchanged.
  Transfer sources are `task-0168-extrema-table-actions.css`,
  `task-0168-extrema-table-actions.js`, the emptied legacy header fragment and
  exact local `trash-16.svg` / `refresh-16.svg` assets. V67 CSS remains loaded.
- Exact current Component Library sources were read successfully:
  [Trash/16 `320:3249`](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=320-3249&p=f),
  [Refresh/16 `320:3378`](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=320-3378&p=f),
  [Loader Light/16 `1593:62048`](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=1593-62048&p=f),
  [Buttons `316:9479`](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=316-9479&p=f)
  and [Table `317:778`](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=317-778&p=f).
  The library's 88×31 ActionTableEngee compound is intentionally compacted to
  64×31 so its two icon targets align with the accepted 32px analytical table
  track and the explicit user request; tokens and icon assets remain exact.
- Focused evidence: `evidence/interaction-regression-v68-extrema-table-actions.json`,
  12/12. The sandbox browser process aborted before page creation, so the
  deterministic helper/event-delegation regression exercises the clickable
  routes without network and records the limitation explicitly. Applied skills:
  `designer/designer-workflow`, `designer/visual-system`,
  `designer/data-entry-and-inspection` and
  `designer/output-and-visualization`. Engee Apps research, application
  composition, page sizing and dialogs were skipped because V68 is a local
  Inspector projection change. Figma reference status is `available`; no
  required exact node is unavailable.

## Exact delta v68 → v69: Primary processing, header hover and compact validated operation form

- Every blue `.button-primary` / `.ui-button-primary` uses a button-local
  `aria-busy="true"` processing state. Exact Figma token is `#75b5d4` for both
  fill and border, with white `14px/1.4` text. The label is unchanged; a single
  16×16 light loader is placed 8px before it. The helper freezes the idle pixel
  width before busy projection, so loading never resizes the control. Normal
  `disabled` without `aria-busy=true` remains the inherited neutral disabled
  state and has no loader.
- Loader geometry follows exact Light/16 node `1593:62048`; the CSS ring uses a
  2px white stroke, `900ms linear infinite`, and `1600ms` under reduced motion.
  The former extrema child spinner is suppressed whenever the global Primary
  owns processing, preventing duplicate loaders.
- Audited Primary async seams: pane clear, signal add, layout apply, Values,
  both Extrema actions, signal color Apply, native file browser/save/import,
  package validate/restore/save/download, trim create, operation create and their terminal
  acknowledgement actions. Only actual async paths project `aria-busy=true`;
  validation/unavailable disabled actions do not.
- `display-add` and `layout-trigger` now use the exact
  `inspector-state-toggle` hover: `var(--button-active)` background and
  `var(--accent)` foreground. Plus and chevron are current-color masks; the
  inline grid inherits the same accent. `aria-expanded=true` remains a separate
  persistent white/text state and rotates only the chevron.
- The operation dialog adopts exact Component Library Modal MD width `480px`,
  16px viewport gutters and canonical 32px fields. At ≤511px it stacks labels
  above controls. Units are appended to labels (`Граница полосы, Гц`) and no
  trailing unit adornment remains.
- The existing typed validator remains the only rule source and runs after
  operation, parameter, name and overwrite edits. It projects field-local
  `aria-invalid`, messages and submit eligibility in place; text-input nodes are
  not remounted, so focus and caret stay intact. Submit is enabled exactly when
  `valid && availability && !busy`.
- Exact references read successfully:
  [Primary Disable LG `316:9852`](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/%F0%9F%93%96-Engee-Component-Library?node-id=316-9852&t=nIIaPku7qTqMd1cr-4),
  [Spinner Light/16 `1593:62048`](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=1593-62048&p=f),
  [Modal MD `316:44470`](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=316-44470&p=f).
  Figma reference status: `available`; no required reference is unavailable.
- Transfer files:
  `integration/css/task-0169-primary-processing-hover-operation-validation.css`
  and `integration/js/task-0169-primary-processing-operation-validation.js`.
  Focused evidence is
  `evidence/interaction-regression-v69-primary-processing-operation-validation.json`
  (8/8). Applied skills: `designer/designer-workflow`,
  `designer/visual-system`, `designer/output-and-visualization`. Engee Apps
  research was skipped because no application composition changed.

## Exact delta v69 → v70: derived unit omission and one 32px control track

- The non-editable `Единицы частоты` row is absent for all four filter
  operations. `frequency_units` remains derived in UI state and is still sent
  in the filter payload; `Гц` or `× π рад/отсчёт` appears only after the
  affected frequency-bound label.
- The prior discrepancy came from a more-specific legacy 40px dropdown rule
  and 10px vertical label padding surviving below the V69 geometry rule. V70
  explicitly resolves those selectors: every single-line input, native select,
  searchable ValueSelect and icon operation trigger uses one full-width 32px
  border box with a 1px line, 6px radius and common vertical alignment.
- A searchable ValueSelect owns exactly one outer border; its inner semantic
  input is borderless. The operation trigger keeps its 16px icon inline with no
  divider and removes the legacy vertical label padding. Textarea height remains
  content-specific while its width, border and radius follow the same track.
- Exact Inputs parent [`316:38487`](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=316-38487&p=f)
  was re-read successfully; its 32px text-input/dropdown instances confirm the
  chosen geometry. Modal MD [`316:44470`](https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=316-44470&p=f)
  remains inherited from V69. Figma reference status: `available`.
- Transfer files are
  `integration/js/task-0157-preprocess-operation.js` and
  `integration/css/task-0169-primary-processing-hover-operation-validation.css`.
  Focused evidence is
  `evidence/interaction-regression-v70-operation-form-unit-geometry.json`
  (8/8). Applied skills: `designer/designer-workflow`,
  `designer/visual-system`, `designer/data-entry-and-inspection` and
  `designer/dialog-and-file-flows`. Engee Apps research, application
  composition and page sizing were skipped because this is an isolated dialog
  field/schema correction with unchanged modal footprint.

### Exhaustive visible localization map

Wire/API tokens in the left column do not change. Only the displayed string in
the right column is emitted by `SignalAnalyserRussianLocalization`.

| Previous visible string(s) | Russian visible string |
|---|---|
| Display | Отображение |
| Time | Время |
| Spectrum | Спектр |
| Spectrogram | Спектрограмма |
| Persistence | Спектр персистентности |
| View | График |
| Options | Параметры |
| Time Limits / Frequency Limits / Power Limits / Density Limits / Y-axis Limits | Диапазоны |
| Link Time | Связь областей |
| Spectrum links | Связь спектров |
| Scale | Шкала |
| Resolution Type | Тип разрешения |
| Leakage | Утечка |
| RBW | Полоса разрешения |
| Window Options | Параметры окна |
| Frequency Resolution | Частотное разрешение |
| Time Resolution | Разрешение по времени |
| Power Bins | Интервалы мощности |
| Screen name | Имя экрана |
| Area name | Имя области |
| Show legend | Показывать легенду |
| Show axis labels | Подписывать оси |
| Normalize Y | Нормировать Y |
| Show markers | Показывать маркеры |
| Time units | Единицы времени |
| Frequency units | Единицы частоты |
| X limits | Пределы X |
| Y limits | Пределы Y |
| Link time | Связать время |
| Link amplitude | Связать амплитуду |
| Frequency limits | Пределы частоты |
| Power limits | Пределы мощности |
| Density limits | Пределы плотности |
| Frequency scale | Шкала частоты |
| Spectrum in dB | Спектр в дБ |
| Resolution type | Тип разрешения |
| Leakage (field) | Утечка |
| RBW (field/readout) | Полоса разрешения |
| Actual RBW / Фактическая RBW | Фактическая полоса разрешения |
| Window length | Длина окна |
| Window | Окно |
| Sidelobe attenuation | Подавление боковых лепестков |
| Overlap | Перекрытие |
| DFT Points / Точки DFT | Точки ДПФ |
| Link spectrum frequencies | Связать частоты |
| Link spectrum magnitudes | Связать магнитуды |
| Reassign | Переназначение |
| Auto / auto | Авто |
| Leakage (option) | По утечке |
| RBW / По RBW (option) | По полосе разрешения |
| Window Length (option) | По длине окна |
| Blackman-Harris | Блэкмана — Харриса |
| Chebyshev | Чебышёва |
| Flat-top | Плосковершинное |
| Hamming | Хэмминга |
| Hann | Ханна |
| Kaiser | Кайзера |
| Rectangular | Прямоугольное |
| Linear | Линейная |
| Log | Логарифмическая |
| dB / db | дБ |
| ps / picoseconds | пс |
| ns / nanoseconds | нс |
| μs / µs / us / microseconds | мкс |
| ms / milliseconds | мс |
| s / sec / seconds | с |
| minutes | мин |
| hours | ч |
| days | дн |
| years | г |
| cycles/year / cycles_per_year | циклов/год |
| cycles/day / cycles_per_day | циклов/день |
| cycles/hour / cycles_per_hour | циклов/час |
| cycles/minute / cycles_per_minute | циклов/мин |
| mHz | мГц |
| Hz / hertz | Гц |
| kHz / kilohertz | кГц |
| MHz / megahertz | МГц |
| GHz / gigahertz | ГГц |
| THz / terahertz | ТГц |
| percent | % |
| samples / sample | отсчёты / отсчёт |
| rad/sample / radians/sample | рад/отсчёт |
| x pi radians/sample / normalized_pi | × π рад/отсчёт |
| Amplitude | Амплитуда |
| Frequency | Частота |
| Magnitude | Магнитуда |
| Power | Мощность |
| Probability | Вероятность |
| Occurrence | Встречаемость |

## Sources

- `architecture/application-spec.yaml`.
- `/Users/makar/work/matlab_clicker/research_output/signal-analyzer-reference-scenarios/scenarios/SA-UI-012-preprocess-function-parameter-inventory.md` — MATLAB Signal Analyzer preprocessing parameter inventory and conditional dependencies.
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
- User TASK-0153 regressions from chat on 2026-08-25 for autoscale event
  isolation, Screen-tab continuity, complete Area sliders and blue footer actions.
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

HND-0752 re-read the exact current dropdown/menu/tooltip/button families on
2026-08-28. Exact metadata and variants were available; the context-render
endpoint required an active Figma selection, so no inaccessible component was
silently substituted. The user-specified tooltip delay of 1500 ms overrides the
library's generic delay while retaining its surface, placement and eligibility
semantics.

| Category | Exact Figma URL / node ID | Status | Applied decision |
|---|---|---|---|
| Inputs / dropdowns | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=316-38487&p=f / `316:38487` | available via exact metadata | One full-width 32px outer track for operation inputs/dropdowns; default/hover/focused/typed/disabled/error remain distinct. |
| Action List | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=316-24742&p=f / `316:24742` | available via exact metadata | 28px action rows and 34px selectable rows keep default/hover/disabled/danger/selected distinctions. |
| Tooltip | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=317-3328&p=f / `317:3328` | available via exact metadata | White compact body, 4px radius, 8×12 padding, no tail, 4px gap, bottom-first/top fallback; user override makes delay 1500ms. |
| Buttons | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=316-9479&p=f / `316:9479` | available via exact metadata | Existing 32px Primary/Secondary/Danger/Invisible states are retained; a dropdown arrow is decorative inside one semantic trigger. |

Local application-style cross-checks used `toolbar-tooltip.png`,
`toolbar-export-menu.png`, `object-export-operation-menu.png` and
`plot-settings-menu.png` from the Designer visual-system reference screenshots.
They confirm the white compact tooltip and menu surface/rhythm without
introducing a new application composition.

The exact required Signal ColorPicker node was re-read successfully on 2026-08-24:

| Category | Exact Figma URL / node ID | Status | Extracted decision | User override |
|---|---|---|---|---|
| Signal ColorPicker | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=1779-11344&p=f&m=dev / `1779:11344` | available | 284px surface, radius 8px, `0 2px 8px #2121211A`, Roboto 14, 16px padding, exact 32px target with a 24px swatch at 4px on every side, separate centered persistent tick layer, two equal 32px footer buttons | Palette contents are the restored original eight application colors. Scheme dropdown plus line/marker/fill/interpolation are omitted. |
| Settings Tab | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=301-7286&p=f / `301:7286` | available | Second-level Primary: 32px row, 8px horizontal/4px vertical padding, accent-soft selected fill, 3px accent bottom indicator, Roboto Regular 14 | Current dense settings-tab geometry is retained; only activation lifecycle is corrected. |
| Area Slider | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=321-7209&p=f / `321:7209`; https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=321-7221&p=f / `321:7221` | available | 4px full-width track and stable Default/Hover-area states; control presence does not change geometry | Existing dual-thumb Screen slider is reused exactly in Area; no new slider visual. |
| Footer Primary Button | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=316-9885&p=f / `316:9885` | available | Primary MD: 32px height, 12px horizontal/6px vertical padding, 6px radius, `#1b84b8` fill, `#166a93` 1px border, white Roboto Regular 14 | Applied to `Значения` and `Рассчитать`; existing footer layout remains. |
| Trim Secondary Button | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=316-9577&p=f / `316:9577` | available (inherited accepted context) | Secondary MD text-only colors, Roboto Regular 14 and 12px horizontal padding | User override in V61: `Обрезать` is a 28px joined start cell, not a standalone 32px button; outer-left radius only, shared selector divider, no icon or tooltip. |
| Trim Source Dropdown | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=316-39595&p=f / `316:39595` | available | Compact 32px dropdown, 6px radius, line border, 8px left/4px arrow-side inset and 16px chevron | Applied to eligible active-Time-pane source selection. |
| Trim Name Input | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=316-39661&p=f / `316:39661` | available | SM text input: 32px height, 8px horizontal padding, 6px radius and canonical focus/error projection | Applied to the suggested Unicode-safe target name. |
| Conditional Overwrite Checkbox | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=321-7018&p=f / `321:7018` | available | Default unchecked 16×16 checkbox, 2px radius, white fill, gray border | Row is mounted only when the target name conflicts. |
| Trim / Operation Error Modal | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=1867-17268&p=f / `1867:17268` | available | 480px canonical modal, 12px radius, 48px titlebar, 56px footer, Roboto 20/500 title, 16px body edges and standard shadow | Applied to trim and stacked operation error alertdialog; operation form remains below error. |
| Operation MD Modal | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=316-44470&p=f / `316:44470` | available | 480px surface, 12px radius, 48px titlebar, 16px body padding, 56px footer, Roboto 20/500 title and standard shadow | Applied to the preprocessing operation singleton; body alone scrolls. |
| Operation Dropdown | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=316-39595&p=f / `316:39595` | available in exact Inputs metadata | 32px height, 6px radius, one outer border and 16px chevron | Applied to Operation and all enumerated conditional fields. |
| Operation Input | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=316-39578&p=f / `316:39578` | available in exact Inputs metadata | 32px height, 6px radius and 1px outer border | Applied to source, numeric/text preprocessing parameters and target name. |
| Operation Error Input | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=3631-13452&p=f / `3631:13452` | available in exact Inputs metadata | Stable 32px outer geometry with 2px red field border and local message below | Applied independently to each visible invalid parameter; no pair/group error border. |
| Operation Footer Secondary / Primary MD | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=316-9577&p=f / `316:9577`; https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=316-9885&p=f / `316:9885` | available | 32px height, 12px horizontal/6px vertical padding and 6px radius | Applied to `Отмена / Создать сигнал`; loading disables both without changing geometry. |
| Operation Error Alert | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=316-6243&p=f / `316:6243` | available | Soft red surface, red border, 6px radius, 8px padding, 14px text, maximum 568px content width | Applied inside the stacked alertdialog body; raw provider copy remains forbidden. |
| Disabled Checkbox | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=321-6988&p=f / `321:6988` | available | 16×16, 2px radius and canonical disabled checked projection | Applied to busy/capability-disabled operation states; ordinary idle overwrite remains enabled. |

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
| Settings limits fields/dual-thumb control | type/select unit/drag/double-click/Apply | Visible numbers mirror the active Plotly viewport in selected units; nothing persists; double-click performs true Auto/full-domain; neither edit nor Apply changes pane-slider visibility | default, hover, focus, drag, viewport-preview, invalid | stable Settings nodes and geometry; no pane-slider mount and no API/output lifecycle |
| Pane slider pane-menu item or Area checkbox | change | The matching explicit control alone changes pane horizontal/vertical slider visibility; both projections synchronize immediately | unchecked, checked, focus | pane-local, both pane sliders may coexist; values/autoscale never infer visibility |
| `Курсор` / `Два курсора` menu row | click/keyboard | Selects one mutually exclusive pane-local mode; clicking the active row turns it off | default, hover, focus-visible, checked, disabled | menu closes; no API, autosave or cross-pane state |
| Graph cursor line | pointer drag / Arrow / Home / End | Snaps to nearest visible X sample/bin and updates Measurements cursor columns; no graph readout is created | default, hover, focus-visible, dragging, clamped | constrained to current Plotly plot rectangle; consumes only its own gesture |
| Graph relayout/refresh with cursors | zoom/pan/linked-axis relayout | Existing cursor is retained or clamped to nearest sample inside the new visible X range | ready, clamped, unavailable | no cursor position/mode propagation to linked panes |
| Measurements cursor columns | three-dot eye menu / cursor update | One `Видимость измерений` flat list shows existing measurements first and cursor rows second; off hides/disables all cursor rows, single enables X1/Y1, dual enables all six | hidden, disabled, visible, live | 244px body portal retains its existing vertical overflow/focus owner; table remains horizontal scroll owner |
| `Подписывать оси` | change | Clear/restore semantic X/Y and applicable colorbar title text only | checked, unchecked, applying-disabled | per-pane persisted; no output/DSP invalidation |
| Plot graph surface | pointer hover | Native Plotly unified/closest tooltip and custom coordinate readout remain absent for every plot type | ready, zoom, pan, cursor | cursor lines/badges and Measurements columns remain available |
| Dual-cursor Time trim action | click/keyboard | Open standard 480px trim modal with eligible-source dropdown, read-only interval and suggested target name | hidden-ineligible, default, hover, pressed, focus-visible, busy-disabled, modal-open | 28px joined start cell of plot-type/overflow cluster; equal 2px header insets; no reserved width otherwise |
| Cursor trim submit | click | Selected source maps to source_signal_id; busy keeps nodes/values; sanitized errors stay open; success closes after returned signal appears | invalid, conflict, busy, typed-error, success | body portal singleton; idle close restores header trigger |
| Operation provider failure | submit failure | End busy and open sanitized standard alertdialog above preserved operation form | busy, alert-open, focus-trapped, restored | no raw runtime error; restore invalid field or submit |
| Display/pane name | input | Draft appears in tab/header/context in the same frame; autosave persists it; stable id unchanged | pristine, dirty, invalid, applying, applied | ellipsis in tabs/header |
| Signal row | plain LMB outside controls/actions | Makes row `main_signal`; ensures checkbox ON; never toggles it OFF | white, grey-hover, main-blue, checkbox-checked/unchecked, busy | fixed 32px row; no geometry shift |
| Signal checkbox | direct click/change | Adds/removes only that graph trace; never changes `main_signal`; pending keeps the same visible node and checked state, disabled in place | unchecked, checked, disabled, busy; row blue remains independent | fixed 16px control; no row geometry shift |
| Signal settings group | click title/keyboard | `Основное` or `Сводка` body independently hides/shows using standard disclosure arrow | expanded, hover, pressed, focus-visible, collapsed | settings body remains y-scroll owner |
| Plot pane | plain LMB outside controls/modebar | Active pane updates and right panel selects `Область` | inactive, hover, active, loading | Plotly host identity unchanged |
| Pane type dropdown | select option | Exact pane loader appears before authoritative mutation; right panel selects `Область`; loader ends only for matching ready/empty/error output | closed, open, selected, loading, empty, error | Same pane/Plotly host identity; stale output cannot dismiss current loader |
| Valid Area setting | autosave commit that schedules output refresh | Exact active-pane loader appears before commit/output request and remains through current ready/empty/error | dirty, applying, loading, ready, empty, error | Invalid draft and settings without output refresh do not start a loader |
| Screen layout mutation | add/remove pane or apply rows/columns | One active display-canvas loader covers all pane slots until accepted layout and every initial output terminal | layout-loading, ready, empty, error | Pane loaders are suppressed; workspace header/tabs, Settings and Inspector remain usable/uncovered |
| Scoped loader spinner | pane/display loading state | Existing 64px spinner rotates continuously with defined `loader-rotate` keyframes | normal, reduced-motion | 800ms normal; 1600ms reduced-motion; static state forbidden |
| Plot autoscale | double-click ready graph surface | Restore authoritative current-output X/Y baseline for clicked Time/Spectrum/Spectrogram/Persistence pane | zoomed, reset, linear, log | No other pane/settings/main/backend change; pane sliders initially off stay unmounted; heatmap color range retained |
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
| Spectrum/time extrema action | click | Valid changed settings save first; calculate only in the active current visible X interval; provider continues in immutable display/pane context while Settings navigation remains immediate | initial `Рассчитать`, pending disabled `Рассчитывается…`, error enabled `Рассчитать ещё раз`, ready/empty enabled `Пересчитать` with full title, stale | Header action immediately before collapse controls; Settings footer stays contextual; no action below inspector table; graph/table/error/settings validation/focus remain visible; Y zoom ignored |
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
| 7 | `[data-testid=signal-operation-select]` | Click/Arrow keys | One semantic operation trigger opens the existing exact-width ten-option popup; selection closes and focus returns to the trigger | v63 focused contract |
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
| 36 | Signal operation action or external `Analyser → Предобработка` | After plain-LMB signal selection, invoke either entry; host dispatches `signal-analyser:host-command` with `detail.command=preprocess` | No in-app host-menu button is added; the existing 740px operation modal opens directly at `Полосовой фильтр` for the current accepted stable-id main signal; no section selector exists | v59 bounded state/schema/host-command evidence |
| 37 | operation selector + conditional fields | Select all ten supported operations and every detrend/fill/smooth/envelope/resample branch | Only branch-valid 40px fields appear; `Авто` is limited to smooth window duration and Savitzky–Golay degree; FIR/RMS/Peak and resample target fields are required; hidden fields are not validated or sent | v59 bounded state/schema evidence |
| 38 | Settings, operation, axes/colorbars | Inspect all enumerated visible copy | Product copy and units are Russian; every visible Auto/auto is `Авто`; wire values and user data are unchanged | v59 localization presenter evidence |

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
V58 bounded state/schema/localization regression is
`evidence/interaction-regression-v58-preprocess-localization.json`, `15 passed /
0 failed`. It covers preserved math parameters, preprocessing entry and field
branches, denoise dependency normalization, uniform resample mode, empty `Авто`
semantics, Russian settings/readout units, unchanged user signal names and exact
external host-command discrimination.
V59 supersedes that operation inventory. Its bounded schema/state regression is
`evidence/interaction-regression-v59-engee-preprocess-only.json`, `26 passed /
0 failed`. It covers the exact ten-operation inventory, former-operation
absence, current-LMB read-only source, every conditional field family,
required-versus-`Авто` rules, strict smoothing-factor bounds, visible-only
payloads, immutable source/derived target semantics and the unchanged trim
source dropdown contract.

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
| `integration/js/task-0140-plot-autoscale.js` | existing plot identity/cleanup/double-click branches in `public/js/app.js` | integrate helper unchanged | True Plotly autorange for both spatial axes; clear frontend mirrors; only enabled frontend link propagation; preserve heatmap color range |
| `integration/js/task-0139-loading-overlays.js` | settings/layout/output lifecycles in `public/js/app.js` | integrate controller unchanged | Begin before mutation, settle current token only at ready/empty/error; sync after workspace render |
| `integration/js/task-0144-synchronized-ranges.js` + `task-0146-range-lifecycle.js` | Plotly relayout and existing Area/Screen range renderers | integrate helpers unchanged | Frontend viewport only; stable nodes/generation; no settings/API/output/DSP/revision/session publication |
| `integration/css/task-0148-measurement-cursor-columns.css` + `integration/js/task-0148-measurement-cursor-columns.js` | existing Measurements table and three-dot eye menu | append/integrate unchanged | One flat menu with existing measurements then six cursor rows; no cursor subgroup title; hidden pane-local intents and eligibility unchanged |
| `integration/js/task-0150-0151-axis-labels-hover.js` | Graph settings inventory and every Plotly payload/overlay-trace path | integrate unchanged | Per-pane title checkbox, title-text-only updates, hovermode false and trace hover disabled |
| `integration/css/task-0154-trim-and-operation-error.css` | `public/css/app.css` | append once after existing dialog/pane-header rules | 28px joined trim start cell, V66 tracks, 480px modal controls and stacked alertdialog |
| `integration/css/task-0167-pane-header-nested-dropdown.css` | `public/css/app.css` | append once after canonical dropdown rules | center 28px trim and neutralize only the pane-select inner readonly combobox chrome |
| `integration/css/task-0168-extrema-table-actions.css` + `integration/js/task-0168-extrema-table-actions.js` | existing Extrema inspector renderer/events in `public/js/app.js`; `public/css/app.css` | append CSS after current extrema/table rules; integrate helper unchanged | ready/stale-ready final table-header trash/reload cell; centered Calculate/Configure for all no-table states; pending same disabled Calculate with loader; no API change |
| `icons/trash-16.svg`, `icons/refresh-16.svg` | `public/icons/` | copy as-is | exact Component Library 16px monochrome table actions; no remote runtime asset |
| `integration/html/dialogs/signal-trim.fragment.html` + `integration/js/task-0152-cursor-trim-signal.js` | existing `.plot-control-cluster`, cursor subscription, body modal portal, signal mutation queue | integrate unchanged singleton/helper | Insert joined trim start cell before plot-type middle cell; preserve eligible source dropdown/main default, Unicode name intent, read-only interval, conditional overwrite and exact selected source_signal_id |
| `integration/html/dialogs/signal-operation.fragment.html` + `integration/js/task-0154-operation-error-dialog.js` | `public/js/app.js` runtime template/provider failure → `document.body` | integrate unchanged singleton/helper | Preserved operation dialog plus sanitized stacked alertdialog; never edit `public/index.html` |
| `js/ui/components/value-select.js` | `public/js/value-select.js` | copy verified component as-is | Preserve registry/search/keyboard/focus/popup behavior; add optional icon data, decorative closed-trigger icon and decorative option icon; non-icon selectors are unchanged |
| `icons/operation-bandpass.svg`, `operation-bandstop.svg`, `operation-highpass.svg`, `operation-lowpass.svg`, `operation-detrend.svg`, `operation-fill-missing.svg`, `operation-smooth.svg`, `operation-envelope.svg`, `operation-resample.svg`, `operation-custom.svg` | `public/icons/` | copy as-is | Ten local 16px monochrome semantic operation icons; no remote runtime asset, text label, color-only distinction or bitmap |
| `integration/css/task-0157-preprocess-operation.css` | `public/css/app.css` after dialog rules | append once | Exact 740px LG modal and 40px control; one selector border with inline 16px icon, no detached cell/divider; other rows/footer unchanged |
| `integration/js/task-0157-preprocess-operation.js` | `window` host-command listener plus existing operation state/render/change/submit branches in `public/js/app.js` | integrate helper unchanged | Accept only `signal-analyser:host-command` + `detail.command=preprocess`; resolve current accepted stable-id main signal locally; add no in-app host-menu button; expose exactly the ten confirmed preprocessing operations with exact V61 semantic icon mapping and submit only their visible typed fields |
| `integration/js/task-0158-russian-localization.js` | visible label/option/readout projection boundaries in `public/js/settings.js` and `public/js/app.js` | integrate named presenter unchanged | Translate product-owned visible copy only; ids/wire values/user names/code remain unchanged; every visible Auto/auto becomes Авто |
| `integration/js/task-0162-extrema-retry.js` | existing extrema Settings/footer, inspector header renderer and calculation lifecycle in `public/js/app.js` | integrate helper unchanged | Provider owns background POST/poll by display/pane context; Settings tabs never await/cancel it; ready/empty label `Пересчитать`, full title preserved; pending only disabled; current Plotly X viewport read on every activation |
| `integration/html/inspector-extrema-header-action.fragment.html` + `integration/css/task-0163-extrema-background-header-selector.css` | existing `.inspector-header`; `public/css/app.css` | replace the legacy tab-row action cluster with the now-empty fragment; retain unrelated selector CSS | Preserve 32px header, tab order and collapse controls; no Extrema action may remain in the tab row |
| Mock shell/zones/renderers/providers/prototype | none | design-only | Never transfer |

Production selectors are fixed: `[data-testid=settings-tabs]`,
`[data-settings-content]`, `[data-testid=settings-footer]`, `.inspector-tabs`,
`[data-inspector-content]`, `[data-signal-rows]`, `.signal-row-actions`,
`[data-testid=display-overflow-menu]`, `[data-plot-range-slider]`,
`[data-plot-amplitude-slider]`, `[data-plot-cursor-mode]`,
`[data-pane-host]`, `.plot-canvas`, `[data-testid=pane-trim-signal]`,
`[data-testid=signal-trim-layer]`, `[data-signal-trim-source]`,
`[data-testid=signal-operation-error-layer]` and `document.body`.
Features extend those hosts; they do not replace their parents or bootstrap.

### Integration seams

| Seam | UI contract | Mock | Frontend production owner |
|---|---|---|---|
| `workspace-state-provider` | Stable displays/panes/names and active context | `mock/mock-provider.js` | `public/js/api.js` → existing `public/js/app.js` |
| `settings-autosave-provider` | Serialized autosave for Signal, Area and Screen; Extrema calculation remains explicit | same | existing `public/js/settings.js` + `public/js/app.js` |
| `pane-slider-visibility` | One active-pane visibility draft changes only from explicit pane-menu tools/Area checkboxes; Settings range edit/Apply and graph autoscale preserve it and cannot mount sliders | v61 bounded regression | existing `public/js/app.js` + inventory in `public/js/settings.js` |
| `pane-graph-cursors` | Existing menu gains single/dual check rows; pane-local controller snaps/clamps lines and numeric badges, preserves finite `X = 0`, and never mounts a coordinate readout | v37 + v57 bounded regressions | existing `public/js/app.js` menu sync/click + Plotly react/relayout/clear lifecycle |
| `measurement-cursor-columns` | Existing `Видимость измерений` eye menu stays one flat list and gains six mode-gated frontend-only columns with signed deltas after existing items | v52 + v56 bounded regressions | existing `public/js/app.js` cursor subscription + Measurements renderer/menu |
| `pane-axis-labels-and-hover-policy` | Persist per-pane title visibility; change title text only; never render native Plotly hover labels | v52 bounded regression | existing `public/js/settings.js` inventory + `public/js/app.js` Plotly queue |
| `cursor-trim-signal` | 28px joined dual-cursor Time start cell opens the unchanged eligible-source modal and creates a rebased inclusive segment from selected source_signal_id | v57 behavior + v61 geometry regression | `public/js/api.js` trim provider + existing `public/js/app.js` signal mutation/modal lifecycle |
| `linked-axis-draft` | Immediate scope relocation, values retained | UI mock | existing `public/js/app.js` + `public/js/settings.js` |
| `projected-spectrum-extrema` | Ready/loading/error rows and marker coordinates already projected into selected units; UI does no DSP | mock | `public/js/api.js` → existing `public/js/app.js` Plotly queue |
| `repeatable-viewport-extrema` | Initial calculate, retry after error and recalculate after ready/empty use the active contextual action; only pending disables; each click reads current visible X and a no-sample signal contributes zero rows without failing others | v62 8/8 + v63 6/6 focused regressions | `public/js/api.js` context-owned extrema provider + existing `public/js/app.js` footer/header/table/error lifecycle |
| `signal-summary-provider` | Backend-authored summary view model | mock | `public/js/api.js` → existing `public/js/app.js` |
| `signal-samples-pagination` | 500-row bidirectional batches plus exact centered point jump, 1000-row DOM window, footer/compensation; never full vector | v39/v40 controller regressions | `public/js/api.js` → existing `public/js/app.js` inspector renderer |
| `sample-time-extrema-markers` | Exact active display/pane, successful TIME rows filtered by `signal_name` and `sample_index`; `row.signal_color`; lowest finite graph number; never Spectrum bins | v40 helper regression | existing extrema state → existing sample renderer |
| `signal-sample-calculated-columns` | Three fixed base columns plus three provider-authored optional columns, all hidden initially; existing 244px eye menu; no square_root UI | v43 UI helper + bridge | `public/js/api.js` row fields → existing `public/js/app.js` sample renderer/menu events |
| `scoped-output-loading` | Exact-pane loader for pane type/valid Area output refresh; single display-canvas loader for layout reconciliation with stale guards and layout priority | v43 controller + bridge | existing settings/layout/output branches in `public/js/app.js` |
| `pane-plot-autoscale` | Graph-surface double click means true full-domain X/Y autoscale only; Plotly-native log coordinates; slider visibility/menu/settings remain unchanged and hidden pane sliders stay unmounted | v44 + v55 + v61 helper bounded regressions | existing `Plotly.react`, updateLayout cleanup and isolated graph double-click branch in `public/js/app.js` |
| `signal-operation-provider` | UI sends the V59 preprocessing-only `{source_signal_id, operation_kind, operation, visible parameters, target_name, overwrite}` envelope; provider executes the confirmed EngeeDSP function family, applies the four documented guards and owns hidden envelope/binding/cleanup | v59 26/26 + Engee 141/141 and 51/51 evidence | `public/js/api.js` → existing `public/js/app.js` body portal |
| `analyser-preprocess-host-command` | External Engee host emits `window` event `signal-analyser:host-command` with `{command:"preprocess"}`; app ignores host source fields and resolves current accepted stable-id `main_signal`; no in-app host-menu trigger | v59 host-command regression | `public/js/app.js` window listener + existing operation singleton |
| `signal-preprocess-provider` | Current accepted LMB main signal + exact ten-operation Engee-supported schema; source preserved and one named derived signal returned | v59 26/26 + Engee 141/141 and 51/51 evidence | existing operation state/render/change/submit plus `public/js/api.js` |
| `russian-settings-presentation` | Product-owned labels/options/units/readouts become Russian at presentation time; wire values and user data remain unchanged | v58 localization regression | `public/js/settings.js` + `public/js/app.js` render/Plotly-title boundaries |
| `signal-operation-error-alert` | Runtime/provider failure ends busy and opens sanitized alertdialog above the preserved form; no raw runtime text | v57 bounded regression | existing `public/js/app.js` operation failure branch/body portal |
| `signal-membership-main` | Checkbox owns pane membership; one explicit main signal owns row emphasis and Signal settings context | deterministic mock state/API | existing `public/js/app.js` + existing layout/view providers |
| `settings-context-routing` | Pane selects Area; display selection/creation selects Screen synchronously, including while a prior settings apply continues in background | actual production UI audit + v55 bounded regression | existing `public/js/app.js` event delegation with late-completion guard |
| `pane-type-context-routing` | Accepted plot-type mutation selects Area and rerenders only Area content | v32 prototype | existing `public/js/app.js` pane ValueSelect/postLayout path |
| `signal-color-draft` | HEX/Jet draft preview; popover Apply updates Signal draft and triggers metadata autosave | v32 UI fragment | existing Signal editor autosave |
| `legacy-import-export-provider` | Preserve existing v26 actions/dialogs | none | `public/js/native-session-io.js` |

Only TASK-0152 declares its exact `/api/signals/crop` provider handoff. V59
keeps the existing operation provider endpoint and declares the exact confirmed
EngeeDSP function inventory and typed operation envelope; Frontend/Backend
integrate it through that existing seam. No integration fragment implements DSP
math, polling or authoritative revision state. `public/index.html`,
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
      min_width: 480
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
    - {id: pane-header, width: stretch, height: 32}
    - {id: pane-header-title-track, width: minmax(0, 1fr), height: 32}
    - {id: pane-header-trim-cell, width: max-content, height: 28}
    - {id: pane-header-type-selector, width: minmax(148px, 212px), height: 28}
    - {id: pane-header-overflow, width: 32, height: 28}
```

At `920×680`, minima meet exactly. Additional width is distributed
workspace:settings `3:1`; additional stack height is distributed main:inspector
`4:1`. At `840×620`, the canvas remains `920×680`, without hide/reorder/stack,
and the document owns both scroll axes. Inside every pane header the title is
the only yielding track and reaches `0px` before any 28px control track can
shrink or overlap. Verified screenshots cover 920×680, 1024×768, 1440×900 and
840×620; V66 adds the focused analytical geometry evidence for trim hidden,
trim visible and selector focus/open.

## Visual contract

### Typography, colors and menus

- Local Roboto Regular 400 and Medium 500 only; all headings use Medium 500.
- Tokens resolve only from the existing production `public/css/theme.css`;
  the design-package theme copy is mock-only.
- Default dense controls are 32px high and radius 6px. The V58 LG operation
  modal uses exact 40px input/dropdown fields; footer actions remain 32px.
  Panels use radius 8px and dialogs radius 12px.
- Settings/table tabs are 32px with one visible 3px selected indicator.
- Settings dropdown items are 34px and share one surface/border/shadow system.
- Checkboxes are 16×16px; plot/settings slider handles have persistent focus.
- Graph canvas is white; legends overlay inside the plot and hover labels are
  absent. Extrema markers use signal/accent color and do not alter plot layout.
- Cursor menu rows are the same 28px compact `menuitemcheckbox` rows as plot
  sliders. A 16px line icon occupies the existing icon column and the existing
  tick appears only for the active pane-local mode.
- Cursor 1 uses a 2px solid accent line, cursor 2 a 1px dashed accent line; both
  have 14px numbered drag handles and persistent focus halo. No coordinate
  readout, tooltip or popover is rendered over the graph; values remain available
  through optional Measurements columns.
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
| Plot | current | white canvas, local controls, overlay legend | two independent spectrum sliders, markers and pane-local cursor lines/badges | no cursor readout or replacement tooltip; plot margins unchanged |
| Tables | analytical-dense | 32px rows, sticky header, left point/name/color, fixed optional order | lazy samples table with three base and zero-to-four optional columns | dynamic min-width 612–1182px; existing inspector owns horizontal scroll |
| Dialog | analytical modal | 48px title, 56px actions, 12px radius | code editor and seven operations | width 660px; menu-open height 500px |
| Signal color popover | Figma `1779:11344` | 284px, radius 8px, 16px padding, 32px targets with exact 24px inner squares, uniform 4px halo, centered tick, equal footer buttons | Original eight swatches only | Palette content follows the explicit restored-color requirement |

### Overlay priority

| Combination | Bottom → top | Pointer owner | Focus owner | Restore after close |
|---|---|---|---|---|
| Plot + legend/sliders/cursors | Plotly graph → legend/sliders → cursor lines/badges | cursor handle only while hovered/focused/dragged; Plotly elsewhere | focused cursor or Plotly graph | pane menu trigger after mode choice |
| Application + operation dialog | app → backdrop → dialog | dialog | first form control | originating row operation button |
| Operation dialog + runtime error | app → operation dialog → error backdrop → alertdialog | alertdialog | `Понятно` then focus trap | first invalid field or operation submit |
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
  visible X; no coordinate readout DOM exists in either mode, while numeric
  badges and Measurements values remain. No API/DSP, state revision or cross-
  pane cursor link occurs.
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
- V59 bounded regression passes 26/26: exact ten-operation preprocessing-only
  inventory; former math/FFT/Denoise/KNN absence; current-LMB source; every
  supported conditional branch; exact required/`Авто` semantics; visible-only
  payloads; Russian units/readouts; unchanged user signal names; external
  host-command discrimination and unchanged trim source dropdown.
- V60 bounded regression passes 12/12: exact icon mapping for all ten operations,
  one local asset per mapping, selected icon in the closed trigger, decorative
  icon before every expanded option label, unchanged text accessible names,
  opt-in behavior for other ValueSelects and unchanged control/option geometry.
- V61 combined targeted regression passes 13/13 and confirms the trim action, selector and overflow are one
  28px joined cluster with invariant state geometry; with both pane sliders off,
  Settings numeric edit/Apply mounts no vertical pane slider and graph autoscale
  mounts no horizontal pane slider. Explicit matching toggles remain the sole
  visibility owner. It also confirms one-border Operation selector geometry and
  the ten distinct local 16px semantic icon mappings in trigger and option rows.
- V62 focused regression passes 8/8: retry/recalculate labels are state-correct,
  only pending disables the unchanged footer button, projection retains node
  identity and every activation reads the current viewport anew.
- V63 focused regression passes 6/6: Settings navigation is independent from a
  context-owned background request, the compact action precedes collapse
  controls with its short label/full title and no table duplicate, and the
  operation selector trigger contains exactly one interactive element while
  preserving popup, option-icon, keyboard and focus hooks.
- V64 focused regression passes 7/7: every current dropdown family is recorded,
  searchable and icon selectors contain one semantic trigger, dynamic renders
  are reconciled, and eligible compact controls receive a 1500ms hover/focus
  tooltip with accessible description, viewport flip/clamp and deterministic
  overlay cleanup. The optional headless click launch was unavailable because
  sandboxed Chrome exited with SIGABRT before loading the file prototype; no
  product or design runtime error was observed. Applied skills: `designer/designer-workflow`,
  `designer/visual-system` and `designer/data-entry-and-inspection`. Engee Apps
  research was skipped because no new application composition or composite
  workflow was introduced.
- V65 focused regression passes 8/8: both action clusters preserve hierarchy
  and geometry, clear enablement is pane-local, marker projection matches stable
  graph SignalIds across rerenders, and `is_maximum` remains boolean.
- The complete old-visible-string → Russian mapping is recorded in this file
  and executable in `task-0158-russian-localization.js`. Visible English
  `Auto/auto`, `Hz`, `dB` and `samples` are absent from the V58 design mock and
  prototype-owned copy; internal contract prose and wire tokens may stay English.
- Exact Component Library provenance is recorded for LG modal, dropdown, input,
  error input, Secondary/Primary MD, error alert and disabled checkbox. No
  required Figma category is blocked.

## Backend integration boundary

The preprocessing-only operation is an Engee backend integration seam. UI sends
the unchanged typed V59 envelope and only currently visible parameters; V61
icon metadata and selector geometry never enter the payload. Custom bodies
remain unchanged. Backend validates again, calls only the confirmed system
functions, applies the four documented adapter guards, owns the hidden
`engee.genie.recv` envelope, temporary `init_signal` binding and cleanup, and
returns busy/error/success. Frontend must not implement DSP, generate/render
wrapper mechanics or leak runtime details.

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
- `v55`: TASK-0153 isolates graph double-click to autoscale, makes `Экран`
  navigation independent of background autosave, restores one slider for every
  applicable Area range and promotes `Значения`/`Рассчитать` to Primary MD.
- `v56`: TASK-0153 removes the redundant `Видимость столбцов` cursor subgroup
  title and keeps one flat `Видимость измерений` menu ordered as existing
  measurement rows followed by X1/Y1/X2/Y2/ΔX/ΔY.
- `v57`: TASK-0154 replaces the trim icon with the canonical Secondary MD text
  action and 480px eligible-source modal, removes the graph cursor coordinate
  readout, and moves signal-operation runtime failures into a sanitized stacked
  alertdialog while preserving the underlying form and values.
- `v58`: adds MATLAB-researched conditional preprocessing to the preserved
  operation dialog, retains all six existing math/custom operations, adopts the
  exact 740px LG modal and 40px fields, and makes every product-owned visible
  settings/unit/option/readout/axis label Russian. All visible Auto/auto is
  `Авто`; wire values, signal names, custom code and numeric data are unchanged.
- `v59`: supersedes the V58 operation inventory with exactly ten PROD-confirmed
  Engee preprocessing operations, removes the section selector and all former
  math/FFT/Denoise/KNN rows, binds both entries to the current plain-LMB signal,
  and fixes the conditional/required field contract including the four provider
  adapter guards. Modal geometry, error alertdialog and trim dialog are unchanged;
  bounded regression passes 26/26.
- `v60`: adds only canonical operation-specific leading icons to the closed
  selected value and all ten expanded operation rows. Six exact local Component
  Library SVGs plus existing `function.svg` cover the inventory; icons are
  decorative and the 740px dialog, 40px control, popup width, 34px rows,
  operation schema/provider payload and all non-operation ValueSelects are unchanged.
  Bounded regression passes 12/12 and the inherited V59 regression stays 26/26.
- `v61`: embeds `Обрезать` as the 28px joined start cell of the existing pane
  header control cluster with invariant geometry across all states. It also
  separates pane-slider visibility intent from Settings range values and Plotly
  autoscale: only explicit matching tools/checkboxes may mount pane sliders;
  numeric edit/Apply and graph double-click never do. The Operation selector is
  one uninterrupted field with the same semantic 16px icon in the closed trigger
  and row; ten distinct monochrome local SVGs replace the generic mappings.
- `v62`: keeps the extrema footer action repeatable after error, successful and
  empty results, disables it only while pending and resolves the current visible
  X interval on every click. Existing extrema table/error, settings validation,
  focus and Primary MD geometry remain unchanged; focused regression passes 8/8.
- `v63`: makes extrema completion context-owned and independent of Settings
  navigation, relocates the inspector action into the right side of its tab row
  with `Пересчитать` plus the full hover title, and changes only the operation
  selector to one semantic button trigger without nested interactive elements.
  Focused regression passes 6/6; unrelated V62 surfaces remain unchanged.
- `v64`: audits every current select/combobox/action-menu family, publishes one
  canonical trigger/surface/state and migration contract, and adds the shared
  1500ms hover/focus tooltip controller for eligible compact or truncated
  controls. Exact Component Library Inputs, Action List, Tooltip and Button
  families were available; focused regression passes 7/7 and unrelated V63
  surfaces remain unchanged.
- `v65`: adds subordinate current-pane `Очистить` actions beside both existing
  extrema actions and restores stored numbered markers by stable SignalId on
  every plot reconstruction, independent of active tabs. Focused regression
  passes 8/8; all unrelated V64 surfaces remain unchanged.
- `v66`: corrects only pane-header geometry. Trim becomes an intrinsic separate
  grid cell left of an unchanged-width plot-type selector; trim, selector and
  overflow are exact 28px border boxes with inset focus, while only the pane
  title yields. Focused geometry regression passes 8/8.
- `v67`: centers the 28px trim item in the 32px pane header and neutralizes the
  nested readonly combobox chrome so only the outer pane-select owns border,
  radius and focus/open emphasis. V66 tracks, DOM/ARIA and dropdown behavior
  remain unchanged; focused regression passes 10/10.
- `v68`: removes Extrema actions from the Inspector tab row. Ready rows expose
  trash-left/refresh-right in the final table-header cell; every no-table state
  centers the same `Рассчитать`, pending disables it in place with a loader, and
  secondary `Настроить расчёт` remains below. V67 and all provider/API seams are
  unchanged; focused deterministic clickable regression passes 12/12.
- `v69`: standardizes all button-local Primary processing states on exact
  Figma `#75b5d4` with one white Light/16 loader, copies the analytical lower-
  zone hover to add-display/layout controls, and converts the operation dialog
  to Modal MD with 32px controls, label-owned units and live in-place typed
  validation. Focused contract regression passes 8/8.
- `v70`: removes the derived, non-editable frequency-unit row while preserving
  that value in filter state/payload and in frequency-bound labels. It resolves
  the surviving legacy 40px selector/padding rules so every operation
  single-line input/dropdown has one identical 32px outer track. Focused
  schema/payload/geometry regression passes 8/8.
