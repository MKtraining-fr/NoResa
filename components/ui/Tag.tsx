import React from 'react';
import { MEMBER_STATUS } from '../../lib/format';

export type TagTone = 'success' | 'warning' | 'danger' | 'neutral';

const TONES: Record<TagTone, string> = {
  success: 'bg-success-soft text-success-text',
  warning: 'bg-warning-soft text-warning-text',
  danger: 'bg-danger-soft text-danger-text',
  neutral: 'bg-line-soft text-ink-2',
};

const Tag: React.FC<{ tone?: TagTone; className?: string; children: React.ReactNode }> = ({ tone = 'neutral', className = '', children }) => (
  <span className={`inline-flex items-center px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${TONES[tone]} ${className}`}>{children}</span>
);

/** Statut d'un membre, jamais affiché avec la valeur brute de la base. */
export const StatusTag: React.FC<{ status: string }> = ({ status }) => {
  const s = MEMBER_STATUS[status];
  return <Tag tone={s?.tone ?? 'neutral'}>{s?.label ?? status}</Tag>;
};

export default Tag;
