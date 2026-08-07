---
id: TASK-0072
kind: task
title: Гарантировать canonical layout/signal selection projection
status: done
priority: P0
queue_order: 1
model: gpt-5.6-sol
reasoning: xhigh
owner: orchestrator
assignees: [backender, tester]
parent: TASK-0055
depends_on: []
blocks: [TASK-0059]
source_handoffs: [HND-0279, HND-0280]
related_handoffs: [HND-0288, HND-0289, HND-0290]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_refinement
ui_impact: covered
---

# Canonical layout selection projection

## Scope

Исправить backend pipeline, в котором ordered pane bindings могли напрямую
попасть в `Display.visible_signals` в порядке, отличном от authoritative signal
inventory. Сохранить произвольный binding/trace order внутри pane, но публиковать
Display/root selection projection только в canonical inventory order. Перед
успешным layout envelope валидировать известность/уникальность сигналов,
selected/analysis membership, active pane/display, plot type и root projection.
Session import должен сохранять pane order, но отклонять неканонический Display
projection атомарно. Active-only outputs и отсутствие eager inactive DSP
сохранить.

## Acceptance criteria

- [ ] Reverse-ordered pane bindings сохраняют pane/trace order и canonicalize Display/root projection.
- [ ] Успешный GET/POST layout envelope не содержит invalid selected/bound references.
- [ ] Same-layout repair меняет revision только при реальном projection change.
- [ ] Session import отклоняет noncanonical Display projection без state/cache mutation.
- [ ] Active-only output behavior не изменён.
- [ ] Focused и full backend suite проходят независимо без dependency files.

## Queue decision

- Priority: P0, блокирует functionally-ready production profiler.
- Eligibility: reproduced by HND-0279 and current-source fix available for test.
