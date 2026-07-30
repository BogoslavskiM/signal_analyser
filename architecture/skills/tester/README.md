# Скиллы тестировщика

Скиллы тестировщика охватывают backend/frontend unit-, static- и
behavior-тесты, контрактные тесты пакетов Engee и подтверждение результатов.

Добавляй сюда скилл только для повторяемой проектной процедуры. Базовые правила
передачи задач, отчетности, проверки и границ уже находятся в
`architecture/agents/roles/tester.toml`.

Доступные скиллы:

- `test-suite-maintenance/` — работа с backend-, frontend- и контрактными
  тестами Engee.
- `engee-contract-testing/` — обязательное исследование через Engee MCP,
  полное покрытие критических контрактов используемых функций и отчёт без
  runtime logs.
- `backend-unit-testing/` — Julia unit tests domain/state logic, fresh objects,
  критические cases, regression tests и coverage/ТЗ report.
- `backend-api-testing/` — ordered route contract, прямые handler tests,
  field-by-field payload/state assertions и endpoint coverage report.
- `frontend-static-behavior-testing/` — dependency-free Node runner,
  static JS/CSS/HTML и VM behavior tests, V8 coverage и frontend skill/ТЗ
  matrix.
