---
name: backlogging
---
# Backlogging

Backlogging is the Orchestrator activity that prepares the unified task
registry for the next development cycle.

## Cycle

1. Receive a candidate from an existing task record or a reviewed handoff.
2. Remove duplicates and preserve the source handoff/task ID.
3. Define user value, scope, exclusions and evidence; group related candidates
   under `kind: group` when they share an outcome or foundation.
4. Classify whether the group is a major feature accepted as one result. If it
   is, assign a stable `feature_slug`; before its first repository-changing
   task request `new_feature_branch` from DevOps and persist the returned
   `development_branch`.
5. Split a chosen idea/group into role-owned `kind: task` records. Child tasks
   inherit the group's feature branch; do not create per-task branches.
6. Add assignees, acceptance criteria, dependencies, priority, exact
   deliverables, `model` and `reasoning` according to `architecture/tasks/README.md`.
7. Set `queued` only for an unblocked task whose dependencies are `done`; a
   repository-changing child of a major feature also requires its
   `development_branch`.
8. Assign queue_order and record the priority rationale and linked handoff.
9. Select the next eligible task by P0 → P3, then queue_order.

## Dynamic reprioritization

Запускай этот цикл после human report, сформированного по review report handoff,
а также в фоне, пока независимые агенты выполняют текущие handoff. Любой
найденный bug становится новым или обновлённым task candidate. P0 назначается для data loss, security,
регрессии критичного user workflow или blocker принятой feature; он получает
первый доступный queue_order. Остальные findings получают P1–P3 по таблице
priority в `architecture/tasks/README.md`.

## Status rules

`backlog`, `queued`, `in_progress` and `done` are the only lifecycle statuses.
`done` is terminal; there is no `is_done` flag.

Blocked work keeps its current status plus `blocked_by` and `blocker_reason`.
Orchestrator may select the next independent queued item. A declined idea
remains in `backlog` with its rationale; it is not deleted.

## Output

Every backlogging pass leaves a priority rationale, dependencies, acceptance
criteria, `model`, `reasoning` and either a next queued task or an explicit
`no-eligible-task` reason.
