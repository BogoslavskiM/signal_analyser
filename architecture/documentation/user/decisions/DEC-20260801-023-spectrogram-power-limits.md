# DEC-20260801-023: Display-local Spectrogram Power Limits

ID: `DEC-20260801-023`
Дата: `2026-08-01`
Статус: accepted
Implementation: planned in Cascade 17; not deployed

Implementation note 2026-08-01: реализовано локально в commit
`290c057a05c7ebeab68a69632fcec462bd893339`; не развёрнуто.
Supersedes: exact four-key Spectrogram settings shape из DEC-022; все
вычислительные и Frequency Scale semantics DEC-017..022 сохраняются

## Контекст

MathWorks описывает Power Limits как границы цветового диапазона Spectrogram.
Исходная шкала охватывает полный диапазон мощности и не меняется при zoom/pan;
Fit Colormap является отдельным действием для видимой области. Это не
`pspectrum` MinThreshold и не основание менять provider output.

Точные универсальные MATLAB default numbers, округление полей и validation
сообщения не задокументированы. Значения `-50/-10` и `-45/-20` на официальных
снимках являются настройками примеров, а не defaults. Поэтому C17 вводит
явную portable Auto-модель и не заявляет её названием MATLAB UI.

## Решение

Exact Display-local settings object содержит ровно пять ключей:

```json
{
  "spectrogram_settings": {
    "overlap_percent": 50.0,
    "leakage": 0.5,
    "frequency_limits": null,
    "frequency_scale": "linear",
    "power_limits": null
  }
}
```

`power_limits=null` означает product Auto. Explicit intent имеет exact форму:

```json
{"min_db": -80.0, "max_db": -20.0, "units": "dB"}
```

Границы — конечные JSON Number, но не Bool, `min_db < max_db`, units строго
`"dB"`; signed zero канонизируется. Положительные dB допустимы, произвольного
верхнего/нижнего product cap нет. Missing/extra key, неверный type/units,
non-finite, equal или reversed pair дают atomic field-level 422. Отсутствие
всего `spectrogram_settings` сохраняет preference. Equal canonical full object
— no-op; изменение requested pair — одна revision; stale — 409.

Backend публикует:

```json
{
  "power_limits": {
    "mode": "auto",
    "requested": null,
    "effective": {"min_db": -93.2, "max_db": -4.1, "units": "dB"}
  }
}
```

В Auto effective вычисляется по полной raw power matrix до wire bounding
160×160: для каждого finite `P>0` используется exact `10*log10(P)`, а
`P=0 -> -Inf` исключается из extrema. Empty/no-source/N<2/zero-only data дают
effective `null`. Mixed zero/positive использует только конечные dB. Constant
positive raw matrix честно публикует equal effective bounds `{v,v}`; backend
не расширяет их искусственно. В Explicit mode requested и effective равны
сохранённой strict pair даже при отсутствующем source.

Power Limits полностью исключены из `SignalSpectrogramQuery`, raw cache key,
provider options и Engee calls. Power-only mutation не вызывает и не прогревает
Spectrum/Spectrogram provider, не меняет cache identity и сохраняет backend
`x/y/z` bit-identical. На холодном Auto response effective может быть null;
обычный следующий GET материализует raw data и authoritative full-raw extrema.
Combined mutation пересчитывается только из-за Leakage/Overlap/Frequency
Limits или другого существующего computational change.

Preference принадлежит Display: новый Display получает Auto, A/B независимы,
Clear сохраняет requested intent. Explicit pair переживает source removal,
re-add и real/complex/source changes. Auto rederives effective после изменения
raw computation/source. Frequency Scale меняет только y presentation и не
меняет Power Limits, raw/wire z или color metadata.

Frontend добавляет одну атомарную пару `P min`/`P max` в dB и read-only
effective state в существующую Spectrogram section. Оба пустых поля коммитят
Auto; одно пустое, non-finite, equal или reversed значение является локальной
ошибкой без request и возвращает accepted pair. Переход фокуса между полями не
коммитит; Enter или выход из всей пары отправляет один полный пятиключевой
target. No-source disables pair без потери preference.

Strictly increasing finite effective pair передаётся Plotly heatmap только как
`zauto:false`, `zmin`, `zmax`; authoritative `z` не клонируется и не мутирует.
При effective `null` frontend опускает границы и использует `zauto:true`. Для
valid constant Auto `{v,v}` только renderer получает deterministic
`zmin=v-1`, `zmax=v+1`; read-only effective сохраняет точное `{v,v}`, backend
metadata и `z` не расширяются. Невалидная backend metadata является stable
contract error и не заменяется extrema bounded wire matrix.

422 восстанавливает последний accepted settings object/metadata и показывает
inline error без retry. Первый 409 принимает canonical current и повторяет
ровно один latest full desired target; второй 409 восстанавливает canonical
state, показывает error и завершает replay. Это сохраняет C15/C16 queue policy.

## Вне scope

Изменение или shared Power Limits для уже существующего Spectrum dB/linear,
изменение Spectrogram z-units, Fit Colormap,
viewport-derived limits, zoom/pan persistence, MinThreshold, Reassign,
Frequency units, Persistence, import/export и любые EngeeDSP/Project.toml
изменения. Fit Colormap требует отдельного viewport contract и безопасного
MATLAB наблюдения.

## Проверка

Backend: typed Auto/Explicit value object, exact five-key parser, full-raw
finite-dB extrema before bounding, empty/zero/mixed/constant cases, A/B/Clear/
source lifecycle, no-op/+1/422/409, cold/equal/combined zero-provider rules and
bit-identical x/y/z. Frontend: atomic pair, Auto clear, effective readout,
strict zmin/zmax mapping, constant fallback, rollback/bounded replay. E2E:
manual/Auto, unchanged x/y/z, full exact request, A/B/Clear/source/frequency
scale independence and exact cleanup. Engee contract test не требуется: новый
setting намеренно не вызывает специализированный provider.

## Источники

- MathWorks Spectrogram Computation:
  https://www.mathworks.com/help/signal/ug/spectrogram-computation-in-signal-analyzer.html
- MathWorks Explore Signals:
  https://www.mathworks.com/help/signal/ug/explore-signals.html
- MathWorks Customize Signal Analyzer:
  https://www.mathworks.com/help/signal/ug/customize-signal-analyzer.html
- MathWorks Signal Analyzer app:
  https://www.mathworks.com/help/signal/ref/signalanalyzer-app.html
- [DEC-022 Frequency Scale](DEC-20260801-022-spectrogram-frequency-scale.md)
- [MATLAB Researcher C17 handoff](../../agents/handoff/matlab-researcher-cascades.md)
