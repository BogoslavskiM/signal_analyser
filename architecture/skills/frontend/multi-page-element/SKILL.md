---
name: multi-page-element
---
# Multi-page Element

## When to Use
- Нужно встроить в любую layout zone агрегатор нескольких frontend-страниц.
- Нужны вкладки, открытие и закрытие страниц, `main_page`, overflow tabs или page menu.
- Один элемент объединяет статические и расчётные страницы.

## When NOT to Use
- Нужно выбрать геометрию основного canvas.
- Нужна динамически создаваемая frontend-страница без заранее зарегистрированного page module.
- Нужно реализовать математический расчёт или backend calculation queue.

## Core Contract
- Применяй skill только если blueprint включает агрегатор нескольких страниц.
- Используй stable page ids и единственную активную страницу.

## Optional Capabilities
- `pages.closable` — закрываемые страницы.
- `pages.catalog` — menu открытия страниц.
- `pages.overflow` — scroll arrows для tabs.
- `pages.output-state` — pending/success/error для расчётных страниц.
- `pages.backend-sync` — синхронизация opened/main page с backend.

## Bundled Template
Используй готовый комплект:

- `assets/template.js` — vanilla tabs/menu/page lifecycle implementation;
- `assets/template.css` — titlebar, tabs, scroll controls, page menu, body, preloader и error;
- `assets/template.html` — mount point агрегатора active pages.

1. Прочитай все три файла.
2. Скопируй их в соответствующие JS/CSS/HTML пути приложения.
3. Зарегистрируй каждую страницу отдельным frontend module по stable page id.
4. Создай агрегатор через `window.GenieMultiPageElement.create(...)`.
5. Передай `defaultPageId`, page registry и backend action `syncPages`.
6. Вызови `mount(root)`.
7. Размести page-specific controls внутри render-функции самой страницы.
8. Не копируй domain page ids, titles или namespace приложения-источника.

## Backend View Contract
Backend возвращает:

```text
multi_page:
  pages
  order
  opened_pages
  main_page
```

Metadata страницы:

```text
id
title
description
icon
closable
menu_group: необязательно
```

- Используй stable `id`, не зависящий от изменяемого title.
- Храни ids в `order`, `opened_pages` и `main_page`.
- Считай `menu_group` только визуальной секцией меню добавления страниц.
- Не помещай `isready`, `success`, `error` и `data` в статическую metadata.

## Frontend Page Registry
Регистрируй page module явно:

```javascript
pages: {
  help: {
    render: function (context) {
      return HelpPage.render(context);
    }
  },
  spectrum: {
    render: function (context) {
      return SpectrumPage.render(context);
    },
    rendersOutputState: true,
    loadData: function (context) {
      return api.getSpectrumData(context.pageId);
    }
  }
}
```

- `render(context)` обязателен и возвращает HTML active page.
- `loadData` добавляй только странице с backend data contract.
- `rendersOutputState` добавляй странице, которая сама размещает pending/error внутри своей структуры; graph page использует это, чтобы controls оставались под canvas.
- Для каждой страницы создавай отдельные JS и CSS. Добавляй отдельный HTML partial, когда страница имеет собственную разметку.
- Храни локальное состояние страницы в root state по page id, а не внутри DOM неактивной страницы.

## Static and Output Pages
- Не создавай backend data route для статической страницы.
- Нормализуй статическую страницу на frontend как `isready=true`, `success=true`, `error=""`.
- Для каждой расчётной страницы используй отдельную data route:

```text
data
isready
success
error
```

- Для `isready=false` показывай page preloader и продолжай polling только активной страницы.
- Для `isready=true, success=true` вызывай page renderer с `data`.
- Для `isready=true, success=false` показывай error внутри page body и не запускай automatic retry.
- После Apply запроси active output page, не помечая pages pending локально до ответа backend.
- Если page module самостоятельно размещает preloader и error, установи в registry `rendersOutputState: true` и передай ему полный runtime state.
- Для graph page используй локальные overlay и controls из `frontend/graph-output-zone`.
- Следуй полному контракту `frontend/output-loading-flow`.

## Tabs and Main Page
- Считай `main_page` единственной непосредственно видимой страницей и открытой зоной с максимальным backend-приоритетом.
- При клике переключай `main_page` на frontend немедленно, затем синхронизируй backend.
- При backend sync error показывай общий error dialog и не откатывай выбранную вкладку.
- При открытии страницы через menu сразу делай её `main_page`.
- При закрытии активной страницы выбирай первую оставшуюся по backend `order`.
- Не разрешай пустой `opened_pages`: при закрытии последней страницы восстанавливай `defaultPageId`.
- Не добавляй drag-and-drop и reorder; используй backend `order`.

## Rendering and Layout
- Держи в DOM только markup текущей `main_page`.
- Размонтируй неактивную страницу, сохраняя её локальный state в root store.
- Показывай крестик только при `closable=true`.
- При переполнении вкладок используй горизонтальный scroll и кнопки прокрутки слева и справа.
- Размещай справа от tabs только кнопку открытия page menu.
- Размещай controls активной страницы снизу внутри её render-функции.
- Разрешай необязательный titlebar агрегатора.

## Async Guardrails
- Для rapid tab changes применяй только последний backend sync response.
- Для page data применяй ответ только к совпадающим page id и request id.
- Останавливай frontend polling страницы после её деактивации; backend calculation queue продолжает работать независимо.
- Очищай timers и listeners в `unmount()`.
- Обычный polling не должен изменять backend calculation priority.

## Verification
- Проверь stable `data-testid` для tabs, close/menu/scroll actions, active
  content и loading/error states.
- Проверь stable ids, backend order, opened pages и immediate main-page switch.
- Проверь open, close, закрытие active и попытку закрыть последнюю страницу.
- Проверь tabs overflow и scroll buttons.
- Проверь static page без HTTP request.
- Проверь output page в pending, success и calculation error.
- Проверь stale sync/data responses и остановку polling неактивной страницы.
- Проверь, что в DOM находится только active page markup.
- Запусти `node --check` для перенесённого JS и `node test/front/run_front_tests.js`.
