import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  QrCode, FileText, MapPin, Gift, Megaphone, X, Maximize2,
  Package, Calendar, Plus, ChevronRight, MessageCircle,
  Dumbbell, TrendingUp, BookOpen,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  getMyMember, getHourlyOccupancy, affluenceLevel, getMyGym, getMyPackStatus, getMemberFormulas,
  type MyMember, type HourOccupancy, type MyGym, type MyPackStatus, type MemberFormula,
} from '../../lib/memberSelfApi';
import { startMemberMandate } from '../../lib/gocardless';
import { startStripePayment } from '../../lib/stripe';

/**
 * Accueil de l'espace adhérent : pass d'accès QR, solde de carnet + recharge,
 * app partenaire MuscleFlow, affluence en direct. Aux couleurs de la salle (brand).
 */

const DAYS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
const hhmm = (s: string) => (s || '').replace(':', 'h');

/** Statut d'ouverture « Ouvert · ferme à 22h30 » / « Fermé » à partir des horaires. */
function openStatus(gym: MyGym | null): { open: boolean; label: string } {
  const hours = gym?.openingHours;
  if (!Array.isArray(hours) || hours.length === 0) return { open: false, label: '' };
  const now = new Date();
  const d = hours.find((h: any) => h.day === now.getDay());
  if (!d || d.closed) return { open: false, label: 'Fermé aujourd’hui' };
  const cur = now.toTimeString().slice(0, 5);
  if (cur < d.open) return { open: false, label: `Ouvre à ${hhmm(d.open)}` };
  if (cur > d.close) return { open: false, label: 'Fermé' };
  return { open: true, label: `Ouvert · ferme à ${hhmm(d.close)}` };
}

const MemberHome: React.FC = () => {
  const [member, setMember] = useState<MyMember | null>(null);
  const [occ, setOcc] = useState<HourOccupancy[]>([]);
  const [gym, setGym] = useState<MyGym | null>(null);
  const [pack, setPack] = useState<MyPackStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [partnerOpen, setPartnerOpen] = useState(false);

  const inFlight = useRef(false);
  const load = useCallback(async (silent = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (!silent) setLoading(true);
    try {
      const [m, o, g, p] = await Promise.all([
        getMyMember(), getHourlyOccupancy(), getMyGym(), getMyPackStatus(),
      ]);
      setMember(m); setOcc(o); setGym(g); setPack(p);
    } finally {
      // Toujours sortir du chargement, même en cas de souci réseau (jamais bloqué).
      setLoading(false);
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    load();
    // Au retour au premier plan (app mobile revenue d'arrière-plan), on rafraîchit
    // en silence — sans re-flasher les squelettes — pour ne jamais rester figé.
    const onVisible = () => { if (document.visibilityState === 'visible') load(true); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [load]);

  if (loading) return <HomeSkeleton />;
  if (!member) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p className="font-bold text-gray-900">Aucune fiche liée à ce compte.</p>
        <p className="text-sm mt-1">Contacte l'accueil pour activer ton espace.</p>
      </div>
    );
  }

  const active = (member.status ?? '').toLowerCase() === 'active';
  const aff = affluenceLevel(occ);
  const maxEntries = Math.max(1, ...occ.map((o) => o.entries));
  const nowH = new Date().getHours();
  const status = openStatus(gym);
  const toneClass =
    aff.tone === 'low' ? 'text-green-700 bg-green-50'
    : aff.tone === 'mid' ? 'text-orange-600 bg-orange-50'
    : 'text-red-600 bg-red-50';

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Salutation */}
      <div>
        <h2 className="text-2xl font-extrabold text-gray-900">Salut, {member.firstName} 👋</h2>
        <p className="text-sm text-gray-500">{DAYS[new Date().getDay()]} · {active ? 'prêt pour ta séance ?' : 'bienvenue 👊'}</p>
      </div>

      {active ? (
      <>
      {/* Pass d'accès */}
      <button
        onClick={() => setQrOpen(true)}
        className="w-full text-left bg-gradient-to-br from-brand to-brand-dark rounded-[2rem] p-5 text-white relative overflow-hidden shadow-2xl shadow-gray-200 active:scale-[0.99] transition-transform"
      >
        <div className="absolute -top-10 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="bg-white px-3.5 py-3 rounded-2xl shadow-lg text-center shrink-0">
            <p className="text-[8px] font-extrabold uppercase tracking-widest text-gray-400">Code d'accès</p>
            <p className="text-[26px] leading-none font-black tracking-[0.15em] text-gray-900 tabular-nums mt-1">{member.keypadCode || '——————'}</p>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-widest opacity-80">Mon accès</p>
            <p className="text-lg font-extrabold leading-tight mt-0.5 truncate">{member.firstName} {member.lastName}</p>
            <p className="text-xs opacity-90 font-semibold truncate">
              {member.subscriptionLabel ?? 'Abonnement'} · {active ? 'Actif' : 'Inactif'}
            </p>
            {status.label && (
              <span className="inline-flex items-center gap-1.5 bg-white/20 px-2.5 py-1 rounded-lg mt-2 backdrop-blur">
                <span className={`w-1.5 h-1.5 rounded-full ${status.open ? 'bg-green-400 animate-pulse' : 'bg-white/60'}`} />
                <span className="text-[10px] font-extrabold tracking-wide">{status.label}</span>
              </span>
            )}
          </div>
        </div>
        <p className="relative mt-3 text-[11px] font-bold opacity-85 flex items-center gap-1.5">
          <Maximize2 size={13} /> Tape ce code au clavier de la porte · appuie pour l'agrandir
        </p>
      </button>

      {/* Carnet de séances (détenteurs) — sinon CTA « première séance » */}
      {pack?.isPack
        ? <RachatCard pack={pack} onRecharge={() => setRechargeOpen(true)} />
        : <FirstSeanceCard onBuy={() => setRechargeOpen(true)} />}

      {/* App partenaire MuscleFlow */}
      <PartnerCard onOpen={() => setPartnerOpen(true)} />
      </>
      ) : (
        /* Prospect : accès pas encore actif → carte d'activation */
        <ProspectActivateCard onActivate={() => setRechargeOpen(true)} />
      )}

      {/* Affluence en direct */}
      <div className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-brand rounded-full animate-pulse" />
            <span className="font-extrabold text-sm text-gray-900">Affluence en direct</span>
          </div>
          <span className={`text-[11px] font-extrabold px-2.5 py-1 rounded-lg ${toneClass}`}>
            {aff.label} · {aff.pct}%
          </span>
        </div>
        <div className="flex items-end gap-1 h-14">
          {occ.slice(6, 23).map((o) => (
            <div
              key={o.hour}
              className={`flex-1 rounded-md ${o.hour === nowH ? 'bg-brand' : 'bg-gray-200'}`}
              style={{ height: `${Math.max(6, (o.entries / maxEntries) * 100)}%` }}
              title={`${o.hour}h · ${o.entries} entrées`}
            />
          ))}
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-gray-400 font-semibold">
          <span>7h</span><span>13h</span><span>18h</span><span>22h</span>
        </div>
      </div>

      {/* Raccourcis */}
      <div className="grid grid-cols-2 gap-3">
        <QuickAction to="/membre/dossier" icon={FileText} tint="indigo" title="Mon dossier" sub="Contrat & factures" />
        <QuickAction to="/membre/infos" icon={MapPin} tint="green" title="Infos salle" sub="Accès & contact" />
        <QuickAction to="/membre/parrainage" icon={Gift} tint="purple" title="Parrainage" sub="1 mois offert" />
        <QuickAction to="/membre/notifications" icon={Megaphone} tint="orange" title="Annonces" sub="Nouveautés" />
      </div>

      {qrOpen && <QrOverlay member={member} active={active} onClose={() => setQrOpen(false)} />}
      {rechargeOpen && <RachatSheet onClose={() => setRechargeOpen(false)} />}
      {partnerOpen && <PartnerModal onClose={() => setPartnerOpen(false)} />}
    </div>
  );
};

// --- Carnet de séances ------------------------------------------------------

const RachatCard: React.FC<{ pack: MyPackStatus; onRecharge: () => void }> = ({ pack, onRecharge }) => {
  const pct = pack.total > 0 ? Math.round((pack.remaining / pack.total) * 100) : 0;
  const low = pack.remaining <= 3;
  const isCarnet = pack.total > 1;
  return (
    <div className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-brand-soft flex items-center justify-center shrink-0 text-brand">
            {isCarnet ? <Package size={19} /> : <Calendar size={19} />}
          </div>
          <div>
            <p className="font-extrabold text-[14.5px] text-gray-900">{isCarnet ? 'Carnet de séances' : 'Séance à l’unité'}</p>
            <p className="text-[11px] text-gray-400 font-semibold">{isCarnet ? 'Pack de 10 séances' : '1 entrée'}</p>
          </div>
        </div>
        <span className={`text-[10px] font-extrabold px-2.5 py-1 rounded-lg ${low ? 'text-orange-600 bg-orange-50' : 'text-green-700 bg-green-50'}`}>
          {low ? (pack.remaining <= 0 ? 'Épuisé' : 'Bientôt épuisé') : 'Actif'}
        </span>
      </div>
      <div className="flex items-center gap-2.5 mb-3">
        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: low ? '#EA580C' : 'var(--brand)' }} />
        </div>
        <span className="text-[12px] font-extrabold text-gray-900 whitespace-nowrap">{pack.remaining} / {pack.total}</span>
      </div>
      <button onClick={onRecharge} className="w-full bg-gray-900 text-white py-3 rounded-2xl font-extrabold text-[13.5px] flex items-center justify-center gap-2 active:scale-[0.99] transition-transform">
        <Plus size={16} strokeWidth={2.4} /> Recharger
      </button>
    </div>
  );
};

// Carte affichée à un prospect (accès pas encore actif) : invite à prendre une
// première séance / carnet / mois. Le QR d'accès et les avantages membres
// n'apparaissent qu'une fois l'accès activé (statut « active »).
const ProspectActivateCard: React.FC<{ onActivate: () => void }> = ({ onActivate }) => (
  <div className="bg-gradient-to-br from-brand to-brand-dark rounded-[2rem] p-5 text-white relative overflow-hidden shadow-2xl shadow-gray-200">
    <div className="absolute -top-10 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
    <div className="relative">
      <p className="text-[10px] font-extrabold uppercase tracking-widest opacity-80">Bienvenue</p>
      <p className="text-lg font-extrabold leading-tight mt-1">Ton accès n'est pas encore actif</p>
      <p className="text-xs opacity-90 font-semibold mt-1.5 leading-relaxed">
        Prends ta première séance, un carnet ou un mois pour entrer à la salle. Ton QR d'accès et tes avantages partenaires se débloquent aussitôt.
      </p>
      <button onClick={onActivate} className="mt-4 w-full bg-white text-gray-900 py-3 rounded-2xl font-extrabold text-[13.5px] flex items-center justify-center gap-2 active:scale-[0.99] transition-transform">
        <Plus size={16} strokeWidth={2.4} /> Activer mon accès
      </button>
    </div>
  </div>
);

const FirstSeanceCard: React.FC<{ onBuy: () => void }> = ({ onBuy }) => (
  <div className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm">
    <div className="flex items-center gap-2.5 mb-3">
      <div className="w-10 h-10 rounded-xl bg-brand-soft flex items-center justify-center text-brand shrink-0"><Calendar size={19} /></div>
      <div>
        <p className="font-extrabold text-[14.5px] text-gray-900">Prendre une séance</p>
        <p className="text-[11px] text-gray-400 font-semibold">Séance, carnet ou mois · paiement instantané</p>
      </div>
    </div>
    <button onClick={onBuy} className="w-full bg-gray-900 text-white py-3 rounded-2xl font-extrabold text-[13.5px] flex items-center justify-center gap-2 active:scale-[0.99] transition-transform">
      <Plus size={16} strokeWidth={2.4} /> Choisir &amp; payer
    </button>
  </div>
);

type ActivSel =
  | { kind: 'noeng'; key: 'seance' | 'carnet' | 'mois'; price: number }
  | { kind: 'eng'; label: string; price: number }
  | { kind: 'annual1'; label: string; price: number }   // annuel réglé en 1 fois (IBP)
  | { kind: 'annual3'; label: string; price: number };  // annuel réglé en 3 fois (mandat SEPA)

const RachatSheet: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const NOENG = [
    { key: 'seance', label: 'Séance à l’unité', sub: '1 entrée', price: 5 },
    { key: 'carnet', label: 'Pack de 10 séances', sub: '10 entrées (cumulées)', price: 45 },
    { key: 'mois', label: '1 mois', sub: 'Accès illimité 30 jours', price: 40 },
  ] as const;
  const [formulas, setFormulas] = useState<MemberFormula[]>([]);
  const [sel, setSel] = useState<ActivSel | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => { getMemberFormulas().then(setFormulas).catch(() => {}); }, []);

  // Mensuelles gérées par le webhook (abonnement auto) + annuelle (réglée en 1 ou 3 fois).
  const monthly = formulas.filter((f) => [25.9, 29.9, 59.9].includes(Number(f.price)));
  const annual = formulas.find((f) => /ann[eé]e|annuel/i.test(f.name));
  const hasEngagement = monthly.length > 0 || !!annual;
  const isMandate = sel?.kind === 'eng' || sel?.kind === 'annual3';

  const eur = (n: number) => `${n.toFixed(2).replace('.', ',')} €`;

  const pay = async () => {
    if (!sel) return;
    setBusy(true); setErr('');
    try {
      const redirect = `${window.location.origin}${window.location.pathname}#/membre`;
      let res: { authorisation_url: string };
      if (sel.kind === 'noeng') res = await startStripePayment(sel.key, redirect);
      else if (sel.kind === 'annual1') res = await startStripePayment('annee', redirect);
      else res = await startMemberMandate(sel.label, sel.price, redirect); // eng | annual3 -> mandat SEPA GoCardless
      const w = window.open(res.authorisation_url, '_blank');
      if (!w) window.location.href = res.authorisation_url;
      onClose();
    } catch (e: any) {
      setErr(e?.message || 'Indisponible pour le moment.');
      setBusy(false);
    }
  };

  const Row = (active: boolean, title: string, sub: string, price: number, onPick: () => void) => (
    <button onClick={onPick} className={`w-full flex items-center gap-3 rounded-2xl px-3.5 py-3 bg-white border-2 ${active ? 'border-brand' : 'border-gray-100'}`}>
      <div className="flex-1 text-left"><p className="font-extrabold text-[14px] text-gray-900">{title}</p><p className="text-[11px] text-gray-400 font-semibold">{sub}</p></div>
      <span className="font-black text-[16px] text-brand whitespace-nowrap">{eur(price)}</span>
      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${active ? 'border-brand' : 'border-gray-300'}`}>{active && <div className="w-2.5 h-2.5 rounded-full bg-brand" />}</div>
    </button>
  );

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-200">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white rounded-t-[30px] px-5 pt-5 pb-7 max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom duration-300">
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />
        <p className="text-[11px] font-extrabold uppercase tracking-wide text-brand">Activer mon accès</p>
        <p className="font-black text-xl text-gray-900 mt-0.5">Choisis ta formule</p>

        {/* Sans engagement — paiement instantané (Instant Bank Pay) */}
        <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-400 mt-4 mb-2">Sans engagement · paiement instantané</p>
        <div className="flex flex-col gap-2">
          {NOENG.map((p) => Row(
            sel?.kind === 'noeng' && sel.key === p.key, p.label, p.sub, p.price,
            () => setSel({ kind: 'noeng', key: p.key, price: p.price }),
          ))}
        </div>

        {/* Avec engagement — prélèvement automatique (mandat SEPA) + annuelle */}
        {hasEngagement && (
          <>
            <p className="text-[10px] font-extrabold uppercase tracking-wide text-gray-400 mt-5 mb-2">Avec engagement · prélèvement automatique</p>
            <div className="flex flex-col gap-2">
              {monthly.map((f) => Row(
                sel?.kind === 'eng' && sel.label === f.name, f.name, 'Prélèvement mensuel le 10', Number(f.price),
                () => setSel({ kind: 'eng', label: f.name, price: Number(f.price) }),
              ))}
              {annual && (
                <div className="rounded-2xl border-2 border-gray-100 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-extrabold text-[14px] text-gray-900">{annual.name}</p>
                    <span className="font-black text-[15px] text-brand">{eur(Number(annual.price))}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setSel({ kind: 'annual1', label: annual.name, price: Number(annual.price) })}
                      className={`rounded-xl px-2 py-2.5 text-center border-2 ${sel?.kind === 'annual1' ? 'border-brand bg-brand-soft/40' : 'border-gray-100'}`}>
                      <p className="font-extrabold text-[12.5px] text-gray-900">En 1 fois</p>
                      <p className="text-[10px] text-gray-400 font-semibold">Paiement instantané</p>
                    </button>
                    <button onClick={() => setSel({ kind: 'annual3', label: annual.name, price: Number(annual.price) })}
                      className={`rounded-xl px-2 py-2.5 text-center border-2 ${sel?.kind === 'annual3' ? 'border-brand bg-brand-soft/40' : 'border-gray-100'}`}>
                      <p className="font-extrabold text-[12.5px] text-gray-900">En 3 fois</p>
                      <p className="text-[10px] text-gray-400 font-semibold">3 × {eur(Number(annual.price) / 3)}</p>
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-2.5 flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
              <span className="text-[13px]">🎫</span>
              <p className="text-[11px] font-semibold text-amber-800 leading-snug">
                Badge d'accès <b>obligatoire (15 €)</b> à retirer à l'accueil de la salle lors de ta première visite.
              </p>
            </div>
          </>
        )}

        {err && <p className="text-[11px] text-red-600 font-semibold mt-3 text-center">{err}</p>}
        <button onClick={pay} disabled={busy || !sel} className="mt-4 w-full bg-brand text-white py-3.5 rounded-2xl font-extrabold text-[15px] disabled:opacity-50">
          {busy ? 'Connexion à ta banque…' : isMandate ? 'Mettre en place le prélèvement' : 'Payer & valider'}
        </button>
        <p className="text-center text-[10.5px] text-gray-400 font-semibold mt-2.5">
          {isMandate
            ? 'Signature du mandat SEPA via ta banque · accès activé après validation.'
            : 'Paiement instantané via ta banque (open banking) · accès activé après confirmation.'}
        </p>
      </div>
    </div>
  );
};

// --- App partenaire MuscleFlow ---------------------------------------------

const APP_STORE_URL = 'https://apps.apple.com/app/muscleflow';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.muscleflow';

const MfLogo: React.FC<{ size: number }> = ({ size }) => {
  const [ok, setOk] = useState(true);
  if (!ok) return <span className="font-black text-indigo-600" style={{ fontSize: size * 0.42 }}>MF</span>;
  return <img src="/muscleflow-logo.png" alt="MuscleFlow" onError={() => setOk(false)} className="w-full h-full object-contain" />;
};

const PartnerCard: React.FC<{ onOpen: () => void }> = ({ onOpen }) => (
  <button onClick={onOpen} className="w-full text-left relative overflow-hidden rounded-[20px] p-3.5 active:scale-[0.99] transition-transform shadow-lg"
          style={{ background: 'linear-gradient(135deg,#14131C,#221F37 55%,#1A1840)' }}>
    <div className="absolute -top-8 -right-5 w-28 h-28 rounded-full" style={{ background: 'radial-gradient(circle,rgba(139,139,247,.30),transparent 70%)' }} />
    <div className="relative flex items-center gap-3">
      <div className="w-11 h-11 rounded-[13px] bg-white flex items-center justify-center shrink-0 p-[5px]"><MfLogo size={44} /></div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-black text-[15px] text-white">MuscleFlow</span>
          <span className="text-[8px] font-extrabold uppercase tracking-wider text-indigo-300 bg-indigo-400/20 px-1.5 py-0.5 rounded-md">Partenaire</span>
        </div>
        <p className="text-[11px] text-slate-400 font-semibold mt-0.5">Programmes & suivi de musculation</p>
      </div>
      <ChevronRight size={18} className="text-slate-500 shrink-0" />
    </div>
    <div className="relative mt-3 flex items-center gap-2.5 rounded-xl border border-indigo-400/20 bg-indigo-400/10 px-3 py-2.5">
      <span className="font-black text-[17px] text-indigo-300 shrink-0">-50%</span>
      <span className="text-[11.5px] text-slate-300 font-semibold leading-snug">offert grâce à ton abonnement <span className="text-white font-extrabold">La Salle</span> 💪</span>
    </div>
  </button>
);

const Feature: React.FC<{ icon: React.ElementType; title: string; sub: string }> = ({ icon: Icon, title, sub }) => (
  <div className="flex items-start gap-3">
    <div className="w-[34px] h-[34px] rounded-[11px] bg-indigo-400/15 flex items-center justify-center shrink-0 text-indigo-300"><Icon size={17} /></div>
    <div>
      <p className="font-extrabold text-[13.5px] text-white">{title}</p>
      <p className="text-[11.5px] text-slate-400 font-medium mt-0.5">{sub}</p>
    </div>
  </div>
);

const PartnerModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div onClick={onClose} className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-200">
    <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-[30px] px-5 pt-5 pb-7 relative overflow-hidden animate-in slide-in-from-bottom duration-300"
         style={{ background: 'linear-gradient(180deg,#1A1830,#14131C)' }}>
      <div className="absolute -top-12 -right-10 w-52 h-52 rounded-full" style={{ background: 'radial-gradient(circle,rgba(139,139,247,.28),transparent 68%)' }} />
      <div className="relative">
        <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-4" />
        <div className="flex items-center gap-3.5">
          <div className="w-[60px] h-[60px] rounded-[18px] bg-white flex items-center justify-center shrink-0 p-[7px]"><MfLogo size={60} /></div>
          <div><p className="font-black text-[21px] text-white">MuscleFlow</p><p className="text-[12px] text-slate-400 font-semibold">Programmes & suivi de musculation</p></div>
        </div>
        <div className="mt-4 rounded-[18px] px-4 py-3.5 flex items-center gap-3.5" style={{ background: 'linear-gradient(135deg,#7C7CF0,#5B4FE0)' }}>
          <span className="font-black text-[28px] text-white shrink-0">-50%</span>
          <span className="text-[12.5px] text-white font-medium leading-snug">sur ton abonnement MuscleFlow, <b className="font-extrabold">offert</b> grâce à ton abonnement La Salle 💪</span>
        </div>
        <div className="mt-4 flex flex-col gap-3.5">
          <Feature icon={Dumbbell} title="Programmes personnalisés" sub="Des séances adaptées à ton niveau et tes objectifs" />
          <Feature icon={TrendingUp} title="Suivi de progression" sub="Charges, séries, records — visualise tes progrès" />
          <Feature icon={BookOpen} title="Bibliothèque d'exercices" sub="Vidéos et conseils technique pour chaque mouvement" />
        </div>
        <div className="flex gap-2.5 mt-5">
          <a href={APP_STORE_URL} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-white rounded-2xl py-3 active:scale-95 transition-transform">
            <span className="text-[13px] font-extrabold text-gray-900">App Store</span>
          </a>
          <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 bg-white rounded-2xl py-3 active:scale-95 transition-transform">
            <span className="text-[13px] font-extrabold text-gray-900">Google Play</span>
          </a>
        </div>
        <button onClick={onClose} className="mt-2.5 w-full bg-white/5 text-slate-400 py-3 rounded-2xl font-bold text-[13px]">Plus tard</button>
      </div>
    </div>
  </div>
);

// --- Sous-composants existants ---------------------------------------------

const TINTS: Record<string, string> = {
  indigo: 'bg-indigo-50 text-indigo-600',
  green: 'bg-green-50 text-green-600',
  purple: 'bg-purple-50 text-purple-600',
  orange: 'bg-orange-50 text-orange-600',
};

const QuickAction: React.FC<{ to: string; icon: React.ElementType; tint: string; title: string; sub: string }> = ({ to, icon: Icon, tint, title, sub }) => (
  <Link to={to} className="bg-white border border-gray-100 rounded-3xl p-4 shadow-sm flex flex-col gap-3 active:scale-[0.98] transition-transform">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${TINTS[tint]}`}><Icon size={20} /></div>
    <div>
      <p className="font-extrabold text-sm text-gray-900">{title}</p>
      <p className="text-[11px] text-gray-400 font-semibold">{sub}</p>
    </div>
  </Link>
);

const QrOverlay: React.FC<{ member: MyMember; active: boolean; onClose: () => void }> = ({ member, active, onClose }) => (
  <div onClick={onClose} className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
    <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-[2rem] p-7 w-full max-w-xs text-center shadow-2xl animate-in zoom-in-95 duration-300">
      <p className="text-[11px] font-extrabold uppercase tracking-widest text-brand">Code d'accès</p>
      <p className="text-xl font-extrabold text-gray-900 mt-1">{member.firstName} {member.lastName}</p>
      <div className="my-5 mx-auto w-full py-6 border border-gray-100 rounded-3xl shadow-inner bg-gray-50">
        <p className="text-[44px] leading-none font-black tracking-[0.18em] text-gray-900 tabular-nums">{member.keypadCode || '——————'}</p>
      </div>
      <span className="inline-flex items-center gap-2 bg-green-50 px-3.5 py-2 rounded-xl">
        <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
        <span className="text-xs font-extrabold text-green-700">{member.subscriptionLabel ?? 'Abonnement'} · {active ? 'Actif' : 'Inactif'}</span>
      </span>
      <p className="text-[11px] text-gray-400 font-semibold mt-3">Tape ce code au clavier de la porte 🔢</p>
      <button onClick={onClose} className="mt-5 w-full bg-gray-900 text-white py-3.5 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2"><X size={16} /> Fermer</button>
    </div>
  </div>
);

const HomeSkeleton: React.FC = () => (
  <div className="space-y-5 animate-pulse">
    <div className="h-8 w-40 bg-gray-200 rounded-lg" />
    <div className="h-36 bg-gray-200 rounded-[2rem]" />
    <div className="h-28 bg-gray-200 rounded-3xl" />
    <div className="h-20 bg-gray-200 rounded-[20px]" />
    <div className="h-32 bg-gray-200 rounded-3xl" />
  </div>
);

export default MemberHome;
