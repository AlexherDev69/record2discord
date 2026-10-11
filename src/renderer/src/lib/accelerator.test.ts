import { describe, expect, it } from 'vitest';
import { acceleratorFromKeyPress, type KeyPress } from './accelerator';

function press(code: string, modifiers: Partial<KeyPress> = {}): KeyPress {
  return { code, ctrlKey: false, altKey: false, shiftKey: false, ...modifiers };
}

describe('acceleratorFromKeyPress', () => {
  it('should give the key alone when no modifier is held', () => {
    expect(acceleratorFromKeyPress(press('F9'))).toBe('F9');
  });

  it('should prefix the modifiers when some are held', () => {
    expect(acceleratorFromKeyPress(press('KeyR', { ctrlKey: true, shiftKey: true }))).toBe('Ctrl+Shift+R');
    expect(acceleratorFromKeyPress(press('Digit5', { altKey: true }))).toBe('Alt+5');
  });

  it('should name numpad digits the way the system expects', () => {
    expect(acceleratorFromKeyPress(press('Numpad0'))).toBe('num0');
  });

  it('should return null when only a modifier is pressed', () => {
    expect(acceleratorFromKeyPress(press('ControlLeft', { ctrlKey: true }))).toBeNull();
  });

  it('should return null when the key is not supported', () => {
    expect(acceleratorFromKeyPress(press('Escape'))).toBeNull();
    expect(acceleratorFromKeyPress(press('F25'))).toBeNull();
  });
});
