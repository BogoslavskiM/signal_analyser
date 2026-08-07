# Engee deployment diagnostic

```yaml
id: LOG-0008
deploy_handoff: HND-0346
target: https://engee.com
branch: neuro_signal_analyser_ui_refinement
revision: 555b6815de9a5d78fd31224f86d47638e18a6bc6
app_path: /user/apps/signal_analyser/app.jl
log_file: /user/apps/signal_analyser/app_log.log
time_range: 2026-08-05T19:44:58Z
pod_status_before: unknown
pod_start_status: failed
pod_status_after: unknown
start_status: not_attempted
readiness_status: not_attempted
technical_maintenance_screen: unknown
main_document_http_status: unknown
evidence_status: blocked
failure_owner: undetermined
redacted: true
truncated: false
```

## Diagnosis

The mandatory production pod gate did not become ready: authenticated `engee_status`
returned upstream HTTP 503 with pod state `unknown`, and the mandatory `engee_start`
call failed with control-plane error `INVALID_ARGUMENT`. This is insufficient to
attribute the issue to the application or a concrete Engee package/function contract.
The retry stopped before every Git mutation and before any remote checkout, log,
application-start, readiness, or browser operation. No package-environment recovery
was attempted or is authorized by HND-0346.

## Evidence

- [application.log](application.log) — remote log unavailable because the pod gate was blocked.

## Routing

- Deployment failure handoff: not-created; failure owner is undetermined.
- Orchestrator FYI: returned in the DevOps completion report for HND-0346.
- Next action: Orchestrator should coordinate production pod/control-plane availability before requesting another deploy retry.
