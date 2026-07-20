import React, { useEffect, useState, useCallback } from 'react';
import { Megaphone, Plus, Loader2, RefreshCw, Trash2, Send, Pencil, X, Check, Info, Calendar, AlertTriangle, Tag } from 'lucide-react';
import { listAnnouncements, saveAnnouncement, deleteAnnouncement, Announcement, AnnouncementCategory } from '../../lib/announcementsApi';
import { sendPush } from '../../lib/pushApi';

const CATEGORIES: { key: AnnouncementCategory; label: string; icon: React.ElementType; tint: string }[] = [
  { key: 'info', label: 'Information', icon: Info, tint: 'bg-blue-50 text-blue-700 border-blue-200' },
  { key: 'event', label: 'Événement', icon: Calendar, tint: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { key: 'alert', label: 'Alerte', icon: AlertTriangle, tint: 'bg-red-50 text-red-700 border-red-200' },
  { key: 'promo', label: 'Offre', icon: Tag, tint: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];
const catOf = (k: AnnouncementCategory) => CATEGORIES.find((c) => c.key === k) ?? CATEGORIES[0];
const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—');

const EMPTY = { id: null as string | null, title: '', body: '', category: 'info' as AnnouncementCategory };

const AnnouncementsPage: React.FC = () => {
  const [rows, setRows] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ ...EMPTY });
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setRows(await listAnnouncements());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const openNew = () => { setForm({ ...EMPTY }); setEditing(true); };
  const openEdit = (a: Announcement) => {
    setForm({ id: a.id, title: a.title, body: a.body, category: a.category });
    setEditing(true);
  };

  // Diffuse la notification push. Non bloquant : l'annonce reste publiée même si l'envoi échoue.
  const notifyMembers = async (title: string, body: string) => {
    const r = await sendPush(title, body.slice(0, 160), '/#/membre/notifications');
    if (!r.ok) alert(`Annonce publiée, mais l'envoi des notifications a échoué :
${r.error}`);
    else if ((r.total ?? 0) === 0) alert("Annonce publiée. Aucun adhérent n'a encore activé les notifications.");
    else alert(`Annonce publiée et notification envoyée à ${r.sent}/${r.total} appareil(s).`);
  };

  const save = async (publish: boolean) => {
    if (!form.title.trim() || !form.body.trim()) { alert('Titre et message sont obligatoires.'); return; }
    if (publish && !window.confirm("Publier cette annonce ?\n\nElle apparaîtra immédiatement dans l'app de tous vos adhérents.")) return;
    setBusy(true);
    try {
      await saveAnnouncement({ id: form.id, title: form.title, body: form.body, category: form.category, publish });
      if (publish) await notifyMembers(form.title, form.body);
      setEditing(false); setForm({ ...EMPTY });
      await load();
    } catch (e: any) { alert(e?.message || 'Enregistrement impossible.'); }
    finally { setBusy(false); }
  };

  const publishExisting = async (a: Announcement) => {
    if (!window.confirm(`Publier « ${a.title} » ?\n\nElle apparaîtra immédiatement dans l'app de tous vos adhérents.`)) return;
    setBusy(true);
    try {
      await saveAnnouncement({ id: a.id, title: a.title, body: a.body, category: a.category, publish: true });
      await notifyMembers(a.title, a.body);
      await load();
    }
    catch (e: any) { alert(e?.message || 'Publication impossible.'); }
    finally { setBusy(false); }
  };

  const remove = async (a: Announcement) => {
    if (!window.confirm(`Supprimer « ${a.title} » ?\n\nElle disparaîtra de l'app des adhérents.`)) return;
    setBusy(true);
    try { await deleteAnnouncement(a.id); await load(); }
    catch (e: any) { alert(e?.message || 'Suppression impossible.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Annonces</h1>
          <p className="text-sm text-gray-500">Publications visibles par vos adhérents dans l'app.</p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button onClick={openNew} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700">
            <Plus size={16} /> Nouvelle annonce
          </button>
          <button onClick={load} disabled={loading} className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-50 disabled:opacity-50">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Actualiser
          </button>
        </div>
      </div>

      {/* Éditeur */}
      {editing && (
        <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">{form.id ? "Modifier l'annonce" : 'Nouvelle annonce'}</h2>
            <button onClick={() => { setEditing(false); setForm({ ...EMPTY }); }} className="p-2 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Type</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {CATEGORIES.map((c) => (
                <button key={c.key} onClick={() => setForm((f) => ({ ...f, category: c.key }))}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-sm font-semibold ${form.category === c.key ? c.tint : 'bg-white border-gray-200 text-gray-500'}`}>
                  <c.icon size={14} /> {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Titre</label>
            <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Fermeture exceptionnelle samedi"
              className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Message</label>
            <textarea value={form.body} onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))} rows={5}
              placeholder="La salle sera fermée samedi 26 pour maintenance. Merci de votre compréhension."
              className="w-full mt-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none resize-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => save(true)} disabled={busy}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50">
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Publier
            </button>
            <button onClick={() => save(false)} disabled={busy}
              className="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-gray-50 disabled:opacity-50">
              Enregistrer en brouillon
            </button>
            <p className="text-[11px] text-gray-400 ml-auto hidden sm:block">Une annonce publiée est visible immédiatement par tous les adhérents.</p>
          </div>
        </div>
      )}

      {/* Liste */}
      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Megaphone size={18} className="text-indigo-600" />
          <h2 className="text-sm font-bold text-gray-900">Toutes les annonces</h2>
        </div>
        {loading ? (
          <p className="text-sm text-gray-400 py-10 text-center">Chargement…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-gray-400 py-10 text-center">Aucune annonce. Créez-en une pour informer vos adhérents.</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {rows.map((a) => {
              const c = catOf(a.category);
              return (
                <div key={a.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-start gap-3">
                  <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md border ${c.tint}`}>{c.label}</span>
                      <span className="font-semibold text-gray-900 truncate">{a.title}</span>
                      {a.published ? (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md">Publiée</span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md">Brouillon</span>
                      )}
                    </div>
                    <p className="mt-1 text-[13px] text-gray-600 whitespace-pre-line line-clamp-3">{a.body}</p>
                    <p className="mt-1 text-[11px] text-gray-400">
                      {a.published ? `Publiée le ${dt(a.publishedAt)}` : `Créée le ${dt(a.createdAt)}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {!a.published && (
                      <button onClick={() => publishExisting(a)} disabled={busy}
                        className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[13px] font-semibold hover:bg-indigo-700 disabled:opacity-50">
                        <Check size={13} /> Publier
                      </button>
                    )}
                    <button onClick={() => openEdit(a)} className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-[13px] font-semibold hover:bg-gray-50">
                      <Pencil size={13} /> Modifier
                    </button>
                    <button onClick={() => remove(a)} disabled={busy}
                      className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-500 px-3 py-1.5 rounded-lg text-[13px] font-semibold hover:bg-red-50 hover:text-red-600 disabled:opacity-50">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementsPage;
