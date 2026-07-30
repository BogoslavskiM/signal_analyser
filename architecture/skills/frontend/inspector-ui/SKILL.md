---
name: inspector-ui
version: 0.2.0
---
# Inspector UI

## When to Use
- Нужно реализовать inspector объектов типового Genie-приложения.
- Нужны table или headerless list, `main_object`, checkbox selection, CRUD, поиск или управление колонками.
- Нужно отобразить типизированные table cells и единицы измерения.

## When NOT to Use
- Нужно реализовать backend inspector state или mutation helpers.
- Нужна серверная фильтрация, pagination, virtualization, sorting или reorder.

## Bundled Template
Используй готовый комплект:

- `assets/template.js` — Vue 3 global module для state, computed, actions и форматирования cells;
- `assets/template.css` — таблица, headerless list, sticky cells, toolbar, hover actions и column menu;
- `assets/template.html` — явный inspector template.

1. Прочитай все три файла.
2. Скопируй их содержимое в соответствующие JS/CSS/HTML пути целевого приложения.
3. Создай модуль через `window.GenieInspectorUi.create(...)`.
4. Передай API actions: `create`, `duplicate`, `delete`, `setMain`, `setSelected`, `setBulkSelected`.
5. Зарегистрируй module sections в одном root Vue app.
6. Замени generic title, description и action icon classes на значения текущего приложения.
7. Не переноси namespace и domain fields приложения-источника.

## Table Contract
Используй payload:

```text
table:
  name_label
  columns
  rows
  order
  main_object
  selected_objects
```

Каждая row содержит stable `id`, `name` и `cells`. Каждая дополнительная cell
имеет одинаковую форму:

```text
value
units
```

- Backend выбирает единицу и выполняет смысловое преобразование display value.
- Frontend округляет числовое `value` до 5 значащих цифр и добавляет `units`.
- Для `value=null` показывай `—`.
- Для string и enum используй ту же cell shape.
- Показывай полное значение с единицей в tooltip.

Metadata дополнительной колонки:

```text
id
label
tooltip
type
default_visible
min_width
max_width
abbreviations
```

- `abbreviations` является необязательной map полного string/enum value в короткую UI-метку.
- Показывай сокращение в cell, а полное значение в tooltip.
- Не храни domain-specific abbreviation map непосредственно в generic renderer.

## Table and List Modes
- Считай inspector таблицей, если backend задал хотя бы одну дополнительную column metadata.
- Считай inspector headerless list, только если `columns` изначально пуст.
- Не переключай table в list, когда пользователь скрыл все дополнительные колонки.
- В table header показывай select-all checkbox, name label и заголовки видимых дополнительных колонок.
- Не показывай текстовый header для checkbox и row actions.
- В headerless list не показывай header и select-all.

## Main Object and Selection
- По нажатию на row отправляй `setMain`; не меняй main object оптимистично.
- Считай checkbox отмеченным, если row id равен `main_object` или входит в `selected_objects`.
- Разрешай нажать checkbox main object. Backend обновляет selection, но main row остаётся визуально отмеченной, поскольку main object всегда участвует в расчётах.
- Останавливай row click при нажатии checkbox или action.
- Select-all применяй только к строкам текущего frontend name filter.
- Не изменяй selection объектов вне фильтра.
- Не используй `indeterminate`: при частичном выборе select-all выглядит пустым.

## Search, Columns and Order
- Выполняй case-insensitive поиск только по `row.name`.
- Храни search query и visible column ids только на frontend.
- Показывай column menu по кнопке с тремя точками в toolbar.
- Разрешай скрывать только дополнительные columns.
- Всегда показывай checkbox, name и row actions.
- Используй backend `order`; не добавляй sorting и reorder.
- Не добавляй pagination и virtualization без отдельного требования.

## Layout and Actions
- Разрешай горизонтальный scroll широкой таблицы.
- Закрепляй table header сверху, checkbox и name слева.
- Показывай row actions при hover или focus-within.
- Размещай row actions поверх последней видимой дополнительной cell. Если все дополнительные columns скрыты или inspector является list, размещай actions в name cell.
- Оставляй create, duplicate и delete в toolbar.
- Оставляй duplicate и delete также в каждой row, как в текущем приложении.
- Добавляй save/export только по контракту конкретного приложения.
- Не показывай confirmation dialog перед delete.
- Не допускай удаление последнего объекта на backend; полученную ошибку показывай в общем error dialog.

## Async Updates
- Не применяй optimistic CRUD, selection или main-object update.
- Отключай на время запроса только запущенную action button.
- После успешного ответа заменяй полный `table`.
- Не блокируй search, scroll и несвязанные rows.
- Защищай ответ context key и request id по правилам `frontend/frontend-state-management`.

## Verification
- Проверь stable `data-testid` toolbar actions, rows, checkbox, row actions,
  columns menu и empty state.
- Проверь table mode, headerless list и table со всеми скрытыми дополнительными columns.
- Проверь main row, checkbox selection и нажатие checkbox main object.
- Проверь select-all с name filter и сохранение selection вне фильтра.
- Проверь отсутствие `indeterminate`.
- Проверь frontend rounding, units, `null`, abbreviations и tooltip.
- Проверь sticky header, checkbox/name cells и горизонтальный scroll.
- Проверь toolbar actions, hover row actions и backend error последнего delete.
- Запусти `node --check` для перенесённого JS и `node test/front/run_front_tests.js`.
