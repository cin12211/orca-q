// ---------------- Hook implementation (không đổi) ---------------- //
import { onMounted, onUnmounted, ref, watch, type Ref, isRef } from 'vue';

// ---------------- Hotkey template types ---------------- //
/** Modifiers được hỗ trợ */
type ModKey = 'ctrl' | 'shift' | 'alt' | 'meta' | 'cmd' | 'mod';

/** Chữ cái a-z */
type Letter =
  | 'a'
  | 'b'
  | 'c'
  | 'd'
  | 'e'
  | 'f'
  | 'g'
  | 'h'
  | 'i'
  | 'j'
  | 'k'
  | 'l'
  | 'm'
  | 'n'
  | 'o'
  | 'p'
  | 'q'
  | 'r'
  | 's'
  | 't'
  | 'u'
  | 'v'
  | 'w'
  | 'x'
  | 'y'
  | 'z';

/** Số 0-9 */
type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

/** Các phím đặc biệt thường gặp */
type Special =
  | 'enter'
  | 'escape'
  | 'space'
  | 'tab'
  | 'backspace'
  | 'delete'
  | 'arrowup'
  | 'arrowdown'
  | 'arrowleft'
  | 'arrowright'
  | `f${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12}`;

/** Phím chính có thể bắt */
type MainKey = Letter | Digit | Special;

/**
 * Ghép tổ hợp modifiers + main key (hỗ trợ tối đa 4 modifier, đủ cho mọi trường hợp thực tế).
 *  - Cho phép 'escape' (không modifier)
 *  - Cho phép 'ctrl+s', 'shift+alt+p', 'ctrl+shift+alt+meta+x', …
 */
type HotkeyTemplate =
  | `${MainKey}` // không modifier
  | `${ModKey}+${MainKey}`
  | `${ModKey}+${ModKey}+${MainKey}`;
// | `${ModKey}+${ModKey}+${ModKey}+${MainKey}`
// | `${ModKey}+${ModKey}+${ModKey}+${ModKey}+${MainKey}`;

/** Hotkey object – key giờ dùng template type */
export interface Hotkey {
  key: HotkeyTemplate;
  callback: (e: KeyboardEvent) => void;
}

const MODIFIERS = ['ctrl', 'shift', 'alt', 'meta', 'cmd', 'mod'] as const;

const matchHotkey = (e: KeyboardEvent, template: string): boolean => {
  const parts = template.toLowerCase().replace(/\s+/g, '').split('+');
  const want = {
    ctrl: parts.includes('ctrl'),
    shift: parts.includes('shift'),
    alt: parts.includes('alt'),
    meta: parts.some(p => p === 'meta' || p === 'cmd' || p === 'mod'),
  };
  const main = parts.find(p => !MODIFIERS.includes(p as any)) ?? '';
  const hitMain = main ? e.key.toLowerCase() === main : true;

  return (
    hitMain &&
    e.ctrlKey === want.ctrl &&
    e.shiftKey === want.shift &&
    e.altKey === want.alt &&
    e.metaKey === want.meta
  );
};

export function useHotkeys(
  hotkeys: ReadonlyArray<Hotkey> | Ref<ReadonlyArray<Hotkey>>,
  {
    target = window,
    isPreventDefault = false,
  }: {
    target?: Window | HTMLElement | Ref<HTMLElement | undefined>;
    isPreventDefault?: boolean;
  } = {
    target: window,
    isPreventDefault: true,
  }
): void {
  const hotkeysRef: Ref<ReadonlyArray<Hotkey>> = isRef(hotkeys)
    ? hotkeys
    : ref(hotkeys);

  const getTarget = (): Window | HTMLElement | undefined =>
    isRef(target) ? target.value : target;

  const handler = (e: KeyboardEvent) => {
    for (const hk of hotkeysRef.value) {
      if (matchHotkey(e, hk.key)) {
        if (isPreventDefault) {
          e.preventDefault();
          e.stopImmediatePropagation();
          e.stopPropagation();
        }
        hk.callback(e);
        break;
      }
    }
  };

  const attach = () =>
    getTarget()?.addEventListener('keydown', handler as EventListener);
  const detach = () =>
    getTarget()?.removeEventListener('keydown', handler as EventListener);

  onMounted(attach);
  onUnmounted(detach);

  // ✨ Dùng lifecycle cho keep-alive component
  onActivated(attach);
  onDeactivated(detach);

  watch(
    [hotkeysRef, () => (isRef(target) ? target.value : target)],
    () => {
      detach();
      attach();
    },
    { flush: 'post' }
  );
}
