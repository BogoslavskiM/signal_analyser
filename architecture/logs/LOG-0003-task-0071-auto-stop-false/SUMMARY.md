# TASK-0071 auto-stop=false lifecycle evidence

Target: production Engee `https://engee.com`; no local runtime or localhost probe was used.

- Exact revision: `cac83c5f445352a50f04aeeeb269b47007766d79`
- Remote checkout: clean `neuro_signal_analyser_ui_refinement` at the exact revision.
- Start invocation: `engee.genie.start("/user/apps/signal_analyser/app.jl"; auto_stop=false, log_file="/user/apps/signal_analyser/app_log.log")`
- Start result: `STARTED`; application URL: `https://engee.com/prod/user/demo54365638-bogoslm/genie/signal_analyser/`.
- Immediate probe: root and `/api/status` were HTTP 200 and the API contained the exact revision, but the TASK-0069 literal registry assertion failed because the sole production registry entry is represented as `/user/apps/signal_analyser/app.jl`, `running`, not `/genie_apps/signal_analyser`, `STARTED`.
- Baseline application log: [application.log](application.log). It reached `Ready!` and logged root/API 200; no `SIGTERM` is present in this bounded snapshot.

Evidence is bounded and sanitized. No credential material, authorization headers, cookies, credential-bearing URLs, or temporary helper paths were observed.

The quiet window lasted 946 seconds from the immediate probe. The first post-window `engee_status` attempt failed at `2026-08-05T14:05:11Z` with a sanitized Engee MCP transport error; its blocked attempt is retained in [probe-post-quiet.txt](probe-post-quiet.txt).

A repeated mandatory pod gate subsequently passed: the production pod was `running`. The read-only completion probe at `2026-08-05T14:09:05.480Z` passed when normalized to the actual current Genie registry representation: one entry at `/user/apps/signal_analyser/app.jl` in `running` state is the continuing process whose start result was `STARTED`. Root and `/api/status` were HTTP 200, the API contained the exact revision, and the bounded 500-line app log contained no new `SIGTERM` or re-bootstrap sequence. See [probe-post-quiet-normalized.txt](probe-post-quiet-normalized.txt).
