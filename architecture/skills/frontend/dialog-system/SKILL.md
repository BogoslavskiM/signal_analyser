---
name: dialog-system
---
# Dialog System

## When to Use
- Нужно добавить modal dialog, unexpected error dialog или success dialog.
- Несколько предметных диалогов должны использовать одинаковые overlay, titlebar, body и actions.
- File browser или error dialog должен открываться поверх основного диалога.

## When NOT to Use
- Нужно показать validation error под полем.
- Нужно показать calculation error поверх output canvas.
- Нужно реализовать предметную логику импорта, экспорта или файлового браузера.

## Core Contract
- Применяй skill только если blueprint включает modal dialogs.
- Обеспечь overlay/card/title/body/actions и закрытие видимыми действиями.

## Optional Capabilities
- `dialog.form` — предметная form modal.
- `dialog.error` — единый unexpected error dialog.
- `dialog.success` — отдельный success dialog.
- `dialog.stacking` — контролируемое наложение dialogs.

## Bundled Template
Используй готовый комплект:

- `assets/template.js` — vanilla dialog stack с явным lifecycle;
- `assets/template.css` — overlay levels, card sizes, fixed title/actions и scrollable body;
- `assets/template.html` — примеры form, error и success dialogs.

1. Прочитай все три файла.
2. Скопируй module и стили в `public/js|css/app/dialogs`.
3. Создай для каждого предметного диалога отдельные JS/CSS/HTML-файлы по правилам `frontend/frontend-project-structure`.
4. Создай один module через `window.GenieDialogSystem.create(...)` и вызови
   `mount(root)`.
5. Храни state предметных диалогов в root state через их модули.
6. Не копируй тексты, selectors и namespace приложения-источника.

## Base Contract
- Base dialog предоставляет overlay, card, titlebar, close button, scrollable body и actions slot.
- Используй видимые кнопки: крестик, `Отмена`/`Закрыть` и primary `Применить`/`Сохранить`/`Ок`.
- Не закрывай dialog по `Escape`, `Enter` или другим клавишам.
- Не закрывай dialog по клику на overlay.
- Не добавляй global keyboard handler для dialogs.
- Отключай close, cancel и primary actions во время выполняющейся операции.
- Меняй текст primary button на состояние операции, например `Сохранение...`.
- Ограничивай card viewport; прокручивай body, сохраняя titlebar и actions на месте.
- Используй стандартные размеры около `480px` для error/success и `560px` для form dialogs.

## State and Stacking
- В обычном состоянии показывай один основной dialog.
- Разрешай file browser поверх form dialog.
- Реализуй его предметное поведение по `frontend/file-browser-dialog`.
- Разрешай unexpected error dialog поверх любого основного dialog или file browser.
- Не закрывай и не очищай нижний dialog при открытии верхнего.
- После закрытия верхнего dialog пользователь продолжает работу с сохранёнными значениями нижнего.
- При повторном открытии отменённого dialog заново инициализируй поля из актуального backend/default state.

## Operation Flow
- Устанавливай `busy=true` до API action.
- Закрывай form dialog только внутри success-ветки завершившейся операции.
- После успешной операции сначала закрой form dialog, затем открой success dialog.
- При ошибке оставь form dialog и введённые значения, открой error dialog поверх него и сними `busy` в `finally`.
- После закрытия error dialog разрешай повторить исходную операцию.
- Не выполняй optimistic close до backend response.

## Unexpected Errors
- Показывай заголовок `Ошибка`, красный alert, короткий пользовательский текст и кнопки `Закрыть` и `Ок`, как в текущем приложении.
- Используй один error dialog без очереди.
- Если новая unexpected error приходит при уже открытом error dialog, замени отображаемый короткий текст последней ошибкой.
- Не добавляй queue, deduplication, counter или history без отдельного требования.
- Полный error object, stack и context отправляй в frontend/backend logs, но не показывай в dialog.
- Unexpected HTTP, transport, frontend и library errors направляй в этот dialog.

## Success Dialog
- Показывай success как отдельный modal dialog с коротким сообщением и кнопкой `Ок`.
- Закрывай success dialog только видимыми кнопками; не назначай Enter.
- Не заменяй modal success toast-уведомлением без отдельного требования.

## Validation Boundaries
- Semantic field validation показывай под соответствующим control.
- Calculation error показывай overlay поверх output canvas.
- Не направляй ожидаемые validation/calculation errors в unexpected error dialog.

## Verification
- Проверь stable `data-testid`, производный от `title-id`, и отдельный id
  кнопки закрытия каждого base dialog.
- Проверь close, cancel и primary buttons; overlay и keyboard не должны закрывать dialog.
- Проверь disabled actions и operation text при `busy=true`.
- Проверь success sequence: form закрывается, затем открывается success.
- Проверь error sequence: form остаётся, error открывается сверху, введённые значения сохраняются.
- Проверь замену текста новой unexpected error без очереди.
- Проверь stacking form → file browser → error.
- Проверь повторное открытие с актуальными backend/default values.
- Проверь размеры, body scroll, fixed title/actions и узкий viewport.
- Запусти `node --check` для перенесённого JS и `node test/front/run_front_tests.js`.
