import React from 'react';

export interface TabItem<T extends string> {
  value: T;
  label: React.ReactNode;
}

interface TabsProps<T extends string> {
  items: TabItem<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

/** Version unique des onglets : texte sur filet, onglet actif souligné en rouge. */
function Tabs<T extends string>({ items, value, onChange, className = '' }: TabsProps<T>) {
  return (
    <div role="tablist" className={`flex gap-7 border-b border-line ${className}`}>
      {items.map((t) => {
        const on = t.value === value;
        return (
          <button
            key={t.value} type="button" role="tab" aria-selected={on} onClick={() => onChange(t.value)}
            className={`pb-2.5 font-semibold transition-colors -mb-px ${on ? 'text-ink border-b-3 border-primary' : 'text-muted hover:text-ink'}`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

export default Tabs;
