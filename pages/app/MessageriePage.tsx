import React, { useEffect, useState, useCallback, useRef } from 'react';
import { MessageSquare, Send, Search, Clock, X, Check, RefreshCw } from 'lucide-react';
import {
  getThreads, getThreadMessages, sendStaffMessage, markThreadReadByStaff,
  getOpeningHours, saveOpeningHours, defaultOpeningHours, dayLabel, isOpenNow,
  MessageThread, ChatMessage, DayHours,
} from '../../lib/messagesApi';
import { resolvePhotoUrls } from '../../lib/accessApi';

const fmtTime = (s: string) => new Date(s).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const fmtDay = (s: string) => {
  const d = new Date(s); const today = new Date();
  if (d.toDateString() === today.toDateString()) return fmtTime(s);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' });
};
const nameOf = (t: { first_name: string | null; last_name: string | null }) =>
  `${t.first_name || ''} ${t.last_name || ''}`.trim() || 'Adhérent';
const initials = (t: { first_name: string | null; last_name: string | null }) =>
  `${(t.first_name || '?')[0] || ''}${(t.last_name || '')[0] || ''}`.toUpperCase();

const MessageriePage: React.FC = () => {
  const [threads, setThreads] = useState<MessageThread[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [active, setActive] = useState<MessageThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const [hours, setHours] = useState<DayHours[]>(defaultOpeningHours());
  const [hoursOpen, setHoursOpen] = useState(false);
  const [hoursDraft, setHoursDraft] = useState<DayHours[]>(defaultOpeningHours());
  const [savingHours, setSavingHours] = useState(false);

  const endRef = useRef<HTMLDivElement>(null);
  const activeId = active?.member_id;

  const loadThreads = useCallback(async () => {
    const t = await getThreads();
    setThreads(t); setLoading(false);
    const map = await resolvePhotoUrls(t.map((x) => x.photo_path));
    setPhotos(map);
  }, []);

  useEffect(() => {
    loadThreads();
    getOpeningHours().then(setHours).catch(() => {});
    const i = setInterval(loadThreads, 15_000);
    return () => clearInterval(i);
  }, [loadThreads]);

  // Rafraîchit le fil ouvert
  const loadActiveMessages = useCallback(async (memberId: string) => {
    const msgs = await getThreadMessages(memberId);
    setMessages(msgs);
  }, []);

  useEffect(() => {
    if (!activeId) return;
    loadActiveMessages(activeId);
    const i = setInterval(() => loadActiveMessages(activeId), 10_000);
    return () => clearInterval(i);
  }, [activeId, loadActiveMessages]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const openThread = async (t: MessageThread) => {
    setActive(t);
    setMessages([]);
    await loadActiveMessages(t.member_id);
    if (t.unread > 0) { await markThreadReadByStaff(t.member_id); loadThreads(); }
  };

  const send = async () => {
    if (!draft.trim() || !active || sending) return;
    setSending(true);
    const body = draft.trim();
    setDraft('');
    try {
      const m = await sendStaffMessage(active.member_id, body);
      if (m) setMessages((prev) => [...prev, m]);
      loadThreads();
    } catch { setDraft(body); } finally { setSending(false); }
  };

  const openHours = () => { setHoursDraft(hours.map((h) => ({ ...h }))); setHoursOpen(true); };
  const saveHours = async () => {
    setSavingHours(true);
    try { await saveOpeningHours(hoursDraft); setHours(hoursDraft); setHoursOpen(false); }
    catch { alert('Enregistrement impossible.'); } finally { setSavingHours(false); }
  };
  const setDay = (day: number, patch: Partial<DayHours>) =>
    setHoursDraft((prev) => prev.map((h) => (h.day === day ? { ...h, ...patch } : h)));

  const open = isOpenNow(hours);
  const filtered = threads.filter((t) => nameOf(t).toLowerCase().includes(search.toLowerCase()));
  const totalUnread = threads.reduce((a, t) => a + t.unread, 0);

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            Messagerie
            {totalUnread > 0 && <span className="text-xs font-semibold bg-indigo-600 text-white px-2 py-0.5 rounded-full">{totalUnread}</span>}
          </h1>
          <p className="text-sm text-gray-500">Messages des adhérents depuis l'application client.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg ${open ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${open ? 'bg-green-500' : 'bg-gray-400'}`} />
            {open ? 'Ouvert' : 'Fermé'}
          </span>
          <button onClick={openHours} className="flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50">
            <Clock size={15} /> Horaires
          </button>
        </div>
      </div>

      {/* 2 panneaux */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ minHeight: '60vh' }}>
        {/* Liste des fils */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-gray-100">
            <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
              <Search size={15} className="text-gray-400" />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher un adhérent" className="bg-transparent outline-none text-sm flex-grow" />
            </div>
          </div>
          <div className="overflow-y-auto flex-grow">
            {loading ? (
              <p className="p-6 text-center text-sm text-gray-400">Chargement…</p>
            ) : filtered.length === 0 ? (
              <p className="p-6 text-center text-sm text-gray-400">Aucune conversation.</p>
            ) : filtered.map((t) => {
              const url = t.photo_path ? photos[t.photo_path] : undefined;
              const isActive = activeId === t.member_id;
              return (
                <button key={t.member_id} onClick={() => openThread(t)} className={`w-full flex items-center gap-3 px-3 py-3 text-left border-b border-gray-50 hover:bg-gray-50 transition-colors ${isActive ? 'bg-indigo-50/60' : ''}`}>
                  {url ? <img src={url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                    : <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-sm font-semibold shrink-0">{initials(t)}</div>}
                  <div className="min-w-0 flex-grow">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${t.unread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>{nameOf(t)}</p>
                      <span className="text-[10px] text-gray-400 shrink-0">{fmtDay(t.last_at)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-xs truncate ${t.unread ? 'text-gray-700' : 'text-gray-400'}`}>{t.last_sender === 'staff' ? 'Vous : ' : ''}{t.last_body}</p>
                      {t.unread > 0 && <span className="shrink-0 text-[10px] font-semibold bg-indigo-600 text-white px-1.5 py-0.5 rounded-full">{t.unread}</span>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Conversation */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-gray-200 flex flex-col overflow-hidden">
          {!active ? (
            <div className="flex-grow flex flex-col items-center justify-center text-gray-400 gap-2">
              <MessageSquare size={28} /> <p className="text-sm">Sélectionnez une conversation</p>
            </div>
          ) : (
            <>
              <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
                {active.photo_path && photos[active.photo_path]
                  ? <img src={photos[active.photo_path]} alt="" className="w-9 h-9 rounded-full object-cover" />
                  : <div className="w-9 h-9 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center text-xs font-semibold">{initials(active)}</div>}
                <div>
                  <p className="text-sm font-semibold text-gray-900">{nameOf(active)}</p>
                  {active.member_number && <p className="text-[11px] text-gray-400">N° {active.member_number}</p>}
                </div>
              </div>

              <div className="flex-grow overflow-y-auto p-4 space-y-2 bg-gray-50/40">
                {messages.map((m) => {
                  const staff = m.sender === 'staff';
                  return (
                    <div key={m.id} className={`flex ${staff ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 ${staff ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'}`}>
                        <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                        <p className={`text-[10px] mt-0.5 text-right ${staff ? 'text-indigo-200' : 'text-gray-400'}`}>{fmtTime(m.created_at)}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={endRef} />
              </div>

              <div className="p-3 border-t border-gray-100 flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Votre réponse…"
                  rows={1}
                  className="flex-grow resize-none bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 max-h-32"
                />
                <button onClick={send} disabled={!draft.trim() || sending} className="shrink-0 bg-indigo-600 text-white p-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-50">
                  <Send size={18} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modale horaires */}
      {hoursOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={() => setHoursOpen(false)}>
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2"><Clock size={17} className="text-indigo-600" /> Horaires d'ouverture</h2>
              <button onClick={() => setHoursOpen(false)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><X size={18} /></button>
            </div>
            <div className="p-4 space-y-2 max-h-[60vh] overflow-y-auto">
              <p className="text-xs text-gray-500 mb-2">En dehors de ces horaires, un adhérent qui écrit verra un message indiquant qu'on lui répondra à la réouverture.</p>
              {[1, 2, 3, 4, 5, 6, 0].map((day) => {
                const h = hoursDraft.find((x) => x.day === day)!;
                return (
                  <div key={day} className="flex items-center gap-3">
                    <span className="w-24 text-sm font-medium text-gray-700">{dayLabel(day)}</span>
                    <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                      <input type="checkbox" checked={!h.closed} onChange={(e) => setDay(day, { closed: !e.target.checked })} />
                      Ouvert
                    </label>
                    <div className={`flex items-center gap-1.5 ml-auto ${h.closed ? 'opacity-30 pointer-events-none' : ''}`}>
                      <input type="time" value={h.open} onChange={(e) => setDay(day, { open: e.target.value })} className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none" />
                      <span className="text-gray-400 text-xs">→</span>
                      <input type="time" value={h.close} onChange={(e) => setDay(day, { close: e.target.value })} className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none" />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={() => setHoursOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-500 hover:bg-gray-100 rounded-xl">Annuler</button>
              <button onClick={saveHours} disabled={savingHours} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50">
                <Check size={15} /> Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessageriePage;
