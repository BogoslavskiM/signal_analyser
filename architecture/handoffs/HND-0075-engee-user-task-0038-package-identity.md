---
id: HND-0075
type: research
from: orchestrator
to: engee_user
title: Установить production identity и source contract EngeeDSP
task_section: ../tasks/TASK-0038-restore-engeedsp-project-contract.md#scope
description: |
  background_research: false
  Используй только project-locked Engee production (`https://engee.com`), без
  devhub/fallback. Установи из реального production package/runtime evidence
  точные UUID, version и source/registry contract EngeeDSP, достаточные для
  Backender-owned Project.toml resolution. Подтверди публичные entrypoints
  EngeeDSP.Functions.pspectrum и findpeaks, уже используемые приложением и
  persistent `test/engee/**`. Не меняй product/Git/deploy и не записывай PAT.
  Если package недоступен обычному Pkg contract, верни точный supported loading
  contract или terminal platform blocker — не предлагай silent fallback.
acceptance_criteria:
  - Report содержит exact production environment и observed package identity/version/source.
  - Report отделяет verified facts от inference и даёт actionable FYI Backender.
  - No credentials, devhub/fallback or product/deployment mutation.
requested_skills:
  - engee-user/required-functionality-analysis
  - engee-user/engee-contract-testing
---
