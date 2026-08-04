---
name: bug-reporting
---
# Engee Bug Reporting

Создавай один файл
`architecture/engee_bugs/ENGEE-<engee_version>-<short-title>.md` только после
contract execution и достаточной локализации.

## Required evidence

- environment, Engee/package versions и exact public function;
- contract source и affected application call site;
- минимальное воспроизведение без credentials;
- inputs, expected MATLAB/contract behavior и actual Engee behavior/error;
- repeatability, isolation level и localization result;
- impact, affected scenarios, cleanup и известный workaround;
- persistent `test/engee/**` regression path;
- unresolved questions.

Статус `confirmed` допустим только при воспроизводимом минимальном case и
достаточной изоляции. Иначе используй `suspected` и явно напиши, какого
evidence не хватает. Orchestrator получает ссылку, короткий summary и affected
contract; полный технический материал остаётся в bug-файле.

Не помещай PAT, внутренние prompts, случайные runtime dumps или непроверенные
утверждения. Bug report не разрешает product fix или deployment.
