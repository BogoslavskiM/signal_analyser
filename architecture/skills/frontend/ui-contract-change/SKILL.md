---
name: ui-contract-change
---
# UI Contract Change

## When to Use
- Нужно изменить JS/CSS/HTML, API-client usage, UI state, selectors или user-facing behavior.
- Нужно обновить zone, dialog, control, graph page или frontend contract tests.

## When NOT to Use
- Нужно изменить backend API semantics.
- Нужно написать только Playwright сценарий без изменения frontend source.

## Workflow
1. Прочитай affected `public/` файлы и matching tests под `test/front/`.
2. Сохраняй selectors, data shapes и exported functions, если задача явно не меняет contract.
3. Держи layout/style изменения в affected zone/component stylesheet.
4. Обнови frontend API client, если появился новый endpoint или payload field.
5. Строй settings controls по правилам `frontend/settings-controls`.
6. Не отправляй в typed backend endpoint локальный draft, который ещё нельзя преобразовать в заявленный тип.
7. После field update применяй полный settings payload из response и подсвечивай semantic validation error без локального отката значения.
8. Реализуй inspector table/list по правилам `frontend/inspector-ui`.
9. Применяй inspector CRUD response как полный table payload: columns, typed rows, order, main object и selected objects.
10. Для select-all отправляй `selected` и ids текущих filtered rows. Не отправляй search query как backend-фильтр.
11. Храни search query и visible columns только во frontend state.
12. Добавь стабильные `data-testid` для всех значимых E2E actions и observable
    states: controls, rows, tabs, dialogs, loading/error overlays и output
    hosts. Передай их e2e-tester вместе с enabled frontend skill ids и
    предметными product capability ids, затронутыми изменением.
13. Добавь или обнови static/behavior contract tests.
14. После завершения coherent feature проведи аналитический design review
    каждого menu item/button: purpose, placement/hierarchy, label/icon/tooltip,
    accessible name, focus order/hit target, default/hover/focus-visible/
    active/disabled/busy/destructive states, visibility, confirmation,
    error/success feedback и recovery. Для каждого finding укажи resolved или
    deferred.
15. Передай feature-complete handoff с review Architect. E2E handoff допустим
    только после ordinary Tester regression и Architect milestone; не создавай
    отдельный E2E-цикл после каждой кнопки.

## Guardrails
- Не переносить business logic во frontend, если она принадлежит backend.
- Не дублируй semantic validation вместо отображения backend validation result.
- Не использовать inline JS в HTML для сложного поведения.
- Не ломать stable selectors без тестового и e2e handoff.
- Не используй локализованный title/name как единственную часть dynamic
  `data-testid`; основывай его на stable backend id.
- Не смешивать unrelated visual refactor с contract change.

## Reference
Проверка:

```bash
node test/front/run_front_tests.js
```
