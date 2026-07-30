---
name: session-import-export-ui
version: 0.3.0
---
# Session Import Export UI

## When to Use
- Типовое приложение должно экспортировать и импортировать полную backend-сессию.
- Нужны session form dialogs, typed path fields и применение полного imported state.

## When NOT to Use
- Нужно сохранить отдельный domain object в workspace, script, JLD2 или Engee model.
- Нужно изменить общий modal contract — используй `frontend/dialog-system`.
- Нужно реализовать backend serialization.

## Inheritance
- Наследуй modal structure, busy/error/success flow и stacking из `frontend/dialog-system`.
- Используй server-side path selection из `frontend/file-browser-dialog`.
- Не копируй base dialog CSS/JS в этот skill.
- Пиши поля form явно в HTML и привязывай к root state только изменяемые значения.
- Не создавай metadata-driven form generator.

## Bundled Template
Используй:

- `assets/template.js` — state, open/export/import actions и file-browser targets;
- `assets/template.css` — только session-specific form rows;
- `assets/template.html` — export/import dialogs на базе `base-dialog`.

1. Прочитай все три файла.
2. Подключи `dialog-system` и `file-browser-dialog`.
3. Создай module через `window.GenieSessionImportExportUi.create(...)`.
4. Передай API actions `openExport`, `exportSession`, `openImport`, `importSession`.
5. Передай `applyBackendState`, global loader methods и общий unexpected error reporter.
6. Добавь возвращённые file-browser targets в target registry.

## Session Format
- Используй `.jld2` без frontend-выбора другого формата.
- Считай import/export обязательной возможностью типового приложения.
- Не определяй структуру сессии на frontend: backend сериализует согласованные typed structures.
- Ожидай обязательный backend session identity `__genie_app_name`.
- Backend session включает objects/settings, inspector order, selection, main object, multi-page state, page controls, последнее полностью записанное output data и `isready/success/error`.
- Plotly viewport и runtime worker/file-browser/dialog state в сессию не входят.

## Export Dialog
Поля:

```text
directory: path
file_name: string
overwrite: boolean
```

- Показывай overwrite checkbox для любой операции записи в файл.
- Получай initial directory, filename и overwrite default от backend при открытии.
- Разрешай ручной ввод directory и выбор через file browser в `directory` mode.
- Во время export используй dialog busy и global loader, как в текущем приложении.
- Закрывай form только после success response.
- Затем показывай success dialog с backend message, содержащим нормализованный итоговый path.

## Import Dialog
Поля:

```text
file_path: path
replace_current: boolean
```

- Получай initial file path и replace default от backend при открытии.
- Разрешай ручной ввод и file browser в `file` mode с `allowed_extensions=[".jld2"]`.
- При `replace_current=true` backend заменяет текущую сессию.
- При `replace_current=false` backend добавляет импортированные objects и сам разрешает name conflicts.
- Требуй атомарный backend import: при error текущее состояние не меняется частично.
- Во время import используй dialog busy и global loader, как в текущем приложении.
- После success целиком примени backend state и только затем закрой import dialog.
- Не жди расчётов и не нормализуй imported output statuses.
- После закрытия form покажи success dialog с backend message.

## Typed Path Control
- Используй `path-input` component из `frontend/file-browser-dialog`: editable text input и icon button открытия file browser.
- Значение path всегда string.
- Кнопка browse вызывает file browser target; она не меняет path самостоятельно.
- Не открывай native browser file input.
- Не помещай backend filesystem validation во frontend control.

## Error Flow
- При import/export error оставляй form open с введёнными значениями.
- Показывай unexpected error dialog поверх form; полный error отправляй в logs.
- Не закрывай form в `finally`.
- Всегда снимай dialog busy и global loader в `finally`.

## Verification
- Проверь stable `data-testid` всех session fields и action buttons.
- Проверь backend defaults при каждом открытии и reset отменённого draft.
- Проверь explicit path input, browse target и ручное редактирование.
- Проверь `.jld2`, overwrite checkbox и normalized success path.
- Проверь export busy + global loader и close-before-success sequence.
- Проверь replace и merge import, backend conflict mapping и atomic error.
- Проверь полное применение imported state без ожидания расчётов.
- Проверь сохранение imported output statuses и page controls.
- Проверь error поверх form без потери fields.
- Запусти `node --check` для перенесённого JS и `node test/front/run_front_tests.js`.
