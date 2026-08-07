# Engee deployment diagnostic

```yaml
id: LOG-0000
deploy_handoff: HND-0000
target: https://engee.com
branch: neuro_<feature_slug>
revision: <exact SHA>
app_path: <absolute or relative Engee path>
log_file: <exact path passed to engee.genie.start>
time_range: <UTC or explicit timezone range>
pod_status_before: <running|stopped|starting|unavailable|unknown>
pod_start_status: <performed|not_needed|failed|blocked>
pod_status_after: <ready|not_ready|unknown>
start_status: failed
readiness_status: failed
technical_maintenance_screen: <true|false|unknown>
main_document_http_status: <status or unknown>
evidence_status: collected # collected | missing | unreadable | blocked
failure_owner: undetermined # devops | backender | frontend | engee_user | mixed | undetermined
redacted: true
truncated: false
```

## Diagnosis

<Evidence-based cause and ownership rationale.>

## Evidence

- [application.log](application.log)
- [browser-console.log](browser-console.log) — optional
- [network-errors.log](network-errors.log) — optional
- [technical-maintenance-screen.png](technical-maintenance-screen.png) — optional
- [main-document-response.txt](main-document-response.txt) — optional

## Routing

- Deployment failure handoff: <HND-ID or not-created>
- Orchestrator FYI: <HND-ID>
- Next action: <owner action or diagnostic blocker>
