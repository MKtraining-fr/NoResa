import { supabase } from './supabaseClient';

/** Couche de données de la page Statistiques (RPC agrégés, scopés salle + staff). */

export interface AccessBreak { n: number; ca: number }
export interface StatsSummary {
  signups: number;
  cancellations: number;
  active_members: number;
  boutique_revenue: number;
  sales_count: number;
  access: Record<string, AccessBreak>; // { seance:{n,ca}, carnet:{...}, mois:{...}, annee:{...} }
}

const EMPTY_SUMMARY: StatsSummary = {
  signups: 0, cancellations: 0, active_members: 0, boutique_revenue: 0, sales_count: 0, access: {},
};

export async function getStatsSummary(fromISO: string, toISO: string): Promise<StatsSummary> {
  const { data, error } = await supabase.rpc('stats_summary', { p_from: fromISO, p_to: toISO });
  if (error) { console.error('statsApi.getStatsSummary', error); return EMPTY_SUMMARY; }
  const r = (data || {}) as any;
  return {
    signups: r.signups ?? 0,
    cancellations: r.cancellations ?? 0,
    active_members: r.active_members ?? 0,
    boutique_revenue: Number(r.boutique_revenue) || 0,
    sales_count: r.sales_count ?? 0,
    access: r.access || {},
  };
}

export interface StatsPoint { bucket: string; signups: number; cancellations: number; revenue: number }

export async function getStatsTimeseries(fromISO: string, toISO: string): Promise<StatsPoint[]> {
  const { data, error } = await supabase.rpc('stats_timeseries', { p_from: fromISO, p_to: toISO });
  if (error) { console.error('statsApi.getStatsTimeseries', error); return []; }
  return (data ?? []).map((r: any) => ({
    bucket: r.bucket,
    signups: Number(r.signups) || 0,
    cancellations: Number(r.cancellations) || 0,
    revenue: Number(r.revenue) || 0,
  }));
}

export interface Attendance {
  total: number;
  by_hour: { hour: number; entries: number }[];
  by_dow: { dow: number; entries: number }[];
}

export async function getStatsAttendance(fromISO: string, toISO: string): Promise<Attendance> {
  const { data, error } = await supabase.rpc('stats_attendance', { p_from: fromISO, p_to: toISO });
  if (error) { console.error('statsApi.getStatsAttendance', error); return { total: 0, by_hour: [], by_dow: [] }; }
  const r = (data || {}) as any;
  return { total: r.total ?? 0, by_hour: r.by_hour ?? [], by_dow: r.by_dow ?? [] };
}

export interface SubsDist { by_formula: { label: string; n: number }[]; mandates_active: number }

export async function getStatsSubscriptions(): Promise<SubsDist> {
  const { data, error } = await supabase.rpc('stats_subscriptions');
  if (error) { console.error('statsApi.getStatsSubscriptions', error); return { by_formula: [], mandates_active: 0 }; }
  const r = (data || {}) as any;
  return { by_formula: r.by_formula ?? [], mandates_active: r.mandates_active ?? 0 };
}

/** CA « encaissé » d'une période = ventes boutique + recharges d'accès (hors prélèvements récurrents GoCardless). */
export function summaryRevenue(s: StatsSummary): number {
  const access = Object.values(s.access || {}).reduce((a, v) => a + (Number(v.ca) || 0), 0);
  return (Number(s.boutique_revenue) || 0) + access;
}
