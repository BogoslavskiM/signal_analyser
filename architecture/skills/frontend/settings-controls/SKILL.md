---
name: settings-controls
---
# Settings Controls

## When to Use
- Нужно реализовать панель настроек типового Genie-приложения.
- Нужно добавить переиспользуемый scalar control или отобразить backend validation metadata.
- Нужно согласовать числовой ввод, enum, checkbox, readonly value, warning или error.

## When NOT to Use
- Нужно реализовать очередь draft-запросов и защиту от устаревших ответов.
- Нужны массивы, динамические списки, file input, date, color или другой составной control.

## Core Contract
- Применяй skill только если blueprint включает scalar settings controls.
- Рендери явные typed controls из backend metadata без дублирования semantic validation.

## Optional Capabilities
- `settings.searchable-enum` — searchable enum control.
- `settings.warning` — warning state отдельно от error.
- `settings.groups` — сворачиваемые группы.
- `settings.readonly` — статическое readonly представление.
- `settings.apply` — согласованный Apply action.

## Rendering Model
- Перечисляй field ids явно в frontend `groups`/`fieldIds` layout config. Не
  формируй состав формы динамически из backend metadata.
- Реализуй типовые controls как переиспользуемые vanilla modules.
- Получай значения, ограничения, варианты и validation state из полного backend `settings`.
- После изменения поля применяй полный settings payload по правилам `frontend/frontend-state-management`.

Минимальные metadata поля:

```text
id
label
type
value
error
warning
readonly
visible
required
units
min
max
step
options
```

- Используй stable `id` в API, layout registry и `data-testid`.
- Считай неприменимые metadata пустыми, но сохраняй стабильную форму контракта.
- Управляй видимостью control через backend `visible`.
- Не определяй semantic validation повторно на frontend.

## Bundled Template
Используй готовый комплект:

- `assets/template.js` — vanilla scalar controls и explicit layout registry;
- `assets/template.css` — связанные стили controls, validation states, groups и Apply;
- `assets/template.html` — явный пример подключения controls к полному settings payload.

1. Прочитай все три файла перед переносом.
2. Скопируй их содержимое в соответствующие JS/CSS/HTML пути целевого приложения.
3. Создай module через `window.GenieSettingsControls.create(...)`, передай
   явные `groups`/`fieldIds`, затем вызови `mount(root)`.
4. Замени примерные field ids в layout config на поля текущего backend contract.
5. Сохрани generic control classes и `data-testid`, если нет явной причины изменить публичный UI contract.
6. Подключи существующие CSS variables приложения; fallback-значения шаблона используй только как страховку.
7. Не копируй в template namespace, тексты или domain fields приложения-источника.
8. Не перезаписывай существующий control целиком без сравнения его поведения с шаблоном.

## Supported Controls
Поддерживай только scalar controls:

- `string` — обычное текстовое поле;
- `float` — числовое поле;
- `int` — числовое поле с проверкой целого результата;
- `enum` — searchable combobox;
- `boolean` — checkbox;
- readonly control для поля с `readonly=true`.

Не добавляй другие типы без отдельного требования.

## Numeric Input
- Разрешай только точку как десятичный разделитель.
- Разрешай ведущий `+` или `-`.
- Разрешай стандартную научную запись через `e` или `E`. Не поддерживай `d` и `D`.
- Для `int` принимай запись только тогда, когда её числовой результат является конечным безопасным целым.
- Используй встроенные возможности numeric input и browser validity, дополняя их минимальной проверкой dot-only и требуемого типа.
- Не ограничивай ввод жёстко через `min`, `max` или автоматический clamp. Типизированное значение вне диапазона отправляй backend и показывай полученную semantic validation error.
- Считай пустую и незавершённую запись наподобие `-`, `1e` или `1e-` допустимым временным UI draft.
- Для временно нечислового draft показывай красную рамку и inline error, не отправляй значение в типизированный backend endpoint.
- Не вызывай Apply, пока существует локальный numeric draft, который нельзя преобразовать в заявленный тип.
- После получения backend error не откатывай типизированное значение.

## String Input
- Разрешай произвольный текст.
- Отправляй пустую строку backend как типизированное string-значение.
- При `required=true` показывай validation error из полного backend settings.
- Не блокируй редактирование из-за validation error.

## Enum Input
- Всегда используй searchable combobox независимо от числа вариантов.
- Встраивай поиск в сам control без отдельного поля или дополнительной строки layout.
- Во время ввода изменяй только локальный search query.
- Изменяй enum value только после выбора элемента из `options`.
- Не сохраняй произвольный текст как enum.
- При закрытии без выбора восстанавливай label текущего выбранного значения.
- Поддерживай выбор мышью и клавиатурой, `Enter`, `Escape` и перемещение стрелками.

## Boolean and Readonly
- Всегда отображай boolean как checkbox. Не заменяй его toggle.
- Связывай label с checkbox, чтобы нажатие на label меняло значение.
- Отображай readonly поле как label и статическое значение без вида редактируемого input.

## Validation Presentation
- Разрешай пользователю редактировать поле при наличии validation error или warning.
- Показывай error красной рамкой, status icon и текстом под control.
- Показывай warning жёлтой рамкой, status icon и текстом под control.
- Считай backend `error` semantic validation result. Он не отменяет сохранение типизированного draft.
- Не блокируй отправку draft или Apply из-за warning.
- Не показывай старые error и warning после более нового локального изменения по правилам request queue.

## Units and Groups
- Показывай `units` рядом с label, как в текущей панели настроек.
- Не конвертируй единицы на frontend. Backend value и отображаемое значение используют одну единицу.
- Разрешай короткую форму без групп.
- Для большой формы явно задавай во frontend-шаблоне названия, порядок и состав сворачиваемых групп.
- Храни открытое/закрытое состояние групп только на frontend.
- Не передавай состояние раскрытия групп backend.

## Apply and Dirty State
- Не показывай отдельный признак «draft не применён».
- Перед Apply проверяй только наличие локальных значений, которые невозможно типизированно отправить backend.
- Не блокируй Apply из-за backend semantic error: Apply выполняет итоговую backend-валидацию и возвращает `success=false`.

## Verification
- Проверь stable `data-testid` каждого field и кнопки Apply.
- Проверь пустой numeric input, знак, decimal point и незавершённую exponent-запись.
- Проверь `1e6`, `1E-3`, отрицательное значение и integer result.
- Проверь значение вне `min/max`: оно отправляется и остаётся в поле вместе с backend error.
- Проверь error, warning, readonly, checkbox и скрытое поле.
- Проверь enum search, выбор, закрытие без выбора и keyboard navigation.
- Проверь форму с группами и без них.
- Проверь `node --check` для перенесённого JS-шаблона.
- Запусти `node test/front/run_front_tests.js`.
