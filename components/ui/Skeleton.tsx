import React from 'react';

/** Bloc de chargement à la taille du contenu final (à la place des « … »). */
const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div aria-hidden className={`bg-line-soft animate-pulse ${className}`} />
);

export const EmptyState: React.FC<{ title: React.ReactNode; children?: React.ReactNode; action?: React.ReactNode }> = ({ title, children, action }) => (
  <div className="px-4 py-12 text-center">
    <p className="font-semibold text-ink">{title}</p>
    {children && <p className="text-sm text-muted mt-1">{children}</p>}
    {action && <div className="mt-4 inline-flex">{action}</div>}
  </div>
);

export default Skeleton;
