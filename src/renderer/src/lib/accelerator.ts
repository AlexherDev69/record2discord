/** The parts of a keyboard event needed to describe a shortcut. */
export interface KeyPress {
  code: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

const NAVIGATION_KEYS = ['Insert', 'Home', 'End', 'PageUp', 'PageDown'];
const FUNCTION_KEY_PATTERN = /^F([1-9]|1[0-9]|2[0-4])$/;

/** Name of the pressed key in a system-wide shortcut, or null when the key cannot be used in one. */
function keyName(code: string): string | null {
  const letterOrDigit = /^(?:Key([A-Z])|Digit([0-9]))$/.exec(code);
  if (letterOrDigit !== null) {
    return letterOrDigit[1] ?? letterOrDigit[2] ?? null;
  }
  const numpadDigit = /^Numpad([0-9])$/.exec(code);
  if (numpadDigit !== null) {
    return `num${numpadDigit[1]}`;
  }
  return FUNCTION_KEY_PATTERN.test(code) || NAVIGATION_KEYS.includes(code) ? code : null;
}

/** Turns a key press into a shortcut such as `Ctrl+Shift+F9`, or null when no usable key is pressed yet. */
export function acceleratorFromKeyPress(press: KeyPress): string | null {
  const key = keyName(press.code);
  if (key === null) {
    return null;
  }
  const pressed = [press.ctrlKey ? 'Ctrl' : null, press.altKey ? 'Alt' : null, press.shiftKey ? 'Shift' : null];
  const modifiers = pressed.filter((modifier) => modifier !== null);
  // The shortcut is taken from every application: a bare letter or digit would no longer be typable.
  if (modifiers.length === 0 && !FUNCTION_KEY_PATTERN.test(key)) {
    return null;
  }
  return [...modifiers, key].join('+');
}
