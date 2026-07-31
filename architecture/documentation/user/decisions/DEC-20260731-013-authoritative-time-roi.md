# DEC-20260731-013: authoritative per-Display Time ROI

ID: `DEC-20260731-013`
Дата: 2026-07-31
Статус: accepted
Supersedes: none

## Контекст

Официальная документация Signal Analyzer связывает Statistics и Peaks с
текущими Time Limits. SA-UI-008 подтвердил пересчёт Statistics в пределах
page-local диапазона и сохранение last-valid состояния при invalid ordering.
Локальный Plotly `xaxis.range` без backend ROI оставил бы таблицы и Peaks
несогласованными с видимой областью.

## Альтернативы

- Оставить Limits только визуальным frontend zoom.
- Передавать Limits в отдельные measurement/peaks endpoints.
- Сделать Time ROI частью per-Display authoritative state и существующего
  revision-safe `/api/view` snapshot.

## Решение

Выбран третий вариант. Nullable typed `time_limits` принадлежит Display и
передаётся через `/api/view`; null допустим только для пустой страницы.
Statistics и Peaks вычисляются по inclusive raw ROI, сохраняя абсолютные
sample/time coordinates. Invalid limits дают явную 422 validation и не меняют
state. Frontend использует те же limits как Plotly Time range.

P0 поддерживает только seconds и ручной commit полей. Link Time, cursors,
zoom/pan synchronization, Spectrum ROI и Y Limits остаются отдельными задачами.

## Последствия

- ROI mutation участвует в общей revision и готовит measurements/Peaks до
  публикации.
- Enabled Peaks query должен хранить absolute sample offset.
- Source change сохраняет допустимый range либо детерминированно сбрасывает его
  на полный диапазон нового source.
- Empty/Clear обнуляет limits; first re-add создаёт полный range.
- UI показывает inline validation, а не копирует MATLAB silent rollback.

## Связи и evidence

- SA-UI-008 saved scenario and Architect handoff.
- MathWorks Measure Signals:
  https://www.mathworks.com/help/signal/ug/measure-signals.html
- MathWorks Customize Signal Analyzer:
  https://www.mathworks.com/help/signal/ug/customize-signal-analyzer.html

## Реализация и проверка

Решение реализовано в локальном checkpoint `1b7864b`. Typed limits/ROI,
absolute Statistics/Peaks mapping, short-ROI capability guard, lifecycle и
atomic errors подтверждены backend 719/719; frontend 2/2 и Playwright static
contract подтверждают commit/rollback/range/page behavior. Runtime deployment
и real EngeeDSP target path остаются отдельными gates.
