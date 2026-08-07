# Engee deployment diagnostic

```yaml
id: LOG-0011
deploy_handoff: HND-0373
target: https://engee.com
branch: neuro_signal_analyser_ui_refinement
revision: 545bef2d6f5fbf76f32f6afb4bfe88f6a962e48c
app_path: /user/apps/signal_analyser/app.jl
log_file: /user/apps/signal_analyser/app_log.log
time_range: 2026-08-06 10:14–10:18 Europe/Moscow
pod_status_before: running
pod_start_status: not_needed
pod_status_after: ready
start_status: started
readiness_status: partial_failure
technical_maintenance_screen: false
main_document_http_status: 200
status_http_status: 200
evidence_status: collected
failure_owner: backender
redacted: true
truncated: false
```

## Diagnosis

The clean production checkout was fast-forwarded to `545bef2d6f5fbf76f32f6afb4bfe88f6a962e48c` and the mandated Genie start returned STARTED. The public root returned HTTP 200, while `/api/status` returned HTTP 200 with `ready=true` and `ok=true`, but reported stale `runtime_revision` `eb4f81eb695ddafef032646aff6245f4f380c4f8`. The checkout/start pipeline is attested; the runtime-revision response fails the exact deployed-revision acceptance condition. No stale or unmaterialized package-environment signature was present. Ownership is Backender for the application status/revision contract.

## Evidence

- [application.log](application.log)
- Production root: HTTP 200
- Production `/api/status`: HTTP 200; `ready=true`; `ok=true`; stale `runtime_revision=eb4f81eb695ddafef032646aff6245f4f380c4f8`

## Routing

- Deployment failure handoff: return-only compact handoff to Backender
- Orchestrator FYI: return-only compact handoff
- Next action: Backender must correct the runtime-revision status contract, then request a repeat deploy.
