import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';

interface CommittedNumberInputProps {
  id?: string;
  value: number;
  onCommit: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
}

/**
 * Input numérico controlado localmente.
 * Só propaga via onCommit ao perder o foco (onBlur) ou ao pressionar Enter.
 * Evita perda de foco a cada keystroke quando o pai re-renderiza.
 */
const CommittedNumberInput = ({
  id,
  value,
  onCommit,
  min,
  max,
  disabled,
  className,
}: CommittedNumberInputProps) => {
  const [local, setLocal] = useState<string>(String(value));

  // Sincroniza quando o valor externo muda (ex: vindo do banco) e o input não está em foco
  useEffect(() => {
    if (document.activeElement?.id !== id) {
      setLocal(String(value));
    }
  }, [value, id]);

  const commit = () => {
    const parsed = Number(local);
    if (Number.isNaN(parsed)) {
      setLocal(String(value));
      return;
    }
    let next = parsed;
    if (typeof min === 'number') next = Math.max(min, next);
    if (typeof max === 'number') next = Math.min(max, next);
    setLocal(String(next));
    if (next !== value) onCommit(next);
  };

  return (
    <Input
      id={id}
      type="number"
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
      min={min}
      max={max}
      disabled={disabled}
      className={className}
    />
  );
};

export default CommittedNumberInput;
