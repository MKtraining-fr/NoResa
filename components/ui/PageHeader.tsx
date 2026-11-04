import React from 'react';

/** Haut de page : secondaires d'abord, action principale en dernier. */
const PageHeader: React.FC<{ title: React.ReactNode; subtitle?: React.ReactNode; actions?: React.ReactNode; ruled?: boolean; className?: string }> = ({ title, subtitle, actions, ruled = true, className = '' }) => (
  <header className={`flex items-end gap-4 ${ruled ? 'border-b-2 border-ink pb-3.5' : ''} ${className}`}>
    <div className="min-w-0">
      <h1 className="text-2xl font-extrabold text-ink">{title}</h1>
      {subtitle && <p className="text-base text-muted mt-0.5">{subtitle}</p>}
    </div>
    {actions && <div className="ml-auto flex flex-wrap justify-end gap-2 shrink-0 max-w-full">{actions}</div>}
  </header>
);

export default PageHeader;
