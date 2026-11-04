import React from 'react';

export interface ChoiceOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

interface SegmentedProps<T extends string> {
  options: ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** primary : règlement, civilité. neutral : filtres (vue du planning, catégories). */
  tone?: 'primary' | 'neutral';
  /** lg : 44 px, pour les écrans utilisés sur tablette. */
  size?: 'md' | 'lg';
  className?: string;
}

/** Choix exclusif court. */
export function Segmented<T extends string>({ options, value, onChange, tone = 'primary', size = 'md', className = '' }: SegmentedProps<T>) {
  const active = tone === 'primary' ? 'bg-primary text-white font-semibold' : 'bg-ink text-white font-semibold';
  return (
    <div role="radiogroup" className={`inline-flex flex-wrap border border-subtle ${className}`}>
      {options.map((o, i) => (
        <button
          key={o.value} type="button" role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}
          className={`${size === 'lg' ? 'h-11' : 'h-9'} px-3 flex items-center text-base transition-colors ${i > 0 ? 'border-l border-subtle' : ''} ${o.value === value ? active : 'bg-surface text-ink hover:bg-ground'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export interface GridOption<T extends string> {
  value: T;
  name: React.ReactNode;
  detail?: React.ReactNode;
}

interface OptionGridProps<T extends string> {
  options: GridOption<T>[];
  /** Valeurs sélectionnées : une seule pour une formule, plusieurs pour des services. */
  selected: T | T[] | null;
  onSelect: (value: T) => void;
  title?: React.ReactNode;
  help?: React.ReactNode;
  columns?: 3 | 4;
}

/** Grille à filets pour choisir une formule ou un service. */
export function OptionGrid<T extends string>({ options, selected, onSelect, title, help, columns = 3 }: OptionGridProps<T>) {
  const isSelected = (v: T) => (Array.isArray(selected) ? selected.includes(v) : selected === v);
  const empty = (columns - (options.length % columns)) % columns;
  return (
    <div>
      {(title || help) && (
        <div className="flex items-baseline justify-between gap-4 mb-1.5">
          <span className="text-sm font-extrabold text-ink">{title}</span>
          {help && <span className="text-xs text-muted">{help}</span>}
        </div>
      )}
      <div className={`grid gap-px bg-subtle border border-subtle ${columns === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1 sm:grid-cols-3'}`}>
        {options.map((o) => {
          const on = isSelected(o.value);
          return (
            <button
              key={o.value} type="button" aria-pressed={on} onClick={() => onSelect(o.value)}
              className={`text-left p-2.5 px-3 transition-colors ${on ? 'bg-primary-soft outline outline-2 -outline-offset-2 outline-primary' : 'bg-surface hover:bg-ground-2'}`}
            >
              <span className={`block ${on ? 'font-extrabold text-primary-dark' : 'font-semibold text-ink'}`}>{o.name}</span>
              {o.detail && <span className={`block tabular-nums ${on ? 'text-primary-dark' : 'text-muted'}`}>{o.detail}</span>}
            </button>
          );
        })}
        {Array.from({ length: empty }, (_, i) => <span key={i} aria-hidden className="hidden sm:block bg-surface" />)}
      </div>
    </div>
  );
}
