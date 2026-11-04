import React from 'react';
import Skeleton from './Skeleton';

interface CardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  /** Filet fort sous le titre, pour un panneau contenant une liste. */
  ruled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ title, subtitle, action, ruled, className = '', children }) => (
  <section className={`bg-surface border border-line p-5 ${className}`}>
    {(title || action) && (
      <div className={`flex items-start gap-3 ${ruled ? 'border-b-2 border-ink pb-2.5 mb-3' : 'mb-4'}`}>
        <div className="min-w-0">
          {title && <h3 className="text-lg font-extrabold text-ink">{title}</h3>}
          {subtitle && <p className="text-sm text-muted">{subtitle}</p>}
        </div>
        {action && <div className="ml-auto shrink-0">{action}</div>}
      </div>
    )}
    {children}
  </section>
);

export interface Stat {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  /** Le sous-texte signale une tendance positive. */
  positive?: boolean;
}

const COLUMNS: Record<number, string> = { 2: 'grid-cols-2', 3: 'grid-cols-3', 4: 'grid-cols-4' };

/** Indicateurs clés dans une seule boîte, séparés par des filets. */
export const StatRow: React.FC<{ stats: Stat[]; loading?: boolean; className?: string }> = ({ stats, loading, className = '' }) => (
  <div className={`grid ${COLUMNS[stats.length] ?? 'grid-cols-4'} bg-surface border border-line ${className}`}>
    {stats.map((s, i) => (
      <div key={i} className={`px-5 py-4 min-w-0 ${i > 0 ? 'border-l border-line' : ''}`}>
        <div className="text-sm font-semibold text-muted">{s.label}</div>
        {loading ? (
          <Skeleton className="h-8 w-28 mt-1.5" />
        ) : (
          <div className="text-3xl font-extrabold tabular-nums text-ink mt-1.5 truncate">{s.value}</div>
        )}
        {s.sub && <div className={`text-sm mt-1 ${s.positive ? 'text-success font-semibold' : 'text-muted'}`}>{s.sub}</div>}
      </div>
    ))}
  </div>
);
