# Скиллы Engee User

- `engee-user-workflow` — обязательный evidence cycle и subskill router;
- `required-functionality-analysis` — MATLAB/Engee docs, call sites и Engee
  help для определения требуемого публичного контракта;
- `engee-contract-testing` — persistent `test/engee/**` scripts, execution,
  MATLAB comparison, iterative discrepancy localization и recovery gate;
- `bug-reporting` — confirmed/suspected evidence, explicit stub authorization
  и recovery trigger в `architecture/engee_bugs`.

Общий `analysis` skill не нужен: его роль выполняет обязательный workflow.
Deployment и Git принадлежат DevOps; browser regression принадлежит E2E.
Только confirmed bug с persistent reproducer может разрешить временную product
заглушку; suspected finding её не разрешает.
