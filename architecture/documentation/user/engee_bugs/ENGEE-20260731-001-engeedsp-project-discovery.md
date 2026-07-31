# ENGEE-20260731-001-engeedsp-project-discovery: EngeeDSP недоступен clean project, но preloaded в prod runtime

ID: `ENGEE-20260731-001-engeedsp-project-discovery`  
Status: closed  
First seen: 2026-07-31  
Last verified: 2026-07-31  
Affected surface: EngeeDSP/runtime

## Environment

- local: `julia --project=.`; точная Julia version должна быть приложена при
  следующем repeat;
- prod Engee: server/package versions не возвращены; app runtime running;
- EngeeDSP UUID: `f9bbbd0e-0dd6-4072-898a-88f8f1250a99`, version `0.72.0`;
- app branch: `neuro_signal_analyser_cascade`; prod SHA `0606d47`.

## Prerequisites

Repository checkout с `Project.toml`, где объявлены Genie и Test, но не
EngeeDSP.

## Minimal safe reproduction

```bash
julia --project=. -e 'import EngeeDSP'
```

Prod isolation probe: проверить active project/LOAD_PATH, presence PkgId в
loaded modules, `Base.find_package("EngeeDSP")` и безопасный `import EngeeDSP`.

## Expected

Runtime dependency contract должен быть воспроизводим: package либо объявлен и
resolvable проектом, либо документированно preloaded target runtime до загрузки
приложения.

## Actual

Local clean project не импортирует package. В prod `Base.find_package` вернул
`nothing`, dependency отсутствует в app Project/Manifest, но import работал,
потому что module уже preloaded платформой.

## Frequency

Local reproduction: 1/1. Prod preload observation: 1/1. Повтор на независимом
Engee target ещё не выполнен.

## Exact error/log/stack trace

```text
ERROR: ArgumentError: Package EngeeDSP not found in current path.
- Run `import Pkg; Pkg.add("EngeeDSP")` to install the EngeeDSP package.
Stacktrace:
 [1] macro expansion @ ./loading.jl:2405 [inlined]
 [2] macro expansion @ ./lock.jl:376 [inlined]
 [3] __require(into::Module, mod::Symbol) @ Base ./loading.jl:2388
 [4] require(into::Module, mod::Symbol) @ Base ./loading.jl:2364
```

Prod `genie.log` показал успешный startup и API 200; import error отсутствует.

## Artifacts/screenshots

Локальный command output и prod runtime/package probes зафиксированы во
внутреннем integration handoff; публичного screenshot нет.

## Impact and severity

Severity: high для portability/clean setup; условный deploy risk. Второй
каскад не добавляет новый тип EngeeDSP вызова, поэтому текущий prod runtime с
тем же подтверждённым preload не заблокирован, но preflight обязателен.

## Isolation evidence

Доказано различие local project discovery и prod platform LOAD_PATH. При
первичной изоляции evidence было недостаточно, поэтому исторический status был
`suspected`. Последующее global environment/Manifest/registry evidence
подтвердило intentional platform contract; текущий status — `closed` как
non-defect dependency/portability limitation.

## Workaround

Перед deploy проверить, что target runtime уже загрузил module с ожидаемым
UUID, затем выполнить import/contract probe. Не добавлять dependency вслепую:
package version/registry discovery неизвестны. Workaround bug не закрывает.

## Regression test/link

`test/engee/engee_package_contract_tests.jl`; локальный run failed, не skipped.

## Owner/upstream ticket

Owner: Architect triage; upstream ticket: none.

## Resolution/fixed version

Triage resolution: не Engee defect. Это platform LOAD_PATH prerequisite и
portability limitation; required runtime version `0.72.0`. Никакой product fix
в cascade v2 не выполняется.

## Append-only history

### 2026-07-31 — created

Candidate зарегистрирован как `suspected`; требуется документированный Engee
preload contract либо registry-resolvable package evidence.

### 2026-07-31 — closed as non-defect limitation

Prod evidence: global environment
`/usr/local/ijulia-core/environments/v1.12/Project.toml` declares EngeeDSP
`0.72.0` through internal GitLab `[sources]`; global Manifest contains version
`0.72.0` and tree `4941c08…`; only reachable registry General lacks the UUID.
Module path is
`/usr/local/ijulia-core/packages/EngeeDSP/XobDm/src/EngeeDSP.jl`. Bare app
`[deps]` therefore would not be reproducibly instantiable. Record closed as a
non-defect dependency/portability limitation; keep target contract test
mandatory.
