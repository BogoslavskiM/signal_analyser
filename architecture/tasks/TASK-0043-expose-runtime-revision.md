---
id: TASK-0043
kind: task
title: Раскрывать immutable runtime revision для browser E2E
status: done
priority: P2
queue_order: 60
model: gpt-5.6-sol
reasoning: xhigh
owner: orchestrator
assignees: [backender, devops]
parent: null
depends_on: []
blocks: []
source_handoffs: [HND-0097]
related_handoffs: [HND-0198, HND-0199, HND-0200, HND-0201, HND-0202, HND-0203, HND-0204, HND-0205, HND-0206, HND-0207, HND-0208, HND-0209, HND-0210, HND-0211, HND-0212, HND-0213, HND-0214, HND-0215, HND-0216, HND-0217, HND-0218, HND-0219, HND-0220]
blocked_by: []
blocker_reason: null
ui_impact: none
---

# Runtime revision observability

## Candidate

Добавить immutable revision в `/api/status` или response header, чтобы E2E мог
не зависеть только от DevOps attestation exact SHA.

## Scope

Определить fail-closed источник exact 40-hex Git SHA на bootstrap, зафиксировать
его неизменным на время жизни процесса и раскрыть отдельным полем `/api/status`.
Покрыть unit/API и production E2E contract. Не менять mutable `state_revision` и
не затрагивать dependency files.

## Acceptance criteria

- [x] Поле runtime revision однозначно отделено от mutable state revision.
- [x] Значение — exact lowercase 40-hex SHA, immutable для process lifetime.
- [x] Invalid/missing source не может молча аттестовать неверную ревизию.
- [x] Backend regression и production exact-SHA E2E проходят.
- [x] Deployment lifecycle не хранит credentials и не использует fallback/devhub.

## Queue decision

P2 observability improvement; требует отдельной backlogging-декомпозиции между
Backender и DevOps и не прерывает текущие P0/P1 tasks.

## Verification and results

Contract diagnosis issued to Backender as `HND-0198`; production source diagnosis
issued to DevOps as `HND-0199`.

Backender report `HND-0200`: expose `runtime_revision` as exact lowercase 40-hex
SHA, loaded once from `SIGNAL_ANALYSER_RUNTIME_REVISION`; malformed or missing
input fails startup, no fallback is allowed, and `/api/status` must be `no-store`.

DevOps report `HND-0201`: inject the independently verified exact checkout SHA
at deployment-time; runtime Git and committed metadata are forbidden fallbacks.
Managed deployment remains gated on guaranteed environment injection. Product
implementation issued as `HND-0202`; independent tests as `HND-0203`.

Backender report `HND-0204`: four-path strict implementation complete with no
fallback. Tester report `HND-0205`: focused 29/29 and full backend 2475/2475
pass at 91.17% coverage; Orchestrator independently repeated full 2475/2475.
Fail-closed deployment issued as `HND-0206`.

DevOps recovery report `HND-0207`: five paths committed/pushed as
`4a30206c7d2770eae7d44a7692b543558a6318df`, but managed launch failed before
exact env injection could be attested. Production was restored healthy at
`a2320652445725678629ad24b325211d3100e275`. Isolated spare-port diagnosis issued
as `HND-0208`; TASK-0043 remains in progress and no fallback is accepted.

Initial HND-0208 intake was rejected without mutation because `diagnose` is not
a valid DevOps request enum. The handoff was corrected to `deploy`; isolated
scope and healthy production preservation are unchanged.

Preflight report `HND-0209`: managed process environment does not contain the
revision variable; production stayed healthy and all disposable artifacts were
removed. The env source is superseded by a fail-closed exact checkout HEAD plus
scoped runtime-surface cleanliness contract in `HND-0210`; replacement tests are
issued as `HND-0211`. No dependency path may be inspected or checked.

Backender report `HND-0212`: exact HEAD plus scoped-clean fail-closed source is
ready with no fallback. Tester report `HND-0213`: focused 43/43 and full backend
2489/2489 pass; Orchestrator independently repeated full 2489/2489. Normal
managed deployment issued as `HND-0214`.

HND-0214 published `38d4134ea962b264ebabe0e7e9814c48368a975c` and proved
the target scoped-clean, but its managed start was externally interrupted before
the 300-second call completed; production was rolled back healthy to `a232065`.
An uninterrupted final start retry is issued as `HND-0215`.

DevOps report `HND-0216`: target runtime itself passed exact SHA and all health
checks; only Engee proxy normalization from application `no-store` to external
`no-cache` triggered rollback. Since `no-cache` requires revalidation, external
acceptance now adds two unique nonce requests with exact SHA while retaining the
application no-store source/test contract. Final target deployment is `HND-0217`.

DevOps report `HND-0218`: exact target
`38d4134ea962b264ebabe0e7e9814c48368a975c` is RUNNING and directly attested by
two nonce requests; all health gates pass. Mandatory final browser E2E is issued
as `HND-0219`.

E2E report `HND-0220`: exact production target passed 21/21. Three fresh
browser-visible status responses exposed the exact immutable SHA, external
no-cache had no Age, mutable state/hash remained unchanged, and all root/DOM/
asset health checks passed with zero product mutations. TASK-0043 is complete.
