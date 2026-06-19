import { supabase } from './supabaseClient';

// Valeur encodée dans le QR d'un membre = son numéro d'adhérent (= card number côté ZKAccess)
export function memberQrValue(memberNumber?: string | null): string {
  return (memberNumber ?? '').toString().trim();
}

export interface AccessEntry {
  id: string;
  access_datetime: string;
  status: string;
  card_number: string | null;
  qr_code: string | null;
  device_sn: string | null;
  member: { first_name: string | null; last_name: string | null; member_number: string | null } | null;
}

/** Entrées du jour (passages enregistrés depuis minuit), plus récentes d'abord. */
export async function getTodayEntries(): Promise<AccessEntry[]> {
  const start = new Date(); start.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from('access_logs')
    .select('id, access_datetime, status, card_number, qr_code, device_sn, member:members(first_name, last_name, member_number)')
    .gte('access_datetime', start.toISOString())
    .order('access_datetime', { ascending: false })
    .limit(500);
  if (error) { console.error('getTodayEntries', error); return []; }
  return (data ?? []) as any;
}

export interface AccessAlert {
  id: string;
  alert_type: string;
  first_event: string;
  second_event: string;
  gap_seconds: number | null;
  status: string;
  created_at: string;
  member: { first_name: string | null; last_name: string | null; member_number: string | null } | null;
}

/** Alertes (par défaut celles à vérifier). */
export async function getAccessAlerts(status: string = 'open'): Promise<AccessAlert[]> {
  let q = supabase
    .from('access_alerts')
    .select('id, alert_type, first_event, second_event, gap_seconds, status, created_at, member:members(first_name, last_name, member_number)')
    .order('created_at', { ascending: false })
    .limit(200);
  if (status) q = q.eq('status', status);
  const { data, error } = await q;
  if (error) { console.error('getAccessAlerts', error); return []; }
  return (data ?? []) as any;
}

/** Marque une alerte comme traitée ('reviewed') ou ignorée ('dismissed'). */
export async function reviewAlert(id: string, status: 'reviewed' | 'dismissed', note?: string): Promise<void> {
  const { error } = await supabase.from('access_alerts').update({ status, note: note ?? null }).eq('id', id);
  if (error) { console.error('reviewAlert', error); throw error; }
}
