---
name: frontend-state-management
version: 0.9.0
---
# Frontend State Management

## When to Use
- Нужно организовать root state нового Genie-приложения.
- Нужно синхронизировать draft-настройки, инспектор или активную страницу с backend.
- Нужно защитить интерфейс от устаревших и пришедших не в текущий контекст ответов.

## When NOT to Use
- Нужно изменить только геометрию layout или CSS.
- Нужно реализовать backend-хранилище, Apply или очередь расчётов.

## State Ownership
- Считай backend источником истины для domain state.
- Разделяй root state по владельцам: `app`, `inspector`, `settings`, `zones`, `dialogs`.
- Внутри раздела явно отделяй backend payload от временного UI state.
- Замещай соответствующий backend payload целиком после успешного ответа. Не пытайся вручную объединять отдельные серверные поля.
- Не включай в замещаемый backend payload локальные loaders, открытые меню, hover, размеры, scroll, request ids и таймеры.
- Храни `main_object`, `main_page` и `selection` на backend и синхронизируй их через API.
- Храни search query и набор видимых колонок только на frontend.
- Не используй `localStorage` и `sessionStorage`.

## Draft Field Queue
Для каждого settings object веди одну последовательную очередь обновлений.

1. Обновляй draft-поле в интерфейсе немедленно.
2. Отложи сетевую отправку на настраиваемые `150 ms` по умолчанию. Новый ввод должен сбрасывать таймер, но не задерживать перерисовку поля.
3. Храни только последнее ещё не отправленное значение каждого изменённого поля.
4. Не отправляй второй запрос для того же settings object, пока не завершился первый.
5. После ответа замени полный backend settings payload.
6. Поверх полученного payload немедленно восстанови более новые локальные draft-значения, которые были введены после отправки запроса или ещё находятся в очереди.
7. Не показывай старую ошибку поля, если после соответствующего запроса пользователь уже изменил это поле. Дождись ответа на новое значение.
8. После завершения запроса отправь следующую накопленную версию очереди без дополнительной задержки.

Передавай в каждом запросе id settings object, field id и типизированное значение.
Неверное по смыслу, но типизированное значение сохраняется backend; frontend показывает
полученную ошибку и не откатывает draft.

- Храни пустой или незавершённый numeric draft локально и не отправляй его в typed endpoint.
- Перед Apply проверь, что все локальные numeric draft можно преобразовать в заявленный backend type.
- Детали scalar inputs и validation presentation бери из `frontend/settings-controls`.

## Apply Coordination
- Перед Apply немедленно сбрось debounce-таймер и дождись отправки всех draft-изменений текущего settings object.
- Затем вызови Apply отдельным быстрым запросом.
- Не ожидай расчётные данные в Apply response и не связывай Apply с готовностью зон.
- Допускай локальную блокировку кнопки Apply на время flush и HTTP response, чтобы исключить повторный клик. Не показывай global calculation loader.
- После успешного Apply передай управление загрузке зон по правилам `frontend/output-loading-flow`.
- Не выставляй output pending самостоятельно: запроси active zone и примени `isready` из её ответа.

## Context Changes
- При смене `main_object` не ожидай старый запрос draft.
- Передавай object id явно и применяй ответ только к тому объекту и inspector, для которых он был отправлен.
- Не применяй ответ старого объекта к активному settings section.
- Для каждого асинхронного канала храни context key и монотонный request id. Игнорируй ответ, если context key уже изменился или существует более новый применимый request.
- Используй backend revision дополнительно, если она входит в контракт, но не подменяй ею проверку frontend-контекста.
- Для tab navigation допускай согласованное исключение: меняй `main_page` и `opened_pages` немедленно, затем синхронизируй backend. При sync error показывай dialog без rollback.

## Inspector Updates
- Не применяй optimistic CRUD для inspector.
- Дождись backend response и замени полный inspector payload: описание колонок, типизированные rows, порядок, `main_object`, `selected_objects` и согласованные данные таблицы.
- Выполняй выбор всех элементов через backend endpoint. Для фильтрованного списка передавай конкретные ids; frontend search query остаётся локальным.
- После смены `main_object`, `main_page` или `selection` применяй только ответ актуального контекста.

## Object Export State
- Храни состояние export dialog отдельно от inspector и settings: opaque
  `context`, доступные `operations`, `active_operation`, полный
  `operation_state`, `field_errors` и локальный `busy`.
- При каждом открытии замещай операции и начальные значения полным backend
  response. Не выводи defaults из frontend state: они могут зависеть от
  произвольного состояния приложения.
- Всегда показывай selector операции. При единственной операции оставляй его
  disabled.
- При смене операции отбрасывай незавершённые значения прежней формы и применяй
  полный набор defaults новой операции с backend.
- Не сохраняй значения закрытого object export dialog в сессию и не выбирай в
  нём objects: opaque context передаёт вызывающая zone.
- Детали modal и operation forms бери из `frontend/object-export-dialog`.

## Toolbar State
- Храни backend `app_version` и полный `toolbar` capability payload в root
  state; название приложения и trusted icon mapping задавай frontend config.
- Полностью замещай toolbar capabilities после backend response.
- Отсутствующую capability не показывай; временно недоступную показывай
  disabled.
- Храни open state export dropdown только локально и не включай его в session.
- Primary export передаёт backend `default_operation`; arrow menu передаёт id
  явно выбранной operation.
- Детали rendering и handlers бери из `frontend/application-toolbar`.

## Vue Module Rules
- Используй `watch` для обнаружения изменения draft-полей и запуска планировщика синхронизации.
- Используй `methods` для явных команд: Apply, CRUD, selection, смена страницы и повторный запрос данных.
- При применении backend payload устанавливай guard наподобие `applyingBackendPayload`, чтобы `watch` не отправил полученные значения обратно на backend.
- Снимай guard после завершения всех синхронных state mutations; при необходимости используй `$nextTick`.
- Не помещай business calculations в `computed` или `watch`.

## Errors and Loading
- Показывай semantic validation error поля под соответствующим control в принятом формате settings: error state, status icon и inline text.
- Считай ошибку отображения графика validation-like ответом зоны с HTTP 200; показывай её overlay поверх canvas внутри зоны с графиком.
- Показывай неожиданные HTTP, transport и frontend errors в общем error dialog принятого приложения и отправляй полный технический отчёт в логи.
- Если error dialog уже открыт, заменяй его короткий текст последней unexpected error; не создавай очередь по умолчанию.
- Не закрывай исходный form dialog до success response: при ошибке он остаётся под error dialog с введёнными значениями.
- Не добавляй keyboard или overlay close; используй правила `frontend/dialog-system`.
- Держи loaders локальными для команды, зоны или страницы. Не превращай root state в один глобальный loading flag.
- Храни page controls в root state по `page_id`, синхронизируй их с backend без общего Apply и восстанавливай из session payload.
- Не отправляй backend Plotly zoom, pan и selection.
- Для file browser храни один local `busy` и request id, применяй полный state response и не изменяй parent target при cancel/error.
- После session import применяй полный backend state одним guarded update до закрытия form dialog; не запускай frontend-нормализацию импортированных output statuses.
- Для object export не объединяй backend defaults с прежними локальными
  значениями при open или switch operation.

## Verification
- Проверь быстрый ввод длинного значения: UI не тормозит, а backend получает последнее значение.
- Проверь ответ на раннее значение после ввода нового: поле не откатывается и старая ошибка не появляется.
- Проверь переключение `main_object` при незавершённом запросе: ответ старого объекта не меняет активные settings.
- Проверь Apply во время debounce: последнее draft-значение сначала сохранено, затем вызван Apply.
- Проверь, что применение backend payload не запускает повторную отправку через `watch`.
- Запусти `node test/front/run_front_tests.js`.
