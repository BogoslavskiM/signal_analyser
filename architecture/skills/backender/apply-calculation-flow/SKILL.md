# Apply Calculation Flow

## Входные данные

Используй подтверждённый settings contract, перечень расчётных зон, их typed
empty/last-good data, validation rules и выбранную в
`backender/calculation-planning` execution architecture. Не вводи worker или
polling только потому, что UI содержит кнопку Apply.

## When to Use
- Нужно реализовать кнопку `Применить` или apply endpoint.
- Нужны состояния готовности, polling или очередь долгих расчётов.
- Нужно защитить outputs от результата предыдущей ревизии настроек.

## When NOT to Use
- Нужно только показать frontend loader поверх уже готового API.
- Output дешёвый и всегда возвращается в основном state payload без cache.

## Mandatory Invariants
- До Apply не изменяй outputs никаким образом.
- На каждом успешном Apply помечай все затронутые outputs устаревшими даже при
  неизменных settings, но не рассчитывай их eager.
- Возвращай из Apply HTTP 200 с `success`, новой `state_revision` и коротким
  `error` только при failure; не включай состояния или результаты зон.
- Делай Apply быстрой операцией: не выполняй в route расчёты данных зон и не жди завершения старого расчёта.
- Храни `need_update_pages` по stable page id и `plot_cache` с готовым payload;
  эти поля не входят в Apply response.
- Не передавай после Apply план всех pages worker-менеджеру. Data request
  active page запускает только её; inactive pages остаются stale и не тратят
  CPU/сеть.
- Если worker нужен, используй обычно два потока: основной поток и один worker thread inspector; multiprocessing здесь не используется.
- При повторном Apply синхронно инвалидируй активный долгий расчёт и старую очередь через cancellation state и новый `calculation_revision`, не ожидая физического завершения worker-задачи.
- Реализуй отмену кооперативно через cancellation token и контрольные точки внутри расчёта.
- Каждому успешному Apply присваивай новый `calculation_revision`.
- Если после запуска расчёта произошёл новый Apply, не записывай результат старого расчёта в `data` или cache и не изменяй им `isready`, `success` и `error`.
- Храни результат последнего успешного расчёта отдельно для каждой расчётной зоны в структуре domain object. Не очищай его при новом Apply, отмене или ошибке следующего расчёта.
- Если зона ещё ни разу не была рассчитана, возвращай её типизированную пустую структуру `data`, а не `null`.
- Если расчёт одной задачи очереди завершился ошибкой, сохрани текст ошибки в состоянии соответствующей зоны и продолжай очередь.
- Смена `main_object`, `main_page`, `selection` и импорт сессии отменяют
  неактуальную active task и инвалидируют затронутые cache keys. Следующий
  active-page request запускает только нужную page, а не полную очередь.
- Не устанавливай timeout расчётов по умолчанию.

## Workflow
1. Сохраняй typed draft settings непосредственно в backend domain object при каждом field update.
2. Не меняй и не очищай результаты при draft update. Не храни applied settings и `settings_dirty`.
3. При каждом Apply сначала синхронно пометь активную задачу и старую очередь отменёнными: обнови cancellation state и запрети старой `calculation_revision` записывать результат. Не жди, пока worker физически дойдёт до контрольной точки. Затем валидируй settings.
4. При ошибке валидации сохрани draft и все cache/data, увеличь
   `state_revision`, верни HTTP 200 с `success=false`, revision и коротким
   error text. Не запускай новую задачу.
5. При успешной валидации создай новый `calculation_revision` и увеличь
   `state_revision`. Пометь все затронутые pages в `need_update_pages=true`,
   сохрани прежние cache/data, установи `isready=false`, `success=false` и
   очисти `error`.
6. Сразу верни Apply response; не создавай eager page queue. Frontend после
   response запросит active page data route.
7. На первом data request active stale page атомарно создай или переиспользуй
   ровно одну task для сочетания page/context/calculation revision и верни
   lightweight pending с пустым typed `data`. Duplicate polling task не создаёт.
8. При explicit page activation обнови active marker. Если worker занят уже
   неактивной page, кооперативно отмени её и запусти новую active page; polling
   не меняет scheduling priority.
9. Если несколько расчётов становятся дешевле после выделения общей части, создай одну общую задачу и поставь её перед зависимыми задачами. Зависимые расчёты должны переиспользовать её результат, а не вычислять общую часть повторно.
10. Добавляй один worker thread на inspector только когда измерения показывают долгие или нагруженные расчёты. Увеличивай число потоков только после явного performance обоснования.
11. Добавляй в длинные calculation functions контрольные точки отмены. Не пытайся аварийно завершить Julia thread или task; при cancellation они должны штатно выйти без записи частичного результата.
12. Перехватывай исключение внутри worker для active page. Установи
    `isready=true`, `success=false`, запиши короткий `error`, сохрани прежний
    `plot_cache`, увеличь `state_revision` и освободи worker.
13. После успешного расчёта atomically запиши typed domain result и готовый
    Plotly payload в `plot_cache`, установи `need_update_pages=false`,
    `isready=true`, `success=true`, очисти `error` и увеличь `state_revision`.
14. Если общая задача завершилась ошибкой, заверши каждую зависимую зону с тем же коротким `error`, `isready=true`, `success=false` и сохранённым ранее `data`. Независимые задачи продолжай.
15. Повторно запускай calculation error только через новый Apply или явный
    page-control action, который инвалидирует эту page.
16. На смене `main_object`, `main_page`, `selection` или импорте сессии
    синхронно инвалидируй неактуальную task без ожидания worker, обнови
    `state_revision` и пометь stale только затронутые pages. Не строй full queue.
17. Возвращай из Apply HTTP 200 с `success`, `state_revision` и только при
    failure коротким `error`. Не возвращай `isready`, zone data или results.
18. Для каждой расчётной зоны создай отдельную data route с `data`, `isready`,
    `success`, `error`, `state_revision`. Cache hit возвращается сразу; stale/
    running page возвращает lightweight pending без large arrays.

## Guardrails
- Не запускай долгие расчёты в основном request thread.
- Не выполняй даже быстрые domain calculations внутри Apply route: Apply только
  инвалидирует старую task, валидирует и выставляет stale flags/revisions.
- Не ставь inactive pages в worker queue и не готовь их Plotly payload.
- Не используй multiprocessing для согласованной схемы расчётов.
- Не оставляй старые queued jobs после создания нового `calculation_revision`.
- Результат разрешено записывать, только если идентификатор задачи совпадает с текущим `calculation_revision` объекта.
- Не создавай API-visible job lifecycle, если он не требуется отдельным ТЗ.
- Не смешивай Apply response с состоянием расчётной зоны.
- Не удаляй сохранённые `data`/`plot_cache` ради preloader, но pending response
  делай лёгким и не сериализуй last-good graph arrays.
- `isready=false` означает, что расчёт ещё идёт; `isready=true` и `success=false` означают завершившийся с ошибкой расчёт.
- Не запускай автоматический retry после calculation error: новый запуск выполняется через Apply.
- Не добавляй timeout без отдельного требования.
- Не увеличивай concurrency автоматически: сначала измерь очередь и длительность расчётов.
- После импорта не пересчитывай ready pages и не создавай очередь. Расчёт stale
  page запускает только её будущий active data request.

## Reference
- Реализуй защиту как пару `task_revision`/`current_revision` и проверяй её
  непосредственно перед каждой публикацией результата или status.
- Используй cancellation token только для кооперативного раннего выхода;
  revision comparison остаётся обязательной защитой от stale write.
- Не копируй pattern, который записывает результат без сравнения идентификатора
  задачи с текущим `calculation_revision`.
- Frontend-сопряжение: `frontend/output-loading-flow`.

## Проверка и завершение

Проверь invalid/successful Apply, отсутствие eager calculation, active-only
cache miss, cache hit, lightweight pending, duplicate polling, page switch,
cancellation без ожидания, stale calculation/state revisions, error и
сохранение last-good cache. Передай Frontend точные Apply/data payloads, а
Tester — state transitions, CPU/network expectations и race cases.
