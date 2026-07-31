---
name: frontend-project-structure
---
# Frontend Project Structure

## When to Use
- Нужно создать frontend типового Genie-приложения.
- Нужно добавить новую зону, control, dialog или страницу multi-page элемента.
- Нужно разделить разросшийся `app.js` на переиспользуемые frontend-модули.

## When NOT to Use
- Нужно только изменить геометрию существующего canvas.
- Нужно только исправить локальный стиль или текст без изменения структуры.

## Core Contract
- Используй vanilla JavaScript и прямое подключение файлов через `index.html`.
- Не добавляй framework, npm, bundler или TypeScript. Другой stack допустим
  только по прямому решению пользователя и ADR с отдельным technology skill.
- Храни JS, CSS и HTML раздельно, сохраняя одинаковую предметную структуру.
- Используй один application root и явный module registry.

## Optional Capabilities
- `frontend.modules.zones` — отдельные zone modules.
- `frontend.modules.controls` — переиспользуемые controls.
- `frontend.modules.dialogs` — dialog modules.
- `frontend.modules.pages` — отдельные страницы multi-page элемента.
- `frontend.modules.api-client` — общий API client.

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
- Создавай `theme.css` из `frontend/style-system` и подключай его раньше CSS
  controls, dialogs, zones и pages.
- Копируй локальный Roboto в `public/fonts` и только реально используемые
  общие SVG в `public/icons`; не подключай runtime font CDN.
- Подключай общий `tooltip.js` один раз до `app.js`; root app явно создаёт и
  монтирует tooltip module.
- Если blueprint включает toolbar, создавай её через
  `frontend/application-toolbar` и сохраняй в симметричных paths.
- Для каждой страницы multi-page элемента создавай отдельный JS и CSS. Добавляй отдельный HTML partial, если разметка страницы не помещается в общий шаблон агрегатора.
- Выноси типовые controls в `controls/`, а не оставляй их реализацию внутри конкретной зоны.
- Используй общий modal contract из `frontend/dialog-system`, но сохраняй каждый предметный dialog отдельным JS/CSS/HTML-модулем.
- Для server-side выбора пути используй отдельный модуль `frontend/file-browser-dialog`.
- Session forms наследуй от `frontend/dialog-system` по правилам `frontend/session-import-export-ui`.
- Форму экспорта выбранных objects подключай через `frontend/object-export-dialog`;
  добавляй только явно поддержанные приложением operation forms.
- Сохраняй симметричные semantic paths между `js/app`, `css/app` и `html/app`, чтобы блок можно было перенести в другое приложение вместе с его поведением и стилями.

## Module Contract
Vanilla frontend-модуль может экспортировать следующие секции:

```text
createState
render
actions
mount
unmount
```

- `createState` возвращает локальное начальное состояние, если оно нужно.
- `render` отображает переданный state без business calculations.
- `actions` содержит user actions и API coordination.
- `mount` подключает listeners, timers и browser integrations.
- `unmount` симметрично освобождает ресурсы.
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
    createState: function () {
      return {};
    },
    actions: {},
  };
})(window);
```

- Используй один способ регистрации во всём приложении.
- Имя namespace должно соответствовать текущему приложению либо быть универсальным.
- При переносе блока удаляй namespace, названия и константы исходного приложения.
- Подключай scripts в `index.html` до `app.js` и в порядке их зависимостей.

## Root App
- Оставляй в `app.js` сборку модулей и общую frontend-координацию.
- Публикуй `data-testid="app-ready"` только после завершения обязательного
  startup state и задавай общему loader `data-testid="app-loader"`. Если
  приложение использует другие ids, передай их E2E через app config.
- Допускай в `app.js` общие loaders, startup flow, маршрутизацию запросов, обработку глобальных ошибок и app-wide lifecycle.
- Переноси из `app.js` логику конкретной зоны, control, dialog или страницы в соответствующий модуль.
- Предпочитай взаимодействие модулей через root state и публичные actions.
- Прямой вызов одного модуля другим допускай только в критическом случае, когда root coordination создаёт лишнюю сложность. Делай такую зависимость явной.

## API Access
- Предпочитай единый `api.js` для повторяемых endpoints, общей обработки JSON, HTTP errors, logging и cancellation.
- Прямой `fetch` внутри модуля не запрещён, если запрос локален для элемента и общий API client не даёт практической пользы.
- Не дублируй в нескольких модулях одинаковую request/error логику.

## Guardrails
- Не складывай всю frontend-логику в `app.js`.
- Не создавай скрытые зависимости через порядок глобальных переменных без явной регистрации.
- Не копируй в новое приложение имя, namespace, selectors или тексты исходного приложения.
- Не помещай business calculations во frontend.
- Не смешивай несвязанные zone, control, dialog и page contracts в одном модуле.
- Сохраняй стабильные module ids и selectors после публикации контракта.
- Добавляй stable `data-testid` для E2E actions и observable states по
  контракту `frontend/ui-contract-change`.
- Перед копированием bundled frontend assets запускай
  `node architecture/skills/frontend/validate_vanilla_assets.js`.

## Verification
- Проверь порядок `<script>` и `<link>` в `public/index.html`.
- Проверь отсутствие ссылок на исходное приложение в перенесённых блоках.
- Запусти `node test/front/run_front_tests.js`.
