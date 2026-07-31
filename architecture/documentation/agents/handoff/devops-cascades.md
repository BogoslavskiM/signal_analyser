# DevOps handoffs: Signal Analyser cascades

Internal durable handoff record.

canonical_role: DevOps  
agent_id_or_session: `019fb7f1-486d-7041-ba96-8ed0119fc97f`  
status: persistent audit active  
current_task: audit durable ownership and no-deploy handoff  
last_handoff: clean gate `019fb7cd-4958-79c0-86b9-b3d76fb80e04`; ephemeral
review `019fb7e8-1f3c-7c20-83f4-4e2c485ea195`

Earlier ephemeral threads became unavailable after completion. Future DevOps
work must resume the persistent canonical ID above.

## Cascade 2

goal: Prepare integration/deployment checklist without repository mutation.  
scope: Read-only branch, status, diff and verification evidence.  
contracts: Work started from clean `neuro_signal_analyser_cascade` at
`0606d47`; architecture rules later committed/pushed at `98d6cd8`. Product and
test changes remain uncommitted. No commit/push/deploy was authorized for child
agents.  
changes: None by DevOps.  
verification: Ownership paths match Backend, Frontend, Tester, E2E Tester and
Architect zones. Backend 289/289 PASS, frontend 2/2 PASS, E2E support PASS; local
EngeeDSP and runtime E2E remain open.  
risks: Backend changed, so a future deployment requires normal Genie stop/start
and logs. No clean-worktree gate should be reinterpreted during active work.  
follow-ups: Main flow commits/pushes explicit product/test files, deploys if
requested, reports SHA/URL/logs, then enables runtime E2E.

## EngeeDSP deployment preflight decision

goal: Prevent a deploy from relying on an unverified package assumption.  
scope: Read-only target package/runtime probes before authorized deployment.  
contracts: Verify Engee platform LOAD_PATH provides `EngeeDSP` version `0.72.0`
with PkgId UUID `f9bbbd0e-0dd6-4072-898a-88f8f1250a99`, then run the target Engee package
contract. Do not require `Base.find_package` to succeed for a preloaded module.  
changes: No `Project.toml` change and no ownership expansion.  
verification: Current prod showed module path under
`/usr/local/ijulia-core/packages`, global Julia 1.12 environment declaration,
Manifest version `0.72.0` tree `4941c08…`, app RUNNING and API 200. General does
not contain the UUID; app Project/Manifest has no dependency.  
risks: Target preload is platform-specific; a different runtime may fail.  
follow-ups: Repeat before second deploy. Missing/wrong UUID or failed import is
a deploy blocker and Engee bug candidate; successful preflight means the known
dependency ambiguity is not a blocker on that target.

## Maintenance shell evidence contract

DevOps handoff сохраняет base/auth evidence, target status/title/final URL/body,
target API probe, Genie process/status и application log tail. При доступных
base/auth maintenance shell является target app/proxy failure, вероятным
app-side 5xx, даже с HTTP 200. При недоступном base/auth contour это platform
outage. После start/redeploy DevOps повторяет target probe и передаёт исходный
scenario E2E Tester на rerun.
