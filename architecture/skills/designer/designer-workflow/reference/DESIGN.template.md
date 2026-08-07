# Design package

- Task: `TASK-XXXX`
- Design mode: `autonomous | review`
- Design status: `ready | partial | user_decision_required`
- Design version: `1`
- Canonical UI profile: `analytical-dense | form-workbench`
- Prototype entry: `prototype/index.html`

## Scope

Опиши пользовательскую цель, включённые экраны и out of scope.

## Sources

Перечисли применённые требования, шаблоны и Figma references. Зафиксируй
существенные автономные решения.

### Used visual references

| Screenshot/template | Extracted pattern or measurement | Explicitly ignored app-specific content |
|---|---|---|
| `<reference path>` | `<proportion/state/menu/dialog rule>` | `<layout/labels/data/browser chrome>` |

## Screens and zones

| Screen | Zone | Purpose | Required viewport |
|---|---|---|---|
| `<screen>` | `<zone>` | `<purpose>` | `<width>x<height>` |

## Interaction and state matrix

| Element | Trigger | Visible result | States | Responsive rule |
|---|---|---|---|---|
| `<element>` | `<action>` | `<result>` | `<states>` | `<rule>` |

## Prototype walkthrough

| Step | `data-design-id` | User action | Expected visible state | Screenshot |
|---|---|---|---|---|
| `1` | `<design-id>` | `<click/focus/input>` | `<state>` | `<path>` |

Каждый required state должен достигаться кликом/фокусом в локальном prototype
без backend API. `data-design-id` используется только для чтения дизайна E2E и
не становится production `data-testid`.

## Page sizing contract

```yaml
page_sizing_contract:
  application_min_width: <px>
  application_min_height: <px>
  layout_invariant_on_resize: true
  undersized_viewport_behavior: document_scroll
  structural_max_sizes: none
  zones:
    - id: <zone-id>
      min_width: <px>
      min_height: <px>
      width_growth_ratio: <number>
      height_growth_ratio: <number>
  fixed_template_controls:
    - id: <control-pattern>
      width: <px or intrinsic>
      height: <px>
```

Viewport меньше application minimum не меняет composition: application canvas
остаётся минимального размера, а document/root предоставляет горизонтальный
и/или вертикальный scroll. Для растягиваемых structural zones не задаются
`max-width`/`max-height`; resize не переставляет, не складывает и не скрывает
зоны. Canonical fixed controls сохраняют точные template sizes.

## Visual contract

Опиши tokens, geometry, overflow, overlays, assets и визуальные accessibility
requirements. Не описывай API, DOM modules или production state.

### Typography, colors and menus

- Headings: local Roboto Medium 500.
- Colors/shadows/radii/control sizes: canonical `theme.css` tokens.
- Geometry/state source: `source-derived-ui-spec.md`; profile выбран целиком,
  без усреднения двух приложений.
- Settings menus: canonical menu proportions/states; перечисли только
  подтверждённые deviations.
- Column visibility: `eye.svg` for visible, `eye-off.svg` for hidden; no
  checkbox/checkmark.

### Proportion contract

| Component | Canonical reference | Preserved proportions | Required layout change | Allowed deviation |
|---|---|---|---|---|
| `<toolbar/settings/graph/menu/dialog>` | `<reference>` | `<sizes/ratios>` | `<task reason or none>` | `<explicit delta>` |

Не считать responsive rearrangement разрешением независимо растягивать toolbar
actions, settings rows, icons, graph padding или menu items.

Для каждого интерактивного компонента укажи source-derived default, hover,
pressed, selected, focus-visible и disabled values. Проверяй, что state change
не меняет geometry.

### Overlay priority

Если overlays не сосуществуют, укажи `not_applicable`. Иначе заполни:

| Combination | Bottom → top | Active pointer owner | Focus owner | Restore after top closes |
|---|---|---|---|---|
| `<parent + child + error>` | `<backdrop → parent → child → error>` | `<top layer>` | `<target>` | `<next layer/target>` |

Отдельно зафиксируй поведение stale dropdown/tooltips, passive toasts и nested
backdrops. Значения CSS могут быть tokens; обязательна наблюдаемая иерархия.

## Evidence

Перечисли prototype entry point и screenshots по схеме
`<screen>--<state>--<viewport>.png`.

### Local asset inventory

| Asset | Package path | Canonical source | Used by |
|---|---|---|---|
| `<Roboto/SVG>` | `<local path>` | `<visual-system reference>` | `<elements>` |

## Acceptance

- Каждый обязательный screen/state/viewport покрыт.
- Prototype работает на mock data без API и runtime CDN.
- Все пути и assets локальны.
- Prototype interaction map полностью прокликивается.
- Headings используют local Roboto; SVG сохраняют исходный aspect ratio.
- Canonical colors, settings menus и component proportions соблюдены либо
  deviation явно зафиксирован.
- `page_sizing_contract` заполнен и проверен на minimum, минимум двух larger и
  одном undersized viewport; layout не меняется, structural maxima отсутствуют,
  а undersized viewport использует document scroll.
- Для допустимых overlay combinations определены topmost layer, hit/focus
  ownership и restoration order.

## Change log

- `v1`: initial package.
