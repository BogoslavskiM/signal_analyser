---
id: TASK-0030
kind: task
title: Реализовать multi-layout UI до 4 × 4 и per-pane signal bindings
status: queued
priority: P1
queue_order: 28
model: gpt-5.6-terra
reasoning: high
owner: orchestrator
assignees: [frontend]
parent: TASK-0014
depends_on: [TASK-0027, TASK-0029]
blocks: [TASK-0031]
source_handoffs: []
related_handoffs: [HND-0025, HND-0039]
blocked_by: []
blocker_reason: null
---

# Multi-layout UI и независимые plot panes

## User value

Пользователь строит до 16 графиков в одном Display, выбирает topology через
понятный popover и независимо назначает каждому pane тип и сигналы.

## Source evidence

- `/Users/makar/Desktop/Снимок экрана 2026-08-04 в 00.03.09.png`.
- Структурные references TASK-0014; styling остаётся утверждённым Engee.

## Scope

Сохранить layout button и реализовать anchored modal popover с rows/columns
`1..4`, доступными topology variants, preview/selected state и Cancel/Apply.
Отрисовать responsive grid; каждый pane имеет stable identity, active border,
собственный существующий plot-type dropdown и собственные signal bindings.
Checkboxes таблицы читают/меняют bindings активного pane. Display tabs должны
сохранять scroll/reorder behavior TASK-0027 при multi-layout.

## Out of scope

Сетка больше `4 × 4`, копирование CSS screenshot, новый plot engine, backend и
deployment.

## Acceptance criteria

- [ ] Popover повторяет информационную архитектуру reference, имеет focus
  trap/Escape/Cancel/Apply, validation и не применяет draft до Apply.
- [ ] Rows/columns и variants никогда не создают больше 16 panes; selection
  визуально и семантически доступен.
- [ ] Active pane явно выделен; смена active pane синхронизирует table
  checkboxes без влияния на bindings других panes.
- [ ] Каждый pane сохраняет собственный type dropdown и корректно отрисовывает
  Time/Spectrum/Spectrogram/Persistence через существующий renderer.
- [ ] Loading/error/conflict/empty states не ломают grid и дают recovery.
- [ ] Layout работает вместе с tab overflow/reorder и session reload.
- [ ] Stable selectors/dynamic-state inventory переданы Tester/E2E; frontend
  suite проходит.

## Queue decision

- Priority: P1.
- Rationale: основной новый пользовательский workflow из явного запроса.
- Queue order: 28.
- Eligibility: после готовых TASK-0027 и TASK-0029, чтобы два Frontend writer
  не пересекались и UI опирался на authoritative contract.

## Verification and results

Ожидается Frontend report, затем TASK-0031 и new-functionality E2E.
