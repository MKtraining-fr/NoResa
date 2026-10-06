import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Hand } from 'lucide-react';
import { getPublicAnnouncements, isImportantAnnouncement, PublicAnnouncement, AnnouncementCategory } from '../../../lib/announcementsApi';
import { parseVideo } from '../../../lib/videoEmbed';

const RED = '#C81E1E';

/* ------------------------------------------------------------------ *
 *  Écran de veille (borne). Boucle vidéo + annonces. Une touche -> accueil.
 *  VEILLE_VIDEO : lien d'une vidéo promo (YouTube / Vimeo / .mp4). Vide -> annonces seules.
 * ------------------------------------------------------------------ */
const VEILLE_VIDEO = '';
const SLIDE_MS = 10000;        // durée d'une annonce
const IMPORTANT_MS = 15000;    // durée d'une annonce « à la une » (plus longue)
const VIDEO_MS = 30000;        // durée max d'une slide vidéo
const REFRESH_ANNONCES_MS = 5 * 60 * 1000;   // recharge les annonces
const RELOAD_MS = 20 * 60 * 1000;            // rechargement complet (récupère les MAJ)

const CAT_LABEL: Record<AnnouncementCategory, string> = {
  info: 'Info', promo: 'Promo', event: 'Événement', alert: 'Alerte',
};

type Slide = { kind: 'video'; url: string } | { kind: 'annonce'; a: PublicAnnouncement };

/** Iframe YouTube/Vimeo en autoplay muet + boucle pour la veille. */
function videoEmbedSrc(url: string): string | null {
  const v = parseVideo(url);
  if (v.kind === 'youtube' && v.embedUrl) {
    const id = v.embedUrl.split('/embed/')[1];
    return `${v.embedUrl}?autoplay=1&mute=1&loop=1&controls=0&playsinline=1&playlist=${id}`;
  }
  if (v.kind === 'vimeo' && v.embedUrl) return `${v.embedUrl}?autoplay=1&muted=1&loop=1&background=1`;
  return null;
}

const VeillePage: React.FC = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState<PublicAnnouncement[]>([]);
  const [idx, setIdx] = useState(0);
  const [now, setNow] = useState(new Date());

  // Chargement + rafraîchissements
  useEffect(() => {
    getPublicAnnouncements().then(setItems);
    const t1 = setInterval(() => getPublicAnnouncements().then(setItems), REFRESH_ANNONCES_MS);
    const t2 = setInterval(() => setNow(new Date()), 1000);
    const t3 = setInterval(() => { try { window.location.reload(); } catch { /* noop */ } }, RELOAD_MS);
    return () => { clearInterval(t1); clearInterval(t2); clearInterval(t3); };
  }, []);

  // Toute interaction -> destination selon la slide courante : une annonce « à la une »
  // ouvre directement la page Infos (l'info apparaît), sinon retour à l'accueil borne.
  const targetRef = useRef('/borne');
  useEffect(() => {
    const dismiss = () => navigate(targetRef.current, { replace: true });
    const evts = ['pointerdown', 'keydown', 'touchstart'] as const;
    evts.forEach((e) => window.addEventListener(e, dismiss, { passive: true }));
    return () => evts.forEach((e) => window.removeEventListener(e, dismiss));
  }, [navigate]);

  const slides = useMemo<Slide[]>(() => {
    const s: Slide[] = [];
    if (VEILLE_VIDEO) s.push({ kind: 'video', url: VEILLE_VIDEO });
    const important = items.filter(isImportantAnnouncement);
    const normal = items.filter((a) => !isImportantAnnouncement(a));
    // Les « à la une » passent d'abord…
    important.forEach((a) => s.push({ kind: 'annonce', a }));
    // …puis on alterne annonces courantes / « à la une » pour qu'elles reviennent souvent.
    normal.forEach((a, i) => {
      s.push({ kind: 'annonce', a });
      if (important.length) s.push({ kind: 'annonce', a: important[i % important.length] });
    });
    return s;
  }, [items]);

  // Avance automatique
  const idxRef = useRef(idx); idxRef.current = idx;
  useEffect(() => {
    if (slides.length <= 1) { setIdx(0); return; }
    if (idx >= slides.length) { setIdx(0); return; }
    const cur = slides[idx];
    const d = cur?.kind === 'video' ? VIDEO_MS
      : (cur?.kind === 'annonce' && isImportantAnnouncement(cur.a)) ? IMPORTANT_MS : SLIDE_MS;
    const t = setTimeout(() => setIdx((i) => (i + 1) % slides.length), d);
    return () => clearTimeout(t);
  }, [idx, slides]);

  const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  const redBg = `radial-gradient(120% 80% at 85% -10%, #d8352f 0%, rgba(216,53,47,0) 45%), linear-gradient(160deg, ${RED} 0%, ${RED} 45%, #8E1414 100%)`;
  const aLaUneBg = `radial-gradient(130% 90% at 80% -10%, #ef6a2a 0%, rgba(239,106,42,0) 45%), linear-gradient(160deg, #C81E1E 0%, #a81414 55%, #7a0f0f 100%)`;
  const current = slides[idx];
  const important = current?.kind === 'annonce' && isImportantAnnouncement(current.a);
  // Destination au toucher (lue par l'écouteur global via la ref)
  targetRef.current = important && current?.kind === 'annonce' ? `/infos?focus=${current.a.id}` : '/borne';
  const bg = current?.kind === 'video' ? '#000' : important ? aLaUneBg : redBg;

  return (
    <div className="fixed inset-0 text-white overflow-hidden ui-crisp" style={{ background: bg }}>
      <style>{`
        @keyframes veilleHalo { 0%,100% { box-shadow:inset 0 0 0 0 rgba(255,210,120,0); } 50% { box-shadow:inset 0 0 160px 0 rgba(255,210,120,.45); } }
        .veille-halo { position:absolute; inset:0; animation:veilleHalo 1.8s ease-in-out infinite; pointer-events:none; }
        @keyframes veilleBadge { 0%,100% { transform:scale(1); } 50% { transform:scale(1.06); } }
        .veille-badge { animation:veilleBadge 1.3s ease-in-out infinite; }
        @keyframes veilleNudge { 0%,100% { transform:translateX(0); } 50% { transform:translateX(8px); } }
        .veille-nudge { animation:veilleNudge 1.2s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .veille-halo,.veille-badge,.veille-nudge { animation:none; } }
      `}</style>
      {important && <span className="veille-halo" aria-hidden />}
      {/* Contenu principal */}
      {!current ? (
        // Aucune annonce ni vidéo : veille de marque
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-10 pt-24 pb-32">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-white/80">A.R.A.P.S · Villeneuve-la-Comptal</p>
          <h1 className="mt-4 text-7xl font-extrabold tracking-tight">La SaLLe</h1>
          <p className="mt-4 text-2xl font-semibold text-white/90">Ouverte de 6h à 23h · Musculation · Cardio · Hyrox</p>
        </div>
      ) : current.kind === 'video' ? (
        (() => {
          const src = videoEmbedSrc(current.url);
          return src ? (
            <iframe key={idx} src={src} title="Vidéo" className="absolute inset-0 w-full h-full" allow="autoplay; encrypted-media" />
          ) : (
            <video key={idx} src={current.url} autoPlay muted loop playsInline className="absolute inset-0 w-full h-full object-cover" />
          );
        })()
      ) : (
        <div key={idx} className="absolute inset-0 flex flex-col justify-center px-12 sm:px-24 pt-24 pb-32 animate-in fade-in duration-700">
          {important ? (
            <span className="veille-badge self-start inline-flex items-center gap-2 text-base font-extrabold uppercase tracking-[0.2em] bg-white text-[#C81E1E] rounded-full px-5 py-2 shadow-lg">
              ⚠ À la une
            </span>
          ) : (
            <span className="self-start text-sm font-extrabold uppercase tracking-widest bg-white/20 rounded-full px-4 py-1.5">{CAT_LABEL[current.a.category] || 'Info'}</span>
          )}
          <h1 className="mt-6 text-6xl sm:text-7xl font-extrabold tracking-tight text-balance max-w-5xl">{current.a.title}</h1>
          {current.a.body && <p className="mt-6 text-2xl sm:text-3xl font-semibold text-white/95 max-w-4xl leading-snug whitespace-pre-line line-clamp-6">{current.a.body}</p>}
          {current.a.mediaUrl && parseVideo(current.a.mediaUrl).kind === 'link' && (
            <img src={current.a.mediaUrl} alt="" className="mt-8 max-h-[38vh] w-auto rounded-3xl object-cover shadow-2xl" />
          )}
        </div>
      )}

      {/* Surcouche : logo + heure + invite (masqués si vidéo plein cadre pour rester propre) */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-10 pt-8 pointer-events-none">
        <span className="text-3xl font-extrabold tracking-tight drop-shadow">La SaLLe</span>
        <span className="text-right leading-tight drop-shadow">
          <span className="block text-3xl font-extrabold tabular-nums">{timeStr}</span>
          <span className="block text-sm font-semibold text-white/80 capitalize">{dateStr}</span>
        </span>
      </div>

      <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center pb-10 pointer-events-none">
        {slides.length > 1 && (
          <div className="flex gap-2 mb-5">
            {slides.map((_, i) => <span key={i} className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-8 bg-white' : 'w-3 bg-white/40'}`} />)}
          </div>
        )}
        <p className={`inline-flex items-center gap-2 font-bold rounded-full px-6 py-3 backdrop-blur-sm ${important ? 'text-xl bg-white text-[#C81E1E] shadow-lg' : 'text-lg bg-white/15 animate-pulse'}`}>
          {important
            ? <><Hand size={22} className="veille-nudge" /> Touchez l'écran pour lire l'info</>
            : <><Hand size={20} /> Touchez l'écran pour commencer</>}
        </p>
      </div>
    </div>
  );
};

export default VeillePage;
