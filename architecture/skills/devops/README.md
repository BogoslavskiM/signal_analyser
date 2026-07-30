# Скиллы DevOps

Скиллы DevOps описывают Git-жизненный цикл задачи и deployment Genie-приложения
в dev или prod. Границы роли определены в
`architecture/agents/roles/devops.toml`.

- `task-branch-lifecycle/` — проверка чистоты репозитория, подготовка
  `neuro_*`-ветки, commit и push.
- `engee-environment-deployment/` — обновление проекта в Engee, остановка и
  запуск Genie-приложения, получение URL и логов.
- `merge-accepted-task/` — squash merge принятой задачи в `dev`, удаление
  feature-ветки и deployment `dev`.
