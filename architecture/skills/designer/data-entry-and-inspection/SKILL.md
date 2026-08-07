# Data Entry and Inspection Designer

## Назначение и вход

Спроектируй видимые settings и object inspection flows. Загружай
`reference/settings-controls.html` и `.css` для forms, а
`reference/inspector-ui.html` и `.css` для lists/tables. Используй только
controls и capabilities, подтверждённые ТЗ.

## Порядок работы

1. Определи visual type каждого поля, label, units, help, readonly/disabled и
   required indicators.
2. Покажи draft, validation error, warning, busy and applied state так, чтобы
   пользователь понимал, какое значение принято.
3. Для inspector определи main item, selection, hover/row actions, search,
   columns, empty state и длинные значения.
4. Для menu видимости столбцов используй только canonical `eye.svg`/`eye-off.svg`:
   открытый глаз означает видимый столбец, перечёркнутый — скрытый. Не заменяй
   эти состояния checkbox или галочкой.
5. Все enum и другие menus внутри settings строй максимально по canonical
   settings menu: 32px control, 34px item, theme surface/line/radius/shadow,
   одинаковые padding, hover/active/selected и focus states.
6. Разделяй состояния menu-компонента и DOM focus. `open` означает видимый
   popup, `active` — текущий подсвеченный option, `selected` — сохранённое
   значение, `not active` — popup закрыт и active option отсутствует. После
   выбора option ЛКМ всегда показывай `not active`: menu закрыт, active
   highlight снят, обычная рамка восстановлена. Не требуй принудительно снимать
   DOM focus с trigger; оставшийся keyboard focus может сохранять отдельный
   focus-ring.
7. В interaction map закрепи: pointer/click по холсту приложения или любому
   месту вне trigger и popup закрывает все открытые dropdown. Клик по другому
   dropdown закрывает предыдущий и открывает выбранный.
8. Проверяй checkbox и checkmark как отдельные visual assets/states: точный
   размер, форму, толщину штриха, выравнивание, цвет и состояния
   default/hover/checked/disabled. В menu видимости столбцов это правило не
   заменяет canonical eye/eye-off semantics.
9. Для input/select фиксируй точную толщину рамки в
   default/hover/focus/disabled/warning/error. Изменение цвета или толщины
   рамки не должно менять внешний размер control или сдвигать соседние
   элементы; используй предусмотренную template box geometry.
10. Сохраняй proportions settings panel: row/control heights, label-to-control
   ratio, group rhythm, column-menu/icon sizes. Меняй только требуемую ТЗ
   раскладку, а не внутренние размеры каждого элемента независимо.
11. Проверь keyboard focus order, visible focus и доступность icon-only actions.
12. Проверь узкие и широкие панели, overflow labels, units и validation text.

Не определяй parser, authoritative state, request guards, CRUD API или backend
validation. Mock prototype может переключать состояния, но не выполнять
реальные операции.

## Проверка и завершение

Проверь default/error/disabled/busy/empty states, читаемость labels, отсутствие
layout shift при validation, canonical menu geometry, LMB transition в
`not active`, закрытие всех dropdown внешним кликом, checkbox/checkmark stroke,
точную field-border thickness, eye/eye-off semantics и сохранение proportions.
Запиши element/state matrix, interaction map и viewport rules в `DESIGN.md`.
