import type { ReactNode } from 'react';

interface SectionProps {
  title: string;
  children: ReactNode;
}

interface FieldProps {
  label: string;
  hint?: string;
  children: ReactNode;
}

interface TextFieldProps {
  label: string;
  hint?: string;
  value: string;
  secret?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
}

interface NumberFieldProps {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}

interface SelectOption {
  value: number;
  label: string;
}

interface SelectFieldProps {
  label: string;
  hint?: string;
  value: number;
  options: SelectOption[];
  onChange: (value: number) => void;
}

interface CheckboxFieldProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function Section({ title, children }: SectionProps) {
  return (
    <section className="card">
      <h2>{title}</h2>
      <div className="fields">{children}</div>
    </section>
  );
}

export function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
      {hint !== undefined && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function TextField({ label, hint, value, secret = false, placeholder, onChange }: TextFieldProps) {
  return (
    <Field label={label} hint={hint}>
      <input
        type={secret ? 'password' : 'text'}
        value={value}
        placeholder={placeholder}
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}

export function NumberField({ label, hint, value, min, max, onChange }: NumberFieldProps) {
  return (
    <Field label={label} hint={hint}>
      <input type="number" value={value} min={min} max={max} onChange={(event) => onChange(Number(event.target.value))} />
    </Field>
  );
}

export function SelectField({ label, hint, value, options, onChange }: SelectFieldProps) {
  return (
    <Field label={label} hint={hint}>
      <select value={value} onChange={(event) => onChange(Number(event.target.value))}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function CheckboxField({ label, hint, checked, onChange }: CheckboxFieldProps) {
  return (
    <label className="field field-checkbox">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>
        <span className="field-label">{label}</span>
        {hint !== undefined && <span className="field-hint">{hint}</span>}
      </span>
    </label>
  );
}
