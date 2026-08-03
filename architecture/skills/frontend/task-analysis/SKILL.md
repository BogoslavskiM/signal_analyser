---
name: task-analysis
---
# Анализ задачи Frontend

Применяй перед implementation для каждого frontend handoff.

1. Прочитай handoff, связанный раздел task, пользовательское ТЗ, UI-документацию
   и затрагиваемый frontend-код.
2. Зафиксируй frontend scope: пользовательские зоны, controls, данные для
   отображения, действия пользователя и требуемые состояния интерфейса.
3. Изучи текущий API client, backend contracts и handoff об изменениях API.
   Для каждого UI action/data укажи method, path, request, response, errors и
   lifecycle; отдельно отметь изменённые контракты.
4. Отдели изменяемые файлы и существующее поведение от нового scope; явно
   укажи out of scope.
5. Не придумывай backend semantics. Если данных, поля или endpoint не хватает,
   отправь Backender `task` handoff. В `description` укажи недостающие данные,
   затронутый UI и желаемое расширение API.
6. Заверши этап списком UI deliverables, используемых API contracts и contract
   gaps.

Если contract gap блокирует работу, не начинай зависимую часть implementation
до ответа Backender. Отдельного backend-contract analysis этапа нет.
