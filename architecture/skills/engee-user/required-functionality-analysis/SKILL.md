# Required Functionality Analysis

Используй до реализации или contract testing, когда нужно установить, какую
публичную функциональность Engee приложение вправе использовать.

## Sources

1. Реальные backend call sites и handoff requirements.
2. Официальная документация MATLAB как reference contract.
3. Официальная документация Engee.
4. `help` соответствующей функции в project-locked Engee production runtime.
5. Переданные MATLAB Researcher artifacts для observed reference behavior.

Документация задаёт ожидаемый контракт, но не подтверждает фактическое
поведение Engee; execution выполняется отдельным contract-testing stage.

## Workflow

1. Составь inventory реально требуемых функций/packages; не исследуй весь
   пакет без необходимости.
2. Для каждой функции зафиксируй call site, purpose, environment/version,
   public signature, arguments, types, defaults, return shape, side effects,
   errors и cleanup requirements.
3. Сопоставь MATLAB и Engee documented contracts field-by-field.
4. Проверь Engee `help`; отдели documented, observed-by-help и unresolved.
5. Определи critical scenarios для execution: nominal, boundaries, invalid
   type/value, optional/default arguments, result shape и side effects.
6. Верни contract matrix и точные inputs для
   `engee-user/engee-contract-testing`.

## Output

```text
function/package:
call_sites:
required_purpose:
MATLAB_contract:
Engee_documented_contract:
Engee_help_contract:
known_differences:
critical_execution_scenarios:
unresolved:
```

Не объявляй текущее фактическое поведение Engee правильным только потому, что
оно воспроизводится. Не записывай secrets и не создавай product fallback.

Перед завершением проверь, что каждая функция связана с реальным call site,
версией и источником, а каждый unresolved contract превращён в конкретный
execution scenario или blocker.
