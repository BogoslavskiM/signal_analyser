---
name: output-loading-flow
---
# Output Loading Flow

## When to Use
- Зона или multi-page page показывает результат, который может рассчитываться, завершиться успешно или завершиться с ошибкой.
- Нужно реализовать lazy loading, retries или loading indicators.

## When NOT to Use
- Нужно реализовать backend calculation queue или cache.
- Output всегда синхронно приходит в основном state payload и не имеет pending состояния.

## Workflow
1. Разделяй Apply contract и data contract. Apply возвращает только `success` и при ошибке `error`; отдельная ручка каждой расчётной зоны возвращает `data`, `isready`, `success`, `error`.
2. Не изменяй текущие outputs во время draft field updates до Apply.
3. После успешного Apply сразу запроси данные активной расчётной зоны; остальные зоны запроси при их обычной активации.
4. Считай Apply быстрым запросом. Не показывай global loader ожидания расчётов; при необходимости кратко блокируй только кнопку Apply до HTTP response.
5. Не устанавливай frontend pending сразу после Apply. До первого ответа data route сохраняй текущее состояние зоны без дополнительного перехода.
6. После ответа `isready=false` не отображай возвращённое прежнее `data`; показывай локальный preloader и планируй polling без блокировки остальных UI actions.
7. Для `isready=true`, `success=true` отобрази `data` и убери preloader.
8. Для `isready=true`, `success=false` убери preloader и покажи полученный `error` в соответствующей зоне. Не запускай автоматический retry.
9. Передавай backend отдельное событие явного открытия зоны, страницы или вкладки. Обычный polling не должен менять расчётный приоритет.
10. Получай данные каждой зоны независимо: готовая зона обновляется сразу, не ожидая остальных.
11. При смене `main_object`, `main_page`, `selection` или импорте сессии учитывай, что backend отменяет и автоматически перестраивает очередь inspector.
12. Для статической multi-page страницы не создавай data route и не запускай polling; нормализуй её frontend runtime как `isready=true`, `success=true`, `error=""`.
13. Для расчётной multi-page страницы подключай отдельную data route через `loadData` page module.

## Guardrails
- Не запускай frontend-расчёты или eager HTTP loading всех pages: полную очередь ведёт backend.
- Не ожидай `isready` или результаты зон в Apply response.
- Не связывай pending состояния зон с длительностью Apply request.
- Не подменяй backend `isready` локально выставленным pending.
- Не показывай возвращённый старый результат под preloader после успешного Apply, но и не трактуй его наличие как нарушение backend-контракта.
- Не держи global loader для локального результата, если достаточно page/zone loader.
- Pending payload не является ошибкой.
- Retry после calculation error выполняется только новым Apply.

## Reference
Frontend contract checklist:

- output payload field name
- pending payload shape
- error payload shape
- polling timing
- loading indicator placement
- active zone priority signal
