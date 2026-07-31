# DEC-20260731-012: разделение row selection, Display membership и analysis source

ID: `DEC-20260731-012`
Дата: 2026-07-31
Статус: accepted
Supersedes: часть visibility invariant в `DEC-20260731-009`

## Контекст

SA-UI-006 подтвердил, что выбранная строка таблицы не обязана входить в
активный Display. SA-UI-007 подтвердил, что Clear Display может удалить все
members активной страницы, не меняя global inventory и неактивные Display.
Прежняя модель объединяла выбор строки с источником анализа и требовала хотя бы
один visible signal, поэтому не могла выразить это состояние.

## Альтернативы

- Сохранить непустой membership и имитировать Clear скрытием графика.
- Удалять сигналы из global inventory вместе с активным Display.
- Разделить global row selection, page membership и nullable analysis source.

## Решение

Используется третья модель. `row_selected_signal` всегда указывает на элемент
global inventory. Каждый Display хранит ordered `visible_signals`, допускающий
пустой массив, и nullable `analysis_signal`; у непустой страницы source обязан
входить в membership. `selected_signal` сохраняется только как nullable legacy
alias analysis source.

`POST /api/view` остаётся единственным view mutation endpoint. Canonical row и
analysis fields независимы; только одновременные `analysis_signal` и legacy
`selected_signal` обязаны совпадать. Clear передаёт `visible_signals=[]`,
`analysis_signal=null`, `peaks_enabled=false`. Первый re-add выбирается source
детерминированно; это product decision, а не неподтверждённое наблюдение MATLAB.

## Последствия

- Пустой Display сохраняет один graph host, inventory и row selection, но не
  вызывает spectral/Peaks provider.
- Measurements и Peaks сохраняют schema/units, возвращая null source и пустые
  items; plot/panel payload остаётся типизированным и пустым.
- Фактическая mutation увеличивает revision один раз; no-op Clear — нет.
- UI обязан визуально и семантически различать row selection и membership.
- Grid/docking, rename и reorder Display остаются вне решения.

## Связи и evidence

- SA-UI-006: selection/membership/active-Display portability.
- SA-UI-007: active-only Clear и сохранность inactive/global state.
- [Спецификация](../specifications/signal-visibility-and-plots.md)
- [Traceability](../traceability/signal-analyser-cascades.md)
