# Settings Controls

## When to Use
- Нужно реализовать панель настроек типового Genie-приложения.
- Нужно добавить переиспользуемый scalar control или отобразить backend validation metadata.
- Нужно согласовать числовой ввод, enum, checkbox, readonly value, warning или error.

## When NOT to Use
- Нужны массивы, динамические списки, file input, date, color или другой составной control.

## Rendering Model
- Размещай controls явно в HTML-шаблоне. Не генерируй всю форму одним универсальным `v-for`.
- Реализуй типовые controls как переиспользуемые Vue-компоненты.
- Получай значения, ограничения, варианты и validation state из полного backend `settings`.
- После изменения поля применяй только актуальный полный settings payload;
  устаревший response не должен перезаписывать более новый draft/context.
- Группируй отправку typed signal/settings changes фиксированным trailing
  debounce 150 ms. Немедленно обновляй локальный draft; Apply сначала flushes
  pending valid changes, затем выполняет собственный request.

## Async state и stale responses

- Храни backend settings snapshot отдельно от локального незавершённого draft.
- Для каждого field update фиксируй context key (например, main object) и
  монотонный request id; применяй response только при совпадении обоих.
- Дополнительно сравнивай backend `state_revision`: response с revision меньше
  уже принятой не может изменить settings или UI state.
- При смене object/session/context инвалидируй все ожидающие responses старого
  context и инициализируй controls новым полным payload.
- Не позволяй более раннему response стирать поздний draft, error/warning или
  выбранный enum. Не решай race произвольным `sleep`.
- Очищай debounce timers и pending markers в `beforeUnmount`.

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

- Используй stable `id` в API, component key и `data-testid`.
- Считай неприменимые metadata пустыми, но сохраняй стабильную форму контракта.
- Управляй видимостью control через backend `visible`.
- Не определяй semantic validation повторно на frontend.

## Technical Reference and Design

Используй `reference/template.js` для Vue components, typed drafts, parsing,
validation mapping and Apply lifecycle. Control composition, visual validation,
groups and responsive layout бери из pinned Designer package.

1. Прочитай technical JS reference и pinned design package.
2. Зарегистрируй components из `window.GenieSettingsControls.create(...)` в одном root Vue app.
3. Свяжи field ids and bindings с текущим backend contract.
4. Добавь stable `data-testid` по frontend report contract.
5. Подключи tokens и layout из design package.
6. Не копируй namespace, texts или domain fields reference implementation.
7. Не перезаписывай существующий control без сравнения его поведения и утверждённого design state.
8. Все enum, dropdown и group menus делай по одному canonical settings-menu
   contract из design package: те же control height, item height, width,
   padding, border, radius, shadow, colors, hover/focus и overlay placement.
9. Считай DOM focus и состояние popup независимыми: закрытый popup с очищенным
   active option — `not active`, даже если input остаётся keyboard-focused.

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
- Используй текстовый draft input с `inputmode="decimal"` и явным parser,
  чтобы не терять промежуточные записи вроде `-`, `1e` и `1e-`; browser
  validity не должен быть единственным источником проверки.
- Считай `12.` завершённым допустимым числом. Пока пользователь редактирует
  поле, сохраняй и показывай raw string ровно как `12.`: не заменяй его на
  `12` через `Number`, `parseFloat` или backend response на каждом keystroke.
  Числовое значение для typed change/API получай отдельно и передавай рядом с
  `rawDraft`; parent binding продолжает хранить raw string. Нормализация
  отображаемого draft допускается только при явном Apply/commit контекста.
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
- После выбора option ЛКМ немедленно сохрани value, закрой popup, очисти
  `activeIndex` и popup geometry: компонент переходит в `not active`. Не
  вызывай `element.blur()` и не требуй потери DOM focus; focus-ring управляется
  отдельно правилами доступности.
- Один document-level outside-pointer handler должен закрывать все открытые
  dropdown при клике по холсту приложения или вне соответствующих trigger и
  popup. Клик по другому dropdown закрывает предыдущий перед открытием нового.
  Удаляй global listener в `beforeUnmount`; не используй таймер потери фокуса
  как основной механизм закрытия.

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
- Проверь пустой numeric input, знак, decimal point, точное сохранение `12.`
  как видимого valid draft и незавершённую exponent-запись.
- Проверь `1e6`, `1E-3`, отрицательное значение и integer result.
- Проверь значение вне `min/max`: оно отправляется и остаётся в поле вместе с backend error.
- Проверь error, warning, readonly, checkbox и скрытое поле.
- Проверь enum search, LMB selection → `not active` без принудительного DOM
  blur, внешний клик по холсту, переключение между двумя dropdown, закрытие без
  выбора и keyboard navigation.
- Проверь форму с группами и без них.
- Проверь batching нескольких inputs в один последний update после 150 ms,
  flush перед Apply и rejection stale `state_revision`.
- Проверь canonical menu geometry/colors во всех settings controls.
- Проверь `node --check` для перенесённого JS-шаблона.
- Запусти `node test/front/run_front_tests.js`.
