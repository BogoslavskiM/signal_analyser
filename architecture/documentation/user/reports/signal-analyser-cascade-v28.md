# Cascade 28: строгий snapshot типа графика Display

Статус: контракт зафиксирован; реализация запланирована; не развернуто

[DEC-034](../decisions/DEC-20260801-034-active-plot-snapshot-contract.md)
запрещает frontend подменять отсутствующий, нестроковый или неизвестный
per-Display `active_plot` графиком Time. Каждая страница обязана явно публиковать
одну из строк `time`, `spectrum`, `spectrogram`, `persistence` без изменения
регистра, обрезки пробелов или fallback.

Повреждение поля одной страницы изолируется по её Display ID: topology,
inventory, row selection и valid другие страницы сохраняются, но из
quarantined страницы не рисуется график и не отправляется `/api/view`. Позднее
завершение прежнего Plotly render не должно заменить доступную local error или
готовность общего graph host.

Root `active_plot` является точной проекцией valid active Display. Его
отсутствие, неверный тип, неизвестное либо другое известное значение означает
global corruption и использует fatal reset/Retry. Если собственный тип active
Display уже malformed, root-проекция игнорируется, чтобы локальная ошибка не
становилась глобальной.

Optional `active_plot` в mutation request остаётся совместимым способом
сохранить текущий тип server state и не разрешает отсутствие response field.
Старые quarantined intents после valid snapshot не replay: требуется новое
действие пользователя.

C28 не меняет backend/API/request compatibility и не валидирует panel, plots,
plot payloads, traces/heatmaps, настройки, Measurements, Peaks, DSP или
математику. Реализация, автоматические проверки, runtime-проверка и deployment
пока не заявляются.
