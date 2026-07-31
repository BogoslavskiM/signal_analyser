# DEC-20260731-003: fixed 2×2 и переносимая видимость сигналов

ID: `DEC-20260731-003`  
Дата: 2026-07-31  
Статус: superseded
Supersedes: none

Superseded by: [DEC-20260731-009](DEC-20260731-009-display-pages.md). Решение
2×2 описывает предыдущий каскад; актуальный контракт использует Display pages
с одним графиком без multi-layout editor.

## Контекст

MATLAB Signal Analyzer разделяет membership display, selection и active
display, но также предлагает layout/docking, не соответствующие продуктовой
геометрии Genie.

## Альтернативы

Копировать MATLAB multi-layout; оставить один selected trace; перенести только
visibility/selection semantics в фиксированную сетку.

## Решение

Сетка остаётся 2×2. Checkbox управляет visibility, row — selection. Time и
Spectrum показывают все visible traces; heatmaps — selected visible signal.

## Последствия

Multi-signal Time-Frequency/Persistence MATLAB зафиксирован как reference delta,
но не меняет продуктовый контракт. Требуются revision-safe API и E2E
independence checks.

## Связи и evidence

[SPEC-SA-UI-001](../specifications/signal-visibility-and-plots.md),
[traceability](../traceability/signal-analyser-cascades.md).
