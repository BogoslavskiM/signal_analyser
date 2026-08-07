# Output Loading Flow

## Входные данные

Требуются лёгкий `/api/state-lite`, отдельные подтверждённые Apply и zone/page
data contracts, `state_revision`, active zone signal, допустимая polling
cadence и placement loading/error state. Если data route не определена, верни
contract gap Backender.

## When to Use
- Зона или multi-page page показывает результат, который может рассчитываться, завершиться успешно или завершиться с ошибкой.
- Нужно реализовать lazy loading, polling, readiness или loading indicators.

## When NOT to Use
- Нужно реализовать backend calculation queue или cache.
- Output всегда синхронно приходит в основном state payload и не имеет pending состояния.

## Workflow
1. На startup запроси `/api/state-lite`: он возвращает form/navigation/view
   state и `state_revision`, но не Plotly arrays. Покажи controls до загрузки
   graph data.
2. Разделяй Apply contract и data contract. Apply возвращает только `success`
   и при ошибке `error`; отдельная ручка каждой расчётной зоны возвращает
   `data`, `isready`, `success`, `error`, `state_revision`.
3. Не изменяй текущие outputs во время draft field updates до Apply.
4. После успешного Apply сразу запроси данные только активной расчётной зоны;
   backend по этому запросу использует `need_update_pages` и при необходимости
   запускает её расчёт. Остальные зоны не запрашивай до их явной активации.
5. Считай Apply быстрым запросом. Не показывай global loader ожидания расчётов; при необходимости кратко блокируй только кнопку Apply до HTTP response.
6. Не устанавливай frontend pending сразу после Apply. До первого ответа data route сохраняй текущее состояние зоны без дополнительного перехода.
7. После лёгкого ответа `isready=false` не отображай возвращённое прежнее
   `data`; показывай локальный preloader и poll позже без блокировки остальных
   UI actions. В pending payload не требуй тяжёлых arrays.
8. Polling выполняй только для текущей active page и прекращай сразу после её
   деактивации, ready/error или unmount.
9. Для `isready=true`, `success=true` отобрази `data` и убери preloader.
10. Для `isready=true`, `success=false` убери preloader и покажи полученный `error` в соответствующей зоне. Не запускай автоматический retry.
11. Передавай backend отдельное событие явного открытия зоны, страницы или вкладки. Обычный polling не должен менять расчётный приоритет.
12. Получай данные каждой зоны независимо: готовая зона обновляется сразу, не ожидая остальных.
13. Любой response применяй только при совпадении context/request и если его
    `state_revision` не меньше уже принятой revision.
14. При смене `main_object`, `main_page`, `selection` или импорте сессии учитывай, что backend отменяет только затронутые calculations и инвалидирует их cache/revisions.
15. Для статической multi-page страницы не создавай data route и не запускай polling; нормализуй её frontend runtime как `isready=true`, `success=true`, `error=""`.
16. Для расчётной multi-page страницы подключай отдельную data route через `loadData` page module.

## Guardrails
- Не запускай frontend-расчёты или eager HTTP loading всех pages: backend
  считает/готовит данные лениво по запросу active page.
- Не ожидай `isready` или результаты зон в Apply response.
- Не связывай pending состояния зон с длительностью Apply request.
- Не подменяй backend `isready` локально выставленным pending.
- Не показывай возвращённый старый результат под preloader после успешного Apply, но и не трактуй его наличие как нарушение backend-контракта.
- Не держи global loader для локального результата, если достаточно page/zone loader.
- Pending payload не является ошибкой.
- Retry после calculation error выполняется только новым Apply.
- Не применяй response с устаревшей `state_revision`.

## Reference
Frontend contract checklist:

- output payload field name
- pending payload shape
- error payload shape
- polling timing
- loading indicator placement
- active zone priority signal
- state revision and stale-response rule
- stop condition when page becomes inactive

Перед завершением проверь быстрый `state-lite` startup, отсутствие plot arrays
в initial response, successful Apply, active-only pending polling, stop on
deactivation, success, calculation error, stale `state_revision` и смену
active context. Передай
Tester contracts и stable selectors, а E2E — placement loader/error.
