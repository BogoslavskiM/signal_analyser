# Signal Analyser: обзор продукта

`SignalAnalyser` — Julia/Genie-приложение анализа сигналов со строгими зонами
ответственности агентов и MATLAB-подобными пользовательскими workflow.

Этот документ даёт человеку краткую текущую картину продукта. Детальные
контракты находятся в [спецификациях](specifications/README.md), причины
решений — в [ADR](decisions/README.md), доказательства реализации — в
[матрице трассируемости](traceability/README.md).

## Постоянные решения Signal Analyser

- Рабочая область поддерживает несколько Display pages с одним графиком на
  активной странице. Tabs являются частью продукта; arbitrary layout chooser,
  docking и MATLAB multi-layout пока не переносятся.
- `portable_behavior` из MATLAB — видимость сигналов через checkbox, независимый
  row selection, операции над selected signal и наблюдаемые результаты графиков.
- `matlab_layout_specific` — расположение, docking и multi-layout MATLAB; это
  reference context, но не требование к Genie UI.
- Time и spectrum могут содержать отдельные traces всех visible signals;
  spectrogram и persistence относятся к selected visible signal.
## Исследовательская основа

Official MathWorks docs исследуются через internet вне MATLAB и формируют
research map. MATLAB Add-On Explorer не используется. Clicker ограничен
workspace/Command Window и Signal Analyzer app и дополняет docs фактическими
controls, defaults, transitions, workflows, edge cases и visual outcomes.

Каждая Command Window команда выполняется отдельным циклом: focus, pre-input
Enter для fresh prompt, English/ASCII, type, visual verification, execution
Enter. В text fields вне Command Window pre-input Enter не применяется.
Double-click и drag-and-drop выполняются нативными mouse actions с последующей
visual verification.

## Диагностика доступности Genie

`Server maintenance` / «Ведутся технические работы» на target, включая HTTP
200, считается soft error, а не автоматическим Engee outage. Base/auth contour,
target title/body/status/API, Genie process и application log проверяются
раздельно. Доступные base/auth означают target app/proxy failure; недоступные
base/auth — platform outage. После start/redeploy повторяются target probe и
исходный E2E.
