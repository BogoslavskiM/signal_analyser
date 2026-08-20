# Current application design

- Task: `TASK-0111 / TASK-0112 / TASK-0113 / TASK-0114 / TASK-0115 / TASK-0116 / TASK-0117 / TASK-0118 / TASK-0119 / TASK-0124`
- Design mode: `autonomous`
- Design status: `ready`
- Design version: `33`
- Canonical UI profile: `analytical-dense`
- Prototype entry: `prototype/index.html`
- Frontend source root: `frontend-source/`
- UI contract: `ui-contract.yaml`
- Transfer manifest: `transfer-manifest.yaml`

## Scope

V33 is the current integration-safe package for the accepted Signal Analyser
visual baseline v28. It preserves the
analytical workspace, right settings panel,
lower multi-tab inspector, automatic settings persistence and existing import/save toolbar seams.
It contains the four previously accepted user-valued surfaces:

1. Spectrum extrema, independent frequency/magnitude plot sliders, independent
   screen links and separate frequency/magnitude limits.
2. Persisted display/pane names with rename controls and monotonic default
   ordinals that do not shift when a display is deleted.
3. First settings tab `Сигнал`, backend-authored summary, `Значения` focus
   action and a dynamic, lazily loaded sample table named after `main_signal`.
4. One signal-operation dialog next to Duplicate, with six built-ins plus a
   user operation body executed by the Engee backend provider with
   `init_signal` available as its input binding.

The exact DSP math, Engee/EngeeDSP call selection, API endpoints, revision
transaction implementation, Plotly payloads, pagination implementation and
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
do not publish. The settings footer is visible only for `Экстремумы` and contains
one action `Рассчитать`, which saves a valid changed extrema configuration before
starting a missing/stale calculation or focusing its current values.

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
| 2 | Dynamic samples tab | Tab label is current `main_signal.name`; five populated semantic columns; cursor fixture visibly appends page 2 | `screenshots/v31--standalone-production-samples--1440x900.png` |
| 3 | Spectrum extrema | Markers overlay the spectrum, lower table uses Magnitude + projected Frequency | `screenshots/v31--standalone-production-spectrum-extrema--1440x900.png` |
| 4 | Spectrum Area settings | Frequency/magnitude slider checkboxes; independent local magnitude limits | `screenshots/v31--standalone-production-spectrum-area--1440x900.png` |
| 5 | Screen spectrum links | Four independent checkboxes; linked frequency limits appear as a separate group | `screenshots/v31--standalone-production-screen-links--1440x900.png` |
| 6 | Operation selector | Seven operations use the existing shared `SignalAnalyserValueSelect`, including inline search and modal-owned options popup | `screenshots/v31--standalone-production-operation-menu--1440x900.png` |
| 7 | User operation body | Editor shows only the body written by the user and a neutral Engee/`init_signal` hint | `screenshots/v31--standalone-production-operation-custom--1440x900.png` |
| 8 | Engee operation states | Backend execution error, busy and success remain inside the same dialog context | `screenshots/v31--standalone-production-operation-{error,progress}--1440x900.png` |
| 9 | Signal table emphasis | Exactly one `main_signal` row is blue; other checked rows stay white and ordinary hover is grey | `screenshots/v31--main-signal-only-and-hover--1440x900.png` |
| 10 | Row click | LMB on an already checked row keeps it checked and makes it the sole blue `main_signal` | `screenshots/v31--row-click-main-signal--1440x900.png` |
| 11 | Direct checkbox | Unchecking the current main removes its graph trace but leaves the same row blue/main | `screenshots/v31--checkbox-hides-current-main--1440x900.png` |
| 12 | Signal disclosures | `Основное` and `Сводка` use standard settings disclosures; collapsed summary and `Дискретизация, Гц` are visible | `screenshots/v31--signal-settings-collapsed--1440x900.png` |
| 13 | Screen context after create | Display selection/creation selects the `Экран` settings page and updates its heading context | `screenshots/v31--screen-focus-after-display-add--1440x900.png` |
| 14 | Automatic sample tab | `radarPulse` exists before `Значения` and opens a populated five-column first page | `screenshots/v32--automatic-main-signal-samples--1440x900.png` |
| 15 | Signal Jet color | Compact 284px anchored popover; HEX, exactly 15 Jet swatches, selected tick and draft-only footer | `screenshots/v32--jet-color-picker--1440x900.png` |
| 16 | Pane type context | Selecting another type while `Сигнал` is open selects `Область`; Signal content cannot remain under the Area page | `screenshots/v32--pane-type-change-focuses-area--1440x900.png` |
| 17 | Operation overwrite row | Standard visible 16px checkbox followed by the full label `Затирать сигнал с таким именем` | `screenshots/v32--operation-overwrite-checkbox--1440x900.png` |

## Autonomous decisions

- The user-facing labels are `Связать частоты спектров` and
  `Связать магнитуды спектров`; they are independent from time/amplitude links.
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
- `Значения` does not create a second dialog: it reveals/selects/focuses a
  dynamic lower tab, preserving the graph and settings context.
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
  a valid main signal exists. `Значения` performs only select + focus.
- The signal color popover follows Figma node `1779:11344` geometry but contains
  only `HEX`, a fixed 15-swatch Jet palette and `Отмена / Применить`. The Figma
  palette was Parula; Jet is an explicit user override. Palette scheme, line,
  marker, fill and interpolation controls are intentionally absent.
- `Дискретизация, Гц` is editable Signal metadata, not summary output. Comma
  decimals, non-finite values, zero and negatives are invalid; dot-decimal and
  exponent notation are accepted only when finite and strictly positive.

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
- Read-only current selectors/geometry in `public/index.html`,
  `public/css/app.css`, `public/js/app.js`, `public/js/settings.js`.
- Canonical local `designer/visual-system`, application composition, settings,
  output, dialog and page-sizing references.

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
| `architecture/design/TASK-0080-explicit-apply-flow/screenshots/v25--tabs-and-measurements--1440x900.png` | 44px toolbar, 32px three-paint-stack tabs, 3px selected indicator, workspace/settings/inspector density | Old three-tab inventory and task-specific values |
| `architecture/design/TASK-0080-explicit-apply-flow/screenshots/v25--values-ready--1024x768.png` | Full-width lower table, fixed settings footer, compact column rhythm | Time-only extrema semantics |
| `architecture/design/TASK-0106-native-engee-session-io/screenshots/v26--import-parent-default--1024x768.png` | 12px modal radius, 48px titlebar, 56px actions, backdrop | Import fields and destructive copy |
| `architecture/skills/designer/data-entry-and-inspection/reference/settings-controls.*` | 32px fields, 40px rows, collapsible group rhythm | Showcase-only fields |
| `architecture/skills/designer/data-entry-and-inspection/reference/inspector-ui.*` | 32px table rows, sticky headers, hover actions | Showcase data |
| `architecture/skills/designer/output-and-visualization/reference/graph-output-zone.*` | White graph canvas, output-local controls, overlay legend | Reference graph data |
| `architecture/skills/designer/dialog-and-file-flows/reference/dialog-system.*` | Blocking modal stack, fixed title/actions, body scroll | File-browser capabilities |
| `architecture/skills/designer/visual-system/reference/source-derived-ui-spec.md` | Analytical-dense token values and proportions | Form-workbench geometry |

### Engee Component Library access

The exact required Signal ColorPicker node was read successfully on 2026-08-19:

| Category | Exact Figma URL / node ID | Status | Extracted decision | User override |
|---|---|---|---|---|
| Signal ColorPicker | https://www.figma.com/design/bE3Xjcryw7JdpoLVekeLUX/Engee-Component-Library?node-id=1779-11344&p=f&m=dev / `1779:11344` | available | 284px surface, radius 8px, `0 2px 8px #2121211A`, Roboto 14, 16px padding, 32px targets with 24px swatches, persistent selected tick, two equal 32px footer buttons | Palette contents are exactly 15 Jet swatches, not the node's Parula palette. Scheme dropdown plus line/marker/fill/interpolation are omitted. |

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
| Main | Settings | main-stage/settings | Four settings pages + one Apply | Existing settings tabs/content/footer; mock `html/zones/settings/**` is design-only | body/y; sticky header/tabs/footer | false | all |
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
| Limits fields/slider | type/drag/double-click | One draft model; empty means auto; double-click clears both bounds | default, hover, focus, drag, dirty, invalid | no geometry change between scopes |
| Plot slider pane-menu item or Area checkbox | change | Both controls synchronize immediately and the slider preview changes without remount; autosave persists the same pane draft | unchecked, checked, focus | pane-local, both sliders may coexist |
| Display/pane name | input + Apply | Stored name appears in all labels; stable id unchanged | pristine, dirty, invalid, applying, applied | ellipsis in tabs/header |
| Signal row | plain LMB outside controls/actions | Makes row `main_signal`; ensures checkbox ON; never toggles it OFF | white, grey-hover, main-blue, checkbox-checked/unchecked, busy | fixed 32px row; no geometry shift |
| Signal checkbox | direct click/change | Adds/removes only that graph trace; never changes `main_signal`, including OFF on current main | unchecked, checked, disabled, busy; row blue remains independent | fixed 16px control; no row geometry shift |
| Signal settings group | click title/keyboard | `Основное` or `Сводка` body independently hides/shows using standard disclosure arrow | expanded, hover, pressed, focus-visible, collapsed | settings body remains y-scroll owner |
| Plot pane | plain LMB outside controls/modebar | Active pane updates and right panel selects `Область` | inactive, hover, active, loading | Plotly host identity unchanged |
| Pane type dropdown | select option | Authoritative pane type updates, then right panel selects `Область` even if `Сигнал` was open | closed, open, selected, loading, error | Same pane/Plotly host identity; no Signal markup may remain in Area content |
| Display tab / Add display | click/keyboard | Active/new display updates and right panel selects `Экран` | default, selected, creating, error | tab row remains horizontal-only |
| Automatic sample tab | main signal exists/changes | One tab named after `main_signal` exists and loads its first page without changing inspector focus | absent-without-main, loading, ready, error | table owns x/y scroll when selected |
| Signal `Значения` | click | Existing main-signal sample tab selects and receives focus; no new tab is created | default, hover, focus, loading, ready, error | table owns x/y scroll |
| Signal color trigger | click/keyboard | 284px anchored non-modal popover opens with HEX and exactly 15 Jet swatches | closed, open, hover, selected-draft, invalid, busy | fixed overlay; flips/clamps to viewport, no settings scroll ownership change |
| Color popover Apply/Cancel | click/Escape/outside | Apply writes Signal color draft; Cancel paths restore opening color | draft, busy, committed-to-page-draft, cancelled | focus returns to color trigger |
| Signal sample rate | type | Editable dot-decimal metadata autosaves after validation | pristine, focus, dirty, invalid, applying | inline error does not shift adjacent controls |
| Spectrum extrema `Рассчитать` | click | Valid changed settings save first; calculation begins if absent, then lower Extrema table receives focus | absent, loading, ready, error, stale | graph remains visible |
| Operation row icon | click | Blocking operation dialog opens with source signal | default, hover, focus, modal-open | icon occupies reserved row-action width |
| Operation selector (`SignalAnalyserValueSelect`) | click/type/keyboard | Closed readonly value becomes same-field search; external modal-owned options popup | closed, open/search, hover, active, selected, focus | popup width equals 32px anchor border-box; viewport clamp only |
| Operation submit | click | User body goes to Engee provider; busy blocks close, then inline success or recoverable Engee error | default, busy, error, success | title/actions fixed, body scrolls |
| Shared Apply | click | One busy state for the draft across Signal/Area/Screen/Extrema | disabled-pristine, ready, hover, busy, retry | fixed footer; no side commentary |

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
| 20 | `.color-swatch-button` | Open, choose Jet swatch, Apply | 284px picker, 15 Jet swatches, tick; page draft changes only after popover Apply | `v32--jet-color-picker--1440x900.png` |
| 21 | `[data-signal-operation-overwrite]` | Open operation dialog | 16px checkbox and full exact label are visible without clipping | `v32--operation-overwrite-checkbox--1440x900.png` |
| 22 | pane type ValueSelect | While `Сигнал` open, select another type | Settings page and content owner switch to `Область` | `v32--pane-type-change-focuses-area--1440x900.png` |
| 23 | spectrum pane type | Calculate, then show values | Spectrum settings+bottom Extrema tab, frequency rows and markers use frequency positions | `v32--spectrum-extrema-settings-values--1440x900.png` |
| 24 | spectrogram pane type | Switch the same pane to spectrogram | Unsupported settings and lower Extrema tabs are both hidden | `v32--spectrogram-hides-extrema-tabs--1440x900.png` |

Walkthrough result: complete inherited walkthrough
`evidence/interaction-walkthrough-v31-standalone.json`, `26 passed / 0 failed`,
`runtime_errors: []`. The gate explicitly verifies four nonempty zone slots,
`file:` protocol, zero HTTP(S) resource entries, zero CORS/console/page errors,
the actual production `app.css` base, shared selector geometry and every state
listed above. V32 delta result is
`evidence/interaction-walkthrough-v32-standalone.json`, `9 passed / 0 failed`,
with `runtime_errors: []`; baseline hashes are in
`evidence/production-baseline-v32.json`.

## Transfer contract

- Manifest: `transfer-manifest.yaml`
- Source root: `frontend-source/`
- Target root: `public/`
- Mode: additive integration only; `copy_as_is: []` by design.

| Design source | Existing production target/host | Mode | Constraint |
|---|---|---|---|
| `integration/css/task-0112-0115-additions.css` | `public/css/app.css` | append once | Exact rules; do not overwrite existing CSS |
| `integration/css/task-0116-refinements.css` | matching signal-row selectors in `public/css/app.css` | replace selector bodies | Exact final selectors; remove the previous `.is-selected` row/color state |
| `integration/js/task-0117-signal-row-intent.js` | signal row/checkbox branches in `public/js/app.js` | integrate exact intent split | Do not install the prototype bridge; preserve existing revision/provider flow |
| `integration/css/task-0118-color-picker.css` | `public/css/app.css` | append once | Exact 284px Jet popover geometry/states |
| `integration/js/task-0118-color-picker.js` | `public/js/app.js` boot/import | integrate UI-only popover unchanged | Use existing Signal draft/input event; no API call from popover |
| `integration/js/task-0119-context-and-samples-intent.js` | pane type/sample tab branches in `public/js/app.js` | integrate exact intent | Preserve provider/revision flow; do not install prototype bridge |
| `integration/html/dialogs/signal-operation.fragment.html` | `public/js/app.js` runtime template → `document.body` | integrate unchanged singleton | Never edit `public/index.html` |
| Mock shell/zones/renderers/providers/prototype | none | design-only | Never transfer |

Production selectors are fixed: `[data-testid=settings-tabs]`,
`[data-settings-content]`, `[data-testid=settings-footer]`, `.inspector-tabs`,
`[data-inspector-content]`, `[data-signal-rows]`, `.signal-row-actions`,
`[data-testid=display-overflow-menu]`, `[data-plot-range-slider]`,
`[data-plot-amplitude-slider]`, `[data-pane-host]` and `document.body`.
Features extend those hosts; they do not replace their parents or bootstrap.

### Integration seams

| Seam | UI contract | Mock | Frontend production owner |
|---|---|---|---|
| `workspace-state-provider` | Stable displays/panes/names and active context | `mock/mock-provider.js` | `public/js/api.js` → existing `public/js/app.js` |
| `settings-autosave-provider` | Serialized autosave for Signal, Area and Screen; Extrema calculation remains explicit | same | existing `public/js/settings.js` + `public/js/app.js` |
| `pane-slider-visibility` | One active-pane draft projected into pane menu and Area checkboxes; both synchronize immediately | UI mock | existing `public/js/app.js` + inventory in `public/js/settings.js` |
| `linked-axis-draft` | Immediate scope relocation, values retained | UI mock | existing `public/js/app.js` + `public/js/settings.js` |
| `projected-spectrum-extrema` | Ready/loading/error rows and marker coordinates already projected into selected units; UI does no DSP | mock | `public/js/api.js` → existing `public/js/app.js` Plotly queue |
| `signal-summary-provider` | Backend-authored summary view model | mock | `public/js/api.js` → existing `public/js/app.js` |
| `signal-samples-pagination` | Cursor/limit rows and total by stable signal id, never full vector | mock | `public/js/api.js` → existing `public/js/app.js` inspector renderer |
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
replacement is forbidden.

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
- Hover/pressed/selected/focus never changes component geometry.
- Signal color popover is 284px, 8px radius and `0 2px 8px #2121211A`;
  palette grid is six columns with 32px targets/24px swatches and exactly 15
  Jet values. No palette selector, line, marker, fill or interpolation appears.

### Proportion contract

| Component | Canonical reference | Preserved | Required change | Allowed deviation |
|---|---|---|---|---|
| Toolbar | analytical-dense | 44px, 36×32 actions, 32px logo | none | none |
| Settings | analytical-dense | 40px rows, 140-ish label/control split, 32px fields | four tabs and new groups | label column is 132px at 300px panel minimum |
| Tabs | v25/current | 32px row, 3px indicator | add Signal and dynamic sample tab | horizontal scroll, never vertical |
| Plot | current | white canvas, local controls, overlay legend | two independent spectrum sliders and markers | none |
| Tables | analytical-dense | 32px rows, sticky header, left name/color | add five-column lazy samples table | samples table local min-width 760px |
| Dialog | analytical modal | 48px title, 56px actions, 12px radius | code editor and seven operations | width 660px; menu-open height 500px |
| Signal color popover | Figma `1779:11344` | 284px, radius 8px, 16px padding, 32px targets, equal footer buttons | Jet swatches only | Parula content replaced by explicit Jet requirement |

### Overlay priority

| Combination | Bottom → top | Pointer owner | Focus owner | Restore after close |
|---|---|---|---|---|
| Application + operation dialog | app → backdrop → dialog | dialog | first form control | originating row operation button |
| Dialog + operation menu | app → backdrop → dialog → menu | menu | active option | operation selector |
| Settings + Signal color popover | app → settings → color popover | popover | HEX then swatches/actions | Signal color trigger |
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
| Tick | `public/icons/tick-figma.svg` | `frontend-source/icons/tick-figma.svg` | selected Jet swatch and existing checked states |

## States and validation

- Visible parameters alone participate in validation. Hidden inapplicable
  spectrum/time settings are absent from the page and ignored.
- Empty Min/Max is not replaced by a concrete number. Full range is represented
  by placeholders and the slider's full domain.
- Signal summary supports ready/loading/empty/error through its provider seam.
- Sample table supports loading-page, ready, end-of-data and recoverable error;
  the full vector is never placed in UI state or DOM.
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

## Acceptance

- Complete current package paths exist and are local.
- Prototype remains the accepted visual harness and is wholly design-only.
- Inherited 26/26 plus the v32 delta walkthrough pass; zero required viewports
  are pending.
- Transfer audit confirms `copy_as_is: []`, the existing two feature fragments
  plus one selector-replacement CSS fragment, immutable
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
  editable sampling draft, Jet color draft/apply and unclipped overwrite row are
  click-tested against the production-faithful file harness.
- Exact Figma ColorPicker node access and the explicit Jet deviation are both
  recorded; inherited unavailable-reference rows remain historical provenance.

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
