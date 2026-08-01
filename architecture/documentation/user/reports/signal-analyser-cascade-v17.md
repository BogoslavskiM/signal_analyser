# Cascade 17: Spectrogram Power Limits

Дата: 2026-08-01
Статус: реализовано и локально проверено; не развёрнуто

## Результат

Spectrogram получил независимые для каждого Display Power Limits. Auto режим
публикует точный dB-диапазон всей raw power matrix, а Manual принимает строгую
пару P min/P max. Настройка управляет только цветовым диапазоном heatmap и не
изменяет вычисление Spectrogram.

Backend хранит typed Auto/Explicit preference, валидирует exact five-key
payload и публикует `{mode,requested,effective}`. Auto extrema считаются до
160×160 transport bounding; empty, zero-only, mixed и constant matrices
обработаны отдельно. Power-only mutation не входит в query/cache/provider и не
меняет authoritative `x/y/z`.

Vanilla-JS frontend получил атомарную пару dB-полей, Auto clear, effective
readout и стабильную 422/409 recovery. Plotly использует `zauto` либо
`zmin/zmax`; equal Auto bounds расширяются только для renderer на ±1 dB.

## Проверка

- backend full: 1397/1397 PASS;
- C17 service: 49/49 PASS;
- C17 API: 22/22 PASS;
- frontend: 2/2 PASS;
- Julia parse, JavaScript/Playwright syntax, support contract, runner help и
  `git diff --check`: PASS;
- финальный независимый integration audit: CLEAN.

Product/test commit:
`290c057a05c7ebeab68a69632fcec462bd893339`.

Runtime Playwright не запускался: доступного CDP/application target нет.
Push, deployment и merge не выполнялись. Новый Engee contract test не нужен,
поскольку Power Limits намеренно не вызывают provider.

## Отложено

Fit Colormap, viewport-derived limits, Persistence, MinThreshold, Reassign,
Frequency units и shared Power Limits для Spectrum требуют отдельных решений.

Связано с [DEC-023](../decisions/DEC-20260801-023-spectrogram-power-limits.md)
и [traceability](../traceability/signal-analyser-cascades.md).
