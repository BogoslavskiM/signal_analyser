---
id: TASK-0046
kind: task
title: Добавить authoritative plot payload для каждой multi-layout pane
status: done
priority: P1
queue_order: 43
model: gpt-5.6-sol
reasoning: high
owner: orchestrator
assignees: [backender]
parent: TASK-0014
depends_on: [TASK-0029]
blocks: [TASK-0030]
source_handoffs: [HND-0095, HND-0129]
related_handoffs: [HND-0133, HND-0134, HND-0135, HND-0137, HND-0142, HND-0144, HND-0145, HND-0149, HND-0153, HND-0154, HND-0159]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_patterns
ui_impact: none
---

# Per-pane visualization output contract

## User value

Все до 16 panes одновременно показывают собственный фактический график, а не
только конфигурацию или placeholder неактивной pane.

## Source evidence

Orchestrator review TASK-0030 подтвердил: current `GET/POST /api/layouts`
возвращает ordered pane state, но вложенный `state.plot_payload` вычислен только
для active pane. Frontend не может получить данные остальных panes без
мутационного `select_pane`, что нарушает authoritative/atomic contract.

## Scope

Расширить layout snapshot совместимым ordered per-pane output contract для
каждого Display/pane. Каждый output должен однозначно связывать server pane ID,
plot type, bindings/analysis source и payload существующего renderer. GET,
успешный POST и stale `current` используют одну форму. Empty pane имеет явный
детерминированный output без ошибки. Подготовка максимум 16 panes не меняет
active pane/revision/session и использует существующие calculation/cache paths
без клиентских догадок.

## Out of scope

Frontend/CSS, новый plot engine, изменение layout/session model, dependency
files, Git/deployment и speculative background mutations.

## Acceptance criteria

- [x] Layout response содержит полный ordered output для каждой pane каждого Display.
- [x] Time/Spectrum/Spectrogram/Persistence payload совместимы с существующим renderer.
- [x] Output identity/type/bindings точно соответствуют authoritative pane state.
- [x] GET/200/409 имеют одну форму; чтение не меняет state revision или active pane.
- [x] Empty/error isolation и max-16 behavior детерминированы.
- [x] Focused и full backend suites проходят без dependency files.

## Queue decision

P1 runtime blocker TASK-0030, выявленный при implementation review. Выдан
Backender параллельно с disjoint Frontend paths; TASK-0030 не может считаться
готовой или deploy-иться до contract/report/tests.

## Verification and results

Backender task — `HND-0133`.

Backender report `HND-0134`: additive `layouts[].outputs` implemented in one
service file with one focused test. Ordered identity/type/bindings and existing
renderer payloads cover all four types, empty panes, pane-local calculation
failure, max 16, GET/200/409 parity, cache reuse and session exclusion. Focused
79/79 and full backend 2141/2141 PASS. Orchestrator reviewed the complete diff
and independently repeated syntax, focused 79/79 and full suite without
failures. Task remains in_progress through combined Tester/deploy/E2E cycle.

Integration review выявил presentation addendum `HND-0135`: derived inactive
Spectrum output должен явно нести typed `frequency_scale`, иначе stored Log
pane получает linear x-axis. Top-level envelope не меняется.

Backender addendum report `HND-0137`: canonical linear/log metadata добавлена в
каждый nonempty derived Spectrum trace; inactive/session-restored Log pane теперь
рендерится корректно. Focused 87/87 и full backend 2149/2149 PASS. Orchestrator
independently повторил syntax и focused 87/87.

TASK-0031 integration report `HND-0142` добавил exact API/session coverage;
full backend 2446/2446 PASS. Общий deploy выдан как `HND-0144`.

DevOps report `HND-0145`: backend/output contract deployed at exact SHA
`8c0d37e525268b2acf4781a4cb61e823a50639f8`; external `/api/layouts` HTTP 200.
Mandatory production API regression выдано как `HND-0149`.

`HND-0153`: 16 API checks not_run из-за maintenance 404 до baseline; contract
failure не наблюдался, mutation не начиналась. Тот же HND-0149 продолжится
после P0 recovery `HND-0154`.

Final continuation `HND-0159`: exact state restoration PASS 1/16, 0 FAIL;
GET layouts was HTTP 200 but remaining assertions were not completed inside the
browser availability window. Contract defect not observed; TASK-0042 owns the
shell boundary before any further post-task continuation decision.
---
