---
name: graph-output-zone
---
# Graph Output Zone

## When to Use
- Расчётная зона или multi-page page отображает один или несколько графиков Plotly.
- Backend возвращает готовые Plotly `data`, `layout` и `config`.
- Под графиками нужны page controls, которые обновляются без общего Apply.

## When NOT to Use
- Frontend должен самостоятельно выполнять предметные или математические расчёты.
- Требуется другая библиотека графиков.
- Страница не имеет расчётного output contract.

## Core Contract
- Применяй skill только если blueprint включает Plotly output.
- Рендери backend-defined Plotly payload без предметных frontend calculations.

## Optional Capabilities
- `graph.multiple` — несколько графиков в frontend-defined grid.
- `graph.comparison` — traces main + selected objects.
- `graph.output-state` — pending/error overlays.
- `graph.page-controls` — controls без общего Apply.
- `graph.locale-ru` — локальная русская Plotly locale.

## Bundled Template
Используй готовый комплект:

- `assets/template.js` — общий Plotly module, локальная загрузка библиотеки и русской locale;
- `assets/template.css` — canvas, frontend-defined grid, overlay, spinner и controls;
- `assets/template.html` — пример graph page внутри multi-page element.

1. Прочитай все три файла.
2. Скопируй их в соответствующие JS/CSS/HTML пути приложения.
3. Положи Plotly и русскую locale в локальную vendor-директорию приложения.
4. Создай модуль через `window.GenieGraphOutputZone.create(...)`.
5. Вызови `mount(root)` и зарегистрируй vanilla module в общем registry.
6. В page registry установи `rendersOutputState: true`, чтобы graph page сама разместила preloader и error.
7. Определи сетку и responsive rules в JS/CSS конкретной страницы.
8. Не копируй названия страниц, объектов или namespace приложения-источника.

## Plot Contract
Отдельная data route страницы возвращает:

```text
data
isready
success
error
```

Для graph page поле `data` является упорядоченным массивом:

```text
data:
  - data
    layout
    config
```

- Не добавляй plot ids без отдельной необходимости.
- Связывай ячейки frontend-сетки с элементами массива по порядку.
- Backend формирует traces, цвета, `name`, legend, title, axes, ticks, units, hover и Plotly config.
- Frontend не пересчитывает и не интерпретирует математические данные.
- Пустой массив отображай как пустую область без сообщения.
- Если элементов меньше, чем рассчитано сеткой страницы, оставляй остальные места пустыми.

## Inspector Objects and Legend
- Для графика со сравнением отображай объединение `main_object + selected_objects` без дубликата main object.
- Для графика без сравнения отображай только `main_object`.
- Для несравниваемого графика backend скрывает legend и добавляет имя main object в `layout.title`.
- Для сравниваемого графика backend передаёт имена объектов через `data[].name`.
- Не вводи frontend-эвристику по типу trace для скрытия legend.

## Loading and Errors
- После успешного Apply сразу запроси данные активной страницы, но не меняй graph runtime до ответа.
- Показывай preloader только после ответа `isready=false`.
- При pending не отображай возвращённые прежние графики; показывай overlay поверх canvas.
- При `isready=true, success=false` показывай `error` overlay поверх всей graph grid.
- Не вставляй error в Plotly и не заменяй им всю multi-page zone.
- Оставляй controls под canvas видимыми, но блокируй их во время pending.
- Ошибку расчёта возвращай с HTTP 200. Ошибки HTTP, транспорта, локальной Plotly-библиотеки и повреждённого payload показывай в общем error dialog.
- Продолжай polling pending активной страницы по правилам `frontend/output-loading-flow`.

## Page Controls
- Размещай page controls ниже canvas внутри render-функции конкретной страницы.
- По умолчанию page controls не требуют общего Apply.
- Храни их типизированные значения в backend view state и включай в session export/import.
- Frontend root state зеркалит backend values по `page_id`.
- При изменении отправляй backend update этой страницы.
- Если control требует расчёта, backend помечает dirty только соответствующую страницу; frontend получает pending и результат через её data route.
- Если control меняет только представление готового payload, разрешай немедленную frontend-перерисовку и синхронизируй backend state без общего Apply.
- Не считай Plotly zoom, pan и selection page controls: не отправляй их backend и не сохраняй в сессии.

## Plotly Component
- Используй локальные Plotly bundle и русскую locale; не загружай библиотеку с CDN.
- Оставляй стандартную modebar и скрывай логотип Plotly.
- Запускай `Plotly.react` только для контейнера с ненулевыми размерами.
- Отслеживай контейнер через `ResizeObserver` и адаптируй график к доступной ширине и высоте.
- Очищай observer, animation frames, listeners и `Plotly.purge` при размонтировании.
- Не стандартизируй click, selection и range events без отдельного требования.
- Используй встроенный экспорт изображения Plotly; отдельный механизм экспорта графиков не добавляй.

## Verification
- Проверь stable `data-testid` graph zone, plot hosts, controls и
  loading/error overlays.
- Проверь один и несколько графиков, порядок массива и page-specific grid.
- Проверь пустой массив и отсутствующие элементы массива.
- Проверь сравнимый и несравнимый график, main object, selection, legend и title.
- Проверь первый load, pending overlay, calculation error overlay и успешный результат.
- Проверь, что controls видимы и disabled при pending.
- Проверь page-control update без общего Apply и восстановление из сессии.
- Проверь, что zoom/pan не входят в backend payload и сессию.
- Проверь resize, tab remount, русскую modebar, отсутствие логотипа и локальную загрузку Plotly.
- Запусти `node --check` для перенесённого JS и `node test/front/run_front_tests.js`.
