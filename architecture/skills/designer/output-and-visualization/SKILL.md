# Output and Visualization Designer

## Назначение и вход

Спроектируй область вывода по типу данных и пользовательским операциям. Для
Plotly-like layout используй `reference/graph-output-zone.html` и
`reference/graph-output-zone.css`; не считай их требованием использовать
Plotly или фиксированную сетку. Если output реализуется через Plotly, внешний
вид его canvas и modebar возьми из `reference/plotly-modebar.md`.

## Порядок работы

1. Определи главную visual output, secondary plots, legends и metadata.
2. Размести controls под или рядом с тем output, который они изменяют. Plot
   settings menus визуально переиспользуют canonical settings menu из
   `designer/visual-system`; не создавай отдельный menu style для графиков.
3. Спроектируй loading overlay без потери контекста, а также empty, error,
   warning и ready states.
4. Задай правила resize, min size, aspect behavior, grid и scroll для каждого
   viewport. Сохраняй canonical proportions plot frame/padding/control
   rows/icons; меняй layout сетки только по ТЗ или required viewport.
5. Учитывай длинные labels, несколько plots и отсутствие части результатов.

Не определяй технический Plotly config, backend payload, readiness contract,
polling, calculation queue или error semantics. Внешний вид Plotly canvas и
modebar является design contract и передаётся Frontend без указания способа
реализации. Используй только факты из ТЗ.

## Проверка и завершение

Проверь видимость controls, overlays и errors, отсутствие перекрытия plot,
canonical plot-settings menus, сохранение proportions и адаптацию нескольких
outputs. Для Plotly проверь белый canvas/modebar и серые default/hover/active
icons без layout shift. Добавь screenshots всех обязательных visual states и правила
геометрии в `DESIGN.md`.
