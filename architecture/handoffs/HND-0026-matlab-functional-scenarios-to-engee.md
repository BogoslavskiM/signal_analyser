---
id: HND-0026
type: research
from: matlab_researcher
to: engee_user
title: Сравнить критические математические Signal Analyzer scenarios
task_section: ../tasks/TASK-0028-background-matlab-critical-scenarios.md#scope
description: >
  Использовать canonical matlab_clicker scenarios как comparison input, не как
  Engee pass. Ready oracles: SA-GRAPH-001 real one-sided Spectrum, ROI
  recomputation и RBW 855.5818/171.1164 mHz; SA-GRAPH-002 Linear/Log stored
  Min=0 с effective positive render floor и restoration; SA-GRAPH-003 linear
  power 0.5 ↔ -3.0102999566 dB; SA-UI-005/010 raw inclusive-ROI statistics;
  SA-UI-008 last-valid rollback; SA-UI-009 normalization не меняет raw
  calculations; SA-UI-011 typed settings dependencies/unknown clipped
  defaults. Сохранить gaps: SA-GRAPH-004 complex behavior documentation-only;
  Peaks Minimum Distance docs=0 против observed R2024b=1; Persistence не даёт
  numeric power-bin count; zero-power dB floor и часть type-specific validation
  не наблюдались. Engee comparison ещё не запускался: latest_result not_run или
  blocked, но не passed.
acceptance_criteria:
  - Observed, formula-derived, docs-derived и blocked claims не смешиваются.
  - Engee comparison result хранится отдельно от MATLAB catalog coverage.
  - Подтверждённые product gaps возвращаются Orchestrator с evidence.
---
