---
id: TASK-0060
kind: task
title: Устранить frontend stalls архитектурным решением
status: in_progress
priority: P0
queue_order: null
model: gpt-5.6-terra
reasoning: high
owner: orchestrator
assignees: [frontend]
parent: TASK-0055
depends_on: [TASK-0059, TASK-0065]
blocks: [TASK-0061]
source_handoffs: [HND-0222]
related_handoffs: [HND-0310, HND-0320, HND-0322, HND-0323, HND-0324, HND-0325, HND-0326, HND-0329, HND-0330, HND-0333, HND-0334, HND-0335, HND-0336, HND-0339, HND-0343, HND-0344, HND-0346, HND-0347, HND-0349, HND-0350, HND-0351, HND-0400, HND-0401, HND-0402, HND-0403, HND-0404, HND-0405, HND-0406, HND-0407, HND-0408, HND-0409]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_refinement
ui_impact: covered
design_mode: autonomous
design_ref: ../design/TASK-0057-ui-overlay-refinement/DESIGN.md
design_version: 2
---

# Frontend performance architecture remediation

## Scope

По trace evidence TASK-0059 и API contract TASK-0065 устранить frontend stall
architecture. Использовать `/api/state-lite`, active-output-only loading,
150 ms settings debounce, 350 ms noncritical UI-state debounce, stale
`state_revision` rejection, local lazy Plotly, latest-only rAF queue,
`Plotly.react` и coalesced ResizeObserver; semantic actions остаются immediate.
Сохранить behavior и pinned design; установить measurable budgets. Modebar и
видимые graph-tool controls полностью скрыты по более позднему прямому ТЗ, но
каждый rendered graph остаётся живым интерактивным Plotly DOM instance с
Shift+ЛКМ pan, LMB selection zoom и double-click autoscale. При layout до
10×10 не выполнять eager Plotly render невидимых/inactive outputs.
Прямое уточнение пользователя от 2026-08-05 закрепляет этот пункт как
блокирующий: design mock и production runtime не могут заменять график
картинкой, raster snapshot, staticPlot или неинтерактивным placeholder.

## Acceptance criteria

- [x] Root cause исправлен на соответствующем архитектурном уровне.
- [ ] P95 interaction budget выполняется в исходном deterministic scenario.
- [x] Нет stale state, race, lost update или visual regression.
- [x] Решение не маскирует проблему debounce/delay без устранения причины.
- [x] Inactive outputs не загружаются и не рендерятся; browser не выполняет DSP.
- [x] Runtime assets локальны; CDN и local application start отсутствуют.
- [x] Lazy/latest-only rendering использует `Plotly.react`, сохраняет живые
  zoom/pan/autoscale events и не заменяет graph raster/static fallback; modebar,
  graph-tool buttons и пустой container под них отсутствуют.

## Queue decision

- Priority: P0, блокирует приемлемую пользовательскую работу.
- Queue order: null; зависит от evidence TASK-0059 и обновлённых skills.
- Eligibility: TASK-0059 done, design pin available, feature branch recorded.

## 2026-08-06 checkpoint

- Exact 150 ms coalescing, stale-context rejection and the pending blur race are
  covered by 12/12 passing frontend files.
- Production serves exact SHA `bba7f2528abccf14dcdd313681c8fd8bf538d40c`;
  root and `/api/status` return 200 with `ready=true`, `ok=true`.
- Two-viewport smoke confirms the full-page shell with no page exception or
  HTTP 500. Its production state exposed no active graph; live Plotly remains
  covered by the earlier final-revision lineage and deterministic contracts,
  not by HND-0407 itself. One unidentified non-500 resource 404 remains.
- The only unproved acceptance item is the original production P95 interaction
  matrix: the bounded final smoke exposed no enabled visible numeric input for
  a reversible sample, so the task remains `in_progress` as an evidence gap,
  not as a demonstrated product defect.
