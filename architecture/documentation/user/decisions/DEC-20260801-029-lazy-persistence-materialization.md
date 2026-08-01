# DEC-20260801-029: active-view-only Persistence materialization

ID: `DEC-20260801-029`
Дата: `2026-08-01`
Статус: accepted
Extends: [DEC-024 typed Persistence foundation](DEC-20260801-024-typed-persistence-foundation.md)
Responds to: [DEC-028 resource NO-GO](DEC-20260801-028-fixed-persistence-segmentation-no-go.md)
Implementation: planned in Cascade 23; not deployed

## Контекст

C22 подтвердил, что current omitted-overlap Persistence может выделять больше
1.2 GiB уже на N=64. Математику нельзя безопасно менять на fixed zero, но
current service платит этот риск eager на обычном snapshot даже при active
Time/Spectrum/Spectrogram. Four-cache aggregate этого не требует.

## Решение

Persistence provider вызывается только если prospective active Display имеет
`active_plot="persistence"`, непустой analysis source и минимум два samples.
Inactive nonempty Display публикует прежний exact heatmap/source wire с
пустыми `x/y/z`. Warm raw cache сохраняется, но не попадает в inactive
presentation, поэтому одинаковый state не зависит от cache history.

Новые wire fields не добавляются. `persistence_settings` остаётся exact
`{leakage}`; нет `deferred`, overlap, epoch, status, route или frontend DSP.

Cold switch в Persistence сначала готовит provider result и весь prospective
prepared-display aggregate, затем публикует active plot, revision и четыре
caches. Provider/data/render-preparation failure не меняет state. Warm switch
не вызывает provider. Switch away возвращает empty wire и сохраняет cache;
return reuse. Inactive source/Leakage mutation сохраняет intent/revision без
Persistence call; active mutation остаётся atomic. Create/select/close
используют prospective active Display. Clear/re-add/N<2 следуют той же policy.

## Ограничения

Active Persistence остаётся resource-risk; cancellation, eviction и worker
isolation вне scope. Не меняются provider options, segmentation, Leakage math,
cache key, bounding, Frequency Limits или Overlap decisions.

## Проверка

- Initial/repeated inactive GET и inactive lifecycle/settings — zero calls,
  exact typed-empty wire.
- Cold active switch — one call/full wire; warm GET/return — zero new calls.
- Switch away — empty presentation with retained cache.
- Active/inactive mutation split, A/B, Clear/re-add/source/N<2.
- Cold provider/data/render-preparation failure — exact state/revision/four-
  cache rollback.
- Frontend/E2E Time-deferred → Persistence-cold → away-empty → return-warm,
  event waits, no schema additions.

## Источники

- [Architecture assessment](../../agents/reports/persistence-lazy-materialization-assessment-20260801.md)
- [DEC-028](DEC-20260801-028-fixed-persistence-segmentation-no-go.md)
- [DEC-024](DEC-20260801-024-typed-persistence-foundation.md)

## Датированное уточнение 2026-08-01 — local implementation

Контракт реализован и локально проверен в
`84b21f390a64dab18f576b298ae698deb22432d7`; gated E2E static contract —
`6d5794901698cf0873de2829e1dde991597d0ed1`. C23 104/104, full backend и
independent final audit прошли. Runtime E2E и deployment не заявляются.
