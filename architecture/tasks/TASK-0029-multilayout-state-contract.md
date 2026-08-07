---
id: TASK-0029
kind: task
title: Реализовать authoritative multi-layout state и session contract
status: done
priority: P1
queue_order: 27
model: gpt-5.6-sol
reasoning: high
owner: orchestrator
assignees: [backender]
parent: TASK-0014
depends_on: []
blocks: [TASK-0030]
source_handoffs: []
related_handoffs: [HND-0025, HND-0030, HND-0040, HND-0095, HND-0096, HND-0098]
blocked_by: []
blocker_reason: null
---

# Multi-layout state и session contract

## User value

Каждый Display поддерживает устойчивую сетку до `4 × 4`, а каждый plot pane
сохраняет собственный тип и набор сигналов при reload/session export/import.

## Source evidence

- `/Users/makar/Desktop/Снимок экрана 2026-08-04 в 00.03.09.png`.
- Прямые требования пользователя от 2026-08-04.

## Scope

В backend authoritative state определить versioned layout model: rows/columns
`1..4`, выбранный layout variant, стабильные ordered pane IDs, active pane,
per-pane plot type и ordered signal bindings. Добавить/расширить API mutations,
validation, revision/conflict semantics и session export/import/migration так,
чтобы старый single-pane state безопасно открывался как `1 × 1`.

## Out of scope

HTML/CSS, layout popover rendering, drag UI, tests и deployment.

## Acceptance criteria

- [ ] Layout не принимает dimensions вне `1..4`, duplicate pane IDs,
  неизвестные plot types/signals или число panes вне выбранной topology.
- [ ] Per-pane type/bindings независимы; active pane имеет валидный fallback
  после изменения layout и удаления signal/display.
- [ ] Layout change имеет детерминированные preserve/drop rules и не теряет
  surviving pane configuration.
- [ ] API поддерживает atomic revision-aware update и стабильные errors.
- [ ] Session round-trip сохраняет layout/panes/bindings; старый document
  мигрирует в `1 × 1` без потери прежнего plot state.
- [ ] Contract/report передан Frontend и Tester; backend suite проходит.

## Queue decision

- Priority: P1.
- Rationale: authoritative contract нужен до frontend multi-layout и защищает
  session persistence от несовместимого локального состояния.
- Queue order: 27.
- Eligibility: готова к параллельной работе с TASK-0027.

## Verification and results

Backender final report `HND-0095` подтвердил, что authoritative multi-layout
contract уже полностью присутствует в текущем backend: typed version-1 layout
и panes, strict revision-aware `GET/POST /api/layouts`, atomic validation and
rollback, deterministic prefix-preserve/suffix-drop resize, active-pane
fallback и version-1 session round-trip/legacy `1 × 1` migration.

Backender focused regression прошёл `64/64`; Orchestrator независимо выполнил
`julia --startup-file=no test/back/runtests.jl`, все backend testsets прошли с
exit code 0. Команды не использовали `--project=.`; `Project.toml` и
`Manifest.toml` не читались и не изменялись. Новые product changes для
закрытия task не потребовались. Отдельный post-task quick regression выдан E2E
как `HND-0096` на production SHA из `HND-0092`.

E2E report `HND-0098`: exact target перешёл в platform maintenance HTTP 404
между routing smoke и layout checks; availability обязательна, поэтому
`0/8`, семь checks not-run, layout state не менялся. Terminal TASK-0029 не
переоткрыта; восстановление runtime выделено в TASK-0041/HND-0099.
