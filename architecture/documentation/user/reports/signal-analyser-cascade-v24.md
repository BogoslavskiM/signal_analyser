# Cascade 24: детерминированный рендер последнего графика

Статус: контракт зафиксирован; реализация запланирована; не развернуто

Приложение использует один graph host, а загрузка Plotly и отрисовка выполняются
асинхронно. Медленный старый график сейчас может заменить новый график, empty
state или error state после быстрого переключения plot/Display.

[DEC-030](../decisions/DEC-20260801-030-latest-plot-render-wins.md) делает
последний запрошенный frame authoritative. Generation-aware serialized
frontend coordinator отбрасывает stale queued work, запрещает публикацию stale
success/error и восстанавливает newest frame после неизбежной stale in-flight
DOM mutation.

Это только исправление визуальной согласованности. Server state, API body,
graph data, версия Plotly и analysis math не меняются. Приёмка требует
детерминированных frontend tests с управляемыми promises; runtime deployment
проверяется отдельно.
