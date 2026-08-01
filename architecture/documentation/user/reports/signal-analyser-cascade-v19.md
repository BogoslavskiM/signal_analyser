# Cascade 19: Persistence Leakage

Дата: 2026-08-01
Статус: реализовано и локально проверено; не развёрнуто

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

Frontend получил normalized native range `0..1` в существующей Display tab.
Это сознательное product/API представление, а не неподтверждённая копия шкалы
MATLAB GUI. Новые route, settings tab, client DSP или Persistence metadata не
добавляются.

## Gate и безопасность

- probe PASS/GO, Engee defect не выявлен;
- temporary prod pod остановлен, cleanup подтверждён;
- MATLAB GUI, Command Window и Add-On Explorer не использовались;
- рабочая ветка была чистой до документационного checkpoint;
- backend 1497/1497 PASS; C19 48/48 PASS; frontend 2/2 PASS;
- Playwright syntax/support/static/help и независимые audits CLEAN;
- product/test commit `2f99ff875141a70888195c5718f437765b7ef591`;
- runtime E2E, push, deployment и merge не выполнялись.

Связано с [DEC-025](../decisions/DEC-20260801-025-persistence-leakage.md),
[DEC-024](../decisions/DEC-20260801-024-typed-persistence-foundation.md) и
[traceability](../traceability/signal-analyser-cascades.md).
