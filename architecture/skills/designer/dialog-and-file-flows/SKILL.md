# Dialog and File Flows Designer

## Назначение и выбор references

Спроектируй modal flow и загружай только нужные native references:

- base/error/success: `reference/dialog-system.html` и `.css`;
- server-side paths: `reference/file-browser-dialog.html` и `.css`;
- full session: `reference/session-import-export-ui.html` и `.css`;
- selected objects: `reference/object-export-dialog.html` и `.css`.

## Порядок работы

1. Определи trigger, title, content, primary/secondary actions и явный close.
2. Покрой form, validation, busy, error, success и recovery states.
3. Задай modal width/height, scroll body, fixed actions и required viewports.
4. Для file browser определи path bar, tree/list, selection, root boundary,
   filter, empty/loading/error states и возврат в исходный dialog.
5. Для import/export покажи выбранный operation, inputs, progress, result и
   последствия destructive replacement, если они заданы ТЗ.
6. Задай stacking так, чтобы дочерний browser/error не уничтожил parent form.
7. Составь overlay inventory и явную priority table для всех одновременно
   возможных dialog, backdrop, dropdown, popover, tooltip, toast и loader.

## Overlay priority contract

Для каждого сочетания overlays задай не только значения/токены уровней, но и
наблюдаемое правило приоритета:

- поверхность выше собственного backdrop, а child popup выше родительской
  поверхности;
- актуальное blocking window выше ранее открытых blocking windows;
- новый modal/error/file browser перекрывает оставшиеся открытыми dropdown,
  popover и tooltip нижнего уровня;
- passive toast не перекрывает active modal controls и не забирает у них
  interaction priority;
- нижние overlays сохраняют state, но не получают pointer/focus, пока закрывающий
  их blocking layer активен;
- после закрытия верхнего layer восстанавливаются следующий по приоритету layer
  и ожидаемая focus target.

Запиши допустимые одновременные combinations, topmost owner, backdrop/surface/
child order, pointer blocking, focus owner и restoration target в `DESIGN.md`.
Не полагайся только на большие произвольные `z-index`: контракт должен работать
с учётом stacking contexts и DOM placement.

Не определяй file API, export formats, backend defaults, atomic import,
request guards, focus trap implementation или domain serialization. Не
показывай operation, которой нет в ТЗ.

## Проверка и завершение

Проверь каждое действие и закрытие, busy protection, возврат после ошибки,
stacking, scroll и keyboard-visible focus expectation. Для каждого разрешённого
overlay combination сделай screenshot верхнего состояния и состояния после
закрытия top layer. Запиши flow/state/overlay-priority matrix в `DESIGN.md`.
