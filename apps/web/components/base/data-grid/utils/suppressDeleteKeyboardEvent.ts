import type { SuppressKeyboardEventParams } from 'ag-grid-community';

export function suppressDeleteKeyboardEvent(
  params: SuppressKeyboardEventParams
) {
  const key = params.event.key;
  const deleteKeys = ['Backspace', 'Delete'];

  return deleteKeys.some(
    suppressedKey =>
      suppressedKey === key || key.toUpperCase() === suppressedKey
  );
}
