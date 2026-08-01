# DEC-20260801-037: действия инспектора сигналов

ID: `DEC-20260801-037`
Дата: `2026-08-01`
Статус: accepted
Supersedes: none
Extends: [DEC-012 display state separation](DEC-20260731-012-display-selection-separation.md)
Implementation: planned in Signals milestone; not deployed

## Контекст

Текущая нижняя таблица показывает global inventory, global row selection и
membership активного Display. Checkbox управляет только отображением на active
Display, а row click выбирает сигнал анализа. Add, Copy и Delete отсутствуют;
runtime inventory создаётся из двух встроенных сигналов при старте.

Официальный MATLAB Signal Analyzer импортирует значения из Workspace browser,
использует `Duplicate` для клонирования и подтверждает Delete. Preprocess и
derived signals принимаются через отдельный transactional workflow:

- [Select Signals to Analyze](https://www.mathworks.com/help/signal/ug/select-signals-to-analyze.html);
- [Preprocess Signals](https://www.mathworks.com/help/signal/ug/preprocess-signals.html).

Для Engee существует официальный API обмена Genie с рабочей областью:
`engee.genie.recv(name; context=Main)`. Динамический `eval` для импорта не
нужен и запрещается:

- [Публичные методы программного управления Genie](https://engee.com/helpcenter/stable/ru/feature/genie-functions.html);
- [Работа с Genie в Engee](https://engee.com/helpcenter/stable/ru/feature/genie-engee.html).

## Решение

Signals milestone реализует ровно три toolbar actions: Add, Copy и Delete.
Существующие row selection и visibility checkbox сохраняют разные semantics.
Rename, reorder, search, columns menu и общий preprocessing editor не входят.

### Add

Icon button `signals-add-action` открывает menu `signals-add-menu` с двумя
действиями:

1. `signals-add-workspace-action` — «Из рабочей области…»;
2. `signals-add-selection-action` — «Из выбранного диапазона».

Workspace form принимает имя переменной Engee, необязательное имя базового
сигнала и необязательную частоту дискретизации. Backend использует только
typed adapter над `engee.genie.recv`; `engee.genie.eval`, Julia `Main` текущего
Genie-процесса, local file browser и произвольное выполнение кода запрещены.

Поддерживаемые входы первого milestone:

- конечный numeric vector длиной не менее двух samples;
- finite numeric matrix с не менее чем двумя строками: каждый столбец становится
  отдельным сигналом;
- workspace value с uniform finite `time` и numeric `value`, если официальный
  runtime adapter может безопасно получить эти поля; sample rate выводится из
  времени.

Для raw vector/matrix требуется finite positive `sample_rate_hz`. Если source
уже содержит uniform time, пустое значение sample rate разрешено. Workspace
value копируется в owned samples: последующее изменение source не обновляет
app signal автоматически.

«Из выбранного диапазона» копирует authoritative raw complex samples current
analysis source по inclusive `time_limits` active Display, сохраняет sample
rate и complex semantics и rebases новое время к нулю. Использовать
downsampled plot payload или magnitude ROI запрещено. Диапазон обязан содержать
не менее двух samples.

### Copy

`signals-copy-action` создаёт deep copy current global row-selected signal.
Backend генерирует collision-safe имя `<source>_Copy`, затем `_Copy2`, и новый
цвет из действующей palette. Raw samples не alias исходный vector, caches не
переиспользуются.

### Delete

`signals-delete-action` открывает видимый confirmation dialog с именем сигнала
и формулировкой удаления из текущей сессии. Только confirm отправляет mutation;
cancel ничего не меняет. Последний global signal удалить нельзя: action disabled
при одном сигнале, backend независимо возвращает field-level `422`.

Удаление убирает сигнал из inventory и membership всех Displays. Страница,
потерявшая analysis source, выбирает первый remaining member; empty Display
получает null source/time limits и выключенные Peaks. Если удалён global row
selection, выбирается первый оставшийся signal. Caches удалённого имени
очищаются.

Это явный project-specific override generic `frontend/inspector-ui`: Copy и
Delete существуют только в Signals toolbar, не дублируются в каждой row, а
Delete требует confirmation. Override принят из прямого review пользователя и
документированного MATLAB Delete workflow; остальные core semantics inspector
(row selection, visibility checkbox, backend-confirmed state) сохраняются.

## API и atomic lifecycle

Добавляется один `POST /api/signals` с strict operation union:

```text
import_workspace:
  state_revision
  operation="import_workspace"
  variable_name
  signal_name: string|null
  sample_rate_hz: number|null

duplicate:
  state_revision
  operation="duplicate"
  signal_name

extract_time_limits:
  state_revision
  operation="extract_time_limits"
  display_id

delete:
  state_revision
  operation="delete"
  signal_name
```

HTTP mapper создаёт typed command; domain/service выполняет validate →
prospective inventory/Displays/caches → preparation active outputs → single
publish. Route не содержит mutation logic. Success возвращает полный
authoritative snapshot HTTP 200. Stale revision использует существующий
`409 stale_state` с одинаковыми `state` и `current`; semantic/type validation —
существующий `422 invalid_request`. Ошибка adapter/provider/preparation не
меняет inventory, Displays, caches или revision.

`signal_name=null` выбирает backend base name из `variable_name`; непустая
строка задаёт явный base name. Пустая или whitespace-only строка не является
alias для `null` и отклоняется. Ключ `signal_name` обязателен в exact
`import_workspace` body; отсутствие ключа также даёт `422`.

Import matrix публикуется атомарно. Имена генерируются из requested base либо
workspace variable и получают suffix при collision. Каждый новый сигнал
добавляется в конец global order и membership active Display. Первый новый
сигнал становится global row selection и analysis source active Display;
inactive Displays не меняются. Duplicate и Extract следуют тому же правилу.
Фактическая command увеличивает общую revision ровно на один.

Текущие имена остаются canonical identity этого milestone. Rename и replace
отсутствуют, поэтому migration на stable opaque IDs не требуется. Она может
быть принята отдельным successor ADR.

## Frontend lifecycle

- Никакого optimistic CRUD: UI заменяет state только полным server snapshot.
- Во время mutation busy/disabled только связанное действие; повторная signal
  mutation не запускается.
- `409 current` сначала канонизирует state и повторяет intent не более одного
  раза, только если source/Display всё ещё существует и preconditions valid.
- Workspace и confirmation dialogs закрываются только видимыми actions; error
  сохраняет введённые workspace fields и показывает общий error dialog.
- Add menu закрывается после выбора, outside click, scroll и resize.
- Icon-only controls имеют local SVG/currentColor, tooltip, accessible name и
  stable `data-testid`.

## Design и E2E gate

После product и ordinary tests Frontend проводит action-by-action review:
Add trigger, оба menu items, workspace submit/cancel/close, Copy, Delete,
confirmation confirm/cancel/close и row/visibility interactions. Для каждого
фиксируются purpose, hierarchy, icon/label/tooltip, accessible name, focus/hit
target, default/hover/focus/active/disabled/busy/destructive states,
visibility, validation, feedback и recovery.

Только после этого Architect объявляет Signals inspector complete и выдаёт
один интегральный E2E milestone. Отдельный E2E после каждой кнопки запрещён.

## Вне scope

- rename, reorder, search, columns customization и bulk CRUD;
- generic preprocessing mode, Accept All/Cancel history, filters/resampling;
- file import/browser, session persistence и export;
- automatic workspace enumeration или live binding;
- stable opaque signal IDs и replace/overwrite;
- settings menus, graph application, Jet и optimization.

## Проверка

Backend/unit/API: all operations, vector/matrix/timed workspace doubles,
collision names/colors, two-sample boundary, deep copy, multi-Display delete,
last-delete rejection, cache isolation, rollback, +1 revision, 409/422 and full
snapshot.

Frontend/static/behavior: exact selectors/accessibility, menu/dialog lifecycle,
payloads, action-local busy, no optimistic state, 409 bounded retry, error
preservation, add/copy/delete effects, row-selection versus visibility and
disabled preconditions.

## Связи

- [Signals assessment](../../agents/reports/signal-inventory-actions-assessment-20260801.md)
- [Signals milestone report](../reports/signal-analyser-signals-inspector-v31.md)

Контракт зафиксирован до реализации. Product, tests, E2E runtime и deployment
этим решением не заявляются.
