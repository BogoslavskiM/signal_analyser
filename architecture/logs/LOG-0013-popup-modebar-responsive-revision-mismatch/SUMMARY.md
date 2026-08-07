# Deployment diagnostics: runtime revision mismatch

- Target: production Engee, `https://engee.com/prod/user/demo54365638-bogoslm/`
- Pod status: running and authenticated before each remote sequence; no pod start was needed.
- Branch / production checkout SHA: `neuro_signal_analyser_ui_refinement` / `e0d1253433505943569c2a6b5e07555d5504be0b`.
- Expected runtime SHA: `e0d1253433505943569c2a6b5e07555d5504be0b`.
- Start calls: two production built-in `engee.genie.start` calls, both reporting `STARTED`, with app path `/user/apps/signal_analyser/app.jl` and log path `/user/apps/signal_analyser/app_log.log`.
- Root probe: HTTP 200.
- Readiness probe: `GET /api/status` HTTP 200 and `ready=true`, `ok=true`.
- Revision probe: response remained `runtime_revision=545bef2d6f5fbf76f32f6afb4bfe88f6a962e48c`, not the expected checkout SHA.

Evidence status: collected. `application.log` is a sanitized bounded snapshot (under 1 MiB); no credentials were retained. The log confirms successful Genie bootstrap and HTTP 200 root/status requests, but does not explain why the served revision remains stale after the exact production checkout update and two canonical start calls.

Diagnosis: deployment revision-readiness failed. Package-environment recovery is not applicable: the app bootstrapped successfully, readiness is true, and the evidence contains no package materialization/instantiate signature. The remaining cause is undetermined between Engee runtime revision activation and application runtime-revision reporting; no product source was changed.

Links: [application.log](application.log)
