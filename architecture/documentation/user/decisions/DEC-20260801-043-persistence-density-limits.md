# DEC-20260801-043: Persistence Density Limits

ID: `DEC-20260801-043`
Дата: `2026-08-01`
Статус: accepted
Implementation: planned; not verified; not deployed

Supersedes:

- `persistence.density_limits` stored-only effect в DEC-040;
- exact Persistence plot payload DEC-024 — добавляет Backend-authoritative
  `density_limits` metadata.

Provider/query/raw-cache, power-axis dB projection, Leakage и active-view lazy
materialization DEC-024/025/029 сохраняются.

## Контекст

Persistence `z` уже является строго проверенной raw occurrence matrix в
процентах `[0,100]`. Density Limits задаёт диапазон color mapping и не является
`MinThreshold`: оно не меняет histogram, не зануляет bins и не является
EngeeDSP option. Поэтому поле можно применить как presentation-only cascade
над полным raw result.

## Typed contract

Settings value сохраняет DEC-040 shape:

```text
null | {"min":<finite>,"max":<finite>}
```

Explicit pair обязана удовлетворять `0 <= min < max <= 100`. `null` означает
Auto. `persistence.density_limits` становится
`effect_status="effective_presentation"`, `effect_reason=""`: Backend
authoritative metadata управляет frontend color-range presentation, но raw
occurrence matrix не меняется.

Persistence plot payload получает exact metadata:

```json
"density_limits": {
  "mode": "auto|explicit",
  "requested": null|{"min":10.0,"max":80.0,"units":"percent"},
  "effective": null|{"min":10.0,"max":80.0,"units":"percent"},
  "rendered": null|{"min":10.0,"max":80.0,"units":"percent"}
}
```

Каждый nested pair имеет exact keyset `min,max,units`; `units` строго
`"percent"`. Requested/effective являются canonical metadata; rendered —
готовые конечные strictly ordered Plotly bounds.

## Auto и constant policy

Auto effective выводится из полной raw occurrence matrix до 160×160 bounding,
включая zeros. Для nonconstant matrix:

```text
effective = rendered = [minimum(z_raw), maximum(z_raw)]
```

Для constant raw occurrence `v` canonical effective честно остаётся `{v,v}`,
но Backend строит renderer-only strict pair:

```text
v == 0   -> [0,1]
v == 100 -> [99,100]
otherwise -> [max(0,v-1), min(100,v+1)]
```

No-source, `N<2` и typed-empty result дают Auto `effective=null`,
`rendered=null`. Explicit pair сохраняет `effective=requested` и
`rendered=requested` даже без source.

## OOP, cache и атомарность

- Backend добавляет immutable Auto/Explicit density value object и typed
  Persistence presentation planner/serializer; route остаётся mapping-only.
- Raw occurrence matrix, axes и `SignalPersistenceCacheKey` не меняются.
- Density-only mutation переиспользует hot raw cache только для active
  Persistence target, без provider calls, и публикует новую presentation/full
  state +1 revision.
- Cold active либо любая inactive Persistence mutation не materializes
  provider, не читает даже warm raw cache и не пишет cache. Inactive Auto
  публикует `effective=null,rendered=null`, чтобы snapshot не зависел от cache
  history по DEC-029. Inactive Explicit сохраняет source-independent
  `effective=requested,rendered=requested`. Обычный последующий active GET
  materializes/reads active cache и применяет preference.

Здесь active Persistence target означает одновременно: target Display равен
глобальному active Display и его active plot равен Persistence. Любое другое
состояние является inactive независимо от сохранённого plot выбора другого
Display.
- Planner вычисляет Auto extrema только по полной raw matrix до wire bounding.
- Backend validation/planning/serialization failure до publication сохраняет
  state, revision и все caches. Equal canonical value — cold no-op.
- A/B независимы; Clear/source removal сохраняют preference; re-add/source
  materialization rederives Auto; close удаляет с Display.
- Spectrum, Spectrogram, Time, Measurements и Peaks не меняются.

## Frontend

Frontend применяет только `density_limits.rendered`:

- null → `zauto=true`, без `zmin/zmax`;
- pair → `zauto=false`, `zmin=min`, `zmax=max`.

Frontend не вычисляет extrema из bounded `z`, не расширяет constants и не
использует Density Limits как threshold/filter. Active accepted target получает
один существующий `Plotly.react`; inactive target — только settings/revision и
zero active render. Plotly error после Backend commit следует DEC-030 и не
откатывает server revision.

Settings response router распознаёт этот конкретный
`effective_presentation` field как Backend-snapshot presentation: для active
target он принимает полный returned state, а не применяет локальную догадку.
Остальные `effective_presentation` fields сохраняют свои уже принятые
DEC-040/041 paths; status сам по себе не является универсальным разрешением на
full-state render.

Atomic range control, inline 422, one 409 replay, field-local busy, stable
selectors и accessibility DEC-040 сохраняются. Labelled endpoints показывают
percent.

## Проверка

Backend:

- exact field/payload keysets and enum/effect metadata;
- Auto/explicit/no-source/N<2/zero/100/interior constants/mixed extrema;
- full-raw-before-bound fixture; unchanged raw z/axes;
- hot/cold/inactive zero-provider/cache behavior;
- bounds/type/Bool/nonfinite/extra-key 422, +1/no-op/409 rollback;
- A/B/Clear/source/re-add/close and zero unrelated delta.

Frontend:

- exact four-key metadata validation and authoritative rendered mapping;
- active one-render, inactive zero-render, stale A/B isolation;
- null/pair zauto behavior; no extrema/threshold calculation;
- range draft/error/busy/accessibility and DEC-030 recovery.

Engee contract test не требуется. Отдельный E2E для Density Limits не
создаётся; поле войдёт в следующий coherent Persistence presentation workflow
после ordinary gate.

## Источники

- DEC-024 typed Persistence foundation.
- DEC-025 Persistence Leakage.
- https://www.mathworks.com/help/signal/ug/persistence-spectrum-in-signal-analyzer.html
- https://www.mathworks.com/help/signal/ref/pspectrum.html
- Settings application research handoff.
