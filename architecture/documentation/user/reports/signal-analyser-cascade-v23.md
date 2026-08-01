# Cascade 23: lazy Persistence resource containment

Дата: 2026-08-01
Статус: контракт принят; реализация запланирована

Current service eager-вычисляет Persistence на обычном GET даже при active
Time. [DEC-029](../decisions/DEC-20260801-029-lazy-persistence-materialization.md)
замораживает active-view-only materialization: inactive response сохраняет
exact heatmap/source wire с пустыми x/y/z, raw cache сохраняется, active switch
вычисляет cold либо reuse warm.

Это не меняет Persistence математику и не разблокирует Frequency Limits/fixed
overlap. Оно предотвращает случайную оплату 1.2 GiB provider risk на startup и
других страницах; active Persistence всё ещё требует осторожности.

До product/test checkpoint implementation, runtime E2E, push, deployment и
merge не заявляются.
