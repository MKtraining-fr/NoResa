import { supabase } from './supabaseClient';

/** Annonces publiées par la salle et lues dans l'app adhérent. */

export type AnnouncementCategory = 'info' | 'event' | 'alert' | 'promo';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  published: boolean;
  publishedAt: string | null;
  createdAt: string;
}

const map = (r: any): Announcement => ({
  id: r.id,
  title: r.title ?? '',
  body: r.body ?? '',
  category: (r.category ?? 'info') as AnnouncementCategory,
  published: r.published === true,
  publishedAt: r.published_at ?? null,
  createdAt: r.created_at,
});

// ---- Staff ----

export async function listAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase.rpc('list_announcements', { p_only_published: false });
  if (error) { console.error('listAnnouncements', error); return []; }
  return (data ?? []).map(map);
}

export async function saveAnnouncement(p: {
  id?: string | null; title: string; body: string; category: AnnouncementCategory; publish: boolean;
}): Promise<Announcement | null> {
  const { data, error } = await supabase.rpc('save_announcement', {
    p_id: p.id ?? null, p_title: p.title, p_body: p.body, p_category: p.category, p_publish: p.publish,
  });
  if (error) { console.error('saveAnnouncement', error); throw error; }
  const r = Array.isArray(data) ? data[0] : data;
  return r ? map(r) : null;
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase.rpc('delete_announcement', { p_id: id });
  if (error) { console.error('deleteAnnouncement', error); throw error; }
}

// ---- Adhérent ----

export interface MyAnnouncement {
  id: string;
  title: string;
  body: string;
  category: AnnouncementCategory;
  publishedAt: string | null;
  read: boolean;
}

export async function getMyAnnouncements(): Promise<MyAnnouncement[]> {
  const { data, error } = await supabase.rpc('my_announcements');
  if (error) { console.error('getMyAnnouncements', error); return []; }
  return (data ?? []).map((r: any) => ({
    id: r.id,
    title: r.title ?? '',
    body: r.body ?? '',
    category: (r.category ?? 'info') as AnnouncementCategory,
    publishedAt: r.published_at ?? null,
    read: r.read === true,
  }));
}

export async function getUnreadAnnouncements(): Promise<number> {
  const { data, error } = await supabase.rpc('my_unread_announcements');
  if (error) { console.error('getUnreadAnnouncements', error); return 0; }
  return Number(data) || 0;
}

/** Marque une annonce (ou toutes si id omis) comme lue. */
export async function markAnnouncementsRead(id?: string): Promise<void> {
  const { error } = await supabase.rpc('mark_announcements_read', { p_id: id ?? null });
  if (error) console.error('markAnnouncementsRead', error);
}
