---
id: TASK-0051
kind: task
title: Стабилизировать managed production runtime для полного E2E
status: done
priority: P0
queue_order: 46
model: gpt-5.6-terra
reasoning: high
owner: orchestrator
assignees: [devops, e2e]
parent: null
depends_on: [TASK-0050]
blocks: []
source_handoffs: [HND-0155, HND-0156, HND-0157, HND-0158, HND-0159, HND-0161]
related_handoffs: [HND-0163, HND-0164, HND-0165, HND-0166, HND-0167, HND-0168, HND-0170, HND-0171, HND-0179]
blocked_by: []
blocker_reason: null
development_branch: neuro_signal_analyser_ui_patterns
ui_impact: none
---

# Stabilize managed production runtime

## User value

Production application остаётся доступным достаточно долго, чтобы закончить
полный browser/API regression без повторяющегося maintenance 404.

## Scope

DevOps восстанавливает exact SHA
`8c0d37e525268b2acf4781a4cb61e823a50639f8`, выясняет lifecycle managed app и
затем поддерживает/наблюдает runtime во время E2E через bounded periodic probes,
listener/process/status/log evidence. После ready report Orchestrator запускает
E2E и отдельный DevOps monitor параллельно. При исчезновении процесса DevOps
фиксирует точную причину/status/log до optional single restart.

## Out of scope

Source/test/dependency changes, speculative frontend fixes, merge,
devhub/fallback и ручной unmanaged duplicate server.

## Acceptance criteria

- [x] Exact branch/SHA и managed lifecycle/status аттестованы до E2E.
- [x] Runtime остаётся product HTTP 200 в bounded concurrent monitoring window.
- [x] E2E изолирует healthy-bootstrap product defect и маршрутизирует оставшиеся gaps.
- [x] Session восстанавливается exact; source/Git/dependencies остаются untouched.

## Queue decision

P0 recurring platform/runtime blocker: два раза managed application исчезал
после успешного start, прерывая mandatory production E2E.

## Verification and results

Initial exact runtime start/attestation выдан DevOps как `HND-0163`.

DevOps start report `HND-0166`: managed app/process/listener снова отсутствовали;
один cold start за 32.522s восстановил exact SHA. Три последовательных полных
раунда по root, four assets и status/state/session/layouts — 27/27 HTTP 200 без
redirects за 66.7–87.4s каждый. Concurrent monitor `HND-0164` и recovery E2E
`HND-0165` запускаются параллельно; healthy bootstrap остаётся `HND-0162`.

Coordinated E2E reports `HND-0167`/`HND-0168`: availability passed 3/3 clean
contexts and backend accepted 4×4 plus sixteen updates; exact session/layouts
restoration passed. Healthy-API shell nevertheless failed 3/3 and is routed to
TASK-0052. Later navigation hit ERR_SSL_PROTOCOL_ERROR; DevOps monitor HND-0164
will classify the transport lifecycle separately.

DevOps monitor report `HND-0170`: 605.6s concurrent window, root/status 25/25
each HTTP 200, 11/11 lifecycle snapshots RUNNING with unchanged PID/listener,
zero outages/transitions/restarts. ERR_SSL_PROTOCOL_ERROR did not reach Genie and
is consistent with transient edge/TLS failure, not runtime stop. Runtime objective
is complete; healthy-API UI defect is TASK-0052. Exactly one post-task stability
E2E issued as `HND-0171` for the fixed deployed revision.

Post-task E2E `HND-0179`: 14/14 PASS. Five-minute monitoring produced 44/44
root/status/state/layouts HTTP 200 observations; three independent clean
bootstraps completed healthy. Exact session/layout restoration passed.
