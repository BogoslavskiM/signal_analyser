---
name: backend-unit-testing
---
# Backend Unit Testing

## When to Use
- Нужно создать или расширить Julia unit tests для domain-функций, структур,
  state helpers и calculation coordination.
- Нужно добавить regression test подтверждённой backend-ошибки.

## When NOT to Use
- Проверяется Genie route/request/response — используй backend API testing.
- Проверяется реальный Engee contract — отправь handoff Engee User на
  `engee-user/engee-contract-testing`.
- Проверяется браузерный workflow.

## Bundled Templates
Используй:

- `assets/unit-test-template.jl` — структура testset;
- `assets/coverage-summary.jl` — сводка built-in Julia `.cov`;
- `assets/report-template.md` — итог unit-прогона и coverage ТЗ.

## Project Structure
Сохраняй текущую структуру:

```text
test/back/
  runtests.jl
  support/
    test_context.jl
  lib/
    <source path>_test.jl
```

- Зеркаль предметную структуру `lib/**` внутри `test/back/lib/**`.
- `runtests.jl` рекурсивно подключает `*_test.jl` в стабильном sorted order.
- Общий `test_context` загружает production code и минимальные test doubles.
- Каждый testset создаёт свежие domain objects и не зависит от мутаций
  предыдущего testset.
- Не создавай один глобальный изменяемый fixture для всего suite.

## Test Boundary
- Unit tests проверяют domain-функции, typed structures и state helpers без API
  routes.
- Внутренний helper проверяй через публичное поведение.
- Тестируй internal helper напрямую только когда он содержит самостоятельную
  сложную логику и его contract стабилен.
- Не вызывай Engee packages/runtime/MCP из unit suite.
- Для внешней границы используй минимальный typed test double, если без неё
  невозможно проверить собственную логику приложения.
- Не копируй production algorithm в test helper.

## Required Cases
Для каждой проверяемой функции добавь:

- normal cases;
- boundary cases;
- invalid typed input;
- согласованный exception type и пользовательский error text;
- state до и после mutation;
- отсутствие частичной mutation при error;
- regression case для каждого подтверждённого bug.

Покрой все относящиеся к модулю пункты ТЗ и согласованных contracts.

## State and Resources
- Создавай inspector, main object, selection, settings и calculation state
  заново в каждом независимом testset.
- Для filesystem используй `mktempdir() do dir ... end` либо `try/finally`.
- Не оставляй generated files в project tree.
- Проверяй cleanup и состояние после исключения.

## Threads and Queues
- Проверяй queue, cancellation и threaded calculations через управляемые
  callbacks, `Channel`, task state и явные synchronization points.
- Не используй фиксированные `sleep`.
- Не проверяй внутренний timing, если contract описывает observable state.
- Быстрый unit test не должен запускать реальный тяжёлый calculation.

## Coverage
- Минимальный процент coverage не устанавливается.
- Фактический line coverage обязательно укажи в отчёте.
- Запускай Julia с built-in `--code-coverage=user`, затем сформируй сводку
  через `assets/coverage-summary.jl` или существующий эквивалент проекта.
- Отдельно веди coverage map пунктов ТЗ/contract: требование → testset.
- Высокий line coverage не заменяет проверку contract и критических границ.

## Source Checks
- Static source assertion допустим для architecture contract: наличие route
  registration, требуемого public call или отсутствие запрещённого pattern.
- Не подменяй source-string assertion проверку фактического поведения функции.

## Ownership and Rerun
- Tester изменяет только `test/back/**`.
- При product failure оформи handoff backend/domain owner.
- После исправления test code повтори релевантный test file, затем весь backend
  suite.
- После исправления product code повторяй тесты по запросу владельца изменения.

## Verification
- Запусти `julia --project=. test/back/runtests.jl`.
- Для финального отчёта запусти suite с coverage.
- Проверь независимость test order и отсутствие оставшихся files/tasks.
- Заполни `assets/report-template.md`.
