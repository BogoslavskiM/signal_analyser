---
name: merge-accepted-task
---
# Merge Accepted Task

## When to Use
- Architect явно сообщил, что пользователь принял завершённую задачу.
- Нужно собрать commits рабочей `neuro_*`-ветки в один commit на `dev`.

## When NOT to Use
- Принятие сообщил не Architect.
- Architect не подтвердил явное принятие задачи пользователем.
- Рабочая ветка не соответствует `neuro_*`.

## Required Handoff
```text
source_branch:
user_acceptance_confirmed: true
task_summary:
changed_zones:
```

## Workflow
1. Убедись, что handoff пришёл явно от Architect.
2. Повтори clean-worktree gate, включая untracked-файлы. При нарушении прекрати
   операцию и верни handoff Architect.
3. Не перезапускай локальные тесты: для merge используется уже принятый
   результат задачи.
4. Переключись на `dev`.
5. Обнови `dev` командой `git pull --ff-only`.
6. Выполни squash merge исходной `neuro_*`-ветки.
7. При конфликте не исправляй файлы самостоятельно. Прекрати merge и передай
   Architect конфликтующие пути и Git diagnostics.
8. Создай один commit на `dev`: короткая русская тема и подробное тело с
   описанием выполненной задачи и затронутых зон.
9. Выполни push ветки `dev`.
10. Удали локальную squash-ветку через `git branch -D <source_branch>` и
    удалённую через `git push origin --delete <source_branch>`.
11. Выполни deployment ветки `dev` в окружение dev через
    `devops/engee-environment-deployment`.

## Guardrails
- Только явный Architect handoff может запустить merge.
- Architect передаёт подтверждение только после явного принятия пользователем.
- Не используй rebase merge или обычный merge commit.
- Не переписывай историю `dev`.
- Не разрешай конфликты и не изменяй product source.
- Ошибка deployment не является основанием для автоматического rollback.

## Output
```text
source_branch:
squash_commit_sha:
tests: not_rerun_after_acceptance
push:
local_branch_deleted:
remote_branch_deleted:
deployment:
diagnostics:
```
