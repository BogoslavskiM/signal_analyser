---
name: object-export-dialog
---
# Object Export Dialog

## When to Use
- Один или несколько уже выбранных domain objects можно экспортировать поддерживаемыми приложением способами.
- Backend возвращает доступные операции и context-dependent defaults.

## When NOT to Use
- Нужно экспортировать полную сессию приложения.
- Нужно сформировать export value, вычислить математику или построить Engee topology.
- Приложение не поддерживает object export.

## Core Contract
- Применяй skill только если blueprint включает object export UI.
- Получай operations/defaults с backend и используй explicit forms.

## Optional Capabilities
- `object-export.workspace` — workspace form.
- `object-export.julia-script` — Julia script form.
- `object-export.jld2` — JLD2 form.
- `object-export.engee-model` — Engee model form.

## Inheritance
- Наследуй modal/busy/error/success flow из `frontend/dialog-system`.
- Для file targets используй `path-input` и targets из `frontend/file-browser-dialog`.
- Не дублируй base dialog и file browser.

## Bundled Template
Используй:

- `assets/template.js` — operation registry, state, defaults switch и export action;
- `assets/template.css` — selector и operation form container;
- `assets/template.html` — mount point export dialog.

1. Прочитай все три файла.
2. Создай module через `window.GenieObjectExportDialog.create(...)`.
3. Передай API actions `open`, `changeOperation`, `exportObject`.
4. Передай map explicit vanilla form renderers только для операций текущего приложения.
5. Передай opaque export context из вызывающей inspector/zone.
6. Вызови `mount(root)`.
7. Не стандартизируй форму context и context-dependent defaults заранее.

## Available Operations
- Ни одна export operation не является обязательной или стандартной.
- Backend возвращает только доступные в текущем context операции:

```text
operations:
  - id
    label
active_operation
operation_state
field_errors
```

- Показывай operation selector всегда.
- Если operation одна, оставляй selector видимым и disabled.
- Если операций несколько, переключение запрашивает backend defaults новой операции.
- Не сохраняй незавершённые values предыдущей операции.
- Defaults могут зависеть от любого state приложения; frontend только применяет response.

## Explicit Forms
- Для каждой подключённой операции создай явную form render-функцию.
- Не создавай универсальный form generator из field metadata.
- Form получает `operation_state`, `field_errors` и `busy`, обновляет только свои explicit fields.
- File operation обычно использует path, filename и overwrite.
- Workspace operation обычно использует variable name и overwrite.
- Operation-specific fields и capabilities не объявляй общими, если они нужны только одному формату.

## Backend Operation Skills
- Workspace delivery: `backend/export-to-workspace`.
- Julia script: `backend/export-to-julia-script`.
- JLD2: `backend/export-to-jld2`.
- Engee model: `backend/export-to-engee-model`.
- Формирование object/math/model description остаётся в domain/calculation/model-generation skill.

## Context and Defaults
- Export dialog не выбирает objects самостоятельно.
- Один/несколько objects и scope определяет вызывающая zone.
- Передавай context backend как opaque contract текущего приложения.
- При каждом open получай operations, active operation и defaults заново.
- При switch применяй полный operation response и field errors.

## Submit Flow
- Все export operations выполняет backend.
- Во время export используй dialog busy и global loader.
- Для backend validation response оставляй dialog open и показывай errors под соответствующими fields.
- При success закрой form, затем покажи success dialog с backend message.
- Backend message может содержать normalized workspace variable или file path.
- При unexpected error оставь form и values, покажи error dialog сверху.

## Verification
- Проверь stable `data-testid` operation selector и action buttons.
- Проверь zero/one/multiple operations; при одной selector видим и disabled.
- Проверь context-dependent defaults при open.
- Проверь discard values и новые defaults при operation switch.
- Проверь explicit form renderer и отсутствие metadata form generator.
- Проверь field validation отдельно от unexpected error.
- Проверь busy/global loader, success target и form retention при error.
- Проверь, что dialog не выбирает objects и не формирует export value.
- Запусти `node --check` для перенесённого JS и `node test/front/run_front_tests.js`.
