# Cascade 27: строгий snapshot selection и membership Display

Статус: контракт зафиксирован; реализация запланирована; не развернуто

[DEC-033](../decisions/DEC-20260801-033-display-selection-snapshot-contract.md)
запрещает frontend восстанавливать повреждённые row selection, Display
membership и analysis source через aliases, defaults или первый signal.

Обязательный известный `row_selected_signal` и противоречивые проекции
selection-valid active Display являются global corruption и используют fatal
reset/Retry из DEC-032. Повреждение membership/source одной страницы
изолируется по её Display ID: global inventory, valid row и другие страницы
сохраняются, но из quarantined страницы не рисуется график и не отправляется
`/api/view`.

Проверки имеют явный precedence. Если selection active Display уже malformed,
она остаётся локально quarantined, а её root selection projections игнорируются
и не превращают ошибку в global fatal. Если active Display valid, root aliases,
membership и `signals[].visible` обязаны точно ей соответствовать.

Структурно допустимый в предыдущем каскаде пустой inventory теперь считается
global corruption, потому что не позволяет выразить обязательную известную row
selection. Старые quarantined intents после valid snapshot не replay: требуется
новое действие пользователя.

C27 не меняет backend/API/request compatibility, не валидирует graph payload,
настройки, Measurements/Peaks и не затрагивает DSP или математику. Реализация,
автоматические проверки, runtime-проверка и deployment пока не заявляются.

## Реализация — 2026-08-01

Boundary реализован локально в `f334e7f`: invalid selection сохраняет
authoritative inventory/row как read-only, очищает только View intents своего
Display и не мешает независимому B; row/root corruption использует global fatal
reset. Frontend tests 2/2 и независимый аудит CLEAN. Gated E2E contract —
`a4edbc9`; browser runtime и deployment не заявляются. Backend остаётся без
изменений и прошёл 1582 assertions.
