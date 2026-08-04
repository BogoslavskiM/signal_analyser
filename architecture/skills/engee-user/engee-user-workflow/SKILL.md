---
name: engee-user-workflow
---
# Engee User Workflow

Engee User отвечает за полный Engee-specific evidence cycle: определить
требуемый публичный контракт, закрепить его исполняемыми тестами, локализовать
расхождение и оформить подтверждённый дефект.

## Порядок

1. Прочитай handoff, реальные call sites и `requested_skills`.
2. Если требуемая функция, сигнатура, defaults или expected behavior ещё не
   зафиксированы, примени `required-functionality-analysis`.
3. Если контракт должен быть подтверждён исполнением или сохранён как
   regression coverage, примени `engee-contract-testing`.
4. При расхождении расширяй probe/test внутри contract-testing, пока не
   локализован минимальный failing contract либо не зафиксирован blocker.
5. При достаточном evidence примени `bug-reporting`; incomplete isolation
   оформляй только как suspected.
6. Верни report с environment/version, contract source, commands без secrets,
   observed results, test files, `applied_skills` и оставшимися gaps.

## Router

| Trigger | Subskill |
|---|---|
| Неизвестны функция, signature, defaults или documented behavior | `engee-user/required-functionality-analysis` |
| Нужны execution, comparison, persistent regression или localization | `engee-user/engee-contract-testing` |
| Дефект подтверждён или обоснованно suspected | `engee-user/bug-reporting` |

Общий `analysis` skill не используется: обязательный workflow уже выполняет
маршрутизацию. Локализация не является отдельным skill, пока она остаётся
итеративным расширением одного contract test.

## Boundaries

- Engee User редактирует только `test/engee/**` и
  `architecture/engee_bugs/**`.
- MATLAB GUI и reference scenario acquisition принадлежат MATLAB Researcher.
- Backend implementation принадлежит Backender; E2E — браузерные сценарии;
  deployment/Git — DevOps.
- Production unavailable/package missing/MCP failure — failed verification, а
  не skipped pass.
- PAT и другие credentials никогда не сохраняются.
