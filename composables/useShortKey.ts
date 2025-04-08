import { onKeyStroke } from "@vueuse/core";

type ModifierKey = "ctrl" | "meta" | "alt" | "shift";
type LetterKey = Lowercase<
  | "a"
  | "b"
  | "c"
  | "d"
  | "e"
  | "f"
  | "g"
  | "h"
  | "i"
  | "j"
  | "k"
  | "l"
  | "m"
  | "n"
  | "o"
  | "p"
  | "q"
  | "r"
  | "s"
  | "t"
  | "u"
  | "v"
  | "w"
  | "x"
  | "y"
  | "z"
>;

type ShortcutKey =
  | `${ModifierKey}_${LetterKey}`
  | `${ModifierKey}_${LetterKey}_${LetterKey}`
  | `${ModifierKey}_${ModifierKey}_${LetterKey}`
  | `${ModifierKey}_${ModifierKey}_${LetterKey}_${LetterKey}`
  | `${ModifierKey}_${ModifierKey}_${ModifierKey}_${LetterKey}`;

export function useShortKey(
  shortcut: ShortcutKey,
  callback: (e: KeyboardEvent) => void
) {
  const parts = shortcut.split("_");
  const key = parts.pop() as string;
  const modifiers = new Set(parts);

  console.log("key", key);

  //   document.onkeypress = (e) => {
  //     e.preventDefault();
  //     // Check if the modifiers match exactly
  //     const hasCtrl = modifiers.has("ctrl")
  //       ? e.ctrlKey
  //       : e.ctrlKey === true
  //       ? false
  //       : true;
  //     const hasMeta = modifiers.has("meta")
  //       ? e.metaKey
  //       : e.metaKey === true
  //       ? false
  //       : true;
  //     const hasAlt = modifiers.has("alt")
  //       ? e.altKey
  //       : e.altKey === true
  //       ? false
  //       : true;
  //     const hasShift = modifiers.has("shift")
  //       ? e.shiftKey
  //       : e.shiftKey === true
  //       ? false
  //       : true;

  //     const hasKey = e.code === `Key${key.toUpperCase()}`;

  //     const isTriggerCallback =
  //       hasCtrl && hasMeta && hasAlt && hasShift && hasKey;

  //     console.log(
  //       "🚀 ~ isTriggerCallback:",
  //       e.charCode,
  //       e.code === `Key${key.toUpperCase()}`,
  //       e.key
  //     );

  //     if (isTriggerCallback) {
  //       callback(e);
  //     }
  //   };

  onKeyStroke(key, (e) => {
    console.log("e::", modifiers, e.altKey, e);

    // Check if the modifiers match exactly
    const hasCtrl = modifiers.has("ctrl")
      ? e.ctrlKey
      : e.ctrlKey === true
      ? false
      : true;
    const hasMeta = modifiers.has("meta")
      ? e.metaKey
      : e.metaKey === true
      ? false
      : true;
    const hasAlt = modifiers.has("alt")
      ? e.altKey
      : e.altKey === true
      ? false
      : true;
    const hasShift = modifiers.has("shift")
      ? e.shiftKey
      : e.shiftKey === true
      ? false
      : true;

    // Ensure that all the required modifiers are active, and ignore extra ones
    const isTriggerCallback = hasCtrl && hasMeta && hasAlt && hasShift;

    if (isTriggerCallback) {
      callback(e);
    }
  });
}
