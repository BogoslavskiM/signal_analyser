---
id: ENGEE-prod-current-julia-1.12.4-genie-auto-stop-sigterm
task: TASK-0069
handoff: HND-0255
status: suspected
verdict: environment_failure
stub_authorization: false
public_function: engee.genie.start
affected_call_site: DevOps production start command only; no app/lib product call site
environment: Engee production at https://engee.com
julia_version: 1.12.4
engee_package_version: unavailable_from_loaded_module
contract_test: ../../test/engee/genie_runtime_lifecycle_contract.jl
evidence: ../logs/LOG-0002-task-0059-maintenance/SUMMARY.md
follow_up_evidence: ../logs/LOG-0003-task-0071-auto-stop-false/SUMMARY.md
---

# Suspected Genie `auto_stop` / external SIGTERM lifecycle issue

## Summary

The exact production application reached Genie `Ready!`, served `HEAD / 200`
and `GET / 200`, then received external signal 15 without a preceding Julia or
product exception. The application process and registry entry disappeared and
the route changed to HTTP 404 `Server maintenance` while the Engee pod was
still running. Production runtime introspection shows that the actual
`engee.genie.start` method has an undocumented `auto_stop` keyword whose
no-keyword default is `true`; the affected start call did not override it.

This is `suspected`, not `confirmed`: the platform does not expose the signal
sender, controller event, termination reason, or documented `auto_stop`
semantics. LOG-0003 confirms an immediate successful `auto_stop=false` start,
but the mandatory post-quiet status gate failed before the second lifecycle
sample, so survival beyond the prior SIGTERM boundary remains unverified.

## Environment and version

- Target: production `https://engee.com`; devhub/fallback were not used.
- Production capture: 2026-08-05.
- Julia: `1.12.4`, Linux `x86_64`, five Julia threads.
- Loaded Engee module UUID: `399853c4-f727-4213-85e8-3b395cdc65dd`.
- `Base.pkgversion(Engee)` returned `nothing`; no public runtime/package version
  string was available. Dependency files were not accessed.
- Current pod status during localization: `running`, started at
  `2026-08-05T13:02:40.596757Z`, `inactivityTimeout=1800.0` seconds.
- Exact application revision:
  `cac83c5f445352a50f04aeeeb269b47007766d79`.

## Public contract

### Official Engee documentation

Official Engee documentation describes:

```julia
engee.genie.start(app_path::String;
    devel::Bool=false,
    log_file::String="",
    open_url::Bool=false)
```

It says the function starts the application and returns
`GenieApplicationStatus` with its URL. It documents explicit stop through
`engee.genie.stop(app_path)` and inspection through `engee.genie.list()`. The
application URL is described as working while the Engee server/session is
running.

Sources:

- https://engee.com/helpcenter/stable/ru/feature/genie-functions.html
- https://engee.com/helpcenter/stable/en/feature/genie-engee.html
- https://engee.com/helpcenter/stable/en/external-software/external-software-interface-for-engee.html

The public pages do not mention `wait`, `timeout`, `new_window`, `auto_stop`,
the `auto_stop` timeout/trigger, or its interaction with pod inactivity.

### Production `help` and method surface

Production `help(engee.genie.start)` reports the same documented signature and
defaults for `devel`, `log_file`, and `open_url`. Runtime method introspection
reports:

```text
start(location::AbstractString;
      wait, timeout, devel, open_url, new_window, auto_stop, log_file)
```

The no-keyword wrapper lowers to these observed defaults:

```text
wait=true
timeout=nothing
devel=false
open_url=false
new_window=true
auto_stop=true
log_file=nothing
```

The observed `log_file=nothing` also differs from the documented `""` default.
These undocumented values are observations, not promoted to expected behavior.

### MATLAB contract

Not applicable. MATLAB has no equivalent public contract for Engee pod/Genie
route lifecycle. No MATLAB numerical expected value or fallback is used.

## Affected invocation

DevOps started the existing production checkout with:

```julia
engee.genie.start(
    "/user/apps/signal_analyser/app.jl",
    log_file="/user/apps/signal_analyser/app_log.log",
)
```

The call omitted `auto_stop`, so the observed production default `true`
applied. This is deployment/runtime orchestration, not an application product
call site. There is no product call to replace with a stub.

LOG-0003 records the controlled recovery invocation with `auto_stop=false`.
Its immediate result was `STARTED`; root and `/api/status` were HTTP 200 and
the API contained the exact revision. The sole registry entry used the current
representation `/user/apps/signal_analyser/app.jl`, status `running`.

## Observed lifecycle and localization

1. The bounded application log contains complete bootstrap, `Ready!`,
   `HEAD / 200`, and `GET / 200`.
2. Its next terminal record is `[131] signal 15: Terminated`; no earlier
   product exception, `LoadError`, or backend readiness failure is present.
3. Pod `lastActivityAt` was `2026-08-05T12:27:09.491944Z`. The application log
   stopped changing at `2026-08-05T12:37:37.698Z`, about `628.206` seconds
   later. The signal line itself has no timestamp, so log mtime is an upper
   bound for termination time.
4. Foreground Chrome observed maintenance/404 from
   `2026-08-05T12:46:05Z`, before the pod stopped at
   `2026-08-05T12:58:02.480858Z`.
5. Pod stop occurred about `1852.989` seconds after `lastActivityAt`, consistent
   with the separately reported `inactivityTimeout=1800.0` plus controller
   delay. Therefore pod idle-stop cannot directly explain the earlier app
   SIGTERM and route loss.
6. DevOps restarted only the pod for diagnostics at
   `2026-08-05T13:02:40.596757Z`; it did not restart the application. At
   `2026-08-05T13:03:31.937Z`, the route remained HTTP 404 maintenance.
7. Current localization repeated the state while the pod was running:
   `engee.genie.list()` had no `signal_analyser` entry, and bounded root probes
   at `2026-08-05T13:23:17Z` and by the final persistent test at
   `2026-08-05T13:38:52.029Z` returned HTTP 404 `Server maintenance`.
   `/api/status` also returned the same 404 maintenance response.

Localization result: app-level process termination/registry removal precedes
and is distinct from pod inactivity shutdown. The approximately ten-minute
timing and effective `auto_stop=true` are consistent with an Engee Genie
auto-stop policy, but causation remains unconfirmed because the policy and
server-side event are not exposed.

## Persistent reproducer / recovery probe

Path:

```text
test/engee/genie_runtime_lifecycle_contract.jl
```

The probe is read-only. It introspects the public start surface, calls
`engee.genie.list()`, and performs bounded production GETs for `/` and
`/api/status`. It never starts, stops, deploys, edits, or emulates the app.

Production execution used the exact file contents through Engee MIND
`eval_code`, followed by:

```julia
GenieRuntimeLifecycleContract.run_contract(throw_on_failure=false)
```

Final result at `2026-08-05T13:38:52.029Z`:

```text
passed=false
Test: 3 passed, 6 failed, 0 errored, 0 broken
matching_app_count=0
app_status=nothing
root.status=404
root.title="Server maintenance"
api_status.status=404
api_status.title="Server maintenance"
observed auto_stop default=true
```

The test intentionally expects exactly one registered target app in an active
equivalent state, HTTP 200 root, and HTTP 200 `/api/status` containing the exact
revision. It does not accept maintenance or route loss as expected behavior.

LOG-0003 showed that the public registry has equivalent current and legacy
representations. The corrected probe therefore requires exactly one target
entry whose location is either `/genie_apps/signal_analyser` or
`/user/apps/signal_analyser/app.jl` and whose case-insensitive active state is
either `STARTED` or `running`. HTTP 200, exact revision, and no-maintenance
checks remain mandatory for both root and `/api/status`.

Local syntax-only check (no application runtime) passed:

```sh
julia --startup-file=no -e 'Meta.parseall(read(ARGS[1], String)); println("syntax_ok")' test/engee/genie_runtime_lifecycle_contract.jl
```

## Repeatability and remaining gap

- Post-termination route loss is repeatable across the LOG-0002 browser probe,
  bounded DevOps probe, current direct production GET, and persistent test.
- Successful restart followed by later unavailability occurred in the HND-0234
  and HND-0249 sequences, but only LOG-0002 contains a bounded signal-15
  process record. Exact SIGTERM repeatability is therefore `1/1 captured
  lifecycle`, not a controlled multi-run reproducer.
- LOG-0003 adds an immediate successful `auto_stop=false` sample. Its old
  registry assertion was a probe defect, not an application failure: the sole
  entry was `/user/apps/signal_analyser/app.jl`, `running`, with root/API 200
  and exact SHA.
- Missing evidence: the post-quiet `auto_stop=false` sample, server/controller
  lifecycle events including signal sender and termination reason, and a
  verified idle observation beyond the observed 628-second boundary. The
  attempted post-quiet gate after 946 seconds failed at Engee MCP transport,
  so it is a failed verification, not a pass or skip.

## Impact and workaround

Impact: the exact production application becomes unavailable after nominal
`STARTED`/Ready/200, preventing TASK-0059 production profiling. A maintenance
page is platform route-loss evidence, not successful application behavior.

There is no product fallback or stub. A DevOps-owned restart with explicit
`auto_stop=false` now has immediate STARTED/root/API evidence, but it is not yet
claimed as a permanent fix because the post-quiet verification was blocked and
the keyword semantics are undocumented.

## DevOps recovery trigger

1. DevOps runs the mandatory production pod status/start gate.
2. DevOps starts only the exact app/revision with:

   ```julia
   engee.genie.start(
       "/user/apps/signal_analyser/app.jl",
       auto_stop=false,
       log_file="/user/apps/signal_analyser/app_log.log",
   )
   ```

3. Run the persistent probe immediately, then run the same probe again after
   at least 720 quiet seconds (longer than the observed 628-second boundary).
4. Recovery requires both runs to pass: exactly one target registry entry in
   either documented/observed location representation and active state
   `STARTED`/`running`, root 200, `/api/status` 200 containing the exact
   revision, no maintenance response, and no new signal-15 record in the
   bounded application log.
5. If SIGTERM recurs with `auto_stop=false` while the pod remains running,
   collect the exact controller/pod/application event window and return it to
   Engee User for confirmation. If both probes pass, DevOps may attest runtime
   readiness and Orchestrator may resume TASK-0059.

`stub_authorization: false`. There is no commented Engee product call to restore
and no adjacent stub to delete; recovery is solely the same persistent probe
passing after DevOps-owned runtime restoration.
