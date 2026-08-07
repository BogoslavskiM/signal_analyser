# Engee deployment diagnostic

```yaml
id: LOG-0012
deploy_handoff: HND-0374
target: https://engee.com
branch: neuro_signal_analyser_ui_refinement
revision: 545bef2d6f5fbf76f32f6afb4bfe88f6a962e48c
app_path: /user/apps/signal_analyser/app.jl
log_file: /user/apps/signal_analyser/app_log.log
time_range: 2026-08-06T10:22:11–10:28:28 (production pod activity timestamps)
pod_status_before: running
pod_start_status: not_needed
pod_status_after: ready
start_status: passed
readiness_status: passed
technical_maintenance_screen: false
main_document_http_status: 200
evidence_status: collected
failure_owner: devops (resolved)
redacted: true
truncated: true
```

## Diagnosis

The clean production checkout was already at the expected SHA, while the prior
SignalAnalyser runtime had a stale Ready/listen record. The exact
SignalAnalyser lifecycle registration was stopped with the supported
path-scoped Engee API and then started once with the mandated absolute start
call. The external runtime now reports the expected revision and healthy
readiness.

The Engee command-execution image does not expose `ss` or `lsof`; after start,
the serving process is also not visible from that execution namespace. The
supported lifecycle status, its one-record SignalAnalyser registry result, and
external HTTP/API checks are the available runtime-ownership evidence. The
unrelated RadarCalculate process was not touched.

## Evidence

- [application.log](application.log)
- [runtime-reconciliation.txt](runtime-reconciliation.txt)

## Routing

- Deployment failure handoff: not-created; DevOps-owned stale lifecycle state was resolved.
- Orchestrator FYI: this report.
- Next action: E2E may use the recorded production URL and revision.
