# Engee deployment diagnostic

```yaml
id: LOG-0009
deploy_handoff: HND-0349
target: https://engee.com
branch: neuro_signal_analyser_ui_refinement
revision: c7e0f9a4bbe145be14a197c25d0c8700c0f205ee
app_path: /user/apps/signal_analyser/app.jl
log_file: /user/apps/signal_analyser/app_log.log
time_range: 2026-08-06T07:38Z-07:40Z
pod_status_before: running
pod_start_status: not_needed
pod_status_after: ready
start_status: started
readiness_status: passed_after_devops_probe_retry
technical_maintenance_screen: false
main_document_http_status: 200
evidence_status: collected
failure_owner: devops
redacted: true
truncated: false
```

## Diagnosis

The first readiness probe was not sent: a DevOps-owned Julia command constructed
an invalid `curl` command because the HTTP write-out format was not quoted. The
application log independently shows successful boot, `Ready!`, and `HEAD / 200`.
The corrected production-only probe then passed: root and `/api/status` both
returned HTTP 200; status reported `ready=true`, `ok=true`, and the exact
revision. The target has one RUNNING Genie registry entry. No package-environment
signature or product error is present.

## Evidence

- [application.log](application.log)

## Routing

- Deployment failure handoff: not-created (DevOps-owned probe error recovered)
- Orchestrator FYI: not-created (deployment completed)
- Next action: hand off the ready runtime revision for E2E.
