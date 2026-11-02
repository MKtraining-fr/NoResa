import { supabase } from './supabaseClient';

/** Inscription avec un nom + prénom déjà connus sous un autre e-mail (à vérifier par le staff). */
export interface DuplicateAlert {
  id: string;
  createdAt: string;
  memberId: string;
  firstName: string;
  lastName: string;
  memberNumber: string | null;
  email: string | null;
  otherMemberId: string;
  otherMemberNumber: string | null;
  otherEmail: string | null;
}

export async function listDuplicateAlerts(): Promise<DuplicateAlert[]> {
  const { data, error } = await supabase.rpc('list_duplicate_alerts');
  if (error) { console.error('listDuplicateAlerts', error); return []; }
  return (data ?? []).map((r: any) => ({
    id: r.id, createdAt: r.created_at, memberId: r.member_id,
    firstName: r.first_name ?? '', lastName: r.last_name ?? '',
    memberNumber: r.member_number ?? null, email: r.email ?? null,
    otherMemberId: r.other_member_id, otherMemberNumber: r.other_member_number ?? null, otherEmail: r.other_email ?? null,
  }));
}

export async function dismissDuplicateAlert(id: string): Promise<void> {
  const { error } = await supabase.rpc('dismiss_duplicate_alert', { p_id: id });
  if (error) { console.error('dismissDuplicateAlert', error); throw error; }
}
