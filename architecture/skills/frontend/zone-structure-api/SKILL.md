---
name: zone-structure-api
---
# Структура зон и подключение API

Начинай после zoning и завершённого `task-analysis`. Используй только
подтверждённые API contracts. Базовый формат реализации — HTML + JS + CSS.

## Типовые зоны

- `app_data_inspector` — список или таблица объектов, выбор и доступные actions;
- `data_item_settings` — настройки выбранного объекта;
- `data_display` — отображение данных, чаще всего Plotly-график;
- `multi_page_zone` — контейнер вкладок, внутри которого размещаются другие
  статические или расчётные зоны.

Для каждой используемой зоны сначала прочитай её JS/HTML pattern:

```text
assets/app_data_inspector/
assets/data_item_settings/
assets/data_display/
assets/multi_page_zone/
```

## Порядок работы

1. Сопоставь каждую зону из zoning с одним из patterns либо явно обоснуй новую
   структуру.
2. Возьми соответствующий JS/HTML pattern за основу; адаптируй domain names,
   тексты, stable ids и доступные capabilities.
3. Свяжи actions и data с method, path, request, response, errors и lifecycle,
   зафиксированными в `task-analysis`.
4. Храни authoritative data в backend snapshots; на frontend оставляй только
   view state и допустимый локальный draft.
5. Реализуй default, loading, empty, error, success и disabled states, когда
   они предусмотрены контрактом.
6. Добавь stable `data-testid` всем наблюдаемым actions и состояниям.
7. Если pattern требует отсутствующие данные или API, отправь Backender `task`
   handoff и не придумывай временный frontend contract.

`data_display` использует graph pattern только для Plotly contract. Удаляй
неиспользуемые возможности шаблона. На этом этапе не выбирай финальные цвета,
шрифты и изображения — это делает `styling`.

Четыре типовых зоны не являются закрытым списком: создавай нестандартную зону,
если этого требует ТЗ и существующие patterns не подходят.
