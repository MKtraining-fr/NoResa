import React from 'react';
import { Check } from 'lucide-react';

const COLUMNS: Record<number, string> = { 3: 'grid-cols-3', 4: 'grid-cols-4', 5: 'grid-cols-5' };

/** `current` part de 0. */
const Stepper: React.FC<{ steps: React.ReactNode[]; current: number; className?: string }> = ({ steps, current, className = '' }) => (
  <ol className={`grid ${COLUMNS[steps.length] ?? 'grid-cols-4'} border-t-2 border-ink ${className}`}>
    {steps.map((label, i) => {
      const done = i < current;
      const active = i === current;
      return (
        <li key={i} aria-current={active ? 'step' : undefined} className={`py-2 flex items-center gap-1.5 ${done || active ? 'border-t-4 border-primary -mt-0.5' : ''} ${active ? 'font-extrabold text-ink' : done ? 'text-ink' : 'text-muted'}`}>
          {done ? <Check size={14} className="text-primary shrink-0" /> : <span className="tabular-nums">{i + 1}</span>}
          <span>{label}</span>
        </li>
      );
    })}
  </ol>
);

export default Stepper;
