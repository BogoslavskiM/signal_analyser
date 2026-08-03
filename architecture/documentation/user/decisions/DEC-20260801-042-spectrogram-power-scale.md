# DEC-20260801-042: Spectrogram dB/Linear power scale

ID: `DEC-20260801-042`
Дата: `2026-08-01`
Статус: accepted
Implementation: locally complete and ordinary-verified; not deployed

Supersedes:

- `spectrogram.scale` stored-only effect в DEC-040;
- exact three-key `plots.spectrogram.power_limits` metadata DEC-023 — добавляет
  четвёртый Backend-authoritative key `rendered`;
- unconditional acceptance arbitrary-finite explicit Power Limits DEC-023
  только когда effective scale равен Linear: canonical dB pair сохраняет свой
  domain, но непредставимая finite/ordered Linear projection даёт cross-field
  422.

Typed raw Spectrogram, canonical requested/effective dB metadata, Frequency
Scale, query/cache и provider semantics DEC-017..023 сохраняются.

## Контекст

Signal Analyzer показывает `Spectrum in dB` как presentation control. Текущий
Backend уже хранит полную raw nonnegative power matrix и после raw cache
проецирует её в dB. Поэтому Linear можно применить без нового EngeeDSP вызова,
изменения query/raw-cache identity или повторного расчёта STFT.

## Решение

`spectrogram.scale` остаётся enum `db|linear`, default `db`, но становится
`effect_status="effective"`, `effect_reason=""`. Его typed per-Display value
является единственной authority; дубликат effective scalar не создаётся.

Presentation projection выполняется Backend до wire bounding:

```text
db:     z = 10 * log10(P); P=0 -> -Inf -> JSON null
linear: z = P; P finite and P>=0, including exact zero
```

Wire bounding остаётся 160×160 и применяется после выбранной projection.
`x`, `y`, matrix orientation, topology и selected source не меняются.
`color_label` exact:

```text
db     -> "Мощность, дБ"
linear -> "Мощность"
```

`spectrogram.power_limits` сохраняет canonical requested/effective metadata в
dB, но DEC-023 payload расширяется четвёртым exact key `rendered`. Backend
строит scale-specific render limits из полной raw matrix до wire bounding:

```text
{
  "mode": "auto|explicit",
  "requested": null|<canonical dB pair>,
  "effective": null|<canonical dB pair>,
  "rendered": null|{"min":<finite>,"max":<finite>,"units":"dB|power"}
}
```

Exact projection:

- dB explicit/nonconstant Auto: rendered pair равна canonical effective pair;
- Linear explicit: Backend вычисляет `10^(dB/10)` и принимает mutation только
  если оба результата finite, nonnegative и strictly ordered;
- Linear nonconstant Auto: rendered pair равна exact min/max полной raw power
  matrix, включая zero;
- dB constant Auto `{v,v}`: canonical effective остаётся `{v,v}`, rendered
  становится `{v-1,v+1,"dB"}`;
- Linear constant positive Auto `P`: canonical effective остаётся equal dB
  pair. Rendered использует `[prevfloat(P),nextfloat(P)]`, если обе границы
  finite и ordered; на краях Float64 используется `[prevfloat(P),P]` либо
  `[P,nextfloat(P)]`. Хотя бы одна такая конечная strict pair существует для
  любого finite `P>0`;
- Auto zero-only/no-source/N<2 сохраняет `effective=null`, `rendered=null`.
  Explicit pair остаётся `effective=requested` даже без source и получает
  scale-specific rendered pair после той же representability validation.

Таким образом прежний arbitrary finite dB domain DEC-023 сохраняется в
canonical state, но Linear является cross-field constraint. Если существующая
explicit dB pair не представима как finite strictly ordered linear pair,
`spectrogram.scale=linear` даёт atomic 422 без изменения scale/revision. Если
Linear уже active, новая непредставимая Power Limits pair также даёт 422.

`rendered=null` означает `zauto=true`. Frontend не выполняет `db2pow`, не
выводит limits из bounded `z` и не меняет canonical settings document.

## OOP и атомарность

- `SignalSpectrogramData` и raw cache продолжают хранить только raw power.
- Typed scale preference участвует только в Spectrogram presentation planner/
  serializer. В query/provider/raw-cache key оно не входит.
- Scale-only mutation с hot raw cache строит prospective full snapshot и plot
  projection, затем публикует Display и +1 revision.
- Scale-only mutation с cold cache не вызывает provider и не прогревает cache;
  snapshot сохраняет typed-empty plot. Обычный последующий GET materializes
  raw data и применяет сохранённую scale.
- Backend validation, raw projection или render-limit serialization failure до
  publication оставляет state, revision и все caches без изменений. Equal
  canonical value — cold no-op.
- A/B независимы. Clear/source removal сохраняют scale; re-add/new source
  использует её при следующей materialization. Close удаляет с Display.
- Measurements, Peaks, Spectrum и Persistence payload/cache не меняются.

## API и Frontend

POST `/api/settings` shape не меняется. Success возвращает полный `state` и
target `settings`. Для active target Frontend принимает authoritative state и
один раз вызывает существующий `Plotly.react`; для inactive target оно только
сохраняет document/revision и не перерисовывает active graph.

Frontend не вычисляет `z`, не конвертирует power matrix и не выполняет
`db2pow`. Оно применяет authoritative `power_limits.rendered` к `zmin/zmax`.
Смена scale не запускает `Plotly.relayout` optimization: optimization остаётся
последним milestone. Busy/error/status локальны checkbox-enum field; stable
selectors DEC-040 сохраняются.

Асинхронная ошибка `Plotly.react` происходит после принятого Backend commit и
не может откатить revision. По DEC-030 Frontend сохраняет authoritative state,
показывает plot-local error и допускает Retry/latest-render recovery; она не
отправляет обратную mutation и не утверждает server rollback.

## Requested/effective и readouts

Requested и effective scale совпадают для real и complex Spectrogram.
Frequency Scale requested/effective topology DEC-022 является независимым.
`spectrogram.actual_rbw` остаётся unavailable: power scale не является
основанием вычислять RBW или подменять его frequency-bin spacing.

## Проверка

Backend:

- exact field effect metadata/default and strict enum validation;
- deterministic raw matrix: exact dB/linear `z`, zeros/nulls, x/y identity,
  bounding order and labels;
- Auto/explicit/constant/null canonical Power Limits metadata unchanged;
  exact authoritative `rendered` pairs, extreme dB overflow/underflow 422 and
  Float64-edge constant fallback;
- hot/cold no-provider, raw-cache reuse, +1/no-op/422/409 rollback;
- A/B/active-inactive/Clear/source/close and zero unrelated delta.

Frontend:

- exact enum-checkbox payload and nested 409/422 recovery;
- active one-render versus inactive zero-render;
- scale-aware zauto/zmin/zmax including constant fallback;
- no frontend power-matrix conversion and no readout fabrication;
- action design review for label, checkbox, busy/error/effective state.

Engee contract test не требуется: provider options и raw calculation не
меняются. Отдельный E2E для checkbox запрещён; DEC-041 + DEC-042 войдут в один
следующий coherent milestone-3 graph/settings scenario после ordinary gate.

## Источники

- DEC-017 typed Spectrogram foundation.
- DEC-023 Spectrogram Power Limits.
- https://www.mathworks.com/help/signal/ug/explore-signals.html
- https://www.mathworks.com/help/signal/ug/spectrogram-computation-in-signal-analyzer.html
- https://www.mathworks.com/help/signal/ref/pow2db.html
- https://www.mathworks.com/help/signal/ref/db2pow.html
- Settings application research handoff.
