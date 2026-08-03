---
id: TASK-0028
kind: task
title: Запускать MATLAB research в фоне и проверять полноту критических сценариев
status: in_progress
priority: P1
queue_order: 25
model: gpt-5.6-sol
reasoning: high
owner: orchestrator
assignees: [orchestrator]
parent: TASK-0014
depends_on: []
blocks: []
source_handoffs: []
related_handoffs: [HND-0023]
blocked_by: []
blocker_reason: null
---

# Фоновое MATLAB research и полнота критических сценариев

## User value

Разработка Signal Analyzer сразу получает проверенные reference scenarios из
MATLAB, а заявление о полном покрытии критических путей имеет воспроизводимое
evidence и не зависит от субъективной оценки Researcher.

## Source evidence

- Пользовательский запрос от 2026-08-03.
- Сохранённый каталог MATLAB Clicker:
  `/Users/makar/work/matlab_clicker/research_output/signal-analyzer-reference-scenarios/scenarios/`.

## Scope

Добавить обязательный неблокирующий research lane в workflow Orchestrator и
skill MATLAB Researcher для чтения сохранённого clicker-каталога, построения
матрицы критических сценариев, маршрутизации сценариев владельцам тестов и
доказуемого coverage verdict.

## Out of scope

Изменение product/test code, перенос clicker-сценариев в этот репозиторий,
управление MATLAB несколькими Researcher одновременно и deployment.

## Acceptance criteria

- [ ] Orchestrator сразу запускает один фоновый MATLAB research handoff для
  каждого нового MATLAB-derived product scope и не блокирует им разработку.
- [ ] Уже работающий research lane переиспользуется; параллельные владельцы
  MATLAB GUI запрещены.
- [ ] Researcher читает сохранённые scenarios из clicker API либо из
  канонического clicker-каталога с явной provenance/freshness.
- [ ] Новый skill задаёт coverage matrix и однозначные условия для
  `all_critical_scenarios_covered: true`.
- [ ] Неизвестный, устаревший, противоречивый или неотслеживаемый critical
  scenario запрещает положительный verdict и возвращается как gap/blocker.
- [ ] Critical UI workflows маршрутизируются E2E, mathematical/compatibility
  workflows — Engee User, смешанные — обоим; результат также получает
  Orchestrator.
- [ ] Source manifests, generated adapters и skill validators проходят.

## Decomposition

| ID | Role | Deliverable | Depends on | Status |
|---|---|---|---|---|
| TASK-0028-A | Orchestrator | Background dispatch и lifecycle contract | — | in_progress |
| TASK-0028-B | MATLAB Researcher | Saved-catalog coverage skill и verdict schema | — | in_progress |
| TASK-0028-C | MATLAB Researcher | Первый фоновый inventory текущего Signal Analyzer scope | TASK-0028-B | in_progress |

## Queue decision

- Priority: P1.
- Rationale: правило должно действовать до следующих циклов product
  development и влияет на полноту создаваемых тестовых сценариев.
- Queue order: 25.
- Eligibility: Orchestrator меняет только собственную architecture ownership;
  background research выполняется независимо от этих правок.

## Verification and results

Ожидаются validation skill/role manifests, regeneration adapters и report
первого background inventory.

## Risks, blockers and follow-ups

- Clicker runtime может быть недоступен; это не блокирует разработку, но
  запрещает свежий положительный coverage verdict без проверяемого snapshot.
