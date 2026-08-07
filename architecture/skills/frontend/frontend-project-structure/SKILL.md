# Frontend Project Structure

## Входные данные

Прочитай текущий `public/**` tree, способ подключения scripts/styles, frontend
stack и список новых zones/controls/dialogs/pages. Сохраняй существующий
согласованный stack; reference layout является default только для нового
типового приложения.

## When to Use
- Нужно создать frontend типового Genie-приложения.
- Нужно добавить новую зону, control, dialog или страницу multi-page элемента.
- Нужно разделить разросшийся `app.js` на переиспользуемые frontend-модули.

## When NOT to Use
- Нужно только изменить геометрию существующего canvas.
- Нужно только исправить локальный стиль или текст без изменения структуры.

## Mandatory Stack
- Используй Vue 3 production global build, обычный JavaScript и прямое подключение файлов через `index.html`.
- Не добавляй npm, bundler или TypeScript без явного требования либо доказанной невозможности разумно реализовать приложение на стандартном стеке.
- Храни JS, CSS и HTML раздельно по типу файлов, сохраняя одинаковую предметную структуру каталогов.
- Используй один root Vue app. Не создавай отдельное Vue-приложение для каждой зоны.

## Project Layout

```text
public/
  index.html
  fonts/
  icons/
  js/
    api.js
    tooltip.js
    app.js
    app/
      zones/
      controls/
      dialogs/
      <multi-page-element>/pages/
  css/
    theme.css
    app/
      zones/
      controls/
      dialogs/
      <multi-page-element>/pages/
  html/
    app/
      zones/
      controls/
      dialogs/
      <multi-page-element>/pages/
```

- Создавай HTML-файл только там, где элементу нужен собственный шаблон.
- Создавай production `theme.css` по pinned Designer package и подключай его
  раньше CSS controls, dialogs, zones и pages. Не выбирай visual tokens внутри
  этого skill.
- Копируй четыре файла Roboto Regular/Medium с Cyrillic/Latin subsets из
  pinned design package в `public/fonts`, объявляй их локальными `@font-face`
  и используй Roboto Medium 500 для headings. Копируй только реально
  используемые общие SVG в `public/icons`, сохраняя filename, `viewBox` и
  aspect ratio; не подключай runtime font/icon CDN.
- Подключай общий `tooltip.js` один раз до `app.js`.
- Создавай обязательную верхнюю zone через `frontend/application-toolbar`;
  сохраняй её JS/CSS/HTML в симметричных `app/zones/toolbar` paths.
- Для каждой страницы multi-page элемента создавай отдельный JS и CSS. Добавляй отдельный HTML partial, если разметка страницы не помещается в общий шаблон агрегатора.
- Выноси типовые controls в `controls/`, а не оставляй их реализацию внутри конкретной зоны.
- Используй общий modal contract из `frontend/dialog-system`, но сохраняй каждый предметный dialog отдельным JS/CSS/HTML-модулем.
- Для server-side выбора пути используй отдельный модуль `frontend/file-browser-dialog`.
- Session forms наследуй от `frontend/dialog-system` по правилам `frontend/session-import-export-ui`.
- Форму экспорта выбранных objects подключай через `frontend/object-export-dialog`;
  добавляй только явно поддержанные приложением operation forms.
- Сохраняй симметричные semantic paths между `js/app`, `css/app` и `html/app`, чтобы блок можно было перенести в другое приложение вместе с его поведением и стилями.

## Module Contract
Frontend-модуль может экспортировать следующие секции:

```text
state
computed
watch
methods
mounted
beforeUnmount
```

- `state` возвращает начальное изменяемое состояние элемента.
- `computed` содержит только производные значения без side effects.
- `watch` реагирует на изменения состояния и запускает только необходимые побочные действия.
- `methods` содержит user actions, координацию API-вызовов и контролируемые state mutations.
- `mounted` выполняет начальную загрузку и подключает DOM/browser listeners или внешние UI-библиотеки.
- `beforeUnmount` удаляет listeners, таймеры, polling и другие frontend-операции.
- Не добавляй пустые секции.

## Module Registration
При прямом подключении `<script>` нет `import` и `export`, поэтому модуль должен
опубликовать свой контракт в согласованном namespace текущего приложения или в
универсальном module registry.

Пример:

```javascript
(function registerInspectorList(window) {
  "use strict";

  window.GenieAppModules = window.GenieAppModules || {};
  window.GenieAppModules.zones = window.GenieAppModules.zones || {};
  window.GenieAppModules.zones.inspectorList = {
    state: function () {
      return {};
    },
    methods: {},
  };
})(window);
```

- Используй один способ регистрации во всём приложении.
- Имя namespace должно соответствовать текущему приложению либо быть универсальным.
- При переносе блока удаляй namespace, названия и константы исходного приложения.
- Подключай scripts в `index.html` до `app.js` и в порядке их зависимостей.

## Root App
- Оставляй в `app.js` сборку модулей, создание root Vue app и общую frontend-координацию.
- Загружай сначала лёгкий `/api/state-lite` без plot arrays, публикуй form,
  zones и controls, затем запрашивай output только активной страницы. Не
  задерживай готовность формы загрузкой Plotly или graph data.
- Публикуй `data-testid="app-ready"` только после завершения обязательного
  startup state и задавай общему loader `data-testid="app-loader"`. Если
  приложение использует другие ids, передай их E2E через app config.
- Допускай в `app.js` общие loaders, startup flow, маршрутизацию запросов, обработку глобальных ошибок и app-wide lifecycle.
- Переноси из `app.js` логику конкретной зоны, control, dialog или страницы в соответствующий модуль.
- Предпочитай взаимодействие модулей через root state и публичные root methods.
- Прямой вызов одного модуля другим допускай только в критическом случае, когда root coordination создаёт лишнюю сложность. Делай такую зависимость явной.

## API Access
- Предпочитай единый `api.js` для повторяемых endpoints, общей обработки JSON, HTTP errors, logging и cancellation.
- Прямой `fetch` внутри модуля не запрещён, если запрос локален для элемента и общий API client не даёт практической пользы.
- Не дублируй в нескольких модулях одинаковую request/error логику.
- Храни последнюю принятую backend `state_revision` в root app. Не применяй
  response с меньшей revision, даже если его HTTP request завершился позже.

## Guardrails
- Не складывай всю frontend-логику в `app.js`.
- Не создавай скрытые зависимости через порядок глобальных переменных без явной регистрации.
- Не копируй в новое приложение имя, namespace, selectors или тексты исходного приложения.
- Не помещай business calculations во frontend.
- Не смешивай несвязанные zone, control, dialog и page contracts в одном модуле.
- Сохраняй стабильные module ids и selectors после публикации контракта.
- Добавляй stable `data-testid` для всех E2E actions и observable states и
  перечисляй их в Frontend report.

## Verification
- Проверь порядок `<script>` и `<link>` в `public/index.html`.
- Проверь отсутствие ссылок на исходное приложение в перенесённых блоках.
- Проверь Vue production build, локальные Roboto/SVG, порядок `theme.css`,
  быстрый `state-lite` startup и отсутствие runtime CDN.
- Запусти `node test/front/run_front_tests.js`.
