# TASK-0080 — explicit Apply calculation flow

- ROLE: Designer
- Design mode: `autonomous`
- Design status: `ready`
- Design version: `1`
- Canonical UI profile: `analytical-dense`
- Additive base: accepted `architecture/design/TASK-0057-ui-overlay-refinement/`, design v2
- Prototype entry: `prototype/index.html`
- Interaction evidence: `evidence/interaction-walkthrough.json`
- Required viewports: `1024×768`, `1280×720`, `1440×900`
- Sizing evidence: minimum `936×696`, undersized `840×620`

## Outcome

Пакет добавляет к принятой v2-композиции единственный явный commit расчётных
настроек — `Применить`. Редактирование меняет только frontend draft; корректное
typed-значение через `150ms` сохраняется как отдельный backend draft field
update и не меняет Plotly/output revision. Нажатие `Применить` сначала
синхронно flush-ит незавершённые корректные field updates, затем отправляет
Apply над уже сохранённым backend draft без settings snapshot.

Видимая композиция v2, две Plotly pane, local Roboto/assets, настройки,
нижний inspector, экранные tabs и overlay stack сохранены. Dirty не получает
отдельный badge, caption или статус: его видно только по изменённым значениям,
enabled-состоянию Apply и обычному keyboard focus. Presentation-only действия
(`Показывать легенду`, `Нормировать Y`, `Показывать маркеры`) остаются
немедленными и не включают Apply.

## Scope

Включено:

- `pristine`, `dirty`, local `invalid`, `applying`, `pending`, `ready`, backend
  semantic `error`, `stale` и `retry`;
- preservation прежнего Plotly output до принятого Apply revision;
- active-output-only pending overlay;
- сохранение draft при local/backend/stale ошибках;
- keyboard/focus/live-region contract;
- требуемые overlay combinations и restoration;
- invariant sizing, unlimited proportional growth и document scroll ниже
  application minimum.

Не включено:

- backend API, payload implementation, polling, production state, DSP и
  business validation;
- новые analysis types, controls или изменение принятой v2-навигации;
- browser-side calculation, CDN или runtime fetch;
- отдельный dirty badge/caption и settings snapshot в Apply.

Prototype values `2` and `0.333` are deterministic mock triggers for a backend
semantic rejection and stale response. They are walkthrough fixtures, not
product validation rules.

## Exact additive delta from accepted design v2

| Surface | v2 retained | TASK-0080 additive change |
|---|---|---|
| Application shell | Toolbar, workspace/settings split, tabs, inspector | No composition change |
| Settings fields | 40px rows, 140px label, 32px controls, inline messages | Input mutates draft only; valid value schedules 150ms field save |
| Apply footer | Sticky 54px footer, primary button at right | Pristine disabled; dirty enabled; applying/pending disabled; error/stale enabled `Повторить` |
| Plotly panes | Local Plotly, two panes, white canvas, no modebar, compact legend | Old plot remains during dirty/applying/error/stale; only active pane receives pending overlay |
| Toast | Passive, non-focus-stealing layer | Ready success and stale warning copy; applying may coexist with an older passive toast |
| Validation | Canonical 2px internal danger border | Local parse failure disables Apply but does not replace plot with error |
| Sizing | 920×680 application minimum and fixed zone order | Exact growth ratios and document scroll are now pinned without structural maxima |

## Sources and priority

1. `TASK-0080`, `HND-0414` and Orchestrator clarification: no dirty
   badge/caption; flush valid pending 150ms updates; Apply sends no settings
   snapshot; backend semantic errors do not locally block Apply.
2. Accepted `architecture/design/TASK-0057-ui-overlay-refinement/DESIGN.md`
   and its v2 prototype/evidence.
3. Canonical Designer references listed below.
4. Current product frontend as factual implementation context.
5. Autonomous choice only for deterministic mock error/stale values and copy.

Corporate Figma was not needed: local accepted v2 and repo-native canonical
references resolve every material visual choice.

### Used visual references

| Exact source | Extracted pattern / measurement | Explicitly ignored content |
|---|---|---|
| `architecture/skills/designer/visual-system/reference/theme.css` | Tokens, Roboto, radii, shadows, focus and z-index bases | Showcase-only capabilities |
| `architecture/skills/designer/visual-system/reference/source-derived-ui-spec.md` | Entire `analytical-dense` profile; exact field/button/menu/table states | `form-workbench` geometry |
| `architecture/skills/designer/visual-system/reference/interaction-state-showcase.html` | Persistent selected vs transient pressed vs focus-visible | App-specific sample labels |
| `architecture/skills/designer/application-composition/reference/application-toolbar.*` | 44px toolbar, 36×32 actions, 32px logo | Optional actions outside product scope |
| `architecture/skills/designer/application-composition/reference/multi-page-element.*` | 32px tabs, selection line, close/scroll behavior | Generic page metadata |
| `architecture/skills/designer/data-entry-and-inspection/reference/settings-controls.*` | 40px rows, 140px label, 32px fields, 54px Apply footer | Template responsive stack rule; sizing contract forbids reflow |
| `architecture/skills/designer/data-entry-and-inspection/reference/inspector-ui.*` | 32px rows, canonical search/actions and eye semantics | Additional inspector CRUD scope |
| `architecture/skills/designer/output-and-visualization/reference/graph-output-zone.*` | Context-preserving local output overlay | Backend readiness implementation |
| `architecture/skills/designer/output-and-visualization/reference/plotly-modebar.md` | White Plotly canvas; v2 task decision keeps modebar absent | Visible modebar, superseded by accepted v2 |
| `architecture/skills/designer/visual-system/reference/screenshots/pulse-waveform-analyser/default-real-imaginary-page.png` | Dense graph/settings/inspector proportions | Browser chrome, legacy labels/data |
| `architecture/skills/designer/visual-system/reference/screenshots/pulse-waveform-analyser/settings-scroll.png` | Sticky Apply and settings density | Legacy application layout/data |
| `architecture/skills/designer/visual-system/reference/screenshots/pulse-waveform-analyser/startup-loading-overlay.png` | Spinner/backdrop visual only | Full-screen startup blocking behavior |
| `architecture/design/TASK-0057-ui-overlay-refinement/screenshots/workspace--default-one-screen--1440x900.png` | Accepted v2 zone composition | No new behavior inferred |
| `architecture/design/TASK-0057-ui-overlay-refinement/screenshots/state--loading--1440x900.png` | Active-pane contextual progress | Prior implicit calculation trigger |
| `architecture/design/TASK-0057-ui-overlay-refinement/screenshots/state--error--1440x900.png` | Error typography and danger surface | Prior invalid-input plot replacement, superseded here |

### Current frontend factual profile

Read-only context was taken from `public/index.html`, `public/css/theme.css`,
`public/css/layouts.css`, `public/css/settings.css`, `public/js/api.js`,
`public/js/settings.js` and `public/js/app.js`.

- Product already contains the v2 shell, local Roboto/icons/Plotly, 920×680
  application minimum, 44px toolbar, 42/32px settings header/tabs, 40px
  settings rows and 32px controls.
- Current `public/js/settings.js` uses exact `SETTINGS_DEBOUNCE_MS = 150` and
  typed field updates, but still dispatches some effective state from field
  responses. TASK-0080 replaces the visible behavior: field update never
  changes output; only Apply commits calculation.
- Current `public/css/layouts.css` carries accepted v2 overlay levels. This
  package preserves their ordering.
- Current frontend breakpoints and legacy settings CSS are factual context,
  not sizing authority. The page sizing contract below supersedes reflow,
  hiding and structural maxima for this task.

## Source-derived exact UI profile

`analytical-dense` is used without mixing profile geometry.

| Element | Exact contract |
|---|---|
| Body | Local Roboto `14px/400`, text `#212121`, app background `#f6f8fa` |
| Headings | Local Roboto Medium `500`; toolbar 18px, panel 16px, group 14px |
| Toolbar | 44px; padding `6px 16px`; 32px logo; 36×32 actions; 2px action gap |
| App/zone gap | 8px invariant |
| Panel | white surface, 1px `#e1e1e1`, 8px radius, analytical shadow |
| Settings heading/tabs/footer | 42px / 32px / 54px |
| Settings row | min 40px; `140px minmax(0,1fr)`; 8px gap; padding `4px 8px 4px 48px` |
| Field | 32px; 1px line; 6px radius; input `6px 8px` |
| Field hover/focus | line `#d7d7d7`; focus border `#1b84b8` + 3px `#e6f5fc` halo |
| Field invalid | 2px `#b3261e` reserved inside existing box; no layout shift |
| Apply | min-width 96px; min-height 30px; padding `7px 16px`; primary colors |
| Primary states | default `#1b84b8`; hover `#166a93`; pressed `#104f6e`; disabled `#75b5d4` |
| Settings menu | anchor width; 34px item; padding `6px 12px`; 6px radius |
| Tabs | 32px; accepted 160px shell, max 240px; selected 3px accent inset |
| Plot pane | 1px line, 6px radius; 32px header; 28px select/action cluster |
| Plot frame | 8px padding/gap; white Plotly paper/canvas; local traces remain mounted |
| Plotly controls | Accepted v2 `displayModeBar:false`; no modebar/container |
| Inspector | 42px header; 32px search and table rows; 16px checkbox/swatch |
| Column visibility | Only local `eye.svg` / `eye-off.svg`; no checkmark |
| Motion | 120ms color/background/border/opacity; spinners 800ms linear |

No new hex color, shadow, radius or base control size is introduced.

## Screens and zones

| Screen | Zone | Purpose | Required viewport |
|---|---|---|---|
| Signal Analyser | Application toolbar | Brand/version and global actions | All |
| Signal Analyser | Display navigation | Screen tabs and layout actions | All |
| Signal Analyser | Plot workspace | Retained applied outputs and active pending state | All |
| Signal Analyser | Display settings | Draft editing, validation and sole Apply | All |
| Signal Analyser | Lower inspector | Signals/measurements/peaks context | All |

Zone order, orientation, grouping and visibility never change with viewport.

## Explicit Apply state machine

| State | Entry | Apply | Fields | Plot/output | Visible copy / recovery |
|---|---|---|---|---|---|
| `pristine` | Draft equals applied revision | Disabled, `Применить` | Enabled | Current applied output | No status text |
| `dirty` | Valid calculation field differs | Enabled, `Применить` | Enabled | Unchanged | No badge/caption/status |
| `invalid` | Locally unparseable numeric draft | Disabled | Invalid field gets 2px danger + inline error | Unchanged | `Исправьте выделенные поля` |
| `applying` | Click/Enter/Space Apply after synchronous flush | Disabled, spinner + `Применение…` | Calculation fields disabled; presentation fields remain available | Previous output intact and interactive | `Применяем сохранённый черновик` |
| `pending` | Backend accepts Apply and publishes new revision | Disabled, spinner + `Ожидание…` | Calculation fields disabled | Only active pane gets translucent contextual loader; inactive pane remains operable | `Обновляется активная область` |
| `ready` | Active output revision catches applied revision | Disabled, `Применить` | Enabled | New plot rendered in same frame | Passive `График обновлён` toast |
| `error` | Backend semantic/transport Apply rejection | Enabled, `Повторить` | Draft preserved and editable | Previous output remains; no plot error replacement for atomic rejection | Exact backend-safe message in footer |
| `retry` | Keyboard focus/hover on `Повторить` after error/stale | Enabled with canonical focus/hover | Preserved draft | Previous output intact | Activation repeats snapshot-free Apply |
| `stale` | Response revision is older than current context | Enabled, `Повторить` | Draft preserved | Stale output ignored | Footer warning + passive warning toast |

Backend semantic invalidity does not pre-disable Apply. Only local numeric parse
failure does. An accepted Apply can later fail while materializing output; that
separate provider case may use the retained active-pane error overlay, but the
atomic validation rejection demonstrated here keeps the previous output.

### Event and revision contract

1. `input/change` updates frontend draft only.
2. A locally valid calculation field schedules one typed field update after
   `150ms`; rescheduling cancels the previous timer.
3. Field update persists backend draft and causes zero calculation/output
   revision change.
4. Apply synchronously flushes every pending valid timer in field-update order.
5. Apply event contains context identifiers only; `settings_snapshot_present:
   false` is asserted in evidence.
6. `applying` retains the old `output_revision`.
7. Accepted Apply increments `applied_revision` once and enters `pending`.
8. Only the affected active pane materializes; inactive panes remain cold and
   visually unobstructed.
9. `ready` publishes the matching `output_revision`; stale responses never
   replace it.

## Interaction and state matrix

| Element | Trigger | Visible result | States | Resize rule |
|---|---|---|---|---|
| Calculation input | Type/change | Draft value only; 150ms backend-draft save | default, hover, focus, invalid, disabled-busy | Fixed 32px |
| Presentation checkbox | Click/Space | Legend/marker/normalization changes immediately | unchecked, checked, hover, focus, disabled | Fixed 16px |
| Apply | Click/Enter/Space | Sole commit; pending valid edits flush first | disabled-pristine, enabled-dirty, applying, pending, retry focus | Intrinsic width ≥96px; same footer |
| Active plot | Accepted Apply | Contextual overlay without unmount/resize | ready, pending, provider-error | Grows with workspace |
| Inactive plot | Any Apply | No overlay or calculation | ready | Grows with workspace |
| Graph help | Pane ellipsis → Help | Modeless help above menu | open/focus/close | Fixed overlay geometry |
| Passive toast | Ready/stale/other action | Status only; never steals focus | success, warning, coexistence | Fixed to viewport; no page reflow |
| Retry | Focus then activate | Reuses preserved backend draft | focus-visible, hover, pressed | Same Apply geometry |

Pointer/click outside a dropdown closes it. Clicking another dropdown closes the
previous one. Selecting an option closes the menu and removes active highlight;
DOM focus may remain on the trigger with its independent focus ring.

## Prototype walkthrough

All actions are real click/focus/keyboard operations over mock data. Prototype
selectors are `data-design-id` only and are not production `data-testid`.

| Record | Main `data-design-id` / action | Expected evidence | Screenshot pattern |
|---|---|---|---|
| `pristine-*` | `app-shell`, `settings-apply`; load | Apply disabled, no dirty copy, two live Plotly panes | `state--pristine--*.png` |
| `invalid-*` | `settings-tab-time`; type `abc`, blur | Local error, disabled Apply, output unchanged | `state--invalid--*.png` |
| `validation-help-*` | plot ellipsis → help | Help owns focus over retained validation | `overlay--settings-validation-help--top|after-close--*.png` |
| `dirty-*` | type `0.3`, wait 150ms | Field update only; no calculation; Apply enabled; empty status | `state--dirty--*.png` |
| `apply-flush-*` | create toast; type `0.31`; immediately Apply | `apply_flush` precedes snapshot-free Apply | `state--applying--*.png` and overlay pair |
| `pending-*` | wait accepted revision | Only active pane overlay; Plotly rectangles unchanged | `state--pending--*.png` |
| `ready-*` | wait output revision | Revisions match, dirty clears, ready toast | `state--ready--*.png` |
| `semantic-error-*` | locally valid maximum `2`; Apply | Server error, preserved draft/output, `Повторить` | `state--error--*.png` |
| `retry-*` | keyboard focus `Повторить` | Canonical focus-visible, no geometry shift | `state--retry--*.png` |
| `stale-*` | maximum `0.333`; Apply | Stale ignored, warning toast, preserved draft | `state--stale--*.png` and overlay pair |
| `stale-retry-commit-*` | click `Повторить` | Second Apply has no snapshot and reaches ready | JSON record |
| `sizing-*` | load minimum/undersized | Min canvas retained; document scroll below min | `sizing--minimum|undersized--*.png` |

Stable ids used: `app-shell`, `plot-grid`, `settings-panel`,
`settings-tab-time`, `settings-field-time.x_limits`, `settings-apply`,
`plot-menu`, `graph-help`, `success-toast`, `display-add`.

## Page sizing contract

```yaml
page_sizing_contract:
  application_min_width: 920px
  application_min_height: 680px
  browser_canvas_with_8px_edges_min_width: 936px
  browser_canvas_with_8px_edges_min_height: 696px
  layout_invariant_on_resize: true
  undersized_viewport_behavior: document_scroll
  structural_max_sizes: none
  zones:
    - id: application-toolbar
      min_width: 920px
      min_height: 44px
      width_growth_ratio: 1
      height_growth_ratio: 0
    - id: main-stage
      min_width: 920px
      min_height: 368px
      width_growth_ratio: 1
      height_growth_ratio: 0.735
    - id: plot-workspace
      min_width: 612px
      min_height: 368px
      width_growth_ratio: 0.85
      height_growth_ratio: 0.735
    - id: display-settings
      min_width: 300px
      min_height: 368px
      width_growth_ratio: 0.15
      height_growth_ratio: 0.735
    - id: plot-grid
      min_width: 610px
      min_height: 292px
      width_growth_ratio: 0.85
      height_growth_ratio: 0.735
    - id: lower-inspector
      min_width: 920px
      min_height: 252px
      width_growth_ratio: 1
      height_growth_ratio: 0.265
  fixed_template_controls:
    - id: toolbar-action
      width: 36px
      height: 32px
    - id: toolbar-logo
      width: 32px
      height: 32px
    - id: screen-and-settings-tab
      width: intrinsic
      height: 32px
    - id: settings-control
      width: zone-track
      height: 32px
    - id: settings-row
      width: zone-track
      height: 40px-minimum
    - id: apply-button
      width: intrinsic-min-96px
      height: intrinsic-min-30px
    - id: checkbox-and-state-icon
      width: 16px
      height: 16px
    - id: inspector-row
      width: table-track
      height: 32px
```

Width beyond minimum is distributed `0.85 : 0.15` between workspace and
settings. Height beyond minimum is distributed `0.735 : 0.265` between main
stage and lower inspector. Toolbar and inter-zone gaps are fixed. Tracks grow
without upper limit; no structural `max-width`/`max-height`, breakpoint reorder,
stack, hide, replacement or CSS zoom is allowed. Rounding tolerance is at most
one CSS pixel per track.

### Measured viewport evidence

| Viewport | App | Workspace / settings | Main / inspector | Scroll |
|---|---:|---:|---:|---|
| 936×696 minimum | 920×680 | 612 / 300 | 368 / 252 | none |
| 1024×768 | 1008×752 | 686.812 / 313.188 | 420.922 / 271.078 | none |
| 1280×720 | 1264×704 | 904.406 / 351.594 | 385.641 / 258.359 | none |
| 1440×900 | 1424×884 | 1040.406 / 375.594 | 517.953 / 306.047 | none |
| 840×620 undersized | retained 920×680 | retained 612 / 300 | retained 368 / 252 | horizontal + vertical document scroll |

Evidence: `screenshots/sizing--minimum--936x696.png`,
`screenshots/sizing--undersized--840x620.png` and measured JSON.

## Proportion contract

| Component | Canonical/accepted reference | Preserved proportions | Required change | Deviation |
|---|---|---|---|---|
| Toolbar | analytical toolbar + v2 | 44px, 36×32, 32px logo, 2px action gap | None | None |
| Screen tabs | v2 multi-page | 32px row, 160px shell, close/scroll targets | None | None |
| Main split | accepted v2 | workspace left, settings right | Unlimited `0.85:0.15` growth pinned | No composition deviation |
| Plot panes | accepted v2 | two panes, 32px headers, 28px cluster, 8px grid | Local pending overlay only | None |
| Settings | canonical + v2 | 42/32 headers, 40px rows, 140px label, 32px field | Explicit Apply states | None |
| Apply footer | canonical settings | 54px footer, right-aligned ≥96px primary action | Button text/state changes only | None |
| Inspector | accepted v2 | 42px header, 32px search/rows, inline actions | None | None |
| Menus | analytical settings menu | 34px combobox, 28px compact items | None | None |
| Plotly | accepted v2 | same mounted frame/axes/traces, white surface, no modebar | Contextual pending overlay | None |

State changes never change width, height, padding or border allocation.

## Plotly integrity contract

- `assets/vendor/plotly-cartesian-3.1.0.min.js` is package-local.
- Paper and plot backgrounds are `#ffffff`; axes/traces remain mounted.
- Accepted v2 `displayModeBar:false`, `displaylogo:false`, `showTips:false` is
  preserved; `.modebar` and empty `.modebar-container` are absent.
- Dirty, invalid, applying, backend error and stale do not add a plot overlay or
  alter plot/output revision.
- Pending adds one absolute, translucent overlay only to `.plot-pane.is-active`;
  the underlying pane/canvas/Plotly host rectangles remain byte-for-byte equal
  in measured JSON.
- The inactive pane has no pending layer and is not calculated by this flow.

## Overlay inventory and priority

| Layer | z-index | Blocking | Pointer/focus owner |
|---|---:|---|---|
| Plot-local pending overlay | pane-local `5` | Active pane only | No focus; live region announces |
| Sticky table/header | 100 | No | In-flow control |
| Layout popover | 1000 | No | Newest popover |
| Passive success/warning toast | 1050 | No | Never steals focus |
| Dropdown / pane / inspector menu | 1100 | No | Open menu |
| Graph help | 1200 | No | Help close while open |
| Tooltip | 90000 | No, pointer-inert | None |
| Main modal backdrop/card | 94990 / 95000 | Yes | Main dialog trap |
| Main modal child tooltip | 95100 | No | None |
| Screen delete backdrop/card | 95990 / 96000 | Yes | Delete confirmation trap |
| Nested confirmation backdrop/card | 96990 / 97000 | Yes | Newest nested trap |
| Critical/global loader | 98000 | Yes when explicitly present | Critical state |

No new global overlay level is introduced.

### Required coexistence, focus and restoration

| Combination | Bottom → top | Active pointer owner | Focus owner | Restore after top closes |
|---|---|---|---|---|
| `settings_validation_with_help` | inline validation → pane menu → graph help | Graph help close/menu | Graph help close | Help menu item; validation and disabled Apply remain |
| `applying_with_passive_toast` | application applying state → passive toast | Application except disabled calculation controls/Apply | Current app context; assertive live region announces, toast never focuses | Toast close changes no applying state/focus |
| `stale_error_with_retry` | preserved plot → settings stale error + Retry → passive warning toast | Retry and ordinary app controls | Retry button | Closing toast keeps focus/availability on Retry |

An older dropdown/tooltip becomes stale/inert below any newer blocker exactly as
in v2. A passive toast never eclipses an active modal control. Modal Tab traps,
Escape newest-first and v2 restoration targets remain unchanged.

## Keyboard and accessibility contract

- Settings tabs keep roving tab focus; controls follow visual order; Apply is
  the final settings action.
- Local invalid Apply is native disabled; error is connected visually and via
  status copy. Focus stays in/can return to the invalid field.
- Apply activation accepts click, Enter and Space. During applying/pending the
  button is disabled and assertive live-region copy announces phase changes.
- Backend error/stale restores focus to enabled `Повторить`; keyboard focus uses
  the canonical 2px accent outline without geometry change.
- Ready/stale toasts use `role=status`, never receive automatic focus and have
  an accessible close action.
- Graph help opens on its close control and restores focus to the originating
  `Управление графиком` item; closing the menu restores pane ellipsis.
- Icon-only actions retain tooltip and accessible names; SVG aspect ratios are
  unchanged.

## Local asset inventory

All runtime assets are package-local; no CDN/API/font fetch is present.

| Asset | Package path | Canonical source / use |
|---|---|---|
| Theme | `assets/theme.css` | Canonical visual-system tokens |
| Roboto Cyrillic regular | `assets/fonts/roboto/roboto-v51-cyrillic-regular.ttf` | Body/copy |
| Roboto Cyrillic medium | `assets/fonts/roboto/roboto-v51-cyrillic-medium.ttf` | Headings/actions |
| Roboto Latin regular | `assets/fonts/roboto/roboto-v51-latin-regular.ttf` | Body/technical values |
| Roboto Latin medium | `assets/fonts/roboto/roboto-v51-latin-medium.ttf` | Headings/actions |
| `engee-logo.svg` | `assets/icons/engee-logo.svg` | 32×32 toolbar logo |
| `chevron-down-fill-16.svg` | `assets/icons/chevron-down-fill-16.svg` | 16px select chevron |
| `plus.svg`, `close.svg`, `more-vertical.svg` | `assets/icons/` | Screen, pane, dialog and inspector actions |
| `eye.svg`, `eye-off.svg` | `assets/icons/` | Column visibility only |
| `copy.svg`, `trash.svg` | `assets/icons/` | Inspector/pane actions |
| `help-circle.svg`, `import.svg`, `save.svg` | `assets/icons/` | Help and toolbar |
| `tick-figma.svg` | `assets/icons/tick-figma.svg` | Success toast |
| Local Plotly | `assets/vendor/plotly-cartesian-3.1.0.min.js` | Interactive plot engine |

Every copied SVG is used by the inherited clickable v2 surface, keeps its
original filename/viewBox and is rendered with preserved aspect ratio.

## Screenshot and evidence inventory

`screenshots/` contains 47 PNGs:

- every required state at all three target viewports:
  `state--pristine|dirty|invalid|applying|pending|ready|error|retry|stale--{viewport}.png`;
- every required overlay combination, top and after-close, at all three target
  viewports:
  `overlay--settings-validation-help--*`,
  `overlay--applying-passive-toast--*`,
  `overlay--stale-error-retry--*`;
- `sizing--minimum--936x696.png` and
  `sizing--undersized--840x620.png`.

`evidence/interaction-walkthrough.json` is authoritative: `32 passed / 0
failed`, `47 screenshots`, `0 browser errors`. It includes event ordering,
snapshot-free Apply evidence, calculation/revision counters, Plotly checks,
viewport rectangles, overlay ownership and screenshot paths.

## Autonomous decisions

- One coherent additive solution was selected; no user material choice remains.
- Dirty has deliberately no standalone visual marker, matching the explicit
  product clarification.
- Applying keeps the previous output clear rather than showing a plot loader;
  pending begins only after Apply acceptance.
- Atomic backend semantic rejection uses the settings footer error/Retry and
  preserves the previous plot; local invalid never invokes Apply.
- `0.333` is a one-shot mock stale trigger so the actual Retry click can succeed
  in the local walkthrough without inventing production stale semantics.

## Acceptance

- All required states/viewports and overlay top/after-close pairs exist.
- Input/change performs zero calculation and zero output revision change.
- Valid pending 150ms field updates flush before Apply.
- Apply is the only calculation commit and carries no settings snapshot.
- Backend-semantic values are not blocked locally; unparseable numeric drafts are.
- Draft survives invalid/backend/stale paths; Retry is keyboard-visible.
- Plotly remains local, mounted, white and geometry-stable.
- Local Roboto/assets, analytical-dense proportions and overlay priority are preserved.
- Page sizing is exact at minimum, two larger and undersized viewports; zones do
  not reorder/hide/stack, structural maxima are absent and undersized uses
  document scroll.
- Prototype contains no API, polling, product code or production `data-testid`.

## Change log

- `v1` — initial additive explicit Apply package based on accepted TASK-0057
  design v2; complete state machine, prototype, screenshots and evidence.
