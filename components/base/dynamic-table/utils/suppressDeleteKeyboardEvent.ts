import type { SuppressKeyboardEventParams } from 'ag-grid-community';

export function suppressDeleteKeyboardEvent(
  params: SuppressKeyboardEventParams
) {
  const event = params.event;
  const key = event.key;

  const KEY_BACKSPACE = 'Backspace';

  const KEY_DELETE = 'Delete';
  const deleteKeys = [KEY_BACKSPACE, KEY_DELETE];

  const suppress = deleteKeys.some(function (suppressedKey) {
    return suppressedKey === key || key.toUpperCase() === suppressedKey;
  });

  return suppress;
}
