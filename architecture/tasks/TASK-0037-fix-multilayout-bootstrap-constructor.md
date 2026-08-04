---
id: TASK-0037
kind: task
title: Исправить multi-layout constructor mismatch, блокирующий Genie bootstrap
status: in_progress
priority: P0
queue_order: 35
model: gpt-5.6-sol
reasoning: xhigh
owner: orchestrator
assignees: [backender]
parent: TASK-0029
depends_on: []
blocks: [TASK-0036]
source_handoffs: [HND-0063]
related_handoffs: [HND-0064, HND-0065, HND-0066, HND-0067, HND-0068, HND-0069, HND-0070, HND-0071, HND-0072]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_patterns
---

# Исправить multi-layout constructor mismatch, блокирующий Genie bootstrap

## User value

Production Signal Analyzer запускается и регистрирует UI/API routes на текущем
authoritative multi-layout state contract.

## Source evidence

На exact SHA `d170f87` `Genie.loadapp()` падает в
`signal_display_default_layout` с `MethodError`: устаревший вызов
`SignalDisplayPaneState(String, SignalAnalyserPlot, Vector{String})` не
соответствует полному constructor contract. Genie server остаётся без routes;
`/` и `/api/status` возвращают 404.

## Scope

В backend ownership устранить несовместимость construction/default state после
multi-layout refactor. Сохранить authoritative 1x1 default layout, pane
identity, membership, analysis/time limits, measurements/type-specific/stored
settings и active-pane semantics.

## Out of scope

Frontend, test-owned files, Engee math/functions, API redesign, deployment и
изменение multi-layout UX.

## Acceptance criteria

- [ ] `default_signal_analyser_state()` создаётся без MethodError.
- [ ] `Genie.loadapp()` регистрирует `/`, `/api/status` и `/api/state` routes.
- [ ] Default single pane соответствует полному current constructor contract и
  не теряет существующие settings/bindings.
- [ ] Backend suite и focused bootstrap probe проходят.
- [ ] Backender возвращает exact constructor/default-state decision и FYI Tester.

## Queue decision

- Priority: P0.
- Rationale: runtime bootstrap полностью блокирует production и E2E текущей feature.
- Queue order: 35; P0 имеет приоритет над всеми P1 независимо от order.
- Model/reasoning: `gpt-5.6-sol` / `xhigh` из-за конфликтующего state contract и
  production blocker.
- Eligibility: немедленно; fix явно включён как blocker текущей feature branch.

## Stage matrix

| Stage | Decision | Reason |
|---|---|---|
| Engee analysis/contracts | not_applicable | Ошибка чисто в Julia domain construction. |
| Backend implementation | required | Исправляется authoritative default state contract. |
| Backend tests | required_after_backend | Нужны constructor/bootstrap regression tests. |
| Frontend/tests | not_applicable | UI contract не меняется. |
| Deploy | required_after_tests | Production runtime должен получить fix. |
| E2E | resumes_TASK-0036 | Visual E2E продолжится после runnable exact revision. |

## Verification and results

Backender report HND-0065:

- legacy 3-argument overload не восстановлен; все call sites используют полный
  11-field typed pane state;
- default/bootstrap, update_pane preserve/rebind и explicit 1x2 session
  round-trip focused probes PASS;
- полный backend suite PASS, exit 0;
- exact legacy calls и stale `pane.signal_bindings` — 0 matches;
- API wire schema не изменена, Engee analysis not_applicable.

Независимое unit/API regression выдано Tester как HND-0066.

Tester report HND-0067: task-specific 51/51 и wider focused 284 assertions
PASS; syntax PASS. Два full-suite запуска не вернули terminal exit в command
window (последний progress 208 passed), detected failures отсутствуют. Full
backend suite exit 0 подтверждён Backender на final product diff. Deploy exact
fix revision выдан DevOps как HND-0068.

DevOps report HND-0069: deploy остановлен до staging из-за 26 untracked test
coverage `*.cov` artifacts. Они точно перечислены, удалены как воспроизводимые
generated files; retry того же deploy отправлен HND-0070.

DevOps report HND-0071: fix опубликован и production checkout обновлён до exact
SHA `7d1329e2f930ee8348439afd4a0c406fde88e2ef`; replacement PID 2073 запущен с
`GENIE_HOST=0.0.0.0` и `GENIE_PORT=8080`, но в первом bounded window HTTP ещё
возвращал 000 при пустом startup log. Продолжение readiness живого процесса
без преждевременного replacement отправлено HND-0072.
