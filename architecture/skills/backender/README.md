# Backender skills

Use this group for backend structure, domain/service design, API/function
contracts, calculations and research handoffs.

- `backender-workflow` — обязательный адаптивный workflow.
- `backend-design` — опциональная инициализация или расширение backend.
- `state-model` — typed domain/inspector/session state patterns.
- `api-contract-planning` — Genie routes и request/response contracts.
- `calculation-planning` — calculations, active-page plot cache, optional worker,
  state/calculation revisions и cancel.
- `apply-calculation-flow` — fast invalidation, need-update pages, active-only
  background calculation и lightweight pending.
- `object-export` — единый workspace/Julia/JLD2/Engee-model export.

Confirmed Engee blocker обрабатывается внутри workflow: реальный Engee call
остаётся закомментированным рядом с typed unavailable stub и удаляется после
pass исходного persistent contract test.

Data-heavy graph applications используют state model + API + calculation +
Apply skills совместно: Julia выполняет DSP и готовит Plotly payload,
`/api/state-lite` не содержит graph arrays, inactive pages не рассчитываются.
