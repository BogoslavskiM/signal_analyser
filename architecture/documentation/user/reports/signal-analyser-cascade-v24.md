# Cascade 24: детерминированный рендер последнего графика

Статус: контракт зафиксирован; реализация запланирована; не развернуто

Приложение использует один graph host, а загрузка Plotly и отрисовка выполняются
асинхронно. До реализации C24 медленный старый график мог заменить новый график,
empty state или error state после быстрого переключения plot/Display.

[DEC-030](../decisions/DEC-20260801-030-latest-plot-render-wins.md) делает
последний запрошенный frame authoritative. Generation-aware serialized
frontend coordinator отбрасывает stale queued work, запрещает публикацию stale
success/error и восстанавливает newest frame после неизбежной stale in-flight
DOM mutation.

## Датированное уточнение 2026-08-01 — реализовано локально

Это только исправление визуальной согласованности. Server state, API body,
graph data, версия Plotly и analysis math не меняются. Детерминированные tests
с controlled promises покрывают stale success/rejection, delayed loader,
empty placeholder, Display switch и bounded reassertion; frontend suite 2/2 и
независимый final audit CLEAN. Local commit:
`102aa074431167da54c8a639c791f8d096b7df75`. Runtime deployment проверяется
отдельно.
