---
task_id: TASK-0040
handoff_id: HND-0094
title: Detailed current layout — Signal Analyzer
design_ref: architecture/design/TASK-0040-detailed-current-layout
design_mode: autonomous
design_status: ready
design_version: 1
required_viewports: [1440x900, 1280x720, 1024x768]
required_states: [default, hover, focus, active, disabled, loading, empty, error, warning, success]
prototype_entry: prototype/index.html
---

# Detailed current layout — Signal Analyzer

## Scope

Version 1 фиксирует измеримый визуальный контракт текущего экрана Signal
Analyzer без изменения информационной архитектуры. Экран сохраняет четыре
существующие крупные зоны и их порядок:

1. global toolbar с брендом, названием, версией и session actions;
2. Display workspace с Display tabs, одним текущим plot pane и его controls;
3. правая панель Display settings с tabs и type-dependent form;
4. нижняя многостраничная зона Signals / Measurements / Peaks с Signals table.

Также зафиксированы существующие overlays: Display menu, меню добавления
сигнала, column menu, Signal Info popover, импорт сессии, импорт из workspace,
подтверждение удаления и success message dialog.

### Out of scope

- multi-layout panes, layout selector и новая навигация;
- новые поля, actions, export formats или file-path browser;
- production DOM/API/state/polling, authoritative validation и расчётные
  semantics;
- backend, `public/**`, tests, runtime, Git, `Project.toml`, `Manifest.toml`;
- Figma-authored изменения, которые невозможно подтвердить доступным read
  context.

Prototype использует только mock data и visual state toggles. Сообщения об
ошибке, warning и success демонстрируют placement, но не бизнес-правила.

## Sources and priority

Решения применены в обязательном порядке приоритета.

1. **Task specification:**
   `architecture/tasks/TASK-0040-generate-detailed-current-layout-design.md` и
   `architecture/handoffs/HND-0094-designer-task-0040-detailed-current-layout.md`.
   Они требуют сохранить текущую IA, покрыть три viewport и все десять states.
2. **Canonical Designer templates:**
   `designer-workflow`, `visual-system`, `application-composition`,
   `data-entry-and-inspection`, `output-and-visualization`,
   `dialog-and-file-flows`, а также их task-matched references.
3. **Corporate Engee Apps Figma:**
   `https://www.figma.com/design/0kCdLEKmTC9S15mNJEJSE0/Engee-Apps?node-id=0-1`.
   Read-only check 2026-08-04 не дал доступного документа; источник отмечен как
   недоступный, но он ниже task и local templates, поэтому работа не
   блокировалась. Ни одно решение не заявлено как Figma-derived.
4. **Autonomous Designer judgment:** точные responsive splits, overlay
   collision rules и унификация message dialog width, перечисленные ниже.

### Read-only current-product evidence

- `public/index.html` — фактический порядок зон, controls, таблица и dialogs;
- `public/css/theme.css`, `public/css/app.css`, `public/css/settings.css` —
  текущие tokens, row heights, panel widths, table columns и overlay styles;
- `public/js/app.js`, `public/js/settings.js` — видимые row actions, Signal Info,
  column menu, custom enum и loading/empty/error text;
- `architecture/tasks/TASK-0014-engee-signal-analyser-ui-parity.md`,
  `TASK-0027-table-settings-visual-density.md` и
  `TASK-0036-apply-frontend-design-patterns.md` — подтверждение текущего scope.

Локальное приложение не было запущено: на документированном
`127.0.0.1:8000` listener отсутствовал. Designer не запускал и не изменял
runtime; source inspection использован как factual evidence. Ранее снятые
product screenshots в worktree отсутствовали.

## Applied skills

- `designer/designer-workflow` — package/version, prototype, evidence и
  autonomous self-review;
- `designer/visual-system` — tokens, controls, focus, disabled и semantic
  states;
- `designer/application-composition` — toolbar, zones, tabs, resize и
  responsive behavior;
- `designer/data-entry-and-inspection` — Settings form, Signals table, row
  actions, long values и validation placement;
- `designer/output-and-visualization` — plot sizing и loading/empty/error/
  warning output states;
- `designer/dialog-and-file-flows` — session/workspace/delete dialogs,
  stacking, focus/dismiss и recovery states.

`skipped_requested_skills: []` — все requested skills соответствуют scope и
применены. Внутри `dialog-and-file-flows` загружены `dialog-system` и
`session-import-export-ui`. Native `file-browser-dialog` и
`object-export-dialog` references не загружались: текущий UI не содержит
server path browser или selected-object export dialog; это не skip requested
skill и не расширяет продуктовый scope.

## Screen, zones and navigation

| Screen | Zone | Purpose | Navigation / ownership |
|---|---|---|---|
| Signal Analyzer | Application toolbar | Brand, app identity, session import/export, disabled Help | Global actions; icon tooltips; no page routing |
| Signal Analyzer | Display tabs | Select, close, reorder context and add Display | Horizontal tablist; active tab by ID; internal x-scroll |
| Signal Analyzer | Plot pane | Plot title, type selector, overflow action and output | One current pane; controls affect this pane only |
| Signal Analyzer | Display settings | Display / Time / Measurements settings | Local tablist; body owns vertical scroll |
| Signal Analyzer | Bottom page header | Signals / Measurements / Peaks and add signal action | Local tablist; no mixing with Display tabs |
| Signal Analyzer | Signals inspector | Visibility, identity, metadata, row actions and Info | Row selection independent of visibility checkbox |
| Overlay | Menus / popovers | Context actions, enum choices, table columns, signal metadata | Anchored to trigger, portaled above zone clipping |
| Overlay | Dialog system | Session import, workspace import, delete confirm, success | Modal focus scope above all application zones |

No required function is hidden at any required viewport. Settings and table
use local scrolling; tabs use horizontal scrolling; the document itself does
not scroll.

## Exact viewport geometry

All sizes are CSS pixels at device scale factor 1. Fractional grid values may
be distributed by the browser over adjacent rows by one physical pixel.

### Top-level rows and columns

| Metric | 1440×900 | 1280×720 | 1024×768 |
|---|---:|---:|---:|
| Application toolbar | 64 h | 64 h | 64 h |
| Main stage | 512 h | 386 h | 427.52 h |
| Bottom zone | 324 h (`36vh`, capped) | 270 h (minimum) | 276.48 h (`36vh`) |
| Main-stage outer padding | 6 all sides | 6 all sides | 4 all sides |
| Workspace / Settings gap | 8 | 8 | 6 |
| Workspace column | 1050 w | 920 w | 710 w |
| Settings column | 370 w | 340 w | 300 w |
| Document overflow | none | none | none |

Formulae:

- app rows: `64px minmax(300px, 1fr) clamp(270px, 36vh, 324px)`;
- wide columns: `minmax(0, 1fr) 370px`, becoming `340px` at width ≤1280
  and `300px` at width ≤1080;
- minimum supported canvas: `1024×720`; TASK-0040's explicit 1024 viewport
  overrides the current product's older `1180px` shell minimum without
  changing IA.

### Internal zone rows

| Zone / row | Geometry | Resize and overflow |
|---|---|---|
| Display tab row | 48 h; 42 h at width ≤1080 | x-scroll; thin 6 px scrollbar; add button remains at right |
| Display tab | min 112, max 210 w; 104–176 at 1024 | label ellipsis; close remains 19 px; long tab does not wrap |
| Single display inset | 8 on all sides | consumes remaining workspace body |
| Plot header | 48 h; 12 horizontal padding | title left; type controls and menu trigger right |
| Plot canvas | remaining width/height; min 0 | chart stretches in both axes; content clipped to pane |
| Settings heading | 44 h | fixed above settings body |
| Settings tab row | 42 h | x-scroll rather than wrap |
| Settings body | remaining height; padding 14×18, 14 at ≤1280, 12 at ≤1080 | vertical scroll with stable scrollbar gutter |
| Bottom header | 42 h | tablist x-scroll; add action fixed at right |
| Table header / data row | 34 h | sticky header; body owns x/y scroll |

At 1280×720 the shorter height reduces only scrollable content. Toolbar,
tab/header rows, action targets and validation geometry do not shrink.

## Visual system

### Tokens

| Token | Value | Use |
|---|---|---|
| `--app-bg` | `#f4f6f8` | shell and gaps |
| `--surface` | `#ffffff` | panels, controls, overlays |
| `--surface-muted` | `#f8fafc` | table header, disabled/secondary surfaces |
| `--text` | `#202938` | primary copy |
| `--muted` | `#697386` | labels, metadata, inactive icons |
| `--line` | `#dfe4ea` | control/panel/table borders |
| `--accent` | `#1676e6` | selected, focus and primary action |
| `--accent-soft` | `#eaf4ff` | selected row and hover surfaces |
| `--danger` / soft | `#b42318` / `#fff1f0` | errors and destructive action |
| `--warning` / soft | `#8b5e1a` / `#fff8e7` | warnings |
| `--success` / soft | `#137333` / `#edf8f0` | applied/success |
| radius | 5 controls, 8 overlays | current compact Engee geometry |
| control height | 32 | form inputs/selects and compact menu items |
| shadow | `0 8px 24px rgba(32,41,56,.18)` | popovers/tooltips |
| font | local system Arial/Helvetica fallback, 14/1.35 | no runtime font dependency |

Task-specific retained deviation from canonical templates: product blue
`#1676e6` remains the accent instead of the template's teal/blue value, and
toolbar remains 64 h. This preserves the current visual identity and shell
density.

### Controls

- toolbar icon button: 36×36, 18×18 icon, 5 radius, 6 px inter-button gap;
- add signal target: 40×40 within the fixed 42 h bottom header;
- plot select: 124×32; Settings inputs/selects: available column width ×32;
- checkbox: 16×16 inside a minimum 32 h label row;
- compact row action: 28×28 inside a 34 h row; actions are always reachable by
  keyboard and appear on row hover/focus without changing column width;
- focus-visible: 2 px accent outline, 1 px offset (inside tab/table where
  clipping requires negative offset);
- disabled: same geometry, muted surface/text, 0.58 opacity, `not-allowed`;
- icon-only actions require an accessible name and visible tooltip after
  pointer hover or keyboard focus; tooltip is not the only name.

## Settings form contract

| Element | Wide panels (370 / 340) | 1024 panel (300) | Messages |
|---|---|---|---|
| Scalar / enum row | `minmax(118px,42%) minmax(0,1fr)`, 8 gap | stacked label then 32 h control, 4 gap | below control; 12 px / 1.35 |
| Checkbox | 32 h flex row, 8 gap | unchanged | message follows field when needed |
| Two-value range | two equal columns, 8 gap, 10 inner padding | one column; 7–10 padding | spans both columns / single stack |
| Group | 10 gap, 12 vertical padding, top divider | 7–10 gap in short viewport | body grows inside its own scroll only |
| Readout metadata | label ellipsis or wrap, value right | wraps `anywhere` when necessary | never overlays adjacent control |

Errors use a 2 px danger border and red message. Warning uses a 2 px warning
border and amber message. Success retains geometry and adds success border plus
`Применено`. Pending/loading disables the affected controls and preserves their
last visible values. Dynamic messages may increase Settings body height, but
never resize the main stage or overlap another zone.

Custom enum dropdown:

- trigger equals control width; prototype dropdown is 220 w, max 180 h;
- preferred anchor is trigger bottom-end with 4 gap;
- selected option has soft accent background and check; active keyboard option
  has the same background plus a visible focus ring;
- Arrow Up/Down moves active option, Enter selects, Escape closes and restores
  trigger focus; typeahead/filter does not alter field geometry;
- viewport collision flips above and shifts horizontally to an 8 px edge
  margin; list scrolls instead of extending beyond viewport.

## Signals inspector and table contract

Table minimum width is 960 and remains inside `.signal-table-scroll`. At all
three required full-width bottom zones it fills the available width; below
960 it stops shrinking and the local horizontal scrollbar appears. Header is
sticky. The action column is sticky right so row actions remain available
while data columns scroll.

The fixed-layout column weights are `48 / 220 / 74 / 132 / 88 / 100 / 126 /
128` (sum 916). The table distributes the available width proportionally.
Exact browser-measured widths at device scale factor 1 are:

| Column | Weight | 1440×900 | 1280×720 | 1024×768 | Alignment / overflow |
|---|---:|---:|---:|---:|---|
| Visibility | 48 | 75.42 | 67.05 | 53.63 | centered 16 checkbox |
| Name | 220 | 345.72 | 307.30 | 245.81 | left; ellipsis; full value in tooltip |
| Color | 74 | 116.28 | 103.36 | 82.67 | left; 19×19 swatch |
| Sample rate | 132 | 207.44 | 184.38 | 147.48 | left; no wrap |
| Samples | 88 | 138.28 | 122.91 | 98.31 | left; no wrap |
| Duration | 100 | 157.14 | 139.67 | 111.73 | left; no wrap |
| Type | 126 | 198.00 | 176.00 | 140.78 | left; ellipsis; full value in tooltip |
| Actions / Info | 128 | 201.22 | 178.84 | 143.08 | sticky right; 28 targets with 3–4 gap |

Selection uses `--accent-soft`; pointer hover uses `#f7fbff`. Row focus draws a
2 px inset ring across cells. Visibility checkbox interaction does not select
the row. Duplicate/delete controls fade in on hover or focus-within, but their
reserved 128 px column never changes. At least one identity signal may make
delete disabled; the visual contract does not define that business rule.

Column menu:

- 224 w, max 360 h, 4 padding, 32 h items;
- anchor below the `…` trigger, end aligned, 4 gap;
- identity and action columns are not listed; optional columns show checkmarks;
- outside click, Escape or completed selection dismisses; Escape/outside click
  restores trigger focus; collision uses 8 px viewport margin and flips above.

Signal Info popover:

- 248 w, 10×12 padding, 12 px copy;
- preferred above/end of Info trigger with 6 gap; flips below when top space is
  insufficient and shifts horizontally to 8 px viewport margin;
- opens on hover or focus, stays open while pointer/focus is in card, click can
  pin it, Escape dismisses; it never changes row height;
- grid has flexible term and auto value columns with 6×12 gaps.

## Plot/output contract

- plot frame consumes all area below the fixed 48 h plot header;
- chart canvas uses width/height 100%, min 0 and clips chart internals;
- title remains left; plot type select and overflow trigger remain right;
- output loading is a translucent local overlay, keeping previous chart
  context visible and disabling related controls;
- empty uses a neutral centered message and no stale traces;
- error uses danger surface/copy with recovery guidance;
- warning is a non-blocking top banner inside the plot and retains interactive
  context;
- success is reported as applied field state and global toast, not as a plot
  replacement.

Plot overflow menu is 184 w, max 320 h, 4 padding, 32 h items. It anchors
bottom-end with 4 gap, flips above/edge-shifts at collision, closes on outside
click/Escape/action, and returns focus to the trigger.

## Overlay and stacking contract

| Layer | z-index | Geometry / behavior |
|---|---:|---|
| Anchored menus/popovers | 50000 | portaled/fixed; 8 px viewport collision margin |
| Tooltip | 90000 | max 260 w; 7×10 padding; pointer-transparent |
| Modal overlay | 95000 | fixed inset 0; dim `rgba(32,41,56,.32)` |
| Child/success dialog if parent retained | 95010 | parent remains dimmed; only top dialog interactive |
| Global toast/status | 98000 | right/bottom 16; max 460 w; never moves app geometry |

### Dialog geometry

| Dialog | Width | Height | Fixed rows |
|---|---:|---:|---|
| Session import | 520 max | content, max viewport−48 | title 56; body scroll; actions min 64 |
| Workspace import | 560 max | `min(680, viewport−48)` | title 56; body flex/scroll; actions min 64 |
| Delete / message / success | 480 max | content, max viewport−48 | title 56; body; actions min 64 |

Overlay padding is 24; when viewport height ≤760 it is 16 and max dialog
height becomes viewport−32. Body owns scroll; title and action rows remain
visible. Long titles/messages wrap `anywhere`. Workspace entries use checkbox
+ content columns; metadata is three columns on required viewports and remains
inside the 560 w dialog.

Dialog behavior:

- opening moves focus to title/first actionable field and stores trigger;
- Tab/Shift+Tab remain inside the top dialog; closing restores trigger focus;
- Escape, explicit close, Cancel and non-busy scrim click dismiss;
- while busy, submit/close/cancel are disabled, `aria-busy` is visible, Escape
  and scrim dismissal are ignored, and body context remains visible;
- validation errors appear adjacent to the field; unexpected errors remain in
  the same dialog with retry; success replaces the operation body with a
  message dialog or closes to a success toast according to the existing flow;
- destructive delete uses a danger primary button and explicit object name;
- session import primary remains disabled until a file is selected. The warning
  is informative and does not invent an additional confirmation step.

## Interaction and state matrix

| Element | Trigger | Visible result | States | Responsive rule |
|---|---|---|---|---|
| Toolbar icon | hover/focus/press | soft accent / focus ring / active fill + tooltip | default, hover, focus, active, disabled | 36 target unchanged |
| Display tab | click, focus, drag context | selected underline; close remains reserved | default, hover, focus, active, disabled | x-scroll, no wrap |
| Add Display | click | existing create intent only | default, hover, focus, active, disabled, loading | sticky end of tab row |
| Plot type select | focus/change | focus ring / chosen type | default, hover, focus, active, disabled, loading, error | 124×32; never wraps |
| Display overflow | click / Escape / outside | anchored menu / return focus | default, hover, focus, active, disabled | flip/shift at 8 margin |
| Settings tab | click / arrows | underline and page content | default, hover, focus, active, disabled, loading | row x-scroll |
| Settings input | input/focus | draft value, local status below | default, hover, focus, active, disabled, loading, error, warning, success | stacked at 1024 |
| Custom enum | click/type/arrows | 220×≤180 listbox | default, hover, focus, active, disabled, loading, empty, error | flip and internal scroll |
| Checkbox | click/focus | check/unchecked | default, hover, focus, active, disabled, loading | 16 control in 32 row |
| Bottom tabs | click/arrows | selected page | default, hover, focus, active, disabled, loading, empty, error | x-scroll |
| Add signal | click | 212 w menu | default, hover, focus, active, disabled, loading | anchor end, flip/shift |
| Table row | click/focus | selection; actions appear | default, hover, focus, active, disabled, loading, empty | row remains 34 |
| Row actions | row hover/focus | duplicate/delete in fixed column | hover, focus, active, disabled, loading, error, success | no data-column shift |
| Info | hover/focus/click | 248 w metadata popover | default, hover, focus, active | fixed overlay, no row resize |
| Column menu | click / Escape / outside | 224 w checks | default, hover, focus, active, disabled | fixed overlay and internal scroll |
| Plot output | state toggle | chart or local semantic overlay | default, loading, empty, error, warning, success | fills remaining plot area |
| Toast | async status | compact non-modal status | loading, error, warning, success | right/bottom 16, max 460 |
| Dialog | trigger / submit / dismiss | modal form/message | default, focus, disabled, loading, empty, error, warning, success | widths/max heights above |

### Requested state definitions

- `default`: ready chart, settings and four Signals rows;
- `hover`: toolbar tooltip, selected row hover, revealed row actions and Signal
  Info popover;
- `focus`: visible focus on custom View combobox and active listbox option;
- `active`: pressed Display overflow trigger and open Display menu;
- `disabled`: Help plus data-dependent/settings actions muted with unchanged
  layout;
- `loading`: existing chart retained behind local loading overlay, related
  controls disabled, global loading toast;
- `empty`: plot empty guidance, zero Signals count and table empty block;
- `error`: plot error overlay, field error border/message and error toast;
- `warning`: plot warning banner, field warning and warning toast;
- `success`: applied field indication and success toast; success dialog has
  separate overlay evidence.

All requested states are applicable; none is marked `not_applicable`.

## Keyboard and focus order

Default order follows visual reading order: toolbar actions → Display tabs and
Add Display → plot type / overflow → Settings tabs and fields → bottom tabs →
Add signal → table checkboxes/rows/actions. Arrow keys move within tablists and
listboxes; Tab exits the component after its last control. Focus is always
visible and is not represented by color alone. Menus/popovers/dialogs restore
focus to their trigger on dismiss.

## Prototype

Entry point: `prototype/index.html`.

Files:

- `prototype/index.html` — current-layout mock screen and overlays;
- `prototype/design.css` — full visual/responsive contract;
- `prototype/demo.js` — deterministic state and overlay toggles, anchor
  collision placement and query-string capture mode;
- `assets/engee-logo.svg` — local approved product asset copied into package.

Open directly as a local file; no server is required. Prototype control panel
switches states and overlays. Deterministic links use:

`prototype/index.html?state=<state>&overlay=<overlay>&chrome=0`

Supported overlays: `none`, `display-menu`, `add-menu`, `columns-menu`,
`info-popover`, `session-dialog`, `workspace-dialog`, `delete-dialog`,
`success-dialog`. `chrome=0` hides prototype-only controls for evidence.

Prototype contains no backend/API calls, polling, production state,
authoritative validation, runtime CDN or `data-testid`.

## Evidence

### Required state × viewport matrix

| State | 1440×900 | 1280×720 | 1024×768 |
|---|---|---|---|
| default | `screenshots/signal-analyzer--default--1440x900.png` | `screenshots/signal-analyzer--default--1280x720.png` | `screenshots/signal-analyzer--default--1024x768.png` |
| hover | `screenshots/signal-analyzer--hover--1440x900.png` | `screenshots/signal-analyzer--hover--1280x720.png` | `screenshots/signal-analyzer--hover--1024x768.png` |
| focus | `screenshots/signal-analyzer--focus--1440x900.png` | `screenshots/signal-analyzer--focus--1280x720.png` | `screenshots/signal-analyzer--focus--1024x768.png` |
| active | `screenshots/signal-analyzer--active--1440x900.png` | `screenshots/signal-analyzer--active--1280x720.png` | `screenshots/signal-analyzer--active--1024x768.png` |
| disabled | `screenshots/signal-analyzer--disabled--1440x900.png` | `screenshots/signal-analyzer--disabled--1280x720.png` | `screenshots/signal-analyzer--disabled--1024x768.png` |
| loading | `screenshots/signal-analyzer--loading--1440x900.png` | `screenshots/signal-analyzer--loading--1280x720.png` | `screenshots/signal-analyzer--loading--1024x768.png` |
| empty | `screenshots/signal-analyzer--empty--1440x900.png` | `screenshots/signal-analyzer--empty--1280x720.png` | `screenshots/signal-analyzer--empty--1024x768.png` |
| error | `screenshots/signal-analyzer--error--1440x900.png` | `screenshots/signal-analyzer--error--1280x720.png` | `screenshots/signal-analyzer--error--1024x768.png` |
| warning | `screenshots/signal-analyzer--warning--1440x900.png` | `screenshots/signal-analyzer--warning--1280x720.png` | `screenshots/signal-analyzer--warning--1024x768.png` |
| success | `screenshots/signal-analyzer--success--1440x900.png` | `screenshots/signal-analyzer--success--1280x720.png` | `screenshots/signal-analyzer--success--1024x768.png` |

### Dialog responsive evidence

| Overlay | 1440×900 | 1280×720 | 1024×768 |
|---|---|---|---|
| Session import | `screenshots/signal-analyzer--overlay-session-dialog--1440x900.png` | `screenshots/signal-analyzer--overlay-session-dialog--1280x720.png` | `screenshots/signal-analyzer--overlay-session-dialog--1024x768.png` |
| Workspace import | `screenshots/signal-analyzer--overlay-workspace-dialog--1440x900.png` | `screenshots/signal-analyzer--overlay-workspace-dialog--1280x720.png` | `screenshots/signal-analyzer--overlay-workspace-dialog--1024x768.png` |
| Delete confirm | `screenshots/signal-analyzer--overlay-delete-dialog--1440x900.png` | `screenshots/signal-analyzer--overlay-delete-dialog--1280x720.png` | `screenshots/signal-analyzer--overlay-delete-dialog--1024x768.png` |

Additional anchored/success evidence:

- `screenshots/signal-analyzer--overlay-display-menu--1440x900.png`;
- `screenshots/signal-analyzer--overlay-add-menu--1440x900.png`;
- `screenshots/signal-analyzer--overlay-columns-menu--1440x900.png`;
- `screenshots/signal-analyzer--overlay-info-popover--1440x900.png`;
- `screenshots/signal-analyzer--overlay-success-dialog--1024x768.png`.

Total: 44 PNG screenshots. Automated capture reported zero page errors and no
document-level overflow for any state/viewport/overlay capture. Images use
device scale factor 1 and exact filename dimensions.

## Autonomous decisions

1. At 1024 the Settings panel remains right of the plot at 300 w. Reflowing it
   below would change current IA; labels stack and the table scrolls instead.
2. Explicit TASK-0040 viewport support reduces the legacy shell minimum from
   1180 to 1024 while preserving all zones and actions.
3. Bottom height uses `clamp(270px,36vh,324px)`: enough for header plus at
   least four 34 px rows at 720 h without starving the plot below 300 h.
4. Action column is 128 w and sticky; three 28 px actions plus gaps are
   reserved, so hover/focus never shifts metadata.
5. Settings form remains two-column at 1280/1440 but stacks at 1024; this is
   the smallest change that removes overlap for long labels.
6. Menus/popovers are fixed/portaled with deterministic flip and 8 px viewport
   clamping, resolving clipping caused by plot/table scroll containers.
7. Message/delete dialogs use canonical 480 w, session import 520 w and
   workspace import 560 w; content hierarchy is unchanged.
8. Success uses a toast for non-modal session feedback and a 480 w message
   dialog only where the existing workspace flow already requires explicit
   acknowledgement.

## Self-review and acceptance

- [x] `design_status: ready`, `design_version: 1` and stable `design_ref` set.
- [x] Current screen IA and only existing domain flows represented.
- [x] Exact zones, rows, gaps, form and table columns documented for all three
  required viewports.
- [x] Inputs, custom enum, checkboxes, tabs, icon actions, table rows and
  validation/status placement specified.
- [x] Menus, dropdown, popover, tooltip, dialogs and overlays include geometry,
  anchor, collision, stacking, focus and dismiss rules.
- [x] All ten requested states exist in prototype and each has screenshots at
  1440×900, 1280×720 and 1024×768.
- [x] Session/workspace/delete dialogs have responsive screenshots at all three
  viewports; anchored menus/popover and success dialog have additional evidence.
- [x] Prototype opens from local files, uses mock data only, and has no API,
  polling, CDN, product selectors or production code.
- [x] Browser capture found no page errors and no document-level overflow.
- [x] Work remained inside
  `architecture/design/TASK-0040-detailed-current-layout/**`.

## Change log

- `v1` — initial ready package: detailed current layout, deterministic local
  prototype, 10-state × 3-viewport evidence, responsive dialog/menu evidence.
