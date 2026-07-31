# Покрытие референсных сценариев Signal Analyser

Этот набор переносим: он не содержит PROD URL. После отдельного deployment
DevOps передаёт значение только из `status.open_url`; ожидаемый canonical path
— `/user/apps/signal_analyser`.

Статус исполнения всех строк: **не запущено — ожидается PROD deployment**.
Документы ниже используются только как внешний behavioral baseline; snapshot
текущего приложения не используется как эталон.

| ID | Документационный baseline | Наблюдаемый пользовательский сценарий | Spec | Численные артефакты | Автоматизация | Статус исполнения / ограничение |
|---|---|---|---|---|---|---|
| SA-UI-01 | [MathWorks Signal Analyzer](https://www.mathworks.com/help/signal/ref/signalanalyzer-app.html) | Постоянная рабочая область из временного графика, спектра, спектрограммы и persistence spectrum; выбранный график показывает controls. | `specs/signal_analyser/shell_layout.test.js`, `active_display.test.js` | Нет: DOM geometry и stable selectors. | Полное UI-структурное покрытие. | Не запущено — ожидается PROD deployment. Точные строки зависят от frontend handoff. |
| SA-SIG-02 | [Explore Signals](https://www.mathworks.com/help/signal/ug/explore-signals.html) | Пользователь выбирает другой сигнал и видит согласованное обновление четырёх отображений. | `specs/signal_analyser/signal_selection.test.js` | Нет: проверяются непустые Plotly signatures. | Интеграционное UI/API покрытие, без проверки формул. | Не запущено — ожидается PROD deployment. Нужны минимум два seed-сигнала. |
| SA-SP-03 | [Spectrum Computation](https://www.mathworks.com/help/signal/ug/spectrum-computation-in-signal-analyzer.html) | Спектр — line/scatter; Welch method видим в активных полях; для отмеченного complex seed частотная ось центрирована около нуля. | `specs/signal_analyser/plot_contracts.test.js` | Нет; проверяются trace type, axes и инварианты. | Частичное: численная точность Welch принадлежит contract/unit suite. | Не запущено — ожидается PROD deployment. Complex assertion включается только для явно отмеченного complex signal. |
| SA-TF-04 | [Spectrogram Computation](https://www.mathworks.com/help/signal/ug/spectrogram-computation-in-signal-analyzer.html) | Спектрограмма — непустая heatmap с согласованными размерами `x/y/z`. | `specs/signal_analyser/plot_contracts.test.js` | Нет; DOM Plotly data. | Частичное: UI data-shape, не численная сверка. | Не запущено — ожидается PROD deployment. |
| SA-PS-05 | [Persistence Spectrum](https://www.mathworks.com/help/signal/ug/persistence-spectrum-in-signal-analyzer.html), [Engee `pspectrum`](https://engee.com/helpcenter/stable/en/func-dsp-transforms-correlation-and-modeling/func-pspectrum.html) | Persistence spectrum — heatmap с корректной матрицей, ненулевым numeric range и colorbar. | `specs/signal_analyser/plot_contracts.test.js` | Нет; range и colorbar наблюдаются через Plotly. | Частичное: E2E не подменяет численный эталон `pspectrum`. | Не запущено — ожидается PROD deployment. |
| SA-RU-06 | [Engee Genie functions](https://engee.com/helpcenter/stable/ru/feature/genie-functions.html) | Pending `/api/state` показывает русское loading-состояние, неуспех state — русское error-состояние. | `specs/signal_analyser/loading_error_contract.test.js` | Нет; `page.route` mock без product changes. | Полное для видимого loading/error contract. | Не запущено — ожидается PROD deployment. |
| SA-VIS-07 | MATLAB evidence: checkbox plots signal; row selection enables operations. | Русские visibility checkboxes сохраняют минимум один visible; row click выбирает сигнал; checkbox не выбирает строку; скрытие selected выбирает первый visible; time/spectrum показывают named/colored legend traces всех visible; spectrogram/persistence остаются heatmaps selected visible; после готовности четырёх Plotly нет видимого `Подготовка графика…`, hosts живы после `Plotly.react`; layout остаётся fixed 2x2 без layout controls. | `specs/signal_analyser/visibility_cascade.test.js` | Нет; проверяются DOM state, `/api/view`, Plotly host data и trace metadata. | Полное UI-regression покрытие зафиксированного visibility contract, без DSP-формул. | Не запущено — ожидается доступный current tab или PROD URL после отдельного deployment. |

Неавтоматизированная численная часть намеренно остаётся за обычными backend/
Engee contract tests: E2E фиксирует реальный UI/API workflow и наблюдаемую
структуру Plotly, а не повторяет расчёты DSP в браузере.
