# Engee deployment diagnostic

```yaml
id: LOG-0002
deploy_handoff: HND-0253
target: https://engee.com
branch: neuro_signal_analyser_ui_refinement
revision: cac83c5f445352a50f04aeeeb269b47007766d79
app_path: /user/apps/signal_analyser/app.jl
log_file: /user/apps/signal_analyser/app_log.log
time_range: 2026-08-05T12:25:09Z/2026-08-05T13:03:33Z
pod_status_before: stopped
pod_start_status: performed
pod_status_after: running
start_status: historical_started_then_terminated
readiness_status: failed
technical_maintenance_screen: true
main_document_http_status: 404
evidence_status: collected
failure_owner: engee_user
redacted: true
truncated: false
```

## Diagnosis

The production checkout is clean and exactly matches the expected branch/SHA. The prior application log records complete Genie bootstrap (`Ready!`) and successful `HEAD / 200` and `GET / 200`, followed by an externally delivered `signal 15: Terminated`; there is no preceding Julia product exception or backend bootstrap failure in the bounded log. The log stopped changing at 2026-08-05T12:37:37.698Z. Foreground Chrome subsequently observed the branded maintenance page with no app shell, and the current bounded production probe returns HTTP 404 with the same `Server maintenance` title. After the mandatory pod gate raised the stopped pod for diagnostics, no matching application process existed; the application was not restarted.

Classification is `engee_user` for contract localization: available evidence points to production runtime/pod lifecycle terminating a previously ready process and removing its route, while checkout/path/revision are correct and no product exception is present. The branded page alone is not the basis for this classification. The previously reported HTTP 500 was not reproduced by the bounded diagnostic probe; the captured current status is HTTP 404.

## Evidence

- [application.log](application.log)
- [runtime-status.txt](runtime-status.txt)
- [browser-console.log](browser-console.log)
- [network-errors.log](network-errors.log)
- [technical-maintenance-screen.png](technical-maintenance-screen.png)
- [main-document-response.txt](main-document-response.txt)

## Routing

- Deployment failure handoff: HND-0253-R1 (inline report to Engee User)
- Orchestrator FYI: HND-0253-FYI (inline report)
- Next action: Engee User localizes the production runtime contract for the unexplained SIGTERM/route loss; DevOps must not create a product stub or retry this get_logs request as a deploy.
