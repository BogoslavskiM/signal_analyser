# Signal Analyser: первая каскадная версия

Status: prod-stabilized  
Prod SHA: `0606d47`  
Prod URL: `https://engee.com/user/apps/signal_analyser`

## Summary

Первая версия создала постоянную MATLAB-подобную рабочую область с четырьмя
Plotly display, таблицей сигналов, selected signal и русскими состояниями.
Geometry закреплена как fixed 2×2 без tabs/layout chooser.

## Verification evidence

- Backend: 108/108 assertions PASS.
- Frontend: 2/2 files PASS.
- EngeeDSP: получено обязательное package/runtime evidence для `pspectrum`
  representations `power`, `spectrogram` и `persistence`.
- Runtime E2E: 6/6 scenarios PASS на prod.

Эти результаты получены при проверке первой каскадной версии; текущая локальная
машина позднее показала отсутствие пакета `EngeeDSP`, что не отменяет prod
evidence, но требует отдельного rerun второго каскада в подходящей среде.

## Stabilization defects

- `326eeec`: исправлены base paths для nested Genie deployment URL.
- `5752dde`: `[hidden]` снова действительно скрывает loading/error/application
  states.
- `0606d47`: E2E API matcher принимает nested Genie endpoint paths и не ловит
  ложные suffix matches.

## Decisions

- Fixed 2×2 является продуктовым invariant.
- Row selection управляет selected signal и active operations.
- Heatmaps строятся для selected signal.
- Русские loading/error состояния обязательны.
- MATLAB multi-layout относится к `matlab_layout_specific` и не переносится.

## Follow-ups discovered after prod review

- Plotly отрисовывался, но внутри host оставался видимый текст
  `Подготовка графика…`; исправление и regression coverage включены во второй
  каскад.
- MATLAB checkbox visibility и multi-signal line traces включены во второй
  каскад как `portable_behavior`.

## Датированное уточнение 2026-07-31

Фактический URL развернутого Genie-приложения:
`https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/`.
Первоначальное значение поля `Prod URL` выше сохранено как часть истории и не
заменено молча.
