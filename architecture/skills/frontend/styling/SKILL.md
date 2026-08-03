---
name: styling
---
# Styling Frontend

Начинай после готовой структуры зон и API.

## Источники

Используй источники в таком порядке: доступный Figma → изображение/ссылка из
ТЗ → существующая визуальная система проекта → bundled CSS/HTML examples.

Если доступна Figma, проанализируй нужные frames и components, экспортируй
используемые изображения и SVG и замени ими неподходящие текущие assets. Не
угадывай закрытые или недоступные Figma-макеты.

## Порядок работы

1. Составь inventory каждого видимого и интерактивного элемента и всех его
   состояний.
2. Зафиксируй общие tokens: шрифты, цвета, отступы, размеры, линии, borders,
   radius, shadows и z-index.
3. Сделай единообразными buttons, dropdowns, inputs, checkboxes, labels,
   dividers, panels, tables, tabs и scroll areas.
4. Используй локальные изображения, SVG и шрифты; для icon-only actions добавь
   accessible name и tooltip.
5. Подключи общую тему раньше component CSS. Удали дублирующиеся локальные
   значения, если они уже выражены token.
6. Проверь каждый элемент в default, hover, focus-visible, active, disabled,
   busy, error, warning и success states, когда они применимы.

## Примеры

- `assets/theme.css` — общие tokens и controls;
- `assets/control-showcase.html` — базовые HTML controls;
- `assets/app_data_inspector.css` — таблица, линии, checkbox и actions;
- `assets/data_item_settings.css` — fields, dropdown и validation;
- `assets/data_display.css` — graph canvas и overlays;
- `assets/multi_page_zone.css` — tabs и page container.

Примеры являются стартовой системой, а не обязательным визуальным решением:
Figma и ТЗ имеют приоритет. Не меняй на этом этапе структуру данных, API
semantics или бизнес-логику.
