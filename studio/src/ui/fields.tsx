// Campos de formulário reutilizáveis: rótulo + ajuda, número tolerante e seletor de IVA.
import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { VAT_RATES } from "../lib/model";

interface FieldProps {
  label: string;
  children: ReactNode;
  hint?: string;
  hintTone?: "warn";
  className?: string;
}

export function Field({ label, children, hint, hintTone, className }: FieldProps) {
  return (
    <label className={`field${className ? ` ${className}` : ""}`}>
      <span className="field__label">{label}</span>
      {children}
      {hint && <span className={`field__hint${hintTone ? ` field__hint--${hintTone}` : ""}`}>{hint}</span>}
    </label>
  );
}

const parseLoose = (text: string) => parseFloat(text.replace(",", ".")) || 0;

interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  integer?: boolean;
  className?: string;
  ariaLabel?: string;
}

/** Campo numérico que aceita vírgula decimal e mantém o texto escrito enquanto se edita. */
export function NumberInput({ value, onChange, min = 0, max, integer, className, ariaLabel }: NumberInputProps) {
  const [text, setText] = useState(String(value));

  useEffect(() => {
    // só reage a mudanças externas do valor
    if (parseLoose(text) !== value) setText(String(value));
  }, [value]);

  const commit = (raw: string) => {
    let n = parseLoose(raw);
    if (integer) n = Math.round(n);
    n = Math.max(n, min);
    if (max !== undefined) n = Math.min(n, max);
    onChange(n);
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      className={`input input--mono${className ? ` ${className}` : ""}`}
      value={text}
      aria-label={ariaLabel}
      onChange={(e) => {
        setText(e.target.value);
        commit(e.target.value);
      }}
      onBlur={() => setText(String(value))}
      onFocus={(e) => e.target.select()}
    />
  );
}

interface VatSelectProps {
  value: number;
  onChange: (value: number) => void;
  ariaLabel?: string;
}

export function VatSelect({ value, onChange, ariaLabel }: VatSelectProps) {
  const rates = [...new Set([...VAT_RATES, value])].sort((a, b) => b - a);
  return (
    <select
      className="select input--mono"
      value={value}
      aria-label={ariaLabel}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {rates.map((r) => (
        <option key={r} value={r}>
          {r === 0 ? "Isento (0%)" : `${r}%`}
        </option>
      ))}
    </select>
  );
}
