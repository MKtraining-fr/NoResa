// Formats fr-FR uniques : montants, pourcentages, téléphones, dates, statuts.

const EUR = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
const EUR_ROUND = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const NUM = new Intl.NumberFormat('fr-FR');
const PCT = new Intl.NumberFormat('fr-FR', { style: 'percent', maximumFractionDigits: 1 });

/** 29,90 € — back-office : toujours 2 décimales */
export const eur = (n: number | null | undefined) => (n == null ? '—' : EUR.format(n));

/** 45 € / 29,90 € — sites publics : décimales seulement si nécessaires */
export const eurPublic = (n: number) => (Number.isInteger(n) ? EUR_ROUND.format(n) : EUR.format(n));

/** 18 540 */
export const num = (n: number | null | undefined) => (n == null ? '—' : NUM.format(n));

/** 98,2 % — attend un ratio (0.982) */
export const pct = (ratio: number | null | undefined) => (ratio == null ? '—' : PCT.format(ratio));

/** 06 33 23 35 80 — garde la valeur brute si ce n'est pas un numéro FR à 10 chiffres */
export const phone = (raw?: string | null) => {
  if (!raw) return '—';
  const d = raw.replace(/\D/g, '');
  if (d.length === 10) return d.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  if (d.length === 11 && d.startsWith('33')) return ('0' + d.slice(2)).replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  return raw;
};

/** 6 nov. */
export const dateShort = (d: string | Date) =>
  new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

/** 04/11/2026 */
export const dateNum = (d: string | Date) => new Date(d).toLocaleDateString('fr-FR');

/** Mercredi 4 novembre 2026 */
export const dateLong = (d: string | Date = new Date()) => {
  const s = new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/** Statuts membre affichés — jamais « ACTIVE » */
export const MEMBER_STATUS: Record<string, { label: string; tone: 'success' | 'warning' | 'danger' | 'neutral' }> = {
  active:   { label: 'Actif', tone: 'success' },
  expiring: { label: 'Expire bientôt', tone: 'warning' },
  expired:  { label: 'Expiré', tone: 'danger' },
  unpaid:   { label: 'Impayé', tone: 'danger' },
  blocked:  { label: 'Bloqué', tone: 'danger' },
  prospect: { label: 'Prospect', tone: 'neutral' },
  archived: { label: 'Archivé', tone: 'neutral' },
};
