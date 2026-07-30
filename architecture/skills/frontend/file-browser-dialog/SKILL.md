---
name: file-browser-dialog
version: 0.3.0
---
# File Browser Dialog

## When to Use
- Form dialog должен выбрать server-side директорию или один файл.
- Нужна навигация внутри разрешённого backend root.
- File browser открывается поверх save/import dialog.

## When NOT to Use
- Нужен нативный browser/OS file picker.
- Нужны upload, rename, delete, create directory или multi-select.
- Нужно реализовать сам import/export workflow.

## Bundled Template
Используй готовый комплект:

- `assets/template.js` — Vue 3 global module, typed `path-input`, state, API actions и target integration;
- `assets/template.css` — tree/list, path bar, loading overlay и compact dialog layout;
- `assets/template.html` — file browser поверх `base-dialog`.

1. Прочитай все три файла.
2. Скопируй их в соответствующие JS/CSS/HTML пути приложения.
3. Подключи `frontend/dialog-system` до file browser.
4. Создай module через `window.GenieFileBrowserDialog.create(...)`.
5. Передай API actions `open`, `path`, `toggle`, `sort`, `select`, `cancel`.
6. Зарегистрируй targets родительских полей с mode, allowed extensions, getter и setter.
7. Не зашивай в generic module конкретные имена target fields приложения-источника.

## Typed Path Control
- Регистрируй возвращённый component `path-input` один раз в root app.
- Используй editable string input и icon button, вызывающую file browser target.
- Не выполняй filesystem validation внутри control.
- Не меняй path по browse button до успешного backend select response.

## Modes and Targets
- Поддерживай только `directory` и `file`.
- В `directory` выбирай текущую директорию.
- В `file` выбирай ровно один доступный файл.
- Передавай `file_browser_target`, mode, текущий path, selected path, sort и allowed extensions по стилю текущего приложения.
- Используй отдельные backend actions `open/path/toggle/sort/select/cancel`.
- При открытии читай актуальное значение target field. Отдельную frontend-историю путей не создавай.
- В file mode открывай директорию, содержащую target file; в directory mode открывай target directory.
- При cancel не изменяй target field.
- После select запиши нормализованный backend path в target field и закрой только file browser.

## Backend State Contract
Backend возвращает полный state:

```text
open
root_path
current_path
parent_path
selected_path
sort_ascending
entries
```

Каждая entry:

```text
name
path
kind
depth
expanded
selectable
```

- `kind` различает directory и file; backend отдельно разрешает или запрещает переход по symlink после проверки real path.
- Не используй параллельные массивы names/paths/kinds/depths.
- Backend нормализует paths и не разрешает перейти выше `root_path`.
- Backend исключает hidden entries, имя которых начинается с точки.
- Для symlink backend проверяет итоговый real path. Ссылку за пределы root показывай недоступной и не открывай.
- Сортируй по имени с folders before files; направление задаёт `sort_ascending`.
- Сохраняй направление сортировки между открытиями.
- При новом открытии сбрасывай expanded folders и selected file.
- При переходе в другую директорию сбрасывай selected file.
- Сравнивай allowed extensions без учёта регистра.

## Interaction
- Клик по directory name переходит в директорию.
- Клик по caret раскрывает или сворачивает directory inline.
- Row `..` переходит к parent, но не показывается в root.
- Клик по selectable file только выбирает строку; отдельного double-click action нет.
- Заверши выбор только по кнопке `Выбрать`.
- Показывай неподходящие файлы disabled, не скрывай их.
- Для пустого списка показывай `В этой папке нет элементов`.
- Обрезай длинные names и paths многоточием, показывай полный текст в tooltip.
- Не закрывай file browser с клавиатуры или по клику на overlay.

## Loading and Errors
- На время каждого backend action устанавливай local `busy`.
- При busy блокируй list, sort, cancel и select; показывай preloader внутри list.
- Не запускай повторный action до завершения текущего.
- При API error оставляй file browser и parent dialog открытыми и показывай unexpected error dialog поверх них.
- Применяй только полный response актуального request/context.

## Verification
- Проверь stable `data-testid` path input, browse, sort, entries,
  loading/empty state и action buttons.
- Проверь directory и file mode, актуальный initial target path и cancel без изменения target.
- Проверь root boundary, parent navigation, inline expand и symlink внутри/вне root.
- Проверь structured entries, hidden exclusion, folders-first sorting и сохранение direction.
- Проверь allowed extensions без учёта регистра и disabled неподходящие files.
- Проверь single click + `Выбрать`, отсутствие double-click и multi-select.
- Проверь reset selected/expanded, empty state, ellipsis и tooltip.
- Проверь busy overlay и disabled actions.
- Проверь stacking parent → file browser → unexpected error.
- Запусти `node --check` для перенесённого JS и `node test/front/run_front_tests.js`.
