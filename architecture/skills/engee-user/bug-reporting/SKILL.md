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
- `status: confirmed|suspected` и `stub_authorization: true|false`;
- точный affected product call site, если он уже существует;
- механический recovery: какой commented Engee call восстановить и какой stub
  удалить после pass того же regression test;
- unresolved questions.

Статус `confirmed` допустим только при воспроизводимом минимальном case и
достаточной изоляции. Иначе используй `suspected` и явно напиши, какого
evidence не хватает. `stub_authorization: true` допустим только для
`status: confirmed`; suspected finding, environment failure и документационное
расхождение его не разрешают. Orchestrator получает ссылку, короткий summary,
affected contract, stub authorization и recovery trigger; полный технический
материал остаётся в bug-файле.

Не помещай PAT, внутренние prompts, случайные runtime dumps или непроверенные
утверждения. Bug report не разрешает Engee emulation, fake success или
deployment. Он разрешает только adjacent explicit unavailable stub в product
call site по отдельному Backender handoff.

Перед завершением проверь ссылку на воспроизводящий test, status/stub
authorization consistency, affected call site, recovery trigger, минимальное
evidence и отсутствие секретов; сообщи Orchestrator путь файла, impact и один
следующий шаг.
