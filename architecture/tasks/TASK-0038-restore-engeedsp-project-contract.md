---
id: TASK-0038
kind: task
title: Восстановить EngeeDSP dependency contract для production runtime
status: backlog
priority: P0
queue_order: 36
model: gpt-5.6-sol
reasoning: xhigh
owner: orchestrator
assignees: [engee_user, backender]
parent: TASK-0037
depends_on: []
blocks: []
source_handoffs: [HND-0073, HND-0074]
related_handoffs: [HND-0075, HND-0076, HND-0077, HND-0078, HND-0079, HND-0080, HND-0081, HND-0082, HND-0083, HND-0084, HND-0085, HND-0086]
blocked_by: []
blocker_reason: "Пользователь запретил изменять или использовать Project.toml и Manifest.toml для этого решения; dependency-contract approach отложен."
development_branch: neuro_signal_analyser_ui_patterns
---

# Восстановить EngeeDSP dependency contract для production runtime

## User value

Production Signal Analyzer возвращает authoritative state и выполняет
EngeeDSP-backed анализ вместо HTTP 500 из-за отсутствующего runtime package.

## Source evidence

На production exact SHA `3c06387ea5f4c6617b67a8081922fe52be22f381`
`/` и `/api/status` возвращают 200, но `/api/state` — 500 при попытке загрузить
EngeeDSP. Active `Project.toml` объявляет только Genie/Test,
`Base.find_package("EngeeDSP") == nothing`, пакет отсутствует в доступных
production environments/depots. Повторный `Pkg.instantiate()` не может
установить dependency, которой нет в project contract.

## Scope

Установить production identity/version/source публичного EngeeDSP через Engee
User evidence. Затем Backender должен восстановить минимальный authoritative
Julia dependency contract в owned `Project.toml` и воспроизводимый generated
`Manifest.toml` без изменения API/math semantics. Не изобретать UUID, version,
dependency graph или fallback.

## Out of scope

Замена EngeeDSP собственной математикой, devhub/fallback, изменение frontend,
merge feature branch и unrelated dependency upgrades.

## Acceptance criteria

- [ ] Production evidence фиксирует точные EngeeDSP UUID/version/source и
  подтверждает публичные `Functions.pspectrum`/`findpeaks` entrypoints.
- [ ] Backender-owned project dependency contract воспроизводимо разрешает
  EngeeDSP без silent fallback.
- [ ] Focused backend/API regression и Engee contract checks проходят.
- [ ] DevOps разворачивает exact revision и `/api/state` возвращает не 500.
- [ ] Post-task E2E получает exact production URL/SHA отдельным handoff.

## Queue decision

- Priority: P0.
- Rationale: полностью блокирует authoritative application state и visual E2E.
- Queue order: 36; P0 исполняется немедленно независимо от P1 order.
- Model/reasoning: `gpt-5.6-sol` / `xhigh` из-за production package identity и
  dependency-resolution boundary.
- Eligibility: Engee User research HND-0075 запущен; Backender следует после
  подтверждённого package identity/source.

## Stage matrix

| Stage | Decision | Reason |
|---|---|---|
| Engee analysis/contracts | required_first | Нельзя угадывать identity/source proprietary package. |
| Backend implementation | required_after_engee | Project.toml принадлежит Backender. |
| Backend tests | required_after_backend | Нужны bootstrap/API regressions. |
| Frontend/tests | not_applicable | UI и frontend contract не меняются. |
| Deploy | required_after_tests | Dependency должна быть разрешена в production. |
| E2E | required_after_deploy | Отдельный post-task quick regression на exact revision. |

## Verification and results

Engee package identity/source research выдан Engee User как HND-0075.

По запросу пользователя цикл остановлен до backend implementation. Partial
report HND-0076 подтвердил production identity: UUID
`f9bbbd0e-0dd6-4072-898a-88f8f1250a99`, version/compat `0.74.0`, revision
`master`, tree SHA `9b155bb681eab1b19016ad7eeb1d5062d60f37e3`, source
`https://gitlab.kpm-ritm.ru/engee/backend/kernels/engeelibraries/EngeeDSP.jl.git`.
Clean child environment импортирует пакет после добавления exact UUID; public
`pspectrum`/`findpeaks` application-shaped probes PASS. До продолжения остаются
полный persistent Engee contract run, cleanup возможного temporary pod path и
Backender-owned Project.toml implementation. Local product/test files Engee
User не менял.

После явного разрешения пользователя продолжить прежняя Engee research lane
возобновлена HND-0077 только для завершения persistent contract verdict и
контролируемого cleanup собственных temporary artifacts.

Новый private GitHub origin локально настроен на тот же repository; точная
production checkout identity/access verification выдана DevOps отдельным
bootstrap request HND-0078 без передачи PAT в handoff.

Final Engee User report HND-0079: strict production contract suite PASS
313/313 (target lock 6/6, findpeaks matrix 16/16, pspectrum contracts 291/291),
remote test hashes совпали с local; exact lane temporary artifacts удалены,
остаток `hnd0075_task0038_*` пуст. Verified Project contract передан Backender
как HND-0080; persistent tests и product files Engee User не менял.

DevOps report HND-0081: existing `/user/apps/signal_analyser` безопасно
переиспользован; normalized private origin, requested feature branch и exact
local/remote production SHA `3c06387ea5f4c6617b67a8081922fe52be22f381`
совпадают. Private HTTPS access подтверждён ephemeral askpass, credentials не
сохранены; checkout clean, restart и Git mutation не выполнялись.

Backender report HND-0082: exact EngeeDSP deps/compat/source contract добавлен
только в `Project.toml`; TOML/Pkg project parsing PASS, Genie/bootstrap suite
ожидаемо blocked, потому что tracked Manifest ещё не содержит direct dep.
Role matrix не назначала владельца `Manifest.toml`; strict ownership исправлен
в source-of-truth: generated Manifest включён в тот же Backender dependency
contract, DevOps prohibition сохранён. После адаптации exact Pkg resolution и
повторные проверки выданы Backender как HND-0083.

Backender local Pkg.resolve по HND-0083 не завершился в bounded window и не
изменил Manifest; process остановлен без retry/ручной правки. Это environment
blocker для production-system GitLab source, а не evidence неверного contract.
HND-0085 production isolated resolver не вернул artifact/status в bounded
window и agent остановлен без local evidence files или application mutation.
Следующий package-resolution step требует явного решения пользователя: текущий
DevOps contract запрещает `Manifest.toml`, а local Backender resolver не имеет
доступа к production-system source. Ручная правка Manifest запрещена.

Пользователь явно отказался от dependency-file approach. `Project.toml`
проверен в исходном виде с entries Genie/Test, `Manifest.toml` не изменялся.
TASK-0038 возвращена в backlog как deferred finding и больше не блокирует
независимую разработку; повторно использовать эти файлы без нового явного
запроса запрещено.
