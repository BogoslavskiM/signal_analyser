---
name: api-contract-planning
---
# API Contract Planning

## When to Use
- Нужно добавить или изменить Genie API route.
- Нужно описать request/response payload для frontend.
- Нужно связать endpoint с backend mutation helper.

## When NOT to Use
- Нужно только поменять frontend rendering без изменения payload.
- Нужно только изменить calculation function без нового route contract.

## Core Contract

- Для каждого выбранного endpoint зафиксируй method, request/response fields,
  mutations и error behavior.
- Держи business logic в named helpers, а route handlers тонкими.
- По умолчанию semantic validation возвращает HTTP 200, wrong API type — HTTP
  500. `409`, `422`, revisions и другая status policy допустимы только по
  прямому проектному решению и ADR.
- Не создавай endpoint или payload capability, не выбранную в blueprint.

## Optional Capabilities

- `api.inspector` — inspector CRUD/table contract.
- `api.inspector-bulk-selection` — bulk selection subset contract.
- `api.settings` — typed settings get/update/validation.
- `api.apply` — быстрый Apply отдельно от outputs.
- `api.output-zones` — независимые zone data routes.
- `api.pages` — multi-page metadata/page controls.
- `api.file-browser` — server-side file browser actions.
- `api.session` — session import/export/defaults.
- `api.object-export` — operations/defaults/export action.
- `api.toolbar` — app version и toolbar capabilities.
- `api.revision-conflict` — project-specific revision/stale contract; требует ADR.

## Selected Capability Contracts

Применяй следующие правила только для ids из
`enabled_optional_capabilities`:
- Обновляй draft одним field endpoint и возвращай HTTP 200 с полным settings payload.
- Выполняй Apply над уже сохранённым backend draft. Не отправляй settings snapshot повторно в Apply request.
- При Apply сначала останови активную долгую задачу inspector и только затем валидируй draft.
- Остановка в Apply означает немедленную логическую инвалидацию старой revision/очереди; не жди физического завершения worker-задачи.
- При невалидном draft возвращай из Apply HTTP 200, `success=false` и короткий `error`.
- При успешном Apply возвращай только HTTP 200 и `success=true`. Не добавляй `isready`, results, job envelope или состояние зон.
- Не принимай `requested_outputs`: успешный Apply всегда планирует все outputs объекта.
- Создавай отдельную data route для каждой расчётной зоны и возвращай её состояние через `data`, `isready`, `success`, `error`.
- Возвращай `data` как типизированную структуру зоны. До первого результата используй её типизированное пустое значение, а не `null`.
- Возвращай HTTP 500 при неверном JSON/API type: это programmer error.
- Добавляй inspector bulk-selection route только при
  `api.inspector-bulk-selection`.
- Не вводи `422`, idempotency keys, state/settings revisions или обобщённый API
  envelope без явного project decision и ADR.

## Workflow
1. Определи только выбранные группы route: initial state, inspector CRUD, view
   sync, settings, Apply/output data, import/export или другие capabilities.
2. Для каждого endpoint запиши method, request fields, response fields и error behavior.
3. Привяжи endpoint к backend helper; route handler не должен содержать business logic.
4. Раздели domain mutation и view-state mutation, если у них разный lifecycle.
5. Возвращай после inspector CRUD полный table payload: `name_label`, columns, rows, order, main object и selected objects. Каждая row содержит stable `id`, `name` и `cells`; каждая дополнительная cell имеет форму `{value, units}`.
6. Для bulk selection принимай `selected: true|false` и необязательный `object_ids`. Без `object_ids` target set равен всем объектам inspector; с `object_ids` операция применяется только к этому подмножеству. Не изменяй selection объектов вне target set.
7. После bulk selection возвращай HTTP 200 и полный table payload.
8. Разрешай пустой `columns` и отсутствие видимого header row, если inspector показывает только checkbox, имя и actions.
9. Возвращай из settings endpoint полный settings payload. Для каждого поля включай `id`, `label`, `type`, `value`, `error`, `warning`, `readonly`, `visible`, `required`, `units`, `min`, `max`, `step` и `options`; для неприменимых metadata используй стабильные пустые значения.
10. Обновляй одно draft-поле за запрос. После обновления возвращай settings целиком.
11. Нормализуй enum input в backend enum. Конкретное внешнее представление enum не делай частью domain model.
12. Сохраняй typed, но семантически невалидное значение. Отвечай HTTP 200 и включай рассчитанную validation error в settings payload.
13. Считай неверный JSON/API type programmer error, не сохраняй такое значение и отвечай HTTP 500.
14. В начале Apply синхронно инвалидируй старую revision и очередь, чтобы они больше не могли публиковать данные. Не жди физического завершения worker-задачи; затем выполни валидацию settings.
15. Для Apply с невалидными settings отвечай HTTP 200, `success=false` и коротким текстом ошибки. Полную диагностику записывай в backend log, не запускай новую очередь и сохрани ранее рассчитанные данные зон.
16. Для успешного Apply выставь boolean dirty flags расчётных зон, передай план менеджеру только если приложение использует worker, и сразу верни HTTP 200 с `success=true`. Расчётные данные и их статусы получаются отдельными zone-specific requests.
17. Во время расчёта возвращай последнее успешно рассчитанное типизированное `data`, `isready=false`, `success=false`, `error=""`. Если успешного результата ещё не было, возвращай типизированное пустое `data`.
18. После успешного расчёта возвращай `data`, `isready=true`, `success=true`, `error=""`.
19. После ошибки расчёта возвращай прежнее типизированное `data`, `isready=true`, `success=false` и короткий текст в `error`.
20. Публикуй каждую расчётную зону через собственную ручку. Завершённая зона доступна сразу и не ждёт результатов других зон.
21. При смене `main_object`, `main_page`, `selection` или импорте сессии отменяй активную задачу и ожидающую очередь inspector, затем автоматически перестраивай очередь по новому состоянию.
22. Сохраняй сессию немедленно, не ожидая активного расчёта. Сериализуй последнее полностью записанное `data` и текущие статусы расчётных зон непосредственно из persistent-структур объектов, а также `selection` и `main_object`.
23. При импорте восстанавливай `data`, `isready`, `success` и `error` расчётных зон из файла без принудительного изменения статусов.
24. Требуй в корне сессии поле `__genie_app_name` со стабильным именем текущего приложения. Отклоняй файл без поля или с другим значением.
25. Не добавляй версию формата сессии и migration layer без отдельного требования.
26. Не сохраняй worker threads, очередь задач, cancellation tokens и runtime logs.
27. Не создавай endpoint автоматического retry calculation error: повторный расчёт запускает Apply.
28. Добавь API tests на route registration, payload mapping, validation semantics и ключевые state mutation.
29. Возвращай для multi-page element stable page metadata, backend order, opened page ids и `main_page`.
30. Не создавай data route для статической frontend-страницы. Для каждой расчётной страницы создавай отдельную route с `data`, `isready`, `success`, `error`.
31. Для graph page возвращай в `data` упорядоченный массив готовых Plotly-объектов `{data, layout, config}`. Порядок соответствует frontend-сетке страницы; дополнительные plot ids не требуются.
32. Формируй на backend traces, colors, names, legend, title, axes, units, hover и config. Для сравнимого графика включай `main_object + selected_objects` без дубликата; для несравниваемого используй только `main_object`, скрывай legend и добавляй имя объекта в title.
33. Храни page controls в backend view state, обновляй их без общего Apply и включай в session export/import. Plotly zoom, pan и selection не принимай и не сохраняй.
34. Если page control требует расчёта, помечай dirty только его расчётную страницу; если меняется только представление, сохрани control без общего Apply.
35. Для server-side file browser создай отдельные действия `open`, `path`, `toggle`, `sort`, `select`, `cancel`, принимающие текущий browser state и target по стилю приложения.
36. Возвращай после каждого file-browser action полный state: `open`, root/current/parent/selected paths, sort direction и structured `entries`; не используй параллельные массивы.
37. Нормализуй paths, запрещай выход выше backend root, исключай hidden entries и разрешай symlink только если его real path остаётся внутри root.
38. При file selection проверяй allowed extensions без учёта регистра. Неподходящие files возвращай как `selectable=false`.
39. Добавь отдельные session export/import defaults endpoints. Возвращай frontend directory/file path, filename и overwrite/replace defaults при каждом открытии dialog.
40. Экспортируй session только в `.jld2`. Для любой backend-операции записи в файл принимай явный `overwrite` и запрещай неразрешённую перезапись.
41. После session export возвращай короткий success message с нормализованным итоговым path.
42. Выполняй session import атомарно. При replace полностью замени state; при merge добавь objects и верни backend name-conflict mapping, не оставляя частичный state при error.
43. После успешного import возвращай полный frontend state и success message. Не ожидай расчётов и не нормализуй импортированные `data/isready/success/error`.
44. Для object export создай endpoint открытия dialog, смены операции и
    выполнения операции. Ни один формат не считай обязательным: backend
    возвращает только операции, доступные для переданного context.
45. Возвращай при open и switch полный payload `operations`,
    `active_operation`, `operation_state`, `field_errors`. Defaults могут
    зависеть от текущего состояния приложения; не вводи общий тип или формулу
    defaults до появления предметного требования.
46. При одной доступной операции всё равно возвращай её в `operations`, чтобы
    frontend показал disabled selector. При смене операции не принимай и не
    восстанавливай незавершённые значения предыдущей формы.
47. При object export принимай opaque context вызывающей zone, operation id и
    typed values явной формы. Выбор objects и формирование экспортируемого
    domain value остаются вне общего dialog contract.
48. Возвращай field validation с HTTP 200, `success=false`, полным
    `operation_state` и `field_errors`. При успехе возвращай `success=true` и
    короткий message с нормализованным target.
49. Реализацию формата передавай соответствующему skill:
    `export-to-workspace`, `export-to-julia-script`, `export-to-jld2` или
    `export-to-engee-model`. Эти skills получают подготовленное значение или
    описание и не вычисляют предметную математику.
50. В initial state возвращай `app_version` и полный `toolbar` capability
    payload для глобальных import/export/other/help actions.
51. Для неподдерживаемого toolbar action возвращай `visible=false`; для
    поддерживаемого, но временно недоступного — `visible=true`,
    `disabled=true`.
52. Для toolbar export возвращай `default_operation` и ordered `operations`.
    Default должен входить в доступные operations. Не объявляй конкретный
    формат обязательным.
53. Возвращай stable icon id, который frontend сопоставляет локальному SVG; не
    передавай произвольный remote icon URL. Для help возвращай обычный `href`.

## Guardrails
- Mapping между payload fields и struct fields должен быть явным и тестируемым.
- Не ломай response shape без frontend/tester handoff.
- Не откатывай сохранённое typed draft-значение из-за semantic validation error.
- Не храни validation error: рассчитывай её при формировании settings response.
- Не храни warning: рассчитывай его при формировании settings response.
- Не возвращай frontend stack trace или внутренний отчёт об ошибке.
- Не возвращай `isready` или zone data из Apply.
- Не выполняй расчёт данных зоны и не ожидай worker внутри Apply route.
- Не заменяй типизированное пустое `data` значением `null`.
- Не подменяй согласованные простые payloads универсальной job/state схемой.
- Не сохраняй file-browser dialog state в сессию приложения.
- Не доверяй frontend extension/path/overwrite: повторно нормализуй и валидируй их на backend.
- Не включай settings и outputs в table payload без явного table contract.
- Не объявляй ни одну object export operation стандартной и не создавай
  универсальную metadata-схему её полей.
- Не передавай название приложения как изменяемый backend state: оно задаётся
  frontend config; backend владеет `app_version`.
- Для любой file export operation повторно проверяй path, extension и
  `overwrite` на backend; для workspace повторно проверяй variable name и
  `overwrite`.
- Передай frontend типы полей, ограничения, units, enum options и стабильные field ids.
- Передай frontend ordered Plotly payload и полный state page controls; не передавай viewport Plotly.
- Передай для каждой дополнительной inspector column `id`, `label`, `tooltip`, `type`, `default_visible`, `min_width`, `max_width` и необязательную `abbreviations` map.
- Выбирай table cell units и выполняй смысловое преобразование display value на backend, но оставляй округление до пяти значащих цифр frontend.
- Передай tester все field ids, validation cases и ожидаемые response shapes.

## Reference
Шаблон контракта:

```text
endpoint:
method:
request_fields:
response_fields:
mutates:
calculation_state_changes:
error_behavior:
tests:
```

Apply response:

```text
success:
error: только при success=false
```

Data response отдельной расчётной зоны:

```text
data:
isready:
success:
error:
```

Минимальный settings field contract должен содержать `id`, `label`, `type`,
typed `value`, `error`, `warning`, `readonly`, `visible`, `required`, `units`,
`min`, `max`, `step` и `options`. Используй несколько типовых контрактов для
numeric, integer, boolean и enum fields, если единая форма создаёт лишнюю
сложность.

Идентифицируй формат сессии стабильным ключом `__genie_app_name`. Имя
константы и функция проверки принадлежат конкретному приложению и не должны
содержать имя другого проекта.
