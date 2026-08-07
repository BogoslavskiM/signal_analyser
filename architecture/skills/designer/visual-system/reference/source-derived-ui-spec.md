# Source-derived Engee UI specification

Этот документ фиксирует не абстрактные рекомендации, а значения из двух
рабочих Engee-приложений:

- `pulse_waveform_analyser/public/css/theme.css`;
- `pulse_waveform_analyser/public/css/app/zones/toolbar.css`;
- `pulse_waveform_analyser/public/css/app/controls/settings_controls.css`;
- `pulse_waveform_analyser/public/css/app/controls/multi_page_window.css`;
- `pulse_waveform_analyser/public/css/app/zones/signal_list.css`;
- `pulse_waveform_analyser/public/css/app/dialogs/*.css`;
- `windowdesigner/public/css/theme.css`.

Исходные CSS были прочитаны 2026-08-05. Этот переносимый reference является
нормативной выжимкой: downstream-проекты не должны зависеть от абсолютных
путей к исходным репозиториям.

## Правило выбора

Общие значения ниже являются default. Там, где приложения расходятся, не
усредняй размеры и не смешивай значения внутри одного компонента. Выбери один
из двух profiles по ближайшему reference-приложению и запиши выбор в
`DESIGN.md`:

- `analytical-dense` — Pulse Waveform Analyser: много графиков, tabs, плотная
  таблица и правая settings zone;
- `form-workbench` — Window Designer: два крупных графика, список объектов,
  form inspector и компактные toolbar actions.

ТЗ и явно выбранный Figma node имеют приоритет. Любое новое значение вне этой
спецификации оформляй как deviation, а не как новый молчаливый стандарт.

## Общие tokens

| Token | Значение | Назначение |
|---|---:|---|
| app background | `#f6f8fa` | Фон приложения |
| surface | `#ffffff` | Panels, controls, dialogs |
| surface muted | `#f8f8f8` | Мягкий hover/background |
| text | `#212121` | Основной текст |
| line | `#e1e1e1` | Стандартная граница `1px` |
| button border | `#e9e9e9` | Граница primary button в Window Designer |
| accent | `#1b84b8` | Primary, focus, selected indicator |
| accent hover | `#166a93` | Hover primary action |
| accent active | `#104f6e` | Pressed primary action |
| button hover | `#f8f8f8` | Secondary button hover |
| button active | `#f2f2f2` | Secondary button pressed |
| option hover | `#f5f5f5` | Combobox option hover |
| row hover | `#f2f2f2` | Table/list row hover |
| selected row, analytical | `#e9f6fb` | Pulse selected table row |
| selected row, form | `#eef8fc` | Window Designer selected list row |
| file-browser hover | `#e6f5fc` | Window Designer tree selection |
| success | `#0d783b` | Success indicator |
| danger, analytical | `#b3261e` | Pulse destructive action |
| danger, form | `#c62828` | Window Designer destructive action |

Common geometry:

| Component | Standard |
|---|---:|
| Body text | `14px / 400` Roboto |
| Main toolbar title | `18px / 500` Roboto |
| Panel title | `16px / 500` Roboto |
| Dialog title | `20px / 500` in `form-workbench`; `16px / 500` in `analytical-dense` |
| Tooltip | `12px / 400` Roboto |
| App edge padding / zone gap | `8px / 8px` |
| Standard control height | `32px` |
| Standard control radius | `6px` |
| Standard panel radius | `8px` |
| Dialog and file-browser radius | `12px` |
| Standard button padding | `6px 12px` |
| Standard icon | `16px`; toolbar icon `24px` |
| Standard transition | `120ms ease`, only color/background/border/opacity |

Ни hover, ни pressed, ни selected не меняют width, height, padding, border
width или расположение соседей.

## Plotly canvas и modebar

Для всех Engee-графиков закреплён единый светлый вид, соответствующий
reference-графику Window Designer:

| Элемент | Значение |
|---|---:|
| `paper_bgcolor` | `#ffffff` |
| `plot_bgcolor` | `#ffffff` |
| modebar background | `#ffffff`, без прозрачности, border и shadow |
| default modebar icon | `#b8b8b8` |
| hover icon / surface | `#7a7a7a` / `#f8f8f8` |
| active icon / surface | `#5f5f5f` / `#f2f2f2` |

Сохраняй стандартные Plotly glyphs, порядок и геометрию кнопок. Скрывай
Plotly logo. Hover/active меняют только цвет и фон: modebar не должна
сдвигаться, затемняться целиком или получать отдельную тёмную подложку.

## Toolbar profiles

| Property | `analytical-dense` | `form-workbench` |
|---|---:|---:|
| Shell min-height | `44px` | `48px` |
| Shell padding | `6px 16px` | `8px 16px` |
| Brand gap | `8px` | `12px` |
| Actions gap | `2px` | `12px` |
| Icon action | `36 × 32px` | `28 × 28px` |
| Icon action radius | `8px` | `8px` |
| Icon | `24 × 24px` | `24 × 24px` |
| Logo | `32 × 32px` | `32 × 32px` |
| Split/menu action | `52 × 32px` | min-width `42px`, min-height `28px` |
| Separator | `1 × 32px` | `1 × 28px` |

Toolbar icon hover:

- `analytical-dense`: background `#f8f8f8`, icon remains `#7a7a7a`;
- `form-workbench`: background `#f6f8fa`, icon changes from `#7a7a7a` to
  `#5f5f5f`;
- destructive action keeps the same geometry and changes only color to the
  profile danger token.

## Buttons and fields

- Standard button: min-height `32px`, padding `6px 12px`, gap `8px`, border
  `1px`, radius `6px`.
- Primary: default `#1b84b8`, hover `#166a93`, pressed `#104f6e`, white text.
- Secondary: white default, hover `#f8f8f8`, pressed `#f2f2f2`; border remains
  `#e1e1e1`.
- Side-panel Apply: `analytical-dense` uses min-width `96px`, min-height
  `30px`, padding `7px 16px`; `form-workbench` uses `120 × 32px`, padding
  `6px 12px`.
- Input/select: height `32px`, border `1px solid #e1e1e1`, radius `6px`.
  Plain input padding is `8px 4px 8px 8px`; select padding is
  `8px 24px 8px 8px`, with a `16px` chevron at `right 4px center`.
- Focus uses accent border. Save/export fields additionally use
  `box-shadow: 0 0 0 3px` with accent-soft. Keyboard-only actions without a
  source focus rule receive a `2px` accent `focus-visible` outline as the
  accessibility completion.
- Disabled controls retain geometry; use muted/surface-muted or the specified
  disabled primary `#75b5d4`, and remove the pointer cursor.
- Error/warning keeps radius `6px` and changes the border to `2px`; reserve the
  extra pixel inside the control so surrounding layout does not move.

## Settings, menus and lists

Settings geometry:

- `analytical-dense` side row: min-height `40px`, columns
  `140px minmax(0, 1fr)`, gap `8px`, padding `4px 8px 4px 48px`;
- collapsible section title: min-height `36px`, padding `6px 8px`;
- `form-workbench` dialog row: min-height `44px`, gap `16px`, padding
  `6px 0 6px 20px`; label is `140px` for save forms and `220px` for analysis
  settings; right control inset is `20px`.

Menu geometry:

| Menu | Width | Item | Radius | Padding/gap |
|---|---:|---:|---:|---|
| Analytical toolbar | `224px` | `28px` | `8px` | item `4px 12px`, icon gap `24px` |
| Form toolbar | min `230px` | `28px` | `8px` | item `4px 12px`, icon gap `24px` |
| Column visibility | `244px` | `28px` | `8px` | item `4px 12px` |
| Combobox/settings | anchor width | min `34px` | `6px` | item `6px 12px`, gap `12px` |

Toolbar/column item hover is `#f2f2f2` in the analytical profile and
`#f6f8fa` in the form profile. Combobox option hover is `#f5f5f5`. A selected
combobox option keeps its size and exposes the `16px` state icon; visible and
hidden table columns use `eye.svg` and `eye-off.svg`, never a checkbox.

Lists and tabs:

- analytical table header/body row `32px`, cell padding `6px 8px`;
- form object-list row `28px`, padding `4px 8px`;
- row hover `#f2f2f2`; persistent selected uses the profile selected-row token;
- contextual row actions appear by opacity/visibility on row hover,
  `focus-within`, or persistent selection; the row never changes width;
- multi-page header and tabs are `32px`; tab min/max width `132/240px`, padding
  `0 8px 0 16px`, gap `8px`; close target/icon is `16px`, radius `4px`;
- selected tab uses accent-soft and `inset 0 -3px 0 #1b84b8`; `:active` is only
  the transient pointer-down state and is not a replacement for selection.

Checkboxes are `16 × 16px`, radius `2px`; hover adds a `3px #f2f2f2`
outline, checked uses accent, checked-hover uses accent-hover.

## Dialogs, file browser and overlays

- Generic/success dialog width: `480px` with `32px` viewport margin.
- Analytical save dialog width: `560px`; form analysis dialog width: `620px`.
- Dialog radius: `12px`; title bar `48px`; title/action edge padding `16px`;
  footer min-height `56px`; action gap `8px`.
- File browser: `480 × 380px`, viewport margin `48px`, radius `12px`; internal
  rows `22px`, current-path row `32px`, footer `64px`.
- Ordinary modal backdrop: `rgba(33, 33, 33, 0.2)`; file browser uses
  `rgba(33, 33, 33, 0.68)`.
- Close action is `32 × 32px`, radius `6px`, icon `16px`; hover uses the
  profile muted hover background.
- Success icon is `16 × 16px`, circular `2px #0d783b` border with a green
  check; content gap `16px`.
- Tooltip radius `4px`, padding `8px 12px`; show/hide changes only opacity and
  a small transform, never layout.

## Interaction-state contract

- `hover`: pointer is over an available target; only visual feedback changes.
- `active` / pressed: pointer or key is currently held; state disappears after
  release.
- `selected`: persistent application state represented by `.selected`,
  `.active`, `aria-selected="true"` or `aria-pressed="true"`.
- `focus-visible`: keyboard navigation state; it must remain distinguishable
  even where the legacy CSS only contains `:focus`/`:focus-within`.
- `disabled`: unavailable and non-clickable; hover and active styling must not
  override it.

Open `interaction-state-showcase.html` and verify all five states with mouse
and keyboard. E2E should compare computed colors, dimensions and persistence,
not just screenshot pixels.
