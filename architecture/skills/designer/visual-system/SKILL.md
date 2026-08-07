# Visual System Designer

## Назначение

Сформируй общую visual foundation дизайн-пакета. Используй ТЗ выше локальных
patterns; затем применяй `reference/theme.css` и
`reference/control-showcase.html`. Для выбора локальной графики открой
`reference/icon-showcase.html`; полный набор SVG находится в каталоге
reference/icons, а Roboto — в reference/fonts/roboto. Для evidence реальных
application proportions/states начни с
`reference/screenshots/README.md`, выбери подходящий application catalog и
просмотри относящиеся к задаче PNG. Точные source-derived размеры, радиусы и
interaction-state values возьми из
`reference/source-derived-ui-spec.md`; не заменяй их приблизительными
значениями со screenshot. Корпоративную Figma Engee Apps используй
для недостающих или явно требуемых visual decisions. Не требуй Figma Editor:
для локального результата достаточно доступного read context.

## Порядок работы

1. Выбери `analytical-dense` или `form-workbench` profile из
   `reference/source-derived-ui-spec.md`; не смешивай profiles внутри одного
   компонента. Зафиксируй typography, colors, spacing, borders, radius, shadows
   и z-index. Для всех заголовков используй локальный Roboto с weight 500; не
   синтезируй отсутствующий bold и не подключай font CDN.
2. Определи базовые buttons, inputs, selects, checkboxes, labels, dividers,
   panels, tables, tabs и scroll areas.
3. Покрой применимые hover, focus-visible, active, disabled, busy, error,
   warning и success states. Открой `reference/interaction-state-showcase.html`
   и реально наведи pointer, удержи press, переключи selected и пройди Tab:
   не подменяй persistent selected кратким CSS `:active` и не смешивай его с
   keyboard focus-visible. Colors, timings, dimensions и radii сверяй с
   source-derived specification.
4. Используй только tokens из `reference/theme.css`. Базовые controls имеют
   высоту `32px`, radius `6px`; panels — `8px`, dialogs — `12px`. Не вводи
   новый hex/color, shadow, radius или control size, пока ТЗ/Figma не требует
   отличия; такое отличие запиши в `DESIGN.md`.
5. Копируй в конкретный design package четыре Roboto files и только фактически
   используемые SVG, сохраняя исходные filenames, `viewBox` и aspect ratio. Не
   редактируй канонические SVG и не растягивай их непропорционально.
6. Во всех menus настроек максимально сохраняй canonical menu из
   `control-showcase`: размеры control/item, surface, border, radius, shadow,
   hover/active/selected, padding и focus. Меняй состав/labels/options по ТЗ, а
   visual pattern — только при явном требовании.
7. В menu настройки видимости столбцов таблицы всегда используй
   `reference/icons/eye.svg` для видимого столбца и
   `reference/icons/eye-off.svg` для скрытого. Checkbox/checkmark в этом menu
   запрещён; обычные boolean settings по-прежнему используют checkbox.
8. Для icon-only action укажи видимый tooltip expectation и accessible name.
9. Проверь contrast, различимость focus, минимальные targets и читаемость
   disabled/error states.
10. Screenshot references используй для измерения proportions, menu/dialog
    density, overlays и interaction states. Не считай browser chrome,
    app-specific labels/data или расположение зон обязательным pattern; в
    `DESIGN.md` перечисли exact files и извлечённые из них решения.
11. Для Plotly используй canonical white canvas/modebar и grey icon states из
    `reference/source-derived-ui-spec.md`. Дизайнер фиксирует внешний вид и
    states, но не выбирает frontend config или payload implementation.

Сохраняй пропорции canonical components: высоту toolbar и его actions, высоту
settings controls/rows, соотношение label/control, размеры plot padding и
controls, menu items, dialogs и icons. При required viewport допускай
равномерное масштабирование или изменение раскладки зон, но не растягивай
отдельные внутренние элементы независимо. Меняй layout только настолько,
насколько требует ТЗ; фиксируй изменённые пропорции как явное deviation.

Шаблоны являются отправной visual системой, а не продуктовым scope. Не
добавляй controls только из-за их присутствия в showcase и не меняй API,
business validation или frontend architecture.

## Проверка и завершение

Проверь единообразие tokens и состояний, Roboto на headings, canonical settings
menus, eye/eye-off column visibility, существование локальных assets, сохранение
aspect ratios/component proportions и отсутствие дублированных component
values. Проверь, что hover/active/selected/focus не меняют geometry и не
создают layout shift, а выбранный source-derived profile применяется
последовательно. Отдельно проверь белый Plotly canvas/modebar, серые default,
hover и active icons. Запиши profile, применённые tokens, copied asset inventory,
proportion contract, отклонения и Figma-derived решения в `DESIGN.md`.
