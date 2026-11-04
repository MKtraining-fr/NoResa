import React from 'react';
import { ChevronRight } from 'lucide-react';

export const Table: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <div className={`bg-surface border border-line overflow-x-auto ${className}`}>
    <table className="w-full text-left text-base text-ink">{children}</table>
  </div>
);

export const Th: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({ className = '', children, ...rest }) => (
  <th className={`px-4 py-2.5 border-b-2 border-ink text-xs font-semibold uppercase tracking-[0.08em] text-muted whitespace-nowrap ${className}`} {...rest}>{children}</th>
);

export const Tr: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ className = '', onClick, children, ...rest }) => (
  <tr onClick={onClick} className={`group hover:bg-ground-2 transition-colors ${onClick ? 'cursor-pointer' : ''} ${className}`} {...rest}>{children}</tr>
);

export const Td: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({ className = '', children, ...rest }) => (
  <td className={`px-4 py-2.5 border-b border-line-soft ${className}`} {...rest}>
    {children === null || children === undefined || children === '' ? <span className="text-subtle">—</span> : children}
  </td>
);

/** Dernière cellule d'une ligne cliquable. */
export const ChevronCell: React.FC = () => (
  <td className="w-8 pr-3 border-b border-line-soft text-muted group-hover:text-primary transition-colors"><ChevronRight size={16} /></td>
);

/** Ligne d'intertitre, par exemple « Avec engagement ». */
export const GroupRow: React.FC<{ colSpan: number; children: React.ReactNode }> = ({ colSpan, children }) => (
  <tr><td colSpan={colSpan} className="bg-ground px-4 py-2 text-sm font-extrabold border-b border-line">{children}</td></tr>
);

const initialsOf = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((w) => w.charAt(0)).join('').toUpperCase() || '?';

export const Avatar: React.FC<{ name: string; photoUrl?: string | null }> = ({ name, photoUrl }) => (
  photoUrl
    ? <img src={photoUrl} alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
    : <span className="h-8 w-8 rounded-full bg-line-soft text-ink-2 text-xs font-semibold inline-flex items-center justify-center shrink-0">{initialsOf(name)}</span>
);

/** Cellule membre : avatar, nom, e-mail en minuscules. */
export const MemberCell: React.FC<{ name: string; email?: string | null; photoUrl?: string | null }> = ({ name, email, photoUrl }) => (
  <div className="flex items-center gap-3 min-w-0">
    <Avatar name={name} photoUrl={photoUrl} />
    <div className="min-w-0">
      <div className="font-semibold truncate">{name}</div>
      <div className="text-sm text-muted truncate">{email ? email.toLowerCase() : 'Pas d\'e-mail'}</div>
    </div>
  </div>
);
