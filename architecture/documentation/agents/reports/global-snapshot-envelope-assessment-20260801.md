# Global snapshot envelope assessment

Date: 2026-08-01

Roles: Frontend (`/root/frontend_c24_final_audit`), Tester
(`/root/tester_c18_persistence_matrix`)

## Finding

`normalize()` dereferences raw Display entries, stringifies missing IDs and
coerces malformed membership/source values. `active()` silently falls back to
the first page. `accept()` validates only nested settings after normalization.
Malformed global topology can therefore crash or fabricate client identity and
later full View bodies.

Backend serialization always emits signal inventory, nonempty Display pages
and active ID. No accepted DEC defines absence compatibility for those fields.

## Staging decision

C26 validates only the global envelope: snapshot object, named unique signals,
identified unique nonempty Displays and exact active ID membership. Failure is
global fatal/reset with existing accessible app error and Retry; all queued
View/Display mutations and C24 work are invalidated. C27 will separately handle
visible membership, analysis aliases, row selection and root projections.

## Matrix

- Every outer/entry/type/empty/duplicate/missing/unknown class on initial GET.
- Same fatal boundary in successful 200 and 409 `current` with queued intent;
  zero replay and complete purge.
- Previous valid render cannot survive as authoritative DOM.
- Retry valid recovery and valid A/B envelope.

No backend/API/HTML/math change is required.
