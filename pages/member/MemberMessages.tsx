import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Send, MessageSquare, Clock, CreditCard, DoorOpen, FileText, CalendarCheck, Tag, ChevronDown, LifeBuoy,
} from 'lucide-react';
import {
  getMyMember, getMyMessages, sendClientMessage, markStaffMessagesRead,
  getOpeningHours, isOpenNow, nextOpening, dayLabel,
  MyMember, ClientMessage, DayHours,
} from '../../lib/memberMessagesApi';

const fmtTime = (s: string) => new Date(s).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

/* ──────────────────────────────────────────────────────────────────────────
   ⬇️  AIDE RAPIDE (FAQ) — MODIFIE LIBREMENT ICI
   - `q` = libellé du bouton / question
   - `a` = réponse affichée (laisse vide pour l'item "Parler à un humain")
   - `dynamic: 'hours'` = la réponse est générée depuis tes horaires d'ouverture
   - `cta: true` = affiche le bouton "Écrire à l'équipe" sous la réponse
   Adapte surtout les TARIFS et la RÉSILIATION à ta salle.
   ────────────────────────────────────────────────────────────────────────── */
type FaqItem = { id: string; icon: React.ComponentType<{ size?: number }>; q: string; a?: string; dynamic?: 'hours'; cta?: boolean };

const FAQ: FaqItem[] = [
  {
    id: 'horaires', icon: Clock, q: 'Horaires d\'ouverture', dynamic: 'hours',
  },
  {
    id: 'tarifs', icon: Tag, q: 'Tarifs & formules',
    a: 'Nos formules : abonnement classique, formule famille/étudiant, suivi & formation, ainsi que des carnets de séances et un pass 1 mois. Pour le détail des tarifs et la formule la plus adaptée, écrivez-nous, on vous conseille.',
    cta: true,
  },
  {
    id: 'abonnement', icon: CreditCard, q: 'Mon abonnement & paiements',
    a: 'Retrouvez votre abonnement et vos paiements dans l\'onglet « Abonnement ». Pour changer de formule ou mettre à jour votre prélèvement, écrivez-nous ici.',
    cta: true,
  },
  {
    id: 'acces', icon: DoorOpen, q: 'Accès à la salle (badge / code)',
    a: 'Vous entrez avec votre badge ou votre code clavier personnel. Badge perdu, code oublié ou accès qui ne fonctionne pas ? Écrivez-nous, on règle ça vite.',
    cta: true,
  },
  {
    id: 'reservation', icon: CalendarCheck, q: 'Réserver un cours',
    a: 'Vos cours se réservent dans l\'onglet « Réservations ». Une place se libère ? Réservez tant qu\'il en reste. Pour annuler, faites-le au plus tôt pour laisser la place à un autre adhérent.',
  },
  {
    id: 'resiliation', icon: FileText, q: 'Résiliation',
    a: 'Pour toute demande de résiliation ou de suspension, envoyez-nous un message ici en précisant votre nom et la raison. On vous indique la marche à suivre selon votre formule.',
    cta: true,
  },
  {
    id: 'humain', icon: MessageSquare, q: 'Parler à un humain', cta: true,
    a: 'Écrivez votre message ci-dessous : l\'équipe de la salle vous répond directement ici.',
  },
];

const MemberMessages: React.FC = () => {
  const [member, setMember] = useState<MyMember | null>(null);
  const [messages, setMessages] = useState<ClientMessage[]>([]);
  const [hours, setHours] = useState<DayHours[]>([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  const focusInput = () => {
    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => inputRef.current?.focus(), 250);
  };

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

  const renderAnswer = (item: FaqItem) => {
    if (item.dynamic === 'hours') {
      return (
        <div className="space-y-1">
          {[1, 2, 3, 4, 5, 6, 0].map((day) => {
            const h = hours.find((x) => x.day === day);
            const closed = !h || h.closed;
            return (
              <div key={day} className="flex items-center justify-between text-sm">
                <span className="text-gray-600">{dayLabel(day)}</span>
                <span className={closed ? 'text-gray-400' : 'text-gray-900 font-medium'}>
                  {closed ? 'Fermé' : `${h!.open} – ${h!.close}`}
                </span>
              </div>
            );
          })}
        </div>
      );
    }
    return <p className="text-sm text-gray-600 leading-relaxed">{item.a}</p>;
  };

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="mb-4">
        <h1 className="text-xl font-semibold text-gray-900">Messagerie</h1>
        <p className="text-sm text-gray-500">Une réponse rapide ci-dessous, ou écrivez directement à l'équipe.</p>
      </div>

      {/* Aide rapide (FAQ) */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden mb-4">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <span className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg"><LifeBuoy size={15} /></span>
          <p className="text-sm font-semibold text-gray-900">Aide rapide</p>
        </div>
        <div className="p-2">
          {FAQ.map((item) => {
            const isOpenItem = openFaq === item.id;
            return (
              <div key={item.id} className="border-b border-gray-50 last:border-0">
                <button
                  onClick={() => { setOpenFaq(isOpenItem ? null : item.id); if (item.id === 'humain') focusInput(); }}
                  className="w-full flex items-center gap-3 px-2.5 py-3 text-left hover:bg-gray-50 rounded-xl transition-colors"
                >
                  <span className="text-indigo-500 shrink-0"><item.icon size={17} /></span>
                  <span className="flex-grow text-sm font-medium text-gray-800">{item.q}</span>
                  <ChevronDown size={16} className={`text-gray-300 transition-transform ${isOpenItem ? 'rotate-180' : ''}`} />
                </button>
                {isOpenItem && (
                  <div className="px-2.5 pb-3 pl-10 space-y-3">
                    {renderAnswer(item)}
                    {item.cta && (
                      <button onClick={focusInput} className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                        <Send size={13} /> Écrire à l'équipe
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Conversation avec le staff */}
      <div className="flex flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden" style={{ height: 'min(60vh, 540px)' }}>
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <span className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg"><MessageSquare size={16} /></span>
          <div className="flex-grow">
            <p className="text-sm font-semibold text-gray-900">Équipe de la salle</p>
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
                ref={inputRef}
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
