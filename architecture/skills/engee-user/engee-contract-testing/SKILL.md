# Engee Contract Testing

Используй для генерации и выполнения persistent Julia contract tests реально
используемых Engee functions. Этот skill включает comparison с MATLAB
contract/reference и итеративную локализацию расхождения.

## Contract sources

Expected behavior разрешено брать только из ТЗ, завершённого
`required-functionality-analysis`, официального MATLAB/Engee contract или
переданных MATLAB Researcher artifacts. Фактический результат текущего Engee
run сам по себе не является expected behavior.

## Workflow

1. Зафиксируй function inventory: call sites, production/package versions,
   contract source, critical scenarios, side effects и resources.
2. Выполни минимальные probes через Engee MCP, не записывая PAT в command,
   source или logs.
   Для model operations сначала загрузи актуальный Engee MIND skill
   `engee_model`; для другой пользовательской специализации загрузи только
   найденный релевантный skill.
3. Создай/обнови tests только в `test/engee/**` на Julia `Test` и существующем
   runner.
4. Для каждой функции покрой применимые nominal, boundary, invalid type,
   invalid semantic value, default/optional arguments, result type/shape,
   documented error, side effects и cleanup cases.
5. Сравни actual Engee result с MATLAB contract/reference, включая tolerances,
   shapes, units и error semantics.
6. При failure расширяй probe/test минимальными дополнительными cases, чтобы
   определить уровень дефекта: input normalization, signature/default,
   algorithm/numerics, result conversion, state/side effect или environment.
7. Не исправляй expected value под observed Engee output. Если локализация
   завершена, передай evidence в `bug-reporting`; если нет — верни suspected
   finding и точный remaining question. Не отключай, не пропускай и не
   превращай воспроизводящий regression в pass из-за известного дефекта.
8. Повтори формальный suite в project-locked production environment и верни
   агрегированный report.

## Blocker and recovery contract

- Только воспроизводимый и локализованный failure получает verdict
  `confirmed`; он может разрешить product stub через `bug-reporting`.
- `suspected` и environment failure не разрешают stub и остаются на Engee User
  lane до получения достаточного evidence.
- Persistent test остаётся единственным recovery gate. После исправления Engee
  повторно запусти тот же case без изменения expected contract.
- Только его pass разрешает Orchestrator открыть recovery task: Backender
  раскомментирует сохранённый Engee call и удаляет adjacent stub.

## Engee model guardrails

- Используй только публичный строчный `engee.*` API.
- `.engee` создавай и сохраняй только через Engee API.
- Block parameters передавай строками; simulation data получай через To
  Workspace contract.
- Temporary models, workspace variables и files создавай с уникальными именами
  и очищай в `finally`.
- Runtime/package/MCP unavailable — environment failure, не skip/pass.

## Report

Для каждой функции вернуть environment/version, source contract, scenario
inputs, expected, actual/error, pass/fail, localization result и remaining
critical gaps. Указать test paths, exact command, `verdict:
supported|confirmed_bug|suspected|environment_failure` и допустимость
`stub_authorization: true|false`. Не включать credentials и лишние runtime
logs.

Перед завершением проверь cleanup, повторяемость минимального case, exact
versions и отсутствие подгонки expected result под observed output.
