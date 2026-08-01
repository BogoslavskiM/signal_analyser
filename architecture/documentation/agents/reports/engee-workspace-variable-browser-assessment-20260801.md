# Engee workspace variable browser assessment

Date: 2026-08-01

Role: Architect

Status: successor contract frozen; external provider proofs complete;
implementation, deployed-app verification and deployment not claimed

## Scope and outcome

DEC-039 replaces only DEC-037's manually typed workspace-variable import with a
server-owned Engee variable browser and one atomic multi-select Add. DEC-037
Copy, Time Limits Extract, confirmed Delete, full-snapshot publication and
revision rules remain authoritative.

The application wire and security/lifecycle boundary are frozen. The exact
literal introspection string remains implementation-private; its required
constant/no-interpolation/bounded-result properties are contract-visible.
Runtime E2E still waits for the same proofs through a deployed application.

## Facts, inference and ambiguity

Facts supplied by the official-API research lane:

- the public Engee API documents typed value transfer through
  `engee.genie.recv`;
- it does not expose a documented workspace-enumeration method;
- local Julia `Main`, filesystem browsing and user-derived evaluation are not
  equivalent substitutes.

Product decision, not an Engee fact: permit one constant provider-owned
`engee.genie.eval` introspection command for catalog names and bounded
type/dimension metadata only. This is a narrow successor exception to DEC-037,
not general permission to evaluate code.

Production evidence now confirms that direct
`engee.genie.eval(code::AbstractString)` return works: one constant bounded
metadata expression returned `(entries, truncated, total)` without a temporary
workspace variable, `send` or cleanup. The catalog cap is 1000 and internal or
imported bindings are excluded. No values were returned.

A second production proof selected a compatible entry internally and called
`engee.genie.recv(resolved_name; context=Main)`. It returned a vector whose
type/shape agreed with catalog metadata, without exposing the name/value or
creating a temporary binding.

The remaining evidence gap is application integration, not provider discovery:
the deployed adapter must repeat the constant catalog proof and catalog-resolved
`recv`. If either operation is unsupported on a target, the browser is an
unavailable capability; the application must return HTTP 503 with
`workspace_unavailable`, not a fabricated empty workspace.

## Provider-neutral application contract

`GET /api/workspace/variables` is read-only, uses `Cache-Control: no-store` and
normalizes the catalog to exact
`{catalog_revision,expires_at,truncated,total,variables}`. Each variable owns
exact `variable_id`, `name`, `type`, `shape`, `sample_count`, `source_kind`,
`compatibility`, `reason`, `sample_rate_requirement` and `selectable`. Entries
are sorted by exact name and capped at 1000. It returns no values, samples,
preview, expression or path and does not change app `state_revision`.

Exact enums are:

- `source_kind`: `raw_vector|raw_matrix|timed_vector|timed_matrix|unsupported`;
- `compatibility`: `requires_sample_rate|compatible|incompatible`;
- `sample_rate_requirement`: `required|not_needed|unsupported`.

Names are 1–256 UTF-8 bytes, type labels at most 200 Unicode scalars and reasons
at most 500. JSON shape/sample counts are safe integers through `2^53-1`.
Selectable rank is one/two, rows/samples are at least two, matrix columns are
1–1000. Any structural/output violation yields a bounded nonselectable
incompatible entry rather than an exception. The response never carries values.

Each GET creates `catalog_revision="wc_" + lowercase canonical UUID` in a session-scoped runtime
registry. TTL is five minutes and capacity is the newest eight snapshots;
oldest-first eviction applies only at the cap. Refresh does not mutate an
unexpired prior revision. Selection never crosses revisions: a refreshed UI
resets every checked row and announces that selection is required again.

The deterministic ID is `"wv_" + lowercase hex SHA-256` over the UTF-8 bytes
of `SignalAnalyser\0WorkspaceVariableId\0v1\0`, exact catalog revision, another
`\0` and exact variable name, without Unicode normalization. Its regex is
`^wv_[0-9a-f]{64}$`; catalog revision uses lowercase canonical UUID after
`wc_`. Registry owns the
ID-to-entry/name map. Backend rejects duplicate names and any ID collision. ID
is neither authorization nor a secret; unexpired registry membership plus
fresh authoritative-catalog equality remains the gate.

`POST /api/signals` adds explicit `operation="import_workspace_batch"` with
exact top-level `state_revision`, `operation`, `catalog_revision` and nonempty,
unique `selections[]`. Every selection owns only `variable_id` and nullable
`sample_rate_hz`. The UI has no per-variable rename. One global sample rate is
copied into every selected raw vector/matrix entry; timed entries carry null and
derive rate from their uniform finite time. The legacy singular
`import_workspace` DEC-037 command remains available for backward-compatible
non-UI callers and is never used by the browser.

Selections contain 1–1000 unique IDs. Each selectable matrix has at most 1000
columns and total expanded signals for one batch are 1–1000; aggregate overflow
is `422 invalid_request` before recv/preparation/publication.

Backend first resolves every ID from the specified unexpired immutable registry
snapshot. It then enumerates the provider again and requires exact equality of
each selected `name`, `type`, `shape` and `source_kind` before `recv`. The
adapter passes the resolved server-owned name to typed `recv` and revalidates
the actual value; the client does not submit names and no name is interpolated
into introspection code.

## Atomicity and state

One submitted selection set is one transaction:

```text
strict request shape/bounds/regex -> 422
  -> current app revision -> 409 stale_state
  -> exact catalog revision registry lookup
  -> selected-ID resolution to stored entries
  -> fresh constant enumeration -> 503 capability / 502 provider
  -> exact fresh equality of name/type/shape/source_kind -> 409 workspace_changed
  -> recv in catalog order -> 503 capability / 502 provider
  -> actual value/rate/output validation -> 422
  -> prospective names/colors/inventory/active Display/caches/outputs
  -> one publish and revision +1
```

Any catalog, provider, value, column, naming, sample-rate or preparation error
publishes nothing. Success appends the entire generated set to global Signals
and active Display membership. The first generated signal becomes global row
selection and active analysis source. Inactive Displays remain unchanged.

Output order is selected catalog order, then ascending matrix-column index,
independent of checkbox click order. The existing allocator tries `base`, then
the first free concatenated integer suffix `base2`, `base3`, and immediately
adds each generated name to prospective `existing_names`. This applies across
the complete multi-variable/matrix batch. Evidence:
`lib/services/signal_inventory_service.jl:167-174,240-267` and
`test/back/lib/signal_analyser_service_test.jl:142-154`.

The catalog, revision-bound checkbox selection and one global sample rate are
ephemeral
frontend dialog state. Opening, refreshing, cancelling and closing do not
mutate the app. No optimistic rows are allowed. HTTP 200 returns the full
authoritative snapshot; `409 stale_state` and at-most-once conditional retry
remain DEC-037 behavior only while the same catalog revision remains valid.
Catalog conflicts are never automatically replayed.

Executable precedence is exact: strict shape/bounds/regex 422; app stale 409;
missing/expired/evicted catalog 409; duplicate/unknown/nonselectable ID 422
after registry lookup; 503/502 during fresh enumerate; metadata mismatch 409;
503/502 during recv; value/rate/output 422; only then prospective publish.
Every error preserves app state and provider errors never masquerade as an empty
variables list.

## Security review contract

The future provider must prove all of the following:

- introspection source is one literal constant with no parameters,
  interpolation, concatenation or user fragments;
- fixed provider context cannot resolve to the app's local Julia `Main`;
- direct return uses no temporary variable, `send` or cleanup;
- normalized catalog strips/rejects values, excludes internal/imported bindings
  and enforces the 1000-entry cap plus name, dimension and metadata bounds;
- registry snapshots are immutable, session-scoped, TTL five minutes, max eight
  and never browser/shared-cache persisted;
- catalog-revision-bound domain-separated SHA-256 IDs are resolved through the
  unexpired registry and fresh catalog before typed `recv`; duplicate names and
  collisions fail closed;
- names are never parsed as symbols/code/paths and frontend renders them as
  text only;
- request duplicates, oversized bodies and session-crossing catalog state are
  rejected;
- unsupported/malformed introspection fails the capability explicitly.

A source/static test must pin the literal command and make later interpolation
or broader output a review-visible contract change.

## Interaction boundary

The project `frontend/file-browser-dialog` skill is an analogy only for
server-authoritative loading, explicit primary action, busy exclusion and
retained errors. It is not enabled as a filesystem feature: directory/path/root
state, navigation and its single-select rule do not apply.

DEC-039 instead defines a modal list with native multi-select checkboxes, one
global raw sample-rate input, visible refresh/cancel/close/Add actions,
zero-selection disabled state, operation-local busy and error retention. Every
refresh creates a new revision, resets selection and emits a polite live
warning. Dynamic and metadata selectors use server-issued `variable_id`, never
raw name.

The form and success acknowledgement follow `dialog-system`: full
`aria-labelledby`, focus trap/return, `aria-busy`, checkbox/reason associations
and sample-rate label/describedby/invalid/required semantics are mandatory.
Success closes the form first, then opens one separate success dialog with
count and visible Done; there is no modal overlap. Keyboard/overlay implicit
submit or close remains forbidden. Stable existing `signals-workspace-*`
selectors are listed in DEC-039.

Focus destinations are exact: open/loading → title (`tabindex=-1`); successful
list → first selectable checkbox or Refresh when none; load error → Retry;
separate success dialog → Done. All visible controls in the current form/success
dialog are trapped. Cancel, Close and Done return focus to the Add trigger.

## Required deterministic matrix

Backend and API:

- constant-command source audit and no user-derived eval path;
- direct-return catalog success/empty/truncated/malformed/oversized/unsupported/
  provider-error cases;
- exact response/entry/request keysets, enums, header and bounds;
- TTL/max8 registry lifecycle, old unexpired validity, expiry/eviction and new
  refresh revision;
- catalog-revision-bound ID vectors, duplicate-name/collision/unknown failures,
  fresh name/type/shape/source-kind comparison and recv only after registry
  ID-to-name resolution;
- exact regex and the two DEC-039 SHA-256 vectors;
- all catalog/name/type/reason/rank/sample/column/selection/expanded-output
  bounds and structurally incompatible normalization;
- atomic vector/matrix/timed batches, column failure rollback,
  `base`/`base2`/`base3`, catalog-then-column order, sample-rate rules, one
  publish and one revision increment;
- exact 409/422/502/503 taxonomy and precedence, full snapshot,
  inactive-Display isolation and DEC-037 Copy/Extract/Delete regressions.

Frontend:

- exact preserved root/dynamic/metadata selectors, safe opaque-name rendering
  and no typed variable-name field;
- full aria labels, focus trap/return, busy/live/reason/sample-rate semantics;
- exact title/first-checkbox-or-refresh/retry/done destinations and
  Cancel/Close/Done return;
- loading/empty/error/refresh, unconditional revision selection reset and live
  warning;
- checkbox combinations, one global sample rate, exact batch POST, busy
  exclusion, no optimistic mutation and authoritative recovery;
- app-stale bounded retry only while active Display/catalog remain current;
  catalog conflicts never replay;
- form-close then separate success/count/Done dialog without modal overlap.

E2E stays behind a single milestone gate: deployed-app catalog/recv contract
probe only at `https://engee.com` after checking the project manifest's locked
production target, product and ordinary tests, then full Signals action
design/accessibility review. The integrated runtime scenario must add multiple
real workspace variables atomically and preserve inactive Display state before
exercising unchanged Copy/Extract/Delete. It must record
`browser_workspace_setup` and sufficient timing/retry evidence.

DevHub and fallback are forbidden. Legacy `devhub` filenames are compatibility
labels only; [DEC-038](../../user/decisions/DEC-20260801-038-engee-production-target.md)
and `[engee_target]` in the project manifest remain authoritative.

## Risks and follow-ups

- Undocumented introspection can vary by target/runtime version. The feature is
  capability-gated; silent fallback is forbidden.
- Names can contain hostile-looking text. Exact allowlisting plus typed `recv`
  and text-only rendering are mandatory negative-test surfaces.
- A multi-selection can expand into many matrix columns. Backend bounds must be
  set from official target evidence before implementation, not guessed here.
- Catalog metadata does not prove value immutability. Every selected current
  value is re-read and revalidated inside the atomic command.

Required follow-up is product implementation with a source pin proving the
literal constant has no interpolation, SHA-256 ID vectors, deployed-app
catalog/recv capability tests, then Frontend selector/layout review and Tester
matrix review.

## Source links

- [DEC-039](../../user/decisions/DEC-20260801-039-engee-workspace-variable-browser.md)
- [DEC-037](../../user/decisions/DEC-20260801-037-signal-inventory-actions.md)
- [DEC-038](../../user/decisions/DEC-20260801-038-engee-production-target.md)
- [Task record](../tasks/engee-workspace-variable-browser-20260801.md)
- [`frontend/file-browser-dialog` interaction analogy](../../../skills/frontend/file-browser-dialog/SKILL.md)

No product, test or deployment change is claimed by this assessment. The two
external prod probes are provider evidence only, not deployed-app verification.
