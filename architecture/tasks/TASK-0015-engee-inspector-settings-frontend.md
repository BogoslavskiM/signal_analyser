---
id: TASK-0015
kind: task
title: Доработать frontend Inspector, settings и Engee-паттерны
status: done
priority: P1
queue_order: 14
model: gpt-5.6-terra
reasoning: medium
owner: orchestrator
assignees: [frontend]
parent: TASK-0014
depends_on: []
blocks: []
source_handoffs: [HND-0001]
related_handoffs: []
blocked_by: []
blocker_reason: null
---

# Доработать frontend Inspector, settings и Engee-паттерны

## Scope

В `public/**` реализовать согласованный с TASK-0014 frontend без
мультилейаута: явная типизация одиночного активного графика, единообразные
plot header/type/overflow controls, недостающая колонка Info с доступной
hover/focus карточкой, hover/focus row actions справа, управление нижней
многостраничной зоной и её toolbar, а также визуальная и accessibility
доработка существующих диалогов и controls в утверждённом Engee-стиле.

Полно и корректно отобразить уже доступные type-specific settings из
существующего backend settings catalog; не изобретать отсутствующие API или
backend-поля. Открыть технический request Backender, если обнаружится
необходимый frontend-blocking contract gap.

## Out of scope

- Мультилейаут графиков и одновременная сетка panes.
- Session import/export UI до готового backend API TASK-0016.
- Изменения `app/**`, `lib/**`, `test/**`, `architecture/**`.

## Acceptance criteria

- [ ] Инспектор имеет Info column, доступную всплывающую карточку и row
  actions на hover/focus без потери keyboard navigation.
- [ ] Все добавленные действия имеют label, `title`/подсказку где нужна,
  stable `data-testid`, focus/hover/disabled/busy/error state.
- [ ] Нижняя зона корректно представляет Signals, Measurements и Peaks,
  включая доступные toolbar actions и состояние вкладок.
- [ ] Settings используют server-owned catalog и читаемо разделяют signal,
  display и plot-type settings в пределах существующего контракта.
- [ ] График сохраняет явный видимый type identity для Time, Spectrum,
  Spectrogram и Persistence.
- [ ] Стили соответствуют существующей Engee visual system и не копируют CSS
  с изображений; разрешено переиспользовать существующие локальные иконки.
- [ ] Frontend report отправлен Tester и Orchestrator.

## Queue decision

- Priority: P1.
- Rationale: основной пользовательский экран требует доведения прежде E2E.
- Queue order: 14.
- Eligibility: независима от TASK-0016, если не добавлять session UI.

## Verification and results

Frontend implementation принята; после P0 TASK-0019 полный frontend
regression прошёл в TASK-0018.
