import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Send, MessageSquare, Clock } from 'lucide-react';
import {
  getMyMember, getMyMessages, sendClientMessage, markStaffMessagesRead,
  getOpeningHours, isOpenNow, nextOpening,
  MyMember, ClientMessage, DayHours,
} from '../../lib/memberMessagesApi';

const fmtTime = (s: string) => new Date(s).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

const MemberMessages: React.FC = () => {
  const [member, setMember] = useState<MyMember | null>(null);
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const [hours, setHours] = useState<DayHours[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (memberId: string) => {
    const msgs = await getMyMessages(memberId);
    setMessages(msgs);
    markStaffMessagesRead(memberId);
  }, []);

  useEffect(() => {
    (async () => {
      const m = await getMyMember();
      setMember(m);
      setHours(await getOpeningHours());
      if (m) await load(m.id);
      setLoading(false);
    })();
  }, [load]);

  useEffect(() => {
    if (!member) return;
    const i = setInterval(() => load(member.id), 10_000);
    return () => clearInterval(i);
  }, [member, load]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const open = hours.length ? isOpenNow(hours) : true;
  const next = hours.length ? nextOpening(hours) : null;

  const send = async () => {
    if (!draft.trim() || !member || sending) return;
    setSending(true);
    const body = draft.trim();
    setDraft('');
    try {
      const m = await sendClientMessage(member.id, member.gym_id, body);
      if (m) setMessages((prev) => [...prev, m]);
    } catch { setDraft(body); } finally { setSending(false); }
  };

  return (
    <div className="max-w-2xl mx-auto w-full p-4 sm:p-6">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Messagerie</h1>
        <p className="text-sm text-gray-500">Une question ? Écrivez à l'équipe de la salle, on vous répond ici.</p>
      </div>

      <div className="flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden" style={{ height: 'min(70vh, 640px)' }}>
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <span className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg"><MessageSquare size={16} /></span>
          <div className="flex-grow">
            <p className="text-sm font-semibold text-gray-900">Équipe {member ? '' : ''}</p>
            <p className={`text-[11px] flex items-center gap-1 ${open ? 'text-green-600' : 'text-gray-400'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${open ? 'bg-green-500' : 'bg-gray-400'}`} />
              {open ? 'En ligne' : 'Hors ligne'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex-grow flex items-center justify-center text-sm text-gray-400">Chargement…</div>
        ) : !member ? (
          <div className="flex-grow flex items-center justify-center text-sm text-gray-500 text-center px-6">
            Connectez-vous avec l'email de votre inscription pour accéder à la messagerie.
          </div>
        ) : (
          <>
            {!open && (
              <div className="m-3 mb-0 flex items-start gap-2 bg-amber-50 text-amber-800 text-xs rounded-xl px-3 py-2.5">
                <Clock size={14} className="mt-0.5 shrink-0" />
                <span>Nous sommes actuellement fermés{next ? ` — réouverture ${next}` : ''}. Votre message est bien transmis, on vous répond dès la réouverture.</span>
              </div>
            )}

            <div className="flex-grow overflow-y-auto p-4 space-y-2 bg-gray-50/40">
              {messages.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">Aucun message pour le moment. Posez votre question, l'équipe vous répondra ici.</p>
              ) : messages.map((m) => {
                const mine = m.sender === 'client';
                return (
                  <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 ${mine ? 'bg-indigo-600 text-white rounded-br-sm' : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'}`}>
                      <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                      <p className={`text-[10px] mt-0.5 text-right ${mine ? 'text-indigo-200' : 'text-gray-400'}`}>{fmtTime(m.created_at)}</p>
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
                placeholder="Votre message…"
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
  );
};

export default MemberMessages;
