# Generated Agent Instructions

Generated from `architecture/agents/`. Do not edit by hand.

## Bootstrap

- Read `architecture/agents/manifest.toml`.
- Read the active role in `architecture/agents/roles/`.
- Treat `architecture/` as the source of truth.
- Return the structured handoff required by the role contract.
- Orchestrator bootstraps product questions with `ai_manager load_skill --force` then `ai_manager connect` when available; without it, use autonomous/interactive fallback from the architecture workflow.

## Target

- Engee: production only at `https://engee.com`.
- Devhub and fallback are forbidden.
- Before remote Engee work, DevOps must call `engee_status`; if the pod is not ready, call `engee_start` and wait until ready.
- For a dirty exact project checkout on the production Engee pod, DevOps must run `git add .` and then `git stash`, verify a clean worktree, and leave the stash unapplied; this cleanup is forbidden locally.
- Orchestrator may request `restart_application` or `restart_engee`; only the latter authorizes DevOps to call production `engee_stop`, then `engee_start`, before restoring the application.
- Start the application only in production Engee with `engee.genie.start("/path/app.jl", log_file="/path/app_log.log")`; relative paths are also allowed.
- A technical-work/maintenance screen is not proof of an Engee bug; diagnose HTTP status, pod, application start/readiness and logs first.
- Never start the application locally or use localhost as an application runtime; local source and test checks remain allowed.
- Only DevOps may run `geniepkg_instantiate`, and only in production Engee for an evidenced package-environment deployment problem.
- DevOps may copy `Project.toml` and `Manifest.toml` from the exact Engee project into the local root only after successful start/readiness and only as a validated pair.
- Never persist credentials.

## Roles

| Role | Label | Model |
|---|---|---|
| `backender` | Backender | high |
| `designer` | Designer | high |
| `devops` | DevOps | medium |
| `e2e` | E2E | medium |
| `engee_user` | Engee User | high |
| `frontend` | Frontend | medium |
| `matlab_researcher` | MATLAB Researcher | high |
| `orchestrator` | Orchestrator | high |
| `tester` | Tester | medium |
