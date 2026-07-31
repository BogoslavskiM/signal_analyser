---
name: engee-contract-testing
version: 0.2.0
---
# Engee Contract Testing

## When to Use
- Приложение использует функцию, package или runtime contract Engee.
- Нужно исследовать контракт через Engee MCP и закрепить его тестами.
- Нужно подготовить полный отчёт по критическим сценариям Engee-функций.

## When NOT to Use
- Нужно проверить предметную математику приложения без Engee contract.
- Нужен пользовательский браузерный сценарий.
- Функция Engee не используется приложением.

## Mandatory Tools
- Используй Engee MCP для исследования и подтверждения каждого проверяемого
  контракта.
- Выбирай prod/devhub server из конфигурации задачи.
- Получай PAT только из защищённого agent environment/AGENTS instructions.
- Никогда не записывай PAT в test source, fixture, report или команду,
  сохраняемую в репозитории.
- Не обращайся к Engee API напрямую по HTTP.
- После подключения проверь status runtime и загрузи релевантный Engee skill
  по стандартному MCP workflow.

## Contract Sources
Expected behavior разрешено брать только из:

- ТЗ;
- переданных reference artifacts;
- согласованного domain/API contract;
- официального контракта используемой функции Engee.

Не создавай независимый математический расчёт для получения expected values.
Фактический результат текущего запуска Engee не объявляй expected behavior без
согласованного источника.

## Function Inventory
До написания тестов составь список только реально используемых функций:

```text
function/package:
call site:
server/environment:
Engee/package version:
contract source:
critical scenarios:
side effects/resources:
```

- Для каждой функции создавай отдельный testset или файл.
- Один skill задаёт общую методику; отдельный skill на каждую функцию не нужен.
- Зафиксируй package/runtime version, на которой подтверждён контракт.

## Required Coverage
Для каждой используемой функции максимально покрой критические сценарии:

- нормальные вызовы;
- граничные значения;
- неверные типы;
- семантически неверные значения;
- обязательные и необязательные аргументы;
- форму, типы и обязательные поля результата;
- согласованные типы и тексты ошибок;
- side effects и состояние после ошибки;
- очистку временных ресурсов.

Не добавляй повтор одинакового вызова только ради проверки повторяемости.
Не выполняй load, stress или concurrent testing, если они не относятся к
критическому контракту конкретной функции.

## MCP to Test Workflow
1. Найди call site и все способы вызова функции приложением.
2. Зафиксируй expected contract и критические сценарии.
3. Через Engee MCP выполни минимальные probes для каждого класса сценариев.
4. Не подменяй probe формальным тестом: перенеси подтверждённые проверки в
   `test/engee`.
5. Используй Julia `Test` и существующий runner.
6. Продолжай suite после отдельного assertion failure, насколько позволяет
   Julia test runner, чтобы собрать общий отчёт.
7. Создавай временные models, workspace variables и files только с уникальными
   именами и обязательной очисткой в `finally`.
8. Повтори формальный suite в настроенном target environment.

## Engee Model Guardrails
Если contract test создаёт или запускает Engee model:

- используй только публичный строчный `engee.*`;
- не создавай `.engee` напрямую;
- сохраняй model только через `engee.save`;
- передавай block parameters строками;
- собирай simulation data только через To Workspace;
- проверяй NaN/Inf и численное расхождение;
- доставляй создаваемые artifacts только через разрешённые Engee MCP file tools.

## Environment Failure
- Недоступность target server, runtime, обязательного package или MCP является
  ошибкой прогона.
- Не помечай такой suite как passed и не скрывай проблему через `skip`.
- В отчёте отделяй environment failure от contract failure.
- Не устанавливай и не скачивай dependency самостоятельно без отдельного
  разрешения architect/user.
- Если package работает только как platform-preloaded module, зафиксируй PkgId
  UUID, loaded-module evidence, project/manifest discovery и import result.
  Local clean-project failure и target preload — разные факты; не объявляй их
  подтверждённым Engee bug без isolation.

## Engee Bug Candidate

При вероятном дефекте верни Architect candidate по шаблону
`architecture/documentation/agents/engee_bug_intake/candidate-template.md`.
Включи minimal safe reproduction, repeat, exact error/stack, environment and
package versions, app branch/SHA, isolation от app/test/config/network,
workaround и regression test. Не записывай secrets. Недостаточная isolation
означает `suspected`.

## Report
Используй `assets/report-template.md`.

Для каждой функции укажи:

- environment/server и версии;
- contract source;
- входные данные сценария;
- ожидаемый контракт;
- фактический результат или error;
- pass/fail;
- оставшиеся непокрытые критические сценарии.

Не прикладывай backend/runtime logs по умолчанию. Отчёт должен быть полным, но
не захламлённым техническим выводом.

## Ownership and Handoff
- Tester изменяет только `test/engee/**`.
- При product failure оформи handoff владельцу backend/domain кода.
- Не исправляй `app/**`, `lib/**` или frontend.
- После исправления самого теста tester повторяет релевантный suite.
- После исправления product code повторяй тесты по запросу владельца изменения.

## Verification
- Запусти `julia --startup-file=no test/engee/engee_package_contract_tests.jl`.
- Проверь отсутствие PAT и других secrets в test files/report.
- Проверь cleanup временных models, variables и files.
- Проверь, что отчёт содержит результат всех функций и критических сценариев,
  а suite не остановился после первой contract failure.
