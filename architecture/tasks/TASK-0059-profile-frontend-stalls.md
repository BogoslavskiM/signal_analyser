---
id: TASK-0059
kind: task
title: Воспроизвести и локализовать неприемлемые frontend stalls
status: done
priority: P0
queue_order: 1
model: gpt-5.6-terra
reasoning: medium
owner: orchestrator
assignees: [e2e]
parent: TASK-0055
depends_on: []
blocks: [TASK-0060, TASK-0065]
source_handoffs: [HND-0222]
related_handoffs: [HND-0229, HND-0230, HND-0231, HND-0234, HND-0235, HND-0244, HND-0245, HND-0249, HND-0250, HND-0252, HND-0253, HND-0254, HND-0255, HND-0259, HND-0260, HND-0269, HND-0270, HND-0273, HND-0274, HND-0277, HND-0278, HND-0279, HND-0280, HND-0288, HND-0289, HND-0290, HND-0291, HND-0295, HND-0296, HND-0297, HND-0298, HND-0299, HND-0300, HND-0301, HND-0302, HND-0310]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_refinement
ui_impact: none
---

# Profile frontend stalls

## Scope

Только на exact production Engee runtime воспроизвести залипание в реальных
user flows через один foreground Google Chrome worker. Снять long tasks,
scripting/render/layout/paint, network waterfall, DOM/render counts и
interaction latency; разделить frontend, API/backend calculation, Plotly и
platform shell causes. Вернуть минимальный deterministic scenario и budgets.
Локальный application runtime и localhost запрещены.

## Acceptance criteria

- [x] Stall воспроизведён production matrix run; незапущенные samples перенесены
  в regression TASK-0073 после устранения блокирующего dispatch defect.
- [x] Root cause подтверждён request/console/Performance/Plotly evidence.
- [x] P50/P95 и long-task totals зафиксированы для успешного settings path;
  failed mutation path имеет подтверждённую нижнюю границу 60 секунд.
- [x] Созданы конкретные Frontend TASK-0073 и Backend HND-0312 handoffs;
  общая TASK-0060 получает эти результаты после их проверки.

## Queue decision

- Priority: P0 по прямой оценке пользователя: текущая задержка неприемлема.
- Queue order: null до создания общей feature branch.
- Eligibility: обновлённый performance skill catalog доступен, intake закрыт,
  feature branch recorded and exact production revision reachable.

## Verification and results

HND-0230 added and syntax-checked a bounded production profiler, but exact
runtime availability failed before any mutation: 0 passed, 0 failed, 25 not-run.
No Frontend/Backend/Plotly attribution is accepted until DevOps restores and
attests the production target, then the same deterministic matrix is rerun.
DevOps HND-0234 subsequently deployed and attested exact feature-base revision
cac83c5f445352a50f04aeeeb269b47007766d79. HND-0235 rerun again stopped
before sample 1 because production navigation timed out and redirected to a
Chrome error page; HND-0244 preserves the 0/0/25 evidence. HND-0245 restores
that already-published revision without staging current local work.
HND-0249 confirmed production STARTED, HTTP 200 and served exact revision;
HND-0250 immediately repeated the matrix but the browser received `Server
maintenance`, no app shell, and no attestable `/api/status`. Therefore HND-0249
is not accepted as stable runtime evidence. HND-0252 records the failure and
HND-0253 requests production logs before another restart attempt.
HND-0254 accepted LOG-0002: the exact clean revision reached Ready and served
200, then received external SIGTERM; no application process remained and the
route served maintenance (current probe 404). TASK-0069/HND-0255 owns Engee
runtime lifecycle localization; no product stub is authorized.
HND-0269 then proved explicit `auto_stop=false` stable for 946 seconds, but the
HND-0270 visible rerun completed only 5/25 samples before a pane-layout request
left the application at `Loading layout…` for 60 seconds. The partial 16.5 s
outlier was API/network wait while Plotly/browser work remained below 5 ms, so
it is non-acceptance telemetry and no layer attribution is made. HND-0274 owns
fresh production log correlation and recovery before the same matrix resumes.
HND-0277 attested the runtime healthy and HND-0278 retried with request-level
correlation. The initial GET `/api/layouts` completed in 724 ms with HTTP 200
and revision 64, but the client correctly rejected its server signal-selection
contract and rendered no plot. This excludes Plotly and the earlier network
hang for this occurrence; HND-0280 owns backend snapshot consistency analysis.

HND-0310 on the repaired production SHA completed five stable settings samples
at P50/P95 471/513 ms with zero long tasks and Plotly.react P95 19.5 ms. Three
plot-type attempts timed out before any product POST because the synchronous
Frontend render path threw on a missing DOM text target; later reload timeout
left 17 samples not run. TASK-0073 owns this blocking dispatch defect. The same
run proved live non-static Plotly zoom/pan/autoscale, so Plotly is excluded as
the stall cause. The remaining matrix resumes after TASK-0073 deployment.
