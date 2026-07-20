import React, { useEffect, useState } from 'react';
import { Bell, ChevronLeft, Loader2, Info, Calendar, AlertTriangle, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getMyAnnouncements, markAnnouncementsRead, MyAnnouncement, AnnouncementCategory } from '../../lib/announcementsApi';
import { enablePush, pushPermission } from '../../lib/pushApi';

const STYLE: Record<AnnouncementCategory, { icon: React.ElementType; tint: string; ring: string }> = {
  info:  { icon: Info,          tint: 'text-blue-600',    ring: 'bg-blue-50' },
  event: { icon: Calendar,      tint: 'text-indigo-600',  ring: 'bg-indigo-50' },
  alert: { icon: AlertTriangle, tint: 'text-red-600',     ring: 'bg-red-50' },
  promo: { icon: Tag,           tint: 'text-emerald-600', ring: 'bg-emerald-50' },
};

const ago = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const days = Math.floor((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return `Aujourd'hui, ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;
  return d.toLocaleDateString('fr-FR');
};

const MemberNotifications: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<MyAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  // L'invitation ne s'affiche que si la permission n'a jamais été accordée.
  // Accordée -> abonnement silencieux géré par le layout, plus rien à afficher.
  // Refusée -> seul le navigateur peut revenir en arrière, on n'insiste pas.
  const [showPrompt, setShowPrompt] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => { setShowPrompt(pushPermission() === 'default'); }, []);

  const activate = async () => {
    setPushBusy(true);
    try {
      const r = await enablePush();
      if (r.ok) setShowPrompt(false);
      else { alert(r.error); setShowPrompt(pushPermission() === 'default'); }
    } finally { setPushBusy(false); }
  };

  useEffect(() => {
    let alive = true;
    getMyAnnouncements().then(async (list) => {
      if (!alive) return;
      setItems(list);
      setLoading(false);
      // Tout est considéré lu dès l'ouverture de l'écran.
      if (list.some((a) => !a.read)) await markAnnouncementsRead();
    });
    return () => { alive = false; };
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex items-center space-x-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-2xl font-extrabold text-gray-900">Annonces</h2>
      </div>

      {/* Invitation unique : une fois les notifications acceptées, ce bloc disparaît
          définitivement (le réabonnement se fait ensuite tout seul, en silence). */}
      {showPrompt && (
        <button onClick={activate} disabled={pushBusy}
          className="w-full flex items-center gap-3 p-4 rounded-3xl border border-brand/30 bg-brand-soft disabled:opacity-60">
          <div className="p-2.5 rounded-2xl shrink-0 bg-white text-brand">
            {pushBusy ? <Loader2 size={18} className="animate-spin" /> : <Bell size={18} />}
          </div>
          <div className="flex-1 text-left">
            <p className="font-extrabold text-[14px] text-gray-900">Activer les notifications</p>
            <p className="text-[11px] text-gray-500 font-semibold">Sois prévenu dès qu'une annonce est publiée.</p>
          </div>
          <span className="text-[11px] font-extrabold text-brand uppercase tracking-wide shrink-0">Activer</span>
        </button>
      )}

      {loading ? (
        <div className="py-20 flex justify-center text-gray-300"><Loader2 className="animate-spin" /></div>
      ) : items.length === 0 ? (
        <div className="py-20 flex flex-col items-center text-center space-y-3">
          <div className="w-14 h-14 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center"><Bell size={24} /></div>
          <p className="text-sm font-bold text-gray-500">Aucune annonce pour le moment</p>
          <p className="text-xs text-gray-400 px-10">Les informations de la salle apparaîtront ici.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((a) => {
            const s = STYLE[a.category] ?? STYLE.info;
            const Icon = s.icon;
            return (
              <div key={a.id} className={`bg-white border rounded-3xl p-4 shadow-sm ${a.read ? 'border-gray-100' : 'border-brand/30'}`}>
                <div className="flex items-start gap-3">
                  <div className={`${s.ring} ${s.tint} p-2.5 rounded-2xl shrink-0`}><Icon size={18} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-extrabold text-gray-900 text-[15px] leading-snug">{a.title}</p>
                      {!a.read && <span className="w-2 h-2 rounded-full bg-brand shrink-0" />}
                    </div>
                    <p className="text-[13px] text-gray-600 mt-1 leading-relaxed whitespace-pre-line">{a.body}</p>
                    <p className="text-[11px] text-gray-400 font-semibold mt-2">{ago(a.publishedAt)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MemberNotifications;
