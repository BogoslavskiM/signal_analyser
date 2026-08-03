---
name: genie-deploy
---
# Genie Deploy

Запускать только по явному deploy handoff с выбранными файлами.

1. Прочитать `[engee_target]` project manifest и использовать только
   зафиксированный environment.
2. При необходимости запустить Engee или остановить целевое Genie-приложение.
3. Проверить текущую локальную ветку через `git branch --show-current`.
4. Если имя не начинается с `neuro_`, создать смысловую ветку командой
   `git checkout -b "neuro_<task_name>"`.
5. Только после проверки ветки добавить исключительно выбранные файлы,
   проверить staged diff, выполнить commit и push.
6. В Engee проверить отсутствие посторонних изменений, выполнить checkout
   нужной ветки и fast-forward pull. Убедиться, что развернут нужный commit.
7. Запустить Genie-приложение с постоянным log-файлом и получить его статус.
8. Вернуть `report` handoff: branch, commit, committed files, start status,
   логи, диагностику и application link. Ссылку не открывать.

Не применять reset, clean или stash; не добавлять посторонние файлы; не
сохранять PAT и другие секреты.
