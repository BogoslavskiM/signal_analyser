---
name: state-model
---
# Backend State Model

## When to Use
- Нужно спроектировать backend state для inspector-style приложения.
- Нужно создать backend типового приложения с нуля.
- Нужны domain objects, main object, selected objects, order, view state или table payload.
- Нужно решить, какие данные живут в inspector, object или view state.

## When NOT to Use
- Нужно выбрать canvas geometry или разместить UI-элементы.
- Нужно только изменить существующий endpoint без изменения state model.

## Core Contract
- Моделируй только domain/view capabilities, выбранные в blueprint.
- Используй typed Julia structures и stable ids для изменяемых сущностей.
- Не помещай runtime resources в persistent state.

## Optional Capabilities
- `state.inspector` — object map/order/main/selection/table payload.
- `state.calculation-zones` — persistent data/isready/success/error per zone.
- `state.pages` — stable page metadata/opened/main page.
- `state.session` — import/export identity и persistent snapshot.
- `state.worker-queue` — runtime dirty/queue/cancellation/revision state.

## Selected Capability Contracts
Следующие правила обязательны только для включённых optional capabilities:
- Возвращай после каждой inspector CRUD mutation объект `table` с `columns`, `rows`, `order`, `main_object` и `selected_objects`.
- Передавай в `rows` stable `id`, `name` и `cells` всех согласованных дополнительных table fields.
- Представляй каждую дополнительную cell как `{value, units}`. Допускай `value=null` только для ещё не рассчитанного table value.
- Используй stable object ids в `order`, `main_object` и `selected_objects`.
- Не заменяй table payload списком имён, изменённой строкой или общим массивом domain objects.
- Храни результат последнего успешного расчёта отдельно для каждой расчётной зоны внутри domain object.
- Храни `data`, `isready`, `success` и `error` расчётной зоны в persistent-структуре объекта, чтобы они сохранялись и импортировались вместе.
- Храни внутренний boolean `dirty` или `need_update` отдельно для каждой расчётной зоны. Не подменяй им API-поле `success`.
- Не требуй metric columns или видимого header row: минимальный inspector может содержать checkbox, имя и row actions.

## Workflow
1. Используй inspector-style модель только при `state.inspector`.
2. Дай каждому domain object стабильный `id`, не зависящий от изменяемого имени.
3. Храни в inspector object map, порядок идентификаторов, selected object ids, main object id и view state.
4. Создай domain object для настраиваемой сущности. Храни в нём typed settings, derived characteristics и отдельные состояния расчётных зон: типизированный `data`, `isready`, `success`, `error`.
5. Храни только текущие draft settings. Не создавай applied-копию и флаг `settings_dirty`.
6. Создай view state для active/visible zones, page controls, columns и search/menu state. В сессию включай типизированные page controls, но не включай временный Plotly viewport, открытые меню, hover и runtime-механизмы.
7. Для каждого multi-page element храни stable page metadata, backend order, opened page ids и `main_page`. Не смешивай статическую metadata с `data/isready/success/error`.
8. Создай calculation-manager state только при `state.worker-queue`; capability
   включается после измерений либо явного требования.
9. Добавь constructors, defaults, name/id generators и mutation helpers: create, duplicate, delete, rename, select, bulk-select, set-main и update. Не добавляй reorder, пока он не требуется явно.
10. Делай созданный и дублированный объект новым main object. После удаления main object выбирай первый оставшийся объект в текущем порядке.
11. Всегда включай main object в расчёты независимо от selected object ids.
12. Возвращай после CRUD полный table payload, а не только изменённый id или список имён.
13. Реализуй bulk-select над всеми объектами либо над переданным подмножеством ids. При выборе добавляй target ids к текущему selection, при снятии удаляй только target ids и сохраняй selection вне подмножества.
14. Выполняй поиск по полученным строкам на frontend. Search query и visible columns оставляй frontend-only state.
15. Для каждой расчётной зоны задай типизированную пустую структуру `data`, используемую до первого успешного расчёта. Не создавай расчётное состояние для статической frontend-страницы.
16. При новом Apply, отмене или ошибке расчёта не удаляй последнее успешно рассчитанное `data`.
17. При сохранении сессии немедленно снимай состояние persistent-структур объектов, не ожидая активных расчётов. Включай settings, page controls, последнее полностью записанное `data`, `isready`, `success`, `error`, `selection` и `main_object`.
18. При импорте сохраняй статусы расчётных зон такими, какими они записаны в объекте. Не заменяй их автоматически на `isready=true`, `success=true`.
19. При `state.session` добавляй обязательное поле `__genie_app_name`; его
    значение должно быть стабильным именем приложения.
20. Runtime-очередь, worker thread, cancellation token и logs не сериализуй. После импорта создай runtime-инфраструктуру заново и перестрой очередь с учётом импортированных статусов; не пересчитывай зоны, импортированные как готовые.
21. Покрой mutation helpers и инварианты inspector unit-тестами без HTTP.

## Guardrails
- Предпочитай typed Julia structs и enums для domain settings.
- Используй полиморфизм, когда варианты реально имеют разное поведение.
- Не плодить типы ради косметических отличий или одного поля.
- Не используй изменяемое имя как единственный идентификатор объекта.
- Не добавляй backend-фильтрацию без пагинации, большого набора данных или явного требования.
- Не держи business logic в HTTP routes.
- Не сохраняй Plotly zoom, pan и selection как backend view state.
- Не используй raw Dict как основную domain model, если структура стабильна.

## Reference
- Используй предметные имена типов инспектора, объектов и состояния
  представления, соответствующие текущему приложению.
- Идентификатор формата сессии хранится под стабильным ключом
  `__genie_app_name`; имя константы и проверяющей функции формируй из имени
  текущего приложения.
- Для API поверх state используй `backend/api-contract-planning`.

Table payload:

```text
table:
  name_label: заголовок служебной name-колонки
  columns: metadata дополнительных колонок
  rows: stable id, name и cells всех строк
  order: object ids в порядке отображения
  main_object: stable object id
  selected_objects: stable object ids
```

Column metadata содержит `id`, `label`, `tooltip`, `type`, `default_visible`,
`min_width`, `max_width` и необязательную `abbreviations` map.

Каждая дополнительная cell:

```text
value: типизированное display value после смыслового преобразования backend
units: выбранная backend единица измерения
```

Backend выбирает единицу и выполняет смысловое преобразование вроде
`0.25 -> 25 %`, но не округляет число для UI. Frontend округляет его до пяти
значащих цифр. Для string и enum используй ту же cell shape.

Не включай в table payload settings и outputs, если они не являются согласованными колонками таблицы.
