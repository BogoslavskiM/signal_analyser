# Cascade 18: typed Persistence foundation

Дата: 2026-08-01
Статус: реализовано и локально проверено; не развёрнуто

## Результат

Persistence переведён с eager untyped helper на отдельную OOP-архитектуру:
immutable query/data/cache key, injectable EngeeDSP provider/service и typed raw
cache. Wire и vanilla frontend не изменились.

Real signal получает one-sided `0..f_s/2`, complex — centered two-sided domain.
Provider явно получает `NumPowerBins=256`; raw matrix обязана иметь orientation
power × frequency, positive ordered power axis и occurrence `0..100`.
Presentation применяет точный `10log10(P)` до 160×160 bounding.

Вычисляется только page-local analysis source. Secondary checkbox membership
не вызывает Persistence provider; A/B, Clear, re-add и source lifecycle
переиспользуют отдельный raw cache. `N<2` возвращает typed empty.

## Атомарность

Первый финальный audit обнаружил partial cache publication при cold provider
failure. Исправление ввело prepared Display aggregate: plots, plot_payload и
четыре cache maps полностью строятся до публикации. Wrong-topology и warm/cold
failure tests требуют exact pre/post equality всех caches и revision.

## Проверка

- backend full: 1449/1449 PASS;
- C18 focused: 49/49 PASS;
- frontend: 2/2 PASS;
- Julia parse, весь Playwright JavaScript syntax, support contract, runner help
  и `git diff --check`: PASS;
- финальный независимый integration audit: CLEAN.

Product/test commit:
`3b16cd96e64fab9654811baa69d83f59d2eac295`.
Atomicity-oracle hardening commit:
`27fcdef177061fed3a69f42899e680ba04ba1a87`.

Локальный mandatory Engee gate проходит findpeaks 16/16 и затем падает на
отсутствующем пакете `EngeeDSP`; prod provider evidence остаётся источником
runtime contract. Runtime Playwright, push, deployment и merge не выполнялись.

## Отложено

Persistence Leakage/Overlap, ROI/fixed segment grid, editable bins/limits,
MinThreshold, Reassign, scale и Fit Colormap требуют отдельных решений.

Связано с [DEC-024](../decisions/DEC-20260801-024-typed-persistence-foundation.md)
и [traceability](../traceability/signal-analyser-cascades.md).
