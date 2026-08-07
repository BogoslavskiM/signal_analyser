# TASK-0057 / TASK-0067 — UI overlay refinement and Display revision

- ROLE: Designer
- Design version: `2`
- Status: `ready`
- Mode: `review`
- Canonical UI profile: `analytical-dense`
- Package: `architecture/design/TASK-0057-ui-overlay-refinement/`
- Prototype entry: `prototype/index.html`
- Interaction evidence: `evidence/interaction-walkthrough.json`
- Viewports: `1440×900`, `1280×720`, `1024×768`
- Related task/handoff: `TASK-0057`, priority revision `TASK-0067`, `HND-0242`

## Outcome

Пакет задаёт одно review-ready решение для всей связанной области TASK-0057 и
приоритетной ревизии TASK-0067. Default содержит один screen. Экранная строка
имеет реальные scroll arrows, icon-only `+`, layout action и подтверждаемое
удаление каждого screen. В каждой видимой pane работает package-local Plotly с
реальными axes/traces, без modebar или graph-tool container. Русская справка по
жестам открывается отдельным overlay и не меняет geometry графиков.

Таблица уменьшена ещё ровно на `10px` относительно review geometry, сохраняет
`32px` rows и scroll. `Имя` всегда видно и не присутствует в column-visibility
menu. Цвет — borderless `16×16px` swatch без видимого текста. Duplicate/Delete
расположены внутри последней content cell без отдельной action column.

Материального решения пользователя не осталось: user review одобрил остальные
visual choices и запросил exact revision, выполненную в этой версии.

## Priority and supersession

Порядок выбора решения применён буквально: явное ТЗ пользователя → canonical
Designer references → локальные screenshot catalogs → самостоятельное решение.

- HND-0239/HND-0241 в части видимой Plotly modebar/tools полностью superseded.
  Локальный Plotly остаётся движком интерактивных графиков, но
  `displayModeBar:false`; `.modebar` и пустого `.modebar-container` нет.
- Built-in Plotly notifier `Double-click to zoom back out` подавлен через
  `showTips:false`: он был английским, перекрывал header/settings и дублировал
  утверждённую русскую graph-help. Gesture behavior сохранён и проверен через
  axis ranges.
- Видимая строка `Добавить экран` запрещена. Назначение `+` остаётся в tooltip и
  accessible name.
- Edge arrow не disabled: на соответствующем краю он полностью скрыт. Между
  краями обе arrows видимы и enabled.
- Предыдущее inferred требование рамки swatch superseded: swatch не имеет
  border/outline ни в одном состоянии.
- Graph-help не участвует в flow; никакой padding/margin pane при open/close не
  меняется.

## Visual sources

| Component | Canonical source | Applied contract |
|---|---|---|
| Theme/tokens | `architecture/skills/designer/visual-system/reference/theme.css` | Canonical colors, Roboto, radii, shadows, state duration |
| Exact profile | `architecture/skills/designer/visual-system/reference/source-derived-ui-spec.md` | `analytical-dense` dimensions only |
| Controls/states | `visual-system/reference/control-showcase.html`, `interaction-state-showcase.html` | Button/select/menu/checkbox states |
| App toolbar | `application-composition/reference/application-toolbar.*` | 44px shell, 36×32 actions, 32px logo |
| Screen tabs | `application-composition/reference/multi-page-element.*` and `screenshots/pulse-waveform-analyser/annotated-tabs-overflow.png` | 32px row, selection line, arrows, close action |
| Settings | `data-entry-and-inspection/reference/settings-controls.*` | 40px rows, 140px labels, 32px controls, 34px options |
| Inspector/table | `data-entry-and-inspection/reference/inspector-ui.*` | 32px table rows, eye/eye-off column menu |
| Graphs | `output-and-visualization/reference/graph-output-zone.*` | Full-size graph viewport and overlaid states; task supersedes modebar section |
| Dialogs | `dialog-and-file-flows/reference/dialog-system.*` | 48px title, 56px footer, focus/stacking anatomy |

Local screenshot catalogs consulted: Pulse Waveform Analyser default,
annotated tabs overflow, settings scroll, page picker and export success;
Window Designer toolbar tooltip, plot settings and analysis dialog. User review
screenshots `15.44.21` and `15.49.23` were rejection evidence for the oversized,
wrapped dropdown, not a visual pattern. Corporate Figma was not needed because
the explicit task and canonical sources resolve every visual choice.

## Screens and zones

The prototype is one application screen with five stable zones:

1. Application toolbar: Engee brand/title/version and import/save/help actions.
2. Workspace title and Display navigation: screen tabs, edge arrows, icon-only
   add immediately left of layout action.
3. Plot workspace: configurable grid, one pane header and one interactive Plotly
   viewport per pane.
4. Display settings: three pages for the active pane.
5. Lower inspector: Signals/Measurements/Peaks tabs, Signals `+` and ellipsis,
   search and scrollable table.

Startup has exactly one screen. The prototype demonstration layout is `1×2` so
two representative plot types remain legible at all required viewports. The
layout picker supports `1…10` rows and columns. Values beyond the recommended
`4×4` envelope show a non-blocking warning and leave Apply enabled.

## Responsive and proportion contract

| Item | Exact contract |
|---|---|
| App minimum | `920×680px`; body padding `8px`, `6px` at ≤1080 |
| Toolbar | `44px`; padding `6×16`; action `36×32`; gap `2`; logo `32×32` |
| App rows | `44px / minmax(0,1fr) / lower-zone`; `8px` gap |
| Main columns | settings `370px`; `340px` at ≤1280; `300px` at ≤1080 |
| Workspace rows | title `42px`; screen row `32px`; plots remaining space |
| Plot grid | `8px` padding/gap; `6px` at ≤1280; dense layouts scroll |
| Pane | 1px border, radius `6px`; header `32px`; plot remainder |
| Pane control cluster | `28px` high in `32px` header; exact `2px` top/bottom inset; max `244px`; gap between select/ellipsis `0` |
| Pane plot select | `28px`; Roboto `14/18/400`; padding `4px 24px 4px 8px`; left radius `6px` |
| Pane ellipsis | `32×28px`; right radius `6px`; adjoining border only |
| Chevron | `16×16px`, right `4px`, visual center at `50%`; no baseline offset |
| General control | `32px`; 1px line; radius `6px`; Roboto `14/1.4` |
| Settings row | min `40px`; `140px minmax(0,1fr)`; gap `8px`; padding `4px 8px 4px 48px` |
| Settings section | title min `36px`, padding `6×8px` |
| Combobox menu | plot-type `244px`; settings min `180px`/anchor-derived; padding `4px`; radius `6px` |
| Combobox option | exact `34px`; padding `6×12px`; gap `12px`; Roboto `14/20/400`; no wrap |
| Compact menu | `224px`; item `28px`; padding `4×12`; radius `8px` |
| Column menu | `244px`; item `28px`; padding `4×12`; eye/eye-off `16px` |
| Checkbox | `16×16px`; 1px line; radius `2px`; canonical polygon mark |
| Display add | icon-only `32×32px`, `+` 16px; directly adjacent to layout |
| Screen tab shell | `160px` prototype review width, max `240px`, row `32px`; close target `28×32px`, icon `14px` |
| Table row | exact `32px`; cell padding `6×8px` |
| Inline actions | reserved `60×24px` inside last cell; host padding-right `72px`; buttons `24×24px`; gap `4px`; top `3px`, right `4px` |
| Dialog | normal max `560px`; confirmation max `480px`; radius `12px`; title `48px`; footer `56px` |

The tab shell width is the reviewed composition that includes a persistent
keyboard close target; it keeps the 32px canonical tab row and max width. It is
not used as a new global tab token.

### Lower table-zone revision

The CSS token is
`calc(clamp(270px, 36vh, 324px) - 18px)`: the earlier review package used
`-8px`, therefore this revision is exactly `−10px` further.

| Viewport | Prior review | v2 current | Delta | Row |
|---|---:|---:|---:|---:|
| 1440×900 | 316px | 306px | −10px | 32px |
| 1280×720 | 262px | 252px | −10px | 32px |
| 1024×768 | 268.46875px | 258.46875px | −10px | 32px |

Only the scroll-zone height changes; row height, checkbox targets, inline action
targets, headers and horizontal scrolling remain unchanged.

## Display navigation contract

- One screen exists at startup. Every tab contains a selection button and a
  separate keyboard-accessible cross.
- `+` adds a screen, selects it and scrolls to it; it has tooltip/accessible
  name `Добавить экран` but no visible text.
- At no overflow both arrows are hidden. At left edge left is hidden/right is
  visible. At middle both are visible. At right edge right is hidden/left is
  visible.
- Pointer click, `Enter` and `Space` on an arrow move the real horizontal
  `scrollLeft`; arrows never fake a state by only changing selection.
- Cross hover/focus/active do not change tab geometry. Activation opens the
  dedicated delete confirmation. The screen remains until `Удалить`.
- `Отмена`, dialog close or Escape preserve the screen and restore focus to its
  cross. Confirm removes it, selects and focuses the deterministic adjacent
  surviving tab. The only screen cannot be deleted; confirmation explains the
  invariant and disables delete.

## Interactive graph contract

`assets/vendor/plotly-cartesian-3.1.0.min.js` is loaded before `demo.js` from a
relative `file:` path. There is no CDN, API, fetch or runtime dependency.

- `displayModeBar:false`, `displaylogo:false`, `showTips:false`.
- No `.modebar`, `.modebar-container`, visible graph tools or reserved tool
  strip may exist after rendering or interaction.
- Default `dragmode:"zoom"`: ЛКМ drag-selection zooms both axes.
- Native Plotly `Shift+ЛКМ` modifies the same drag layer to pan; axis span stays
  constant while range translates.
- Double-click uses `reset+autosize`; both ranges return to initial extents.
- Internal English tips are suppressed. The explicit Russian graph-help is the
  sole gesture instruction.
- Plotly’s own legend is disabled. The canonical compact HTML legend remains
  pointer-inert in the upper-right plot sector, max `148px`, Roboto `12/14`.
- Plot state overlays (loading/empty/error) sit above, but do not remove, the
  interactive graph. Success is a passive toast.

Representative mock data by type:

| Type | Plotly trace | Axes | Compact legend |
|---|---|---|---|
| Временная область | two interactive `scatter/lines` | time/amplitude | radarPulse + echoComplex |
| Спектр | interactive filled `scatter/lines` | frequency/power | radarPulse |
| Спектрограмма | interactive `heatmap` | time/frequency | radarPulse |
| Спектр персистентности | interactive `heatmap` | frequency/power | radarPulse |

Every rendered pane receives a Plotly `_fullLayout`, main SVG, axis layers,
trace layer and compact legend. The click walkthrough also applied `10×10` and
verified all 100 rendered panes.

## Pane menu and graph-help

The plot-type dropdown and ellipsis form one contiguous cluster. The ellipsis
menu contains exactly two actions:

- `Очистить область`
- `Управление графиком`

No external clear or graph-control button exists. Graph-help is a fixed overlay
anchored inside the active plot canvas below the compact legend, not in document
flow. Exact copy:

- `Перетаскивать график: Shift + ЛКМ`
- `Автомасштабирование: двойной клик`
- `Зум: зажать ЛКМ и выделить область`

Open focuses its close control. Close button or Escape returns focus to
`Управление графиком`; a second Escape closes the menu and returns focus to the
ellipsis. Click outside dismisses the modeless layers and transfers pointer
context to the clicked target.

Evidence compares pane, canvas, Plotly host and main-SVG bounding boxes before,
open and closed. They are identical at all three viewports, including fractional
1024-height values. Help, legend and pane-control rectangles do not intersect.

## Display settings inventory

The semantic owner is `paneTypes[activePane]`. The pane selector and the first
row `Тип графика` on `Отображение` are two synchronized views of that state.

### Page: Отображение

| Plot type | Sections and fields |
|---|---|
| Временная область | График: Тип графика, Показывать легенду |
| Спектр | График common; Частотная ось: Единицы частоты, Пределы частоты, Шкала частоты, Пределы Y; Спектральный анализ: Спектр в dB, Тип разрешения, conditional fields, Частотное разрешение |
| Спектрограмма | График common; Частотная ось: Единицы времени/частоты, Пределы частоты, Шкала; Мощность: Пределы мощности, Спектр в dB, Утечка, Разрешение по времени, Перекрытие, Переназначение, Фактическая RBW |
| Спектр персистентности | График common; Частотная ось: Единицы времени/частоты, Пределы частоты, Шкала; Плотность и мощность: power/density limits, dB, leakage, time resolution, overlap, power bins, RBW |

Spectrum conditional fields:

- `По утечке` → Утечка.
- `По RBW` → Полоса разрешения, Окно, conditional side-lobe attenuation,
  Перекрытие.
- `По длине окна` → Длина окна, Окно, conditional side-lobe attenuation,
  Перекрытие, Точки DFT.

### Page: Время

| Plot type | Fields |
|---|---|
| Временная область | Нормировать Y, Показывать маркеры, Единицы времени, Пределы X/Y, disabled Связать время |
| Спектрограмма | Пределы X |
| Спектр | Read-only `Не применяется` with explanatory message |
| Спектр персистентности | Read-only `Не применяется` with explanatory message |

### Page: Измерения

All types: Минимум, Максимум, Среднее, Медиана, Размах,
Среднеквадратичное (RMS). Временная область additionally exposes `Искать пики`.

Range min ≥ max produces `Минимум должен быть меньше максимума.`, 2px danger
border and plot error overlay. Contract/provider warnings use 2px warning border,
remain non-blocking where specified and retain geometry.

## Dropdown and checkbox states

| State | Trigger / option token |
|---|---|
| Default | surface `#fff`, line `#e1e1e1`, text `#212121` |
| Hover | trigger line `#d7d7d7`; option `#f5f5f5` |
| Pressed | `#f2f2f2`, unchanged 34px item geometry |
| Selected option | `#e6f5fc`; visible 16px canonical check, accent `#1b84b8` |
| Focus-visible | 2px accent inner outline for option; trigger accent border + 3px accent-soft halo |
| Disabled | surface-muted/muted, opacity `.72`, no pointer cursor, same dimensions |

Selected-option check uses the canonical 16px reserved slot and CSS tick anatomy
from settings controls. Ordinary checkboxes use `16×16`, radius `2`, accent fill
and canonical white polygon mark; checked-hover uses `#166a93`. Column visibility
uses only `eye.svg`/`eye-off.svg`, never checkbox/checkmark.

## Inspector and table contract

- Header text is only `Сигналы`; no count and no pane-binding caption.
- Signals `+` and vertical ellipsis are adjacent, separate 32px actions.
- Column menu excludes `Имя`; no hide action or hidden state for it exists.
  Render logic also restores `Имя` if external prototype state attempts to omit
  it.
- Remaining columns use eye/eye-off states: Цвет, Частота дискретизации,
  Отсчёты, Длительность, Тип.
- Color button is `16×16px`, `border:0`, `outline:0`; no text node. Accessible
  name `Цвет сигнала {name}: {color}` and tooltip `Цвет: {color}` remain.
- Swatch hover/active use opacity only. Focus-visible and selected state color
  the containing cell with accent-soft; the swatch box never changes.
- Duplicate/Delete are visually hidden at rest and reveal on row hover or
  focus-within with a `120ms` opacity transition. Reserved geometry already
  exists, so reveal/pressed/disabled states do not shift row/cells.
- Duplicate is ordinary accent action; Delete uses danger on hover/active.
  Disabled uses opacity `.45`. Info and the separate action column are absent.
- Long last-cell copy ellipsizes beneath the reserved action zone; actions remain
  operable in the same content cell.

## Overlay inventory and priority

| Layer | z-index | Blocking | Pointer/focus owner |
|---|---:|---|---|
| Sticky table/header | 100 | No | In-flow control |
| Layout popover | 1000 | No | Newest popover |
| Passive toast | 1050 | No | Never steals focus |
| Dropdown / pane / inspector menu | 1100 | No | Open menu |
| Graph-help | 1200 | No | Help close while open |
| Tooltip | 90000 | No | Pointer-inert |
| Main modal backdrop/card | 94990 / 95000 | Yes | Main dialog trap |
| Main modal child tooltip | 95100 | No | Pointer-inert under next blocker |
| Screen delete backdrop/card | 95990 / 96000 | Yes | Delete confirmation trap |
| Nested confirmation backdrop/card | 96990 / 97000 | Yes | Newest nested trap |
| Critical/loading | 98000 | Yes when present | Critical state |

### Required coexistence/restoration

| Combination, bottom → top | Observable contract | Close/restoration |
|---|---|---|
| pane menu → graph-help → tooltip | Menu remains observable; help owns focus; tooltip cannot cover close | Close help → help menu item; close menu → ellipsis |
| legend → graph-help | Legend pointer-inert, rectangles do not intersect; no graph resize | Help close restores menu item |
| pane menu/help stale → screen delete | Underlays opacity `.42` and inert; confirmation owns pointer/focus | Cancel/close preserves screen, closes stale layers, restores tab cross; confirm focuses survivor |
| dropdown + tooltip stale → main dialog | Older overlays stay visible below modal but inert | Close removes stale overlays, restores Signals `+` |
| toast → active dialog | Toast remains visible below modal and never receives focus | Close dialog restores trigger; toast persists |
| main dialog → nested dirty confirm | Main card inert; nested is newest blocker | `Остаться` restores main close; confirm closes both as requested |
| inspector menu → tooltip | Menu is active, tooltip pointer-inert | Escape restores inspector ellipsis |

Modal and confirmation layers trap Tab/Shift+Tab, lock the app using `inert` and
resolve Escape newest-first. A passive toast never eclipses or disables active
modal controls. Screenshots include each required top state and its after-close
state at every required viewport.

## Interaction map

The following map is implemented by actual pointer, focus and keyboard actions.
Each `*` scenario runs at all three viewports unless noted. Exact records,
expected results, durations and pass status are in
`evidence/interaction-walkthrough.json`.

| Record id pattern | Click/focus/keyboard path | Covered states |
|---|---|---|
| `default-one-screen-*` | Load local entry | one screen, two real graphs, icon-only add, table geometry |
| `screen-overflow-*` | Click `+` eight times; click/keyboard arrows; click all tabs | left/middle/right, arrow hover/focus/active, graph on each screen |
| `screen-delete-*` | Hover/focus cross; Enter; Cancel; close; Delete | no pre-delete, cancel/close restoration, confirmed delete |
| `plotly-interactions-*` | LMB drag; double-click; Shift+LMB drag | real zoom, reset/autoscale, native pan, no tips/modebar |
| `area-menu-help-*` | Ellipsis → hover Clear → focus/click Help → Escape twice | common menu, help copy, no layout shift, focus restoration |
| `delete-over-pane-help-*` | Keep menu/help open → screen cross → Cancel | blocker over stale menu/help, pointer/focus owner |
| `clear-area-menu-*` | Ellipsis → keyboard Clear → Cancel | active-area action only inside menu |
| `settings-matrix-*` | Four types × three page tabs; both type selectors | all 12 settings combinations, two-way sync |
| `dropdown-checkbox-states-*` | Open menu; hover/focus/hold; disabled option/trigger; checkbox hover/focus | exact states, check marks, no wrap |
| `primary-button-states-*` | Hover/focus/hold Apply | geometry-stable button states |
| `table-swatches-*` | Hover dark; keyboard focus; select light | borderless default/hover/focus/selected |
| `table-inline-actions-*` | Row hover; keyboard focus; pointer hold; duplicate busy | resting/reveal/focus/active/disabled/long cell |
| `blocking-stale-*` | Open settings menu + tooltip → Signals `+` | blocking modal over stale dropdown/tooltip |
| `passive-toast-dialog-*` | Duplicate → toast → Signals `+` | passive toast below active dialog |
| `nested-confirm-*` | Add → select signal → close → Stay/Leave | nested trap and restoration |
| `inspector-menu-*` | Ellipsis → hover/toggle → Escape | eye icons, no Name action, 28px rows |
| `validation-error-1440x900` | Invalid range → Apply | error field and graph overlay |
| `loading-success-1440x900` | Apply → wait | loading graph and success toast |
| `empty-1440x900` | Pane menu → Clear → confirm | empty state over retained graph |
| `layout-10x10-1440x900` | Select 10/10 → Apply | non-blocking warning and 100 real graphs |

## Prototype states

Reachable states include default, hover, pressed, focus-visible, selected,
disabled, busy/loading, success, empty, validation error, warning, screen-list
overflow/edges, graph zoom/pan/reset, modeless overlays, main/nested/delete
dialogs, stale underlays and focus restoration. There is no backend API,
production state, polling, business validation, `data-testid` or application
runtime code.

## Russian copy inventory

Visible shell/navigation: `Анализатор сигналов`, `Версия 0.1.0`,
`Отображение сигналов`, `Экран {n}`, `Изменить макет`, `Настройки отображения`,
`Отображение`, `Время`, `Измерения`, `Сигналы`, `Пики`.

Screen/pane actions: accessible-only `Добавить экран`, `Удалить экран {n}`,
`Прокрутить экраны влево/вправо`; visible `Очистить область`,
`Управление графиком`; exact help copy is listed above.

Settings/control copy: `График`, `Тип графика`, `Показывать легенду`,
`Частотная ось`, `Спектральный анализ`, `Мощность`, `Плотность и мощность`,
`Параметры`, `Пределы времени`, `Пределы оси Y`, `Связь экранов`,
`Статистики`, `Применить`, `Применение…`, `Обновляется активная область`,
`Исправьте выделенные поля`, `Авто`, `Задать`, `Не применяется` and every field
label in the inventory tables.

Inspector/table copy: `Введите название`, `Имя`, `Цвет`,
`Частота дискретизации`, `Отсчёты`, `Длительность`, `Тип`,
`Видимость столбцов`, `Сигналы не найдены`, accessible `Добавить сигнал`,
`Другие действия`, `Дублировать сигнал {name}`, `Удалить сигнал {name}`,
`Показать/Скрыть столбец «{label}»`.

Dialog/state copy: `Добавление сигналов`, `Выберите поддерживаемые переменные из
рабочей области.`, `Частота дискретизации`, `Отмена`, `Добавить`,
`Закрыть без добавления?`, `Остаться`, `Закрыть`, `Удалить «Экран {n}»?`,
`Экран и его текущий макет будут удалены.`, `Удалить`,
`Очистить активную область?`, `Нет видимых сигналов`, `График не обновлён`,
`Обновление графика…`, `Настройки применены`, `Макет {r} × {c} применён`.

Allowed untranslated technical/user values: `Engee`, user signal/variable names,
`Hz`, `mHz`, `kHz`, `MHz`, `GHz`, `THz`, `ps`, `ns`, `μs`, `ms`, `s`, `dB`,
`RBW`, `DFT`, `RMS`, `cycles/year|day|hour|minute`, window names
`Blackman-Harris`, `Chebyshev`, `Flat-top`, `Hamming`, `Hann`, `Kaiser`,
`Rectangular`, and contract identifiers such as `ENGEE-*` / `DEC-*`.

## Asset inventory

All assets are package-local. SVG aspect ratios are preserved.

| Asset | Purpose / provenance |
|---|---|
| `assets/theme.css` | Byte-identical canonical visual-system theme; SHA-256 `31b98f…3c3cea` |
| Four `assets/fonts/roboto/*.ttf` | Canonical local Roboto regular/medium, Latin/Cyrillic |
| `engee-logo.svg` | Canonical toolbar logo, rendered 32×32 |
| `chevron-down-fill-16.svg` | Centered select chevron |
| `plus.svg`, `close.svg`, `more-vertical.svg` | Screen/Signals/pane controls |
| `eye.svg`, `eye-off.svg` | Column visibility only |
| `copy.svg`, `trash.svg` | Inline/menu actions |
| `help-circle.svg`, `import.svg`, `save.svg`, `tick-figma.svg` | Help, toolbar and success toast |
| `assets/vendor/plotly-cartesian-3.1.0.min.js` | Local interactive graph engine; SHA-256 `c462b4…c44c38` |

No CDN, remote image, API, source-map request or external font is referenced.

## Screenshot inventory

`screenshots/` contains 189 freshly generated PNGs. Naming is
`{state}--{viewport}.png`. Important sets:

- `workspace--default-one-screen--*`
- `screen-list--left-edge|middle|right-edge--*`
- `screen-arrow--hover|focus-visible|active--*`
- `screen-close--hover|focus-visible--*`
- `screen-delete-confirmation--open|cancelled|confirmed--*`
- `plotly--lmb-drag-zoom|double-click-autoscale|shift-lmb-pan--*`
- `overlay-area-menu-graph-help--top|after-close--*`
- `overlay-screen-delete-pane-help--top|after-close--*`
- `dropdown--default-selected|hover|focus-visible|pressed|disabled-option--*`
- `dropdown-trigger--disabled--*`, `checkbox--canonical-*`
- `settings--{display|time|measurements}--{time|spectrum|spectrogram|persistence}--*`
- `table-color-swatch--*`, `table-row-actions--*`, `table--long-last-cell--*`
- required modal/toast/stale overlay top/after-close sets.

The JSON evidence is the authoritative complete inventory. Screenshots are
evidence only; graphs in the prototype are live Plotly instances, never images.

## Verification summary

- Interaction records: `52 passed / 0 failed`.
- Screenshots: `189`.
- Browser console/page errors: `0`.
- Plotly source: package-local `file:` URL at all viewports.
- Plotly modebar/container: `0` after render and gestures.
- Built-in English notifier: absent after zoom/pan.
- Graph-help before/open/closed geometry: exact equality at all viewports.
- Tab scroll positions: left `0`, real middle values, exact right max at all
  viewports.
- Dropdown: exact 34px rows, no wrap/clipping, 14/20/400, 16px marks.
- Lower table zone: exact `−10px` from prior review in all viewports.
- `Имя` hide action: absent; table column present.
- 10×10: 100 interactive panes with axes/traces/legend.

## Version history

- `v1` — partial pre-publication package during TASK-0057 exploration.
- `v2` — full TASK-0057 package plus TASK-0067 priority revision; incorporates
  all user review corrections, local interactive Plotly, notifier suppression,
  exact dropdown/checkbox anatomy, one-screen startup, screen delete dialog,
  borderless swatches, always-visible Name and additional −10px table reduction.

