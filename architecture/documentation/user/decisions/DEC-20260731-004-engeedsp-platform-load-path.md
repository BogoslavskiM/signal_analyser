# DEC-20260731-004: EngeeDSP — обязательный Engee platform LOAD_PATH prerequisite

ID: `DEC-20260731-004`  
Дата: 2026-07-31  
Статус: accepted  
Supersedes: none

## Контекст

Runtime импортирует `EngeeDSP`, но app `Project.toml`/Manifest его не объявляют.
В clean local project package не discoverable. На текущем prod module версии
`0.72.0` с UUID `f9bbbd0e-0dd6-4072-898a-88f8f1250a99` доступен через platform
LOAD_PATH/global environment и уже loaded, поэтому import и Genie startup
проходят; `Base.find_package` при этом возвращает `nothing`.

## Альтернативы

Добавить UUID в app `Project.toml` без доступного source contract; считать
platform LOAD_PATH runtime prerequisite; заменить EngeeDSP собственной
реализацией.

## Решение

Не менять dependency в каскаде v2. Required runtime: Engee platform с
EngeeDSP `0.72.0`, ожидаемым PkgId UUID и target contract test. Global
`/usr/local/ijulia-core/environments/v1.12/Project.toml` объявляет package и
internal GitLab `[sources]`; global Manifest фиксирует version `0.72.0` и tree
`4941c08…`. В доступном registry General этого UUID нет, поэтому bare app
`[deps]` не является reproducible install contract. `Base.find_package` сам по
себе не gate для уже доступного platform module.

## Последствия

Второй deploy на тот же target не заблокирован, если target preflight и real
contract test снова PASS. Local unit tests используют mock; local real contract
может быть недоступен и должен считаться environment failure, не pass/skip.
Portability за пределы Engee остаётся limitation, а не подтверждённым Engee bug.
Project dependency ownership решено отдельно в DEC-20260731-005.

## Связи и evidence

[ENGEE-20260731-001](../engee_bugs/ENGEE-20260731-001-engeedsp-project-discovery.md),
[MATH-SA-001](../specifications/mathematics/signal-analysis.md).
