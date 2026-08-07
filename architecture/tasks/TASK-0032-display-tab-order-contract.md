---
id: TASK-0032
kind: task
title: Добавить authoritative порядок Display tabs для persistent reorder
status: done
priority: P1
queue_order: 30
model: gpt-5.6-terra
reasoning: high
owner: orchestrator
assignees: [backender]
parent: TASK-0014
depends_on: [TASK-0029]
blocks: [TASK-0027]
source_handoffs: [HND-0029]
related_handoffs: [HND-0033, HND-0104, HND-0105, HND-0108, HND-0110, HND-0122]
blocked_by: []
blocker_reason: null
---

# Persistent Display tab reorder contract

## User value

Перетаскивание переполненных Display-вкладок сохраняет визуальный и session
порядок после authoritative re-render, а не работает только до следующего API
ответа.

## Scope

Добавить revision-aware authoritative mutation порядка существующих Display IDs,
валидацию exact permutation, deterministic active-display preservation и
session export/import. Выдать Frontend стабильный request/response/error
contract.

## Out of scope

Drag UI, CSS/keyboard interaction, создание/удаление Display semantics,
multi-layout panes и deployment.

## Acceptance criteria

- [x] API принимает только полный exact permutation существующих Display IDs и
  возвращает 422 для duplicate/missing/unknown ID.
- [x] Stale revision возвращает 409 без частичного reorder.
- [x] Active Display сохраняется по ID; session round-trip сохраняет order.
- [x] Existing create/select/close behavior и backend suite проходят.

## Queue decision

- Priority: P1.
- Rationale: обязательная часть пользовательского tab drag-reorder и единственная
  выявленная contract dependency TASK-0027.
- Queue order: 30.
- Eligibility: выдаётся тому же Backender после TASK-0029, чтобы не смешивать
  два revisioned aggregate changes.

## Dispatch

После завершения TASK-0029 существующий handoff `HND-0033` возобновлён у того
же Backender 2026-08-04. `Project.toml` и `Manifest.toml` исключены из работы
по прямому ограничению пользователя.

## Verification and results

Backender report `HND-0104`: existing `POST /api/displays` расширен строгой
revision-aware operation `reorder` с exact request union и полной permutation
validation. Active Display сохраняется по ID, no-op не увеличивает revision,
422/409 не публикуют partial state, а ordered session array уже обеспечивает
round-trip без schema change. Изменён только
`lib/services/signal_analyser_service.jl`; focused probe PASS, Backender и
Orchestrator независимо выполнили полный backend suite — все testsets PASS.
Dependency files не использовались. Exact product path передан DevOps как
`HND-0105`; task остаётся in_progress до runtime report и post-task E2E.

DevOps report `HND-0108`: единственный backend path committed/pushed/deployed
на exact SHA `bbe0c53e28520feb1799c5dc1bc71db7e865fee3`; local/private/production
SHA совпадают, runtime `RUNNING`, root и status HTTP 200. Unrelated и
dependency files untouched. Task закрыта; отдельный post-task quick regression
выдан как `HND-0110`.

E2E report `HND-0122`: 13/13 API checks PASS на exact deployed revision;
подтверждены exact permutation, active-ID/session preservation, no-op revision,
422 validation, stale 409 rollback и полное восстановление baseline state.
