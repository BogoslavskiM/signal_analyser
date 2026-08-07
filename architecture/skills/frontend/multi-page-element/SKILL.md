# Multi-page Element

## When to Use
- Нужно встроить в любую layout zone агрегатор нескольких frontend-страниц.
- Нужны вкладки, открытие и закрытие страниц, `main_page`, overflow tabs или page menu.
- Один элемент объединяет статические и расчётные страницы.

## When NOT to Use
- Нужно выбрать геометрию основного canvas.
- Нужна динамически создаваемая frontend-страница без заранее зарегистрированного page module.
- Нужно реализовать математический расчёт или backend calculation queue.

## Technical Reference and Design

Используй `reference/template.js` для page registry, opened/main page state,
sync and output polling. Titlebar, tabs, overflow controls, page menu,
preloader/error visuals and markup composition бери из pinned Designer package.

1. Прочитай technical JS reference и pinned design package.
2. Зарегистрируй каждую страницу отдельным frontend module по stable page id.
3. Создай агрегатор через `window.GenieMultiPageElement.create(...)`.
4. Передай `defaultPageId`, page registry и backend action `syncPages`.
5. Размести page-specific controls в позиции, заданной design package.
6. Не копируй domain page ids, titles или namespace приложения-источника.

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
    component: HelpPage
  },
  spectrum: {
    component: SpectrumPage,
    rendersOutputState: true,
    loadData: function (pageId) {
      return api.getSpectrumData(pageId);
    }
  }
}
```

- `component` обязателен.
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
state_revision
```

- Для `isready=false` показывай page preloader и продолжай polling только активной страницы.
- Для `isready=true, success=true` показывай component с `data`.
- Для `isready=true, success=false` показывай error внутри page body и не запускай automatic retry.
- После Apply запроси active output page, не помечая pages pending локально до ответа backend.
- Если page component самостоятельно размещает preloader и error, установи в registry `rendersOutputState: true` и передай ему полный `page-state`.
- Для graph page используй локальные overlay и controls из `frontend/graph-output-zone`.
- Следуй полному контракту `frontend/output-loading-flow`.

## Tabs and Main Page
- Считай `main_page` единственной непосредственно видимой страницей и открытой зоной с максимальным backend-приоритетом.
- При клике переключай `main_page` на frontend немедленно, затем синхронизируй backend.
- Сразу запроси data newly active output page. Сериализацию noncritical view
  state (`main_page`, opened pages и подобное UI state) группируй trailing
  debounce 350 ms; semantic actions create/delete/apply не задерживай.
- При backend sync error показывай общий error dialog и не откатывай выбранную вкладку.
- При открытии страницы через menu сразу делай её `main_page`.
- При закрытии активной страницы выбирай первую оставшуюся по backend `order`.
- Не разрешай пустой `opened_pages`: при закрытии последней страницы восстанавливай `defaultPageId`.
- Не добавляй drag-and-drop и reorder; используй backend `order`.

## Rendering and Layout
- Держи в DOM только component текущей `main_page`.
- Размонтируй неактивную страницу, сохраняя её локальный state в root store.
- Показывай крестик только при `closable=true`.
- При переполнении вкладок используй горизонтальный scroll и кнопки прокрутки слева и справа.
- Размещай справа от tabs только кнопку открытия page menu.
- Размещай controls активной страницы снизу внутри её component.
- Разрешай необязательный titlebar агрегатора.

## Async Guardrails
- Для rapid tab changes применяй только последний backend sync response.
- Для page data применяй ответ только к совпадающим page id и request id.
- Любой backend response применяй только если его `state_revision` не меньше
  уже принятой root revision.
- Останавливай frontend polling страницы после её деактивации. Не запускай и
  не загружай inactive output pages; уже начатая backend task завершается или
  отменяется по backend revision/cancellation contract.
- Очищай timers и listeners в `beforeUnmount`.
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
- Проверь 350 ms batching noncritical UI state, immediate active rendering и
  rejection stale `state_revision`.
- Проверь, что в DOM находится только active page component.
- Запусти `node --check` для перенесённого JS и `node test/front/run_front_tests.js`.
