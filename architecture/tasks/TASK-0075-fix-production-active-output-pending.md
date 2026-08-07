---
id: TASK-0075
kind: task
title: Исправить бесконечный pending активного графика в production
status: done
priority: P0
queue_order: 1
model: gpt-5.6-sol
reasoning: xhigh
owner: orchestrator
assignees: [backender]
parent: TASK-0055
depends_on: []
blocks: [TASK-0074, TASK-0060]
source_handoffs: [HND-0354]
related_handoffs: [HND-0355, HND-0361, HND-0362, HND-0363]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_refinement
ui_impact: covered
design_mode: review
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: 2
---

# Production active output pending

## Scope

Диагностировать и исправить production behavior, при котором
`GET /api/outputs/active` не переходит из lightweight pending в ready и frontend
остаётся на «Обновление графика…» более 10 секунд. Сохранить active-only CPU/
network architecture, cache/revision guards и Plotly payload preparation.

Design prototype использует демонстрационный layout 1×2, но это не является
основанием менять authoritative default layout: пользователь требует один
screen по умолчанию, а число panes остаётся backend/session contract. В этой
задаче запрещено искусственно добавлять второй pane ради сходства mock-прототипа.

## Acceptance criteria

- [x] Первый active-output request возвращает lightweight pending либо ready;
  последующие bounded polls достигают ready с ordered Plotly records.
- [x] Background task действительно выполняется в production-compatible Julia
  scheduling/runtime, публикует только актуальную revision/context key и не
  зависает без terminal error.
- [x] Inactive panes не создают eager calculation/graph traffic.
- [x] Existing rollback/cache/session semantics and full backend corpus pass.
- [x] API contract не требует frontend static/raster fallback.

## Queue decision

- P0: без ready output основной пользовательский workflow и visual review
  блокированы.
- Queue order 1: выполняется параллельно frontend static/behavior test coverage.

## Completion evidence

- Production reached `ready` with a valid ordered Plotly payload in HND-0369.
- Current focused lifecycle coverage passes 81/81 and the dependency-independent
  backend corpus exits successfully at SHA
  `76cb9c6a360ed6d852203f9be0ed7a1a4003e156`.
- Final production E2E HND-0399 confirms a live non-static Plotly instance and
  no raster fallback.
