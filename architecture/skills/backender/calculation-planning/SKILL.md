# Calculation Planning

## Входные данные

Используй предметный calculation contract, typed domain inputs, ожидаемые
output shapes, performance evidence и подтверждённые внешние contracts. Если
расчёт зависит от Engee, сначала получи report Engee User; документация без
execution не доказывает runtime behavior.

## When to Use
- Нужно добавить расчёт характеристик, графиков, статистики или signal processing.
- Нужно решить, где живут math functions, cache, readiness и error state.
- Поведение зависит от Engee или другого внешнего runtime package.

## When NOT to Use
- Нужно только изменить визуальный стиль уже готового output.
- Нужно только описать route без новой math/domain логики.

## Mandatory Runtime
- Оставляй основной поток свободным для API и коротких операций.
- Выполняй очередь долгих расчётов отдельным worker thread каждого inspector только в нагруженных приложениях.
- Храни `need_update_pages` по stable page id и `plot_cache` с готовым для
  frontend Plotly payload, cache revision и context key.
- После Apply только инвалидируй затронутые pages. Не запускай eager calculation
  всех outputs и не трать CPU/сеть на inactive pages.
- Запускай или продолжай расчёт только для явно открытой active output page по
  её data request. При смене active page отменяй уже неактуальную page task
  кооперативно и ставь новую active page первой.
- Выполняй тяжёлую active-page задачу в фоне; пока она не завершена, data route
  возвращает lightweight pending state без больших graph arrays.
- В нагруженном приложении с одним inspector используй обычно два потока: основной поток и один worker thread.
- При повторном Apply сразу инвалидируй активную задачу worker thread; её физическое кооперативное завершение происходит позже и не задерживает Apply response.
- Если после запуска расчёта произошёл новый Apply, не записывай результат старого расчёта в `data`, cache, `isready`, `success` или `error`.
- Храни для каждой расчётной зоны последнее успешно рассчитанное типизированное
  `data`; для graph page это `plot_cache`. Новый расчёт и его ошибка не удаляют
  cache, но stale cache не отправляется как текущий pending result.
- Ошибка расчёта должна менять только состояние соответствующей зоны и не должна останавливать очередь.
- Ошибка общей задачи должна завершать тем же error все зависимые зоны, но не независимые задачи.
- Публикуй результаты расчётных зон независимо: завершение одной зоны не должно ждать завершения остальных.
- Не устанавливай timeout расчётов по умолчанию.

## Workflow
1. Определи входы расчёта: typed domain object или explicit primitive data.
2. Определи output data shape отдельно от rendered/frontend payload.
3. Размести чистые calculation functions вне HTTP route handlers.
4. Для дорогого reusable domain результата выбери cache location: domain
   object или named cache. Для готового view-specific Plotly payload всегда
   используй `plot_cache[page_id]` рядом с `need_update_pages[page_id]`.
5. Ключ cache обязан учитывать page id, active object/selection/view controls и
   `calculation_revision`; не переиспользуй payload из другого context.
6. Передавай фоновой задаче immutable snapshot входов, идентификатор `calculation_revision` и cancellation token.
7. Не выполняй расчёты внутри Apply route. При data request active page:
   верни current cache немедленно, если `need_update_pages[page_id]=false` и
   cache key совпадает; иначе запусти/переиспользуй ровно одну задачу этой page.
   Быструю выполняй через scheduler после response boundary, долгую направляй
   worker thread соответствующего inspector.
8. Добавляй в длинные calculation functions контрольные точки, в которых задача worker thread проверяет cancellation token и штатно завершает отменённый расчёт.
9. Перед записью результата сравни идентификатор задачи с текущим `calculation_revision` объекта. При несовпадении отбрось результат целиком.
10. Храни типизированный `data`, `isready`, `success`, `error` и
    `need_update_pages` отдельно для каждой рассчитываемой зоны. Pending response
    содержит типизированное пустое `data`, например `[]` для graphs, а не
    last-good large arrays.
11. Записывай explicit active-page event отдельно от polling. Только user
    activation меняет active page и scheduling priority; polling не создаёт
    duplicate job и не меняет приоритет.
12. По умолчанию считай расчёты зон независимыми. Выделяй общую задачу только когда общий промежуточный результат действительно уменьшает суммарную стоимость расчётов.
13. Ставь общую задачу перед зависимыми. Зависимые задачи должны запросить готовый общий результат и не дублировать его вычисление.
14. Если задача расчёта завершилась исключением, установи для зоны `isready=true`, `success=false`, запиши короткий текст в `error`, сохрани предыдущее `data` и продолжи очередь.
15. Если общая задача завершилась исключением, установи такой же error state всем зависимым зонам. Независимые задачи продолжай.
16. Классифицируй расчёт как быстрый или долгий инженерным решением backend-разработчика. Используй измерения из backend logs; Engee contract/performance evidence запрашивай у Engee User.
17. Не выполняй автоматический retry ошибочного расчёта; повторный запуск
    происходит через новый Apply или явное page-control действие, которое по
    контракту инвалидирует эту page.
18. После смены `main_object`, `main_page`, `selection` или импорта сессии
    инвалидируй только затронутые zones/cache keys. Не строй eager queue всех
    pages: следующий explicit active-page data request запускает только её.
    Импортированные ready/success/error/cache statuses восстанавливай как state.
19. После завершения каждой зоны сразу сделай её результат доступным через собственную ручку, не дожидаясь других зон.
20. При каждом authoritative state mutation и accepted result publication
    увеличивай monotonic `state_revision`; GET возвращает revision snapshot,
    чтобы browser отвергал медленный старый response.
21. Добавь unit tests для math, cache hit/miss, active-only scheduling,
    lightweight pending, cancellation/revisions/dependencies и contracts
    внешних packages.

## Guardrails
- Не принимай raw HTTP payload в math function.
- Не смешивай расчёт domain data и форматирование Plotly/UI payload без причины.
- Не запускай долгий расчёт синхронно в endpoint, если UI должен оставаться отзывчивым.
- Не рассчитывай и не сериализуй inactive graph pages «на будущее».
- Не включай last-good large graph arrays в pending response.
- Не заставляй Apply ждать кооперативного завершения отменённой worker-задачи.
- Не записывай результат фоновой задачи без сравнения её идентификатора с текущим `calculation_revision`.
- Не создавай отдельный поток на каждый output; если worker нужен, используй один worker thread на inspector.
- Не используй multiprocessing: очередь долгих расчётов выполняется worker thread внутри приложения.
- Не пытайся аварийно завершать Julia thread или task; используй кооперативную отмену.
- Не считай ошибку одной задачи расчёта общей ошибкой всей очереди.
- Не очищай последнее успешное `data` при pending или calculation error.
- Не запускай retry расчёта без нового Apply.
- Не добавляй timeout без отдельного требования.
- Engee-dependent поведение фиксирует Engee User тестами в `test/engee`.

## Reference pattern

Если несколько outputs используют один дорогой промежуточный результат,
вычисли его один раз в отдельной typed operation, сохрани под текущей revision
и передай зависимым calculations. Не выделяй общий cache без измеримого
переиспользования.

Шаблон:

```text
calculation:
input_state:
output_data:
plot_cache_key:
need_update_pages:
readiness_state:
success_state:
error_state:
calculation_revision:
state_revision:
active_page_trigger:
queue_priority:
execution_mode: main-thread | queue-worker-thread
cancellation: token + checkpoints
dependencies:
tests:
```

## Проверка и завершение

Проверь nominal/boundary math, output type/shape, cache hit/miss, отсутствие
eager inactive calculation/network payload, lightweight pending, revision
protection, cancellation checkpoints и независимое завершение задач.
Worker/concurrency добавляй только по измерениям. В report укажи execution
mode, `plot_cache`/`need_update_pages`, state/calculation revisions,
dependencies, tests и неподтверждённые внешние допущения.
