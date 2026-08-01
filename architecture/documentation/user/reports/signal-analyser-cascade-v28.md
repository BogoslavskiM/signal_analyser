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

## Дополнение 2026-08-01 — закрытие реализации

Предыдущий абзац фиксирует состояние отчёта на момент contract freeze. После
него C28 реализован и локально проверен; deployment по-прежнему отсутствует.

- Frontend/Tester checkpoint
  `08af1e73b2852063a76cc9900ca39b17036bc54b` удаляет silent-Time fallback,
  вводит строгую проверку до нормализации, local quarantine и root fatal gate.
- Frontend suite прошёл `2/2`. Initial/`200`/`409`/recovery matrix проверяет
  четыре enum, malformed классы, precedence, A/B isolation, exact queue purge,
  topology operations, zero View POST и защищённое от позднего Plotly
  settlement состояние. Независимые Frontend и Tester аудиты — `CLEAN`.
- Gated E2E checkpoint
  `a09141049e3b4df7ddad3e57b427f6d1d65c2872` прошёл Node syntax, support,
  gated-load, default-false и shell syntax проверки; независимый E2E audit —
  `CLEAN`. Browser runtime не выполнялся.
- Backend code не менялся. Полный backend suite и отдельные route-reachable
  GET/`200`/`409` пробы четырёх enum прошли. Обычный локальный state route
  возвращает `500` из-за известного отсутствующего EngeeDSP prerequisite;
  нового Engee bug candidate нет.
- MATLAB не использовался. Push, deployment и merge не выполнялись.

Контрактные и handoff checkpoints: `9190bb9`, `76f5413`, `8f7bfcf`.
