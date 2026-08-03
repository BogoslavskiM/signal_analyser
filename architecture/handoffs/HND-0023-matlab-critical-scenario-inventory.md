---
id: HND-0023
type: research
from: orchestrator
to: matlab_researcher
title: Фоновый inventory критических Signal Analyzer scenarios
task_section: ../tasks/TASK-0014-engee-signal-analyser-ui-parity.md#user-ts-зоны-и-наблюдаемые-элементы
description: >
  background_research: true. Не блокируя текущую разработку, прочитай
  сохранённый Signal Analyzer scenario catalog из проекта matlab_clicker через
  документированный read API, если он доступен, иначе напрямую из
  канонического каталога. Зафиксируй snapshot/provenance, выдели critical
  пользовательские, математические, validation/error и persistence workflows,
  найди gaps и сформируй coverage matrix. MATLAB GUI имеет только одного
  writer; не запускай параллельные clicker-сессии. Не изменяй SignalAnalyser.
acceptance_criteria:
  - Catalog inventory содержит scenario ID/path, criticality и evidence.
  - Каждый critical scenario имеет downstream owner/handoff mapping либо gap.
  - Verdict использует точное поле all_critical_scenarios_covered и объясняет scope.
  - Report отправлен Orchestrator; UI scenarios отдельно маршрутизированы E2E.
---
