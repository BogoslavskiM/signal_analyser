# DevOps skills

- `devops-workflow` — единый автономный pipeline для `new_feature_branch`,
  `deploy` и `merge_feature` requests поверх основной ветки `neuro_dev`.

DevOps subskills отсутствуют. Каждый request сам оценивает полный ordered
pipeline checkout → add → commit → push → accepted integration → Engee update
→ restart и помечает ненужные этапы как `not_needed`.
