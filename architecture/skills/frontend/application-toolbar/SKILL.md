---
name: application-toolbar
---
# Application Toolbar

## When to Use
- Создаётся верхняя панель типового Genie-приложения.
- Нужно показать бренд, название, версию и глобальные действия приложения.

## When NOT to Use
- Действие относится только к конкретной zone или table row.
- Нужна локальная панель управления графиком.

## Core Contract
- Применяй skill только если blueprint включает application toolbar.
- Покажи brand/name/version и только объявленные backend capabilities.

## Optional Capabilities
- `toolbar.import` — глобальный import action.
- `toolbar.export` — глобальный export action.
- `toolbar.export-split` — primary/default action и dropdown операций.
- `toolbar.other-actions` — дополнительные глобальные actions.
- `toolbar.help` — help link.

## Bundled Template
Bundle реализован на vanilla JavaScript и проверяется общим asset validator.

Используй:

- `assets/template.js` — capability state, actions и export menu;
- `assets/template.css` — fixed toolbar и split button;
- `assets/template.html` — бренд и порядок глобальных действий.

1. Подключи module до root `app.js`.
2. Создай module через `window.GenieApplicationToolbar.create(...)`, затем
   вызови `mount(root)`.
3. Передай frontend config: `appName`, `logoPath`, action handlers и mapping
   trusted icon ids на локальные SVG paths.
4. Примени backend payload версии и доступных export operations через
   `actions.configure(...)`.
5. Скопируй только SVG, реально используемые действиями.
6. Используй tooltip contract из `frontend/style-system`.

## Inheritance
- Наследуй tokens, local font, icon mask, tooltip и fixed canvas из
  `frontend/style-system`.
- Не создавай отдельную палитру или responsive toolbar.

## Brand
- Toolbar существует только когда capability выбрана в blueprint.
- Слева всегда показывай некликабельный логотип Engee, название приложения и
  `Версия <app_version>`.
- Название задаётся frontend config конкретного приложения.
- Версия приходит с backend.
- Не превращай logo или brand block в ссылку/кнопку.

## Actions
- Справа располагай действия в порядке: import, export, дополнительные
  глобальные действия, help.
- Import, export и help показывай только при наличии соответствующей
  capability. Допускай другие глобальные действия приложения.
- Если capability не поддерживается приложением, не создавай кнопку.
- Если поддерживаемое действие временно недоступно, оставляй кнопку видимой и
  disabled.
- Кнопки toolbar показывай только иконками; label используй для `data-tooltip`,
  `aria-label` и visually hidden text.
- Help всегда является ссылкой, открывающейся в новой вкладке. URL задаёт
  frontend config или backend capability текущего приложения.

## Export Split Button
- При нескольких operations export состоит из двух соседних controls: primary
  icon button и отдельной arrow button.
- Primary button открывает export dialog с backend-default operation.
- Arrow button открывает полный список доступных operations, включая default,
  только по click.
- Не открывай export menu по hover или focus.
- По умолчанию каждый пункт dropdown содержит icon и text.
- При единственной operation показывай обычную icon button без arrow.
- Временно недоступную operation оставляй в dropdown видимой и disabled.
- Backend задаёт available operations и default operation; toolbar не
  придумывает формат экспорта.
- Operation-specific form открывай через `frontend/object-export-dialog` или
  `frontend/session-import-export-ui`.
- Закрывай menu после выбора, при click вне menu, scroll и resize.
- Закрывай menu перед запуском любого другого toolbar action.

## Capability Contract

```text
app_version
toolbar:
  import:
    visible
    disabled
  export:
    visible
    disabled
    default_operation
    operations:
      - id
        label
        icon
        disabled
  other_actions:
    - id
      label
      icon
      visible
      disabled
  help:
    visible
    disabled
    href
```

- `icon` — stable id из frontend icon mapping, не произвольный path или remote
  URL.
- Полностью замещай capability payload после backend response.
- Open state export menu является временным frontend state и не сохраняется в
  session.

## Fixed Layout
- Toolbar не перестраивается и не переносит actions в overflow menu.
- Не скрывай title/version/actions из-за узкого viewport.
- При нехватке ширины приложение сохраняет fixed canvas по
  `frontend/style-system`.

## Guardrails
- Не смешивай глобальные и zone-local actions.
- Не копируй конкретное имя исходного приложения в шаблон.
- Не открывай export dropdown наведением.
- Не запускай экспорт непосредственно из toolbar module: передавай command
  соответствующему dialog/root handler.
- Не делай help button обработчиком, если можно использовать обычную ссылку.

## Verification
- Проверь logo, app name и backend version.
- Проверь порядок, visibility и disabled state всех capabilities.
- Проверь две независимые части export split button.
- Проверь обычную export button без arrow при единственной operation.
- Проверь default operation и выбор каждой dropdown operation.
- Проверь, что dropdown содержит default и disabled operations.
- Убедись, что hover/focus не открывает export menu.
- Проверь закрытие menu после выбора, outside click, scroll и resize.
- Проверь tooltip/accessible labels и help href.
- Уменьши viewport: toolbar не должен перестраиваться.
- Запусти `node test/front/run_front_tests.js`.
