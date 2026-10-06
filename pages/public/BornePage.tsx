import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { UserPlus, CreditCard, ArrowRight, Camera, Dumbbell, Tag, HelpCircle, Megaphone, AlertTriangle } from 'lucide-react';
import { setKiosk } from '../../lib/kiosk';
import { getPublicAnnouncements, isImportantAnnouncement, PublicAnnouncement } from '../../lib/announcementsApi';

const RED = '#C81E1E';

const CAT_LABEL: Record<string, string> = { info: 'Info', promo: 'Promo', event: 'Événement', alert: 'À la une' };

/** Bandeau d'annonce en haut de l'accueil borne : attire l'œil et ouvre la page Infos. */
const AnnouncementBanner: React.FC<{ a: PublicAnnouncement }> = ({ a }) => {
  const important = isImportantAnnouncement(a);
  return (
    <Link to={`/infos?focus=${a.id}`}
      className="block relative overflow-hidden text-white active:scale-[0.995] transition-transform"
      style={{ background: important
        ? 'linear-gradient(90deg,#8E1414 0%,#C81E1E 50%,#E0531F 100%)'
        : `linear-gradient(90deg,${RED} 0%,#a81818 100%)` }}>
      {/* reflet qui balaie le bandeau */}
      <span className="borne-shine" aria-hidden />
      {important && <span className="borne-halo" aria-hidden />}
      <div className="relative max-w-6xl mx-auto px-5 py-3.5 flex items-center gap-3">
        <span className={`w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0 ${important ? 'borne-wiggle' : ''}`}>
          {important ? <AlertTriangle size={18} /> : <Megaphone size={18} />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/80">
            {important ? '⚠ À la une' : (CAT_LABEL[a.category] || 'Info')}
          </span>
          <span className="block text-[15px] sm:text-lg font-extrabold truncate">{a.title}</span>
        </span>
        <span className="hidden sm:inline text-sm font-bold text-white/90 whitespace-nowrap">Voir l'info</span>
        <ArrowRight size={20} className="borne-nudge shrink-0" />
      </div>
    </Link>
  );
};

/**
 * Accueil du mini-site / borne « La SaLLe » (dans SalleLayout).
 * Hero + 2 actions clés (M'inscrire / Payer une séance) + accès aux sections.
 * `?kiosk=1` arme le mode borne sur l'appareil ; `?kiosk=0` le désarme (staff).
 */
const BornePage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [latest, setLatest] = useState<PublicAnnouncement | null>(null);

  useEffect(() => {
    const k = params.get('kiosk');
    if (k === '1') setKiosk(true);
    else if (k === '0') { setKiosk(false); navigate('/', { replace: true }); }
  }, [params, navigate]);

  // Dernière annonce publiée : mise en avant « à la une » (Alerte) d'abord, sinon la plus récente.
  useEffect(() => {
    getPublicAnnouncements().then((items) => {
      if (!items.length) return setLatest(null);
      setLatest(items.find(isImportantAnnouncement) ?? items[0]);
    });
  }, []);

  const sections = [
    { to: '/decouverte', icon: Camera, label: 'Découverte', sub: 'La salle en images' },
    { to: '/activites', icon: Dumbbell, label: 'Activités', sub: 'Ce que tu peux faire' },
    { to: '/tarifs', icon: Tag, label: 'Tarifs', sub: 'Formules & séances' },
    { to: '/infos', icon: Megaphone, label: 'Infos', sub: 'Actus & promos' },
    { to: '/faq', icon: HelpCircle, label: 'FAQ', sub: 'Tes questions' },
  ];

  return (
    <div>
      <style>{`
        @keyframes borneShine { 0% { transform: translateX(-120%) skewX(-20deg); } 60%,100% { transform: translateX(320%) skewX(-20deg); } }
        .borne-shine { position:absolute; top:0; bottom:0; left:0; width:35%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.28),transparent);
          animation:borneShine 3.8s ease-in-out infinite; pointer-events:none; }
        @keyframes borneNudge { 0%,100% { transform:translateX(0); } 50% { transform:translateX(5px); } }
        .borne-nudge { animation:borneNudge 1.3s ease-in-out infinite; }
        @keyframes borneWiggle { 0%,100% { transform:rotate(-7deg); } 50% { transform:rotate(7deg); } }
        .borne-wiggle { animation:borneWiggle .9s ease-in-out infinite; }
        @keyframes borneHalo { 0%,100% { box-shadow:inset 0 0 0 0 rgba(255,255,255,0); } 50% { box-shadow:inset 0 0 40px 0 rgba(255,220,150,.55); } }
        .borne-halo { position:absolute; inset:0; animation:borneHalo 1.6s ease-in-out infinite; pointer-events:none; }
        @media (prefers-reduced-motion: reduce) { .borne-shine,.borne-nudge,.borne-wiggle,.borne-halo { animation:none; } }
      `}</style>

      {/* Bandeau d'annonce (visible immédiatement sur l'accueil borne) */}
      {latest && <AnnouncementBanner a={latest} />}

      {/* Hero */}
      <section className="text-white" style={{ background: `radial-gradient(120% 80% at 85% -20%, #d8352f 0%, rgba(216,53,47,0) 45%), linear-gradient(160deg, ${RED} 0%, ${RED} 45%, #8E1414 100%)` }}>
        <div className="max-w-6xl mx-auto px-5 pt-14 pb-16 sm:pt-20 sm:pb-20">
          <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.28em] text-white/85">A.R.A.P.S · Villeneuve-la-Comptal</p>
          <h1 className="mt-3 text-5xl sm:text-6xl font-extrabold tracking-tight text-balance">Ta salle, ouverte de 6h à 23h.</h1>
          <p className="mt-4 text-lg font-semibold text-white/95 max-w-xl">Musculation, cardio et accompagnement, à ton rythme. Inscris-toi en 2 minutes et entraîne-toi dès aujourd'hui.</p>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <Link to="/inscription" className="group bg-white text-gray-900 rounded-3xl p-6 shadow-2xl active:scale-[0.98] transition-transform flex items-center gap-4">
              <span className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0" style={{ backgroundColor: RED }}><UserPlus size={26} /></span>
              <span className="flex-1">
                <span className="block text-xl font-extrabold">M'inscrire</span>
                <span className="block text-[13px] font-semibold text-gray-500">Nouveau ? Crée ton compte</span>
              </span>
              <ArrowRight size={20} style={{ color: RED }} className="group-active:translate-x-1 transition-transform" />
            </Link>
            <Link to="/borne/payer" className="group bg-white/10 border border-white/30 text-white rounded-3xl p-6 active:scale-[0.98] transition-transform flex items-center gap-4">
              <span className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0"><CreditCard size={26} /></span>
              <span className="flex-1">
                <span className="block text-xl font-extrabold">Payer une séance</span>
                <span className="block text-[13px] font-semibold text-white/85">Séance, carnet ou mois · code par e-mail</span>
              </span>
              <ArrowRight size={20} className="group-active:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </section>

      {/* Accès aux sections */}
      <section className="max-w-6xl mx-auto px-5 py-12">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-5">Découvrir la salle</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {sections.map((s) => (
            <Link key={s.to} to={s.to} className="group border border-gray-100 rounded-3xl p-6 hover:border-red-200 hover:shadow-lg transition-all bg-white">
              <span className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: '#fdecec', color: RED }}><s.icon size={22} /></span>
              <p className="text-lg font-extrabold text-gray-900">{s.label}</p>
              <p className="text-[13px] font-semibold text-gray-500 mt-0.5">{s.sub}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

export default BornePage;
