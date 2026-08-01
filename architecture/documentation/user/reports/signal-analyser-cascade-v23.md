# Cascade 23: lazy Persistence resource containment

Дата: 2026-08-01
Статус: контракт принят; реализация запланирована

До реализации C23 service eager-вычислял Persistence на обычном GET при active
Time. [DEC-029](../decisions/DEC-20260801-029-lazy-persistence-materialization.md)
замораживает active-view-only materialization: inactive response сохраняет
exact heatmap/source wire с пустыми x/y/z, raw cache сохраняется, active switch
вычисляет cold либо reuse warm.

Это не меняет Persistence математику и не разблокирует Frequency Limits/fixed
overlap. Оно предотвращает случайную оплату 1.2 GiB provider risk на startup и
других страницах; active Persistence всё ещё требует осторожности.

## Датированное уточнение 2026-08-01 — реализовано локально

Backend теперь использует typed preparation plan и prospective four-plot aggregate.
C23 matrix 104/104 и полный backend suite прошли; независимый аудит после двух
усилений test oracles — CLEAN. Gated Playwright contract зафиксирован отдельно.
Local product/test commit: `84b21f390a64dab18f576b298ae698deb22432d7`;
E2E static commit: `6d5794901698cf0873de2829e1dde991597d0ed1`.
Runtime E2E, push, deployment и merge не заявляются.
