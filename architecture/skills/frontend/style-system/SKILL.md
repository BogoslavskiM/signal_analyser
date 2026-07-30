---
name: style-system
version: 0.3.0
---
# Style System

## When to Use
- Нужно создать или выровнять визуальный стиль типового Genie-приложения.
- Нужны общие цвета, типографика, символы и состояния controls.
- Конкретная zone должна использовать тот же визуальный язык, что и остальное приложение.

## When NOT to Use
- Нужно выбрать количество зон или их пропорции — используй `frontend/layout-geometry`.
- Нужно перестроить canvas под мобильный viewport.
- Нужно изменить предметное поведение control или API.

## Bundled Template
Используй:

- `assets/template.css` как основу `public/css/theme.css`;
- `assets/tooltip.js` как общий `public/js/tooltip.js`;
- `assets/fonts/Roboto-Variable.ttf` как локальный
  `public/fonts/Roboto-Variable.ttf`;
- `assets/fonts/OFL.txt` как лицензию локально поставляемого Roboto.

1. Сначала скопируй font и общую тему.
2. Не загружай font через Google Fonts или другой runtime network request.
3. Подключи `tooltip.js` один раз для всего приложения.
4. Подключай CSS конкретных controls, dialogs, zones и pages после темы.
5. Сохраняй имена общих tokens; меняй значения только при явном требовании приложения.
6. Удаляй из перенесённых модулей дубли общих цветов, шрифтов и состояний.

## Visual Baseline
- Используй светлую тему и визуальный язык текущего приложения: локальный
  Roboto, белые surfaces, светло-серый canvas, синий accent, красный
  validation/error.
- Используй знакомые SVG-символы текущего приложения для import, save, add, copy, export, file browser, delete, visibility, menu, close и search.
- Иконка наследует `currentColor`; один SVG не дублируй для hover/active вариантов.
- Переноси в `public/icons` только SVG, которые действительно использует
  текущее приложение.
- Для icon-only action обязательно задавай tooltip и доступное имя.
- Не включай геометрию конкретного canvas в тему.

## Tokens
- Все повторяемые цвета, размеры controls, отступы, границы, радиусы, тени,
  типографику, длительности и z-index задавай CSS variables в `:root`.
- Предметный модуль может добавлять tokens только для собственной структуры.
- Не переопределяй в предметном модуле общий внешний вид кнопок, inputs,
  selects, tables и dialogs.
- Локальное переопределение общего token допустимо только на корневом container
  компонента и только при явной визуальной необходимости.

## Ownership
- `theme.css` владеет reset, tokens, общими controls, panels, tooltips,
  loaders и validation/busy states.
- CSS конкретной zone/page/dialog владеет её grid, внутренним размещением,
  overflow и предметными элементами.
- Не добавляй в `theme.css` имена объектов, страниц или зон конкретного приложения.
- Переиспользуемый control должен иметь один общий style contract.

## Fixed Canvas
- По умолчанию используй `--app-min-width: 920px` и
  `--app-min-height: 680px`, как в текущем приложении.
- Не перестраивай зоны при уменьшении viewport и не добавляй responsive
  breakpoints для canvas.
- При узком окне приложение может не помещаться целиком; сохраняй его
  минимальные размеры.
- Внутренний component может управлять собственным overflow, но не менять
  глобальную раскладку через media query.
- Изменяй базовые минимальные размеры только если содержимое нового приложения
  объективно требует другого fixed canvas.

## Tooltip and Scrollbars
- Для общей подсказки используй `data-tooltip` и `assets/tooltip.js`.
- Показывай tooltip через `1500 ms` после hover или focus.
- Сначала размещай его под элементом; при нехватке места переноси над элементом
  и ограничивай координаты viewport.
- Скрывай tooltip при mouseout, focusout, click, scroll и resize.
- По умолчанию оставляй системные scrollbars.
- Тонкий стилизованный scrollbar используй только для горизонтальной ленты
  вкладок multi-page element, как задано в `frontend/multi-page-element`.
- Не вводи общий кастомный scrollbar для settings, tables, dialogs и canvas.

## Mandatory States
Каждый интерактивный элемент должен иметь согласованные:

- default;
- hover;
- focus-visible;
- active, если действие поддерживает нажатое состояние;
- disabled;
- busy, если операция асинхронная;
- validation error;
- warning, если он предусмотрен контрактом.

Не обозначай состояние только цветом: сохраняй border, status icon, text или
другой второй визуальный признак.

## Guardrails
- Только светлая тема; не добавляй dark-theme tokens без отдельного требования.
- Не добавляй media queries, которые меняют число, порядок или пропорции зон.
- Не используй inline colors и случайные `z-index`, если для них есть token.
- Не копируй общий button/input CSS в каждый dialog или zone.
- Не переопределяй global selectors из предметного модуля.
- Не подключай внешние fonts/CDN и не переноси неиспользуемые SVG.
- Не добавляй декоративные animations. Используй animation только для loader
  и необходимого раскрытия/смены состояния элемента.
- Не смешивай стили и business calculations.

## Verification
- Проверь, что тема загружена раньше CSS модулей.
- Проверь отсутствие runtime-запросов к Google Fonts/CDN и загрузку локального
  Roboto.
- Проверь отсутствие неиспользуемых SVG в поставке нового приложения.
- Проверь отсутствие hardcoded повторяемых цветов и неименованных z-index.
- Проверь все mandatory states мышью и клавиатурным focus.
- Уменьши viewport ниже `920 × 680`: canvas не должен перекладываться.
- Проверь tooltip и accessible name всех icon-only actions.
- Проверь задержку tooltip `1500 ms`, перенос вверх и скрытие по всем
  согласованным событиям.
- Проверь системные scrollbars и отдельный тонкий scrollbar горизонтальных
  вкладок.
- Проверь, что длинный текст не перекрывает соседние controls.
- Запусти `node test/front/run_front_tests.js`.
