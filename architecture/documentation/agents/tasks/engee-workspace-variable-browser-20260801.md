# Engee workspace variable browser successor task

Date: 2026-08-01
Owner: Architect
Status: contract frozen; external provider proofs complete; product not started
Decision: [DEC-039](../../user/decisions/DEC-20260801-039-engee-workspace-variable-browser.md)

## Goal

Replace DEC-037's typed single variable-name import with a built-in Engee
catalog, native multi-select checkboxes and one atomic Add into global Signals
plus the active Display, without weakening Copy/Extract/Delete or app revision
rules.

## Frozen scope

- Read-only `GET /api/workspace/variables` exact
  `{catalog_revision,expires_at,truncated,total,variables}` plus no-store,
  immutable session registry TTL five minutes/max eight.
- Atomic `POST /api/signals` `import_workspace_batch` with unique
  `catalog_revision`, `selections[{variable_id,sample_rate_hz}]` and one full
  authoritative success snapshot; legacy singular `import_workspace` remains
  non-UI compatibility.
- One narrowly reviewed constant `engee.genie.eval` introspection exception;
  exact catalog-selected values still use typed `recv`.
- Registry ID-to-name resolution, fresh exact name/type/shape/source-kind
  comparison and actual-value validation around each `recv`; no local Julia
  `Main`, paths, filesystem or user-derived evaluation.
- Exact executable precedence: strict shape → app revision → registry → IDs →
  fresh enumerate → metadata equality → recv/value/rate → prospective publish.
- Modal multi-select browser with the full selector/accessibility contract in
  DEC-039; form closes before a separate success acknowledgement opens.
- One integrated Signals E2E only after provider, product, ordinary-test and
  interaction-review gates.

## Dependency queue

| Role | Current deliverable | Next eligible work | Blocker |
| --- | --- | --- | --- |
| Backend | provider port, catalog route and atomic multi-import | deployed-app catalog/recv contract probe | product implementation handoff |
| Frontend | selector/payload handoff complete | catalog dialog and mutation lifecycle | none; frozen wire supports parallel work |
| Tester | read-only matrix review against DEC-039 | backend/API/frontend ordinary coverage | product symbols may land concurrently |
| E2E Tester | scenario contract only | one integrated Signals runtime workflow | provider target probe + product/ordinary tests + design review |
| DevOps | no action | explicit completed-file checkpoints and later target probe/deploy only on handoff | no completed product handoff |
| MATLAB Researcher | no action | optional reference question only | no eligible work; MATLAB evidence is not required for provider binding |

## Provider evidence received and implementation obligations

- official/public Engee sources searched and conclusion that enumeration is
  absent;
- direct-return prod proof for `engee.genie.eval(code::AbstractString)` with no
  temp variable, `send` or cleanup;
- implementation-private literal introspection command with a source pin that
  proves zero interpolation;
- target/runtime/Engee versions and execution context;
- raw `(entries,truncated,total)` provider result for empty, populated and capped
  workspaces;
- demonstrated exclusion of internal/imported bindings and metadata-only rows;
- `catalog_revision="wc_" + lowercase canonical UUID`;
- `variable_id="wv_" + lowercase hex SHA-256` over UTF-8
  `SignalAnalyser\0WorkspaceVariableId\0v1\0` plus exact catalog revision,
  `\0` and exact name, with regex `^wv_[0-9a-f]{64}$`, no Unicode normalization
  and the two DEC-039 vectors;
- immutable registry ID-to-name ownership plus fresh-catalog comparison and
  duplicate-name/collision/unknown rejection; ID is not authorization;
- exact source-kind/compatibility/sample-rate enums;
- confirmed 1000-entry cap, name 1–256 UTF-8 bytes, type/reason 200/500,
  JSON-safe shape/sample count, selectable rank 1/2 with at least two samples,
  matrix columns/batch outputs ≤1000 and selections 1–1000 unique;
- malformed, oversized, unsupported and provider-error behavior;
- prod proof for `recv(...; context=Main)` from a server-resolved catalog name,
  with matching vector type/shape and no exposed name/value/temp binding;
- exact errors: `409 stale_workspace_catalog`, `409 workspace_changed`,
  `422 invalid_request`, `502 workspace_provider_error` and
  `503 workspace_unavailable`; existing `409 stale_state` unchanged;
- capability failure and isolation from local app state/config/network.

Backend implementation must preserve these properties without publishing the
literal expression through the app API or documentation. Naming must allocate
`base`, `base2`, `base3` across the entire prospective catalog-order then
ascending-column batch. A deployed-app contract test must repeat catalog and
resolved-recv behavior before E2E.

## Acceptance gates

1. Backend source/static tests pin the constant/no-interpolation property,
   revision-bound ID vectors, registry lifecycle, metadata equality, exact
   enums/bounds/precedence and `base`/`base2`/`base3` allocation.
2. Backend and Frontend handoffs match the exact app route/payload/selectors.
3. Tester proves the atomic/security/lifecycle matrices and unchanged
   Copy/Extract/Delete behavior.
4. Frontend completes the full Signals action-by-action interaction and
   accessibility review, including revision reset/live status, metadata
   selectors, ARIA state, exact title/checkbox-or-refresh/retry/done focus,
   trapped visible controls, Add-trigger return and separate success dialog.
5. E2E Tester receives one explicit integrated milestone handoff, records
   `browser_workspace_setup` plus timing/retry evidence, and runs only at
   `https://engee.com` after `[engee_target]` production-lock verification.
6. Deployment remains separate and is not inferred from local or E2E success.

## Explicit exclusions

Filesystem/file-browser implementation, local `Main`, arbitrary eval, values
or previews in catalog, live binding, polling, partial import, optimistic rows,
rename/reorder/search, generic preprocessing and any change to Copy/Extract/
Delete are not eligible work.

## Evidence

- [Architecture assessment](../reports/engee-workspace-variable-browser-assessment-20260801.md)
- [DEC-037 historical contract](../../user/decisions/DEC-20260801-037-signal-inventory-actions.md)
- [DEC-038 production target](../../user/decisions/DEC-20260801-038-engee-production-target.md)
- [`frontend/file-browser-dialog` analogy only](../../../skills/frontend/file-browser-dialog/SKILL.md)

Collision evidence:

- `lib/services/signal_inventory_service.jl:167-174,240-267`;
- `test/back/lib/signal_analyser_service_test.jl:142-154`.

No product/test edits, commit or deployment are part of this task record. The
external prod provider proofs are recorded evidence, not application changes.
