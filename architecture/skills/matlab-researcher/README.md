# Скиллы MATLAB Researcher

MATLAB Researcher использует системную утилиту `matlab_clicker` и получает
актуальные исследовательские скиллы, API-документацию, workflow, существующие
сценарии и артефакты через `GET /agent/bootstrap`.

Official MathWorks documentation исследуется обычными internet-инструментами
вне MATLAB и задаёт research map. MATLAB Add-On Explorer запрещён. В MATLAB
clicker работает только с workspace/Command Window и исследуемым Signal
Analyzer app, дополняя документацию фактическими UI/default/state/workflow
наблюдениями.

- `matlab-clicker-research-loop/` — постоянный цикл docs research map,
  bootstrap, автономное clicker-исследование, фиксация docs/app delta,
  сохранение сценариев через API и потоковый handoff E2E Tester.

Содержимое server-side research skills здесь не копируется.
