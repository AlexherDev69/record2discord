import type { KeyboardEvent } from 'react';
import { acceleratorFromKeyPress } from '../lib/accelerator';
import { Field } from './fields';

interface ShortcutFieldProps {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}

const CLEAR_KEYS = ['Backspace', 'Delete'];

/** Field recording the shortcut pressed while it has the focus. */
export function ShortcutField({ label, hint, value, onChange }: ShortcutFieldProps) {
  const record = (event: KeyboardEvent): void => {
    if (event.code === 'Tab') {
      return;
    }
    event.preventDefault();
    if (CLEAR_KEYS.includes(event.code)) {
      onChange('');
      return;
    }
    const accelerator = acceleratorFromKeyPress(event);
    if (accelerator !== null) {
      onChange(accelerator);
    }
  };

  return (
    <Field label={label} hint={hint}>
      <input type="text" value={value} placeholder="Aucun : clique ici puis appuie sur une touche" readOnly onKeyDown={record} />
    </Field>
  );
}
