# Cascade 19: контракт Persistence Leakage

Дата: 2026-08-01
Статус: контракт принят; реализация запланирована; не развёрнуто

## Результат исследования

Следующий узкий срез — независимая для каждого Display настройка Leakage у
Persistence. Prod EngeeDSP `0.72.0` probe подтвердил real/complex default
`0.5`, endpoints `0`/`1`, детерминизм, strict power-by-frequency форму и
эквивалентность порядка опций. Leakage меняет raw power axis и occurrence, но
не частотную ось, поэтому входит в typed query/cache identity.

Контракт замораживает exact `persistence_settings={leakage:0.5}`: finite JSON
Number, не Bool, inclusive `[0,1]`, signed-zero canonicalization. Состояние
принадлежит Display и не связано со Spectrum/Spectrogram Leakage. Root является
зеркалом active Display; Clear сохраняет intent; A/B и source/cache identity
разделены.

Frontend получит normalized native range `0..1` в существующей Display tab.
Это сознательное product/API представление, а не неподтверждённая копия шкалы
MATLAB GUI. Новые route, settings tab, client DSP или Persistence metadata не
добавляются.

## Gate и безопасность

- probe PASS/GO, Engee defect не выявлен;
- temporary prod pod остановлен, cleanup подтверждён;
- MATLAB GUI, Command Window и Add-On Explorer не использовались;
- рабочая ветка была чистой до документационного checkpoint;
- implementation, verification, runtime E2E, push, deployment и merge пока не
  заявляются.

Связано с [DEC-025](../decisions/DEC-20260801-025-persistence-leakage.md),
[DEC-024](../decisions/DEC-20260801-024-typed-persistence-foundation.md) и
[traceability](../traceability/signal-analyser-cascades.md).
