---
id: TASK-0077
kind: group
title: Актуализировать skill-stack и перевести математику на явный Apply
status: in_progress
priority: P0
queue_order: null
model: null
reasoning: null
owner: orchestrator
assignees: []
parent: TASK-0055
depends_on: []
blocks: []
source_handoffs: []
related_handoffs: [HND-0412, HND-0413, HND-0414, HND-0415, HND-0416, HND-0417, HND-0418, HND-0419, HND-0420, HND-0421, HND-0422, HND-0423, HND-0424, HND-0425, HND-0426, HND-0427, HND-0428, HND-0430, HND-0431, HND-0432, HND-0466]
blocked_by: []
blocker_reason: null
feature_slug: signal_analyser_ui_refinement
development_branch: neuro_signal_analyser_ui_refinement
integration_sha: null
ui_impact: new_or_changed
design_mode: autonomous
design_ref: ../design/TASK-0080-explicit-apply-flow/DESIGN.md
design_version: 1
---

# User intake

## Source request

Используя мультиагентный режим доработать приложение до актуального локального
skill-stack: убрать реактивную математику, перевести frontend на соответствующую
логику, проверить математику относительно MATLAB, покрыть contracts тестами,
привести дизайн к skill-паттернам и проверить работоспособность frontend.

## Product decision

- `development_mode: autonomous` из manifest.
- `ai_manager_status: unavailable`: `ai_manager load_skill --force` завершился
  ошибкой запуска local API; bootstrap не повторяется.
- `resolution_attempted_skill: backender/apply-calculation-flow`.
- `decision_source: orchestrator_autonomous`.
- Reactive math означает любой запуск DSP/тяжёлого расчёта из input/change,
  render/watch, polling состояния или пассивного session restore.
- Поля редактируются как frontend draft и сохраняются отдельными typed
  field-update запросами в backend draft без изменения outputs. Единственная
  семантическая фиксация математических параметров — явный `Применить` над уже
  сохранённым backend draft; Apply request не пересылает settings snapshot.
  Backend валидирует draft, повышает revision и инвалидирует только затронутый
  active output.
- Запрос active output может материализовать уже применённый расчёт, но не
  менять настройки и не запускать вычисления для inactive panes/pages.

## Scope

- Провести MATLAB и Engee contract audit текущих time/spectrum/spectrogram/
  persistence calculations, defaults, scales, units and edge cases.
- Создать versioned design package для draft/dirty/validation/applying/pending/
  ready/error transitions и явного Apply без скрытого пересчёта.
- Перевести authoritative backend и frontend contracts на explicit Apply,
  immutable revisioned snapshots, active-only output and no browser DSP.
- Добавить deterministic backend/frontend/Engee tests, затем production-only
  deploy и visible E2E frontend/design regression.

## Out of scope

- Новые виды анализа, отсутствующие в текущем продукте и MATLAB reference scope.
- Browser-side DSP, CDN, local application runtime или silent numerical fallback.
- Незаявленная смена accepted design composition вне состояний Apply flow.

## Acceptance criteria

- [ ] Ни один input/change/render/watch не запускает математический расчёт.
- [ ] Field update сохраняет typed draft, но не меняет outputs; явный Apply
  атомарно валидирует backend draft, публикует revision и пересчитывает
  только затронутый active output; inactive outputs остаются cold.
- [ ] MATLAB/Engee evidence фиксирует функции, сигнатуры, defaults, conventions,
  units, tolerances and critical scenarios для всей поддерживаемой математики.
- [ ] Frontend реализует dirty/applying/pending/ready/error/stale transitions,
  не теряет draft и отклоняет stale responses.
- [ ] Ready design package и production UI используют актуальные локальные
  designer/frontend skills, assets, sizing and overlay contracts.
- [ ] Backend, frontend, Engee contract tests и production E2E проходят.

## Stage matrix

| Stage | Decision | Reason |
|---|---|---|
| MATLAB research | required | Пользователь требует parity относительно MATLAB. |
| Engee contract | required | Production math использует EngeeDSP functions. |
| Design | required | Apply flow добавляет новые visible states/transitions. |
| Backend | required after Engee report | Authoritative math trigger/API changes. |
| Frontend | required after design/backend contracts | Draft/Apply state machine replaces reactive dispatch. |
| Tester | required | Positive/negative and race/performance coverage. |
| DevOps | reuse existing feature branch, then deploy | Scope extends TASK-0055 and its recorded branch. |
| E2E | required after exact production deploy | Visible frontend and design gate. |

## Decomposition

| ID | Role | Deliverable | Depends on |
|---|---|---|---|
| TASK-0078 | MATLAB Researcher | MATLAB reference matrix | — |
| TASK-0079 | Engee User | Engee/MATLAB backend-consumable contracts | — |
| TASK-0080 | Designer | Explicit Apply design package | — |
| TASK-0081 | Backender | Apply-only authoritative calculation/API flow | TASK-0079 |
| TASK-0082 | Frontend | Draft/Apply/revision frontend state machine | TASK-0080, TASK-0081 |
| TASK-0083 | Tester | Backend/frontend deterministic regression matrix | TASK-0081, TASK-0082 |

## Queue decision

P0 because reactive calculation and frontend behavior are the user's explicit
blocking request. Independent evidence/design lanes start in parallel. The
existing `neuro_signal_analyser_ui_refinement` branch is reused because this is
an extension of the active TASK-0055 feature, not a separate feature cycle.

## 2026-08-06 current-code audit

- `POST /api/settings` calls `apply_signal_setting!`; its lightweight branch
  increments `state_revision` and immediately calls
  `signal_analyser_invalidate_output_pages_unlocked!` for the active page.
- `public/js/settings.js` sends field updates after 150 ms and dispatches
  `signal-analyser-settings-state` for calculation-affecting fields; the root
  and layout modules accept the snapshot and begin active-output polling.
- No calculation-settings Apply route/client method exists. The only visible
  `Применить` currently found is the unrelated layout-resize action.
- Baseline backend suite `julia --project=. test/back/runtests.jl` passed.
- Baseline frontend suite reached 11 passing files, then failed in
  `settings_select_width.static.test.js`: current CSS does not preserve the
  asserted desktop 188 px offset. This is pre-existing TASK-0076/HND-0410
  evidence and must remain a separate product baseline, not be hidden by the
  Apply-flow refactor.

## 2026-08-06 implementation status

- MATLAB/Engee audits, versioned design, backend explicit Apply, frontend
  state machine and TASK-0083 regression are complete.
- The authoritative backend runner exits 0; frontend passes 15/15 with V8
  function coverage 456/666 (68.47%); `git diff --check` exits 0.
- Remaining acceptance is production-only: diagnose the current root 404,
  deploy the exact revision and run foreground browser/design E2E.
- The mandatory production DevOps lock remains foreign-busy after 3139 atomic
  attempts over 61740 seconds. Per policy it is neither cleared nor bypassed;
  DevOps continues waiting for its turn.
