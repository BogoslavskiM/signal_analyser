# Measurement kinds snapshot boundary assessment

Date: 2026-08-01

Role: Tester (`/root/tester_c18_persistence_matrix`)

## Backend contract trace

The serializer publishes `measurement_kinds` per Display and repeats the active
Display value at root. The root field is a projection, not an independent
preference source. Request validation requires an array of unique known string
IDs, accepts empty, rejects duplicates/unknown/non-string entries and returns
canonical order:
`minimum, maximum, mean, median, peak_to_peak, rms`.

## Frontend gap

Current `measurementKinds(...)` is permissive. Present `null` and non-array
input silently become the first-three default; unknown IDs are filtered and
duplicates are deduplicated into another apparently valid subset. There is no
dedicated snapshot contract error, disabled Statistics state or desired/
queued/pending/replay quarantine for this field.

## Frozen matrix

- Display field absent while root is a valid nondefault selection: use the
  compatibility first-three default, never root fallback.
- Display field present malformed while root is valid: quarantine, never root
  recovery.
- Present valid empty and unordered unique subset: accept and render canonical
  UI order.
- Present null/nonarray/non-string/unknown/duplicate: stable accessible error,
  all Statistics checkboxes disabled and zero unrelated View POST.
- Malformed 409 with queued intent and malformed successful 200: immediate
  desired/queued/pending purge and no replay.
- Valid state retains the exact full View request contract and A/B isolation.

This assessment authorizes frontend/test work only. Backend/API/math and C24
Plotly coordination do not change.
