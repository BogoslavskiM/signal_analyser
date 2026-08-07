# Graph Output Zone

## When to Use
- Расчётная зона или multi-page page отображает один или несколько графиков Plotly.
- Backend возвращает готовые Plotly `data`, `layout` и `config`.
- Под графиками нужны page controls, которые обновляются без общего Apply.

## When NOT to Use
- Frontend должен самостоятельно выполнять предметные или математические расчёты.
- Требуется другая библиотека графиков.
- Страница не имеет расчётного output contract.

## Technical Reference and Design

Используй `reference/template.js` для Plotly component, local library/locale,
payload rendering, controls and resize. Canvas geometry, grid, overlays,
spinner and visual control placement бери из pinned Designer package.

1. Прочитай technical JS reference и pinned design package.
2. Положи Plotly и русскую locale в локальную vendor-директорию приложения.
3. Создай модуль через `window.GenieGraphOutputZone.create(...)`.
4. Зарегистрируй возвращённые `components` в root Vue app.
5. В page registry установи `rendersOutputState: true`, чтобы graph page сама разместила preloader и error.
6. Реализуй grid/responsive rules из design version без самостоятельного выбора geometry.
7. Не копируй названия страниц, объектов или namespace приложения-источника.
8. Не меняй canonical proportions graph frame, settings controls, modebar и
   menus; изменяй только layout/grid, явно требуемую ТЗ и pinned design.

## Plot Contract
Отдельная data route страницы возвращает:

```text
data
isready
success
error
state_revision
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
- Backend в Julia рассчитывает signals, spectra, spectrograms, ambiguity
  functions и формирует готовые traces, colors, `name`, legend, title, axes,
  ticks, units, hover и Plotly config.
- Frontend не выполняет DSP, не готовит derived graph arrays и не
  интерпретирует математические данные.
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
- Не применяй graph payload с `state_revision` меньше уже принятой root
  revision или из неактивного page/request context.

## Page Controls
- Размещай page controls ниже canvas внутри component конкретной страницы.
- По умолчанию page controls не требуют общего Apply.
- Храни их типизированные значения в backend view state и включай в session export/import.
- Frontend root state зеркалит backend values по `page_id`.
- При изменении отправляй backend update этой страницы.
- Если control требует расчёта, backend помечает dirty только соответствующую страницу; frontend получает pending и результат через её data route.
- Если control меняет только представление готового payload, разрешай немедленную frontend-перерисовку и синхронизируй backend state без общего Apply.
- Не считай Plotly zoom, pan и selection page controls: не отправляй их backend и не сохраняй в сессии.

## Plotly Component
- Используй локальные Plotly bundle и русскую locale; не загружай библиотеку с CDN.
- Подключай Plotly лениво только при первом реальном render графика, чтобы он
  не входил в critical path `/api/state-lite` и initial controls.
- Оставляй стандартные glyphs, порядок и geometry modebar, скрывай логотип
  Plotly. Принудительно применяй canonical contract: белые `paper`, `plot` и
  непрозрачная modebar `#ffffff`; default icons `#b8b8b8`, hover icons
  `#7a7a7a` на `#f8f8f8`, active icons `#5f5f5f` на `#f2f2f2`. Не допускай
  тёмной/полупрозрачной общей подложки, border, shadow или layout shift.
- Сериализуй render через `requestAnimationFrame`: одновременно выполняется
  не более одного render, а очередь хранит только последнее requested update.
- Используй `Plotly.react`, а не полное пересоздание graph DOM. Запускай его
  только для mounted контейнера с ненулевыми размерами.
- Отслеживай контейнер через `ResizeObserver`, coalesce промежуточные events и
  выполняй один отложенный resize после стабилизации layout.
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
- Проверь белый canvas/modebar и exact default/hover/active grey states
  инструментов через source tests и передай реальную visual проверку E2E.
- Проверь lazy Plotly load, one-render-in-flight, latest-only queue,
  `requestAnimationFrame`, `Plotly.react`, coalesced `ResizeObserver` и stale
  `state_revision` rejection.
- Замерь отдельно cold load локального Plotly bundle и payload size больших
  arrays: это оставшиеся возможные bottlenecks, а не повод переносить DSP в JS.
- Запусти `node --check` для перенесённого JS и `node test/front/run_front_tests.js`.
