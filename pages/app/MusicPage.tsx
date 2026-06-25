import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, Search, Radio, Loader2, Plus, X } from 'lucide-react';

/**
 * Ambiance musicale de la salle — radio internet (gratuit, via Radio Browser API).
 * Joue depuis le PC de la salle vers les enceintes. SACEM déjà payée par la salle.
 * NoResa étant servi en HTTPS, on ne joue que des flux HTTPS (sinon bloqué par le navigateur).
 */

interface Station { name: string; url: string; }

// Préréglages (flux HTTPS). « FG at work » = la webradio workout de Radio FG.
const PRESETS: Station[] = [
  { name: 'FG — Training / At work', url: 'https://stream.rcs.revma.com/2v1zz979n98uv' },
  { name: 'Radio FG 98.2', url: 'https://stream.rcs.revma.com/wknqhm4yuchvv' },
  { name: 'FG Underground', url: 'https://radiofg.impek.com/ufg.mp3' },
  { name: 'FG Techno', url: 'https://stream.rcs.revma.com/1z19ak79n98uv' },
  { name: 'FG Classics', url: 'https://stream.rcs.revma.com/37n8gxv9n98uv' },
];

const RB_SERVERS = ['https://de1.api.radio-browser.info', 'https://nl1.api.radio-browser.info'];

async function searchStations(q: string): Promise<Station[]> {
  for (const base of RB_SERVERS) {
    try {
      const res = await fetch(`${base}/json/stations/search?name=${encodeURIComponent(q)}&limit=40&hidebroken=true&order=clickcount&reverse=true`);
      if (!res.ok) continue;
      const data = await res.json();
      const seen = new Set<string>();
      return (data as any[])
        .map((s) => ({ name: s.name?.trim() || 'Station', url: (s.url_resolved || s.url || '').trim() }))
        .filter((s) => s.url.startsWith('https://')) // HTTPS uniquement (mixed-content)
        .filter((s) => { const k = s.url; if (seen.has(k)) return false; seen.add(k); return true; })
        .slice(0, 24);
    } catch { /* essaie le serveur suivant */ }
  }
  return [];
}

const MusicPage: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [station, setStation] = useState<Station | null>(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [err, setErr] = useState('');

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Station[]>([]);
  const [searching, setSearching] = useState(false);
  const [customUrl, setCustomUrl] = useState('');

  // Restaure la dernière station + volume
  useEffect(() => {
    try {
      const v = localStorage.getItem('noresa_music_volume');
      if (v) setVolume(Number(v));
      const s = localStorage.getItem('noresa_music_station');
      if (s) setStation(JSON.parse(s));
    } catch { /* noop */ }
  }, []);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; localStorage.setItem('noresa_music_volume', String(volume)); }, [volume]);

  const play = async (s: Station) => {
    setErr(''); setStation(s);
    try { localStorage.setItem('noresa_music_station', JSON.stringify(s)); } catch { /* noop */ }
    const a = audioRef.current;
    if (!a) return;
    a.src = s.url;
    a.volume = volume;
    setLoading(true);
    try {
      await a.play();
      setPlaying(true);
    } catch (e: any) {
      setErr("Lecture impossible (flux indisponible ou bloqué). Essaie une autre station.");
      setPlaying(false);
    } finally { setLoading(false); }
  };

  const toggle = async () => {
    const a = audioRef.current;
    if (!a || !station) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { try { await a.play(); setPlaying(true); setErr(''); } catch { setErr('Lecture impossible.'); } }
  };

  const doSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!query.trim()) return;
    setSearching(true); setResults([]);
    setResults(await searchStations(query.trim()));
    setSearching(false);
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Radio size={24} className="text-indigo-600" /> Musique &amp; ambiance</h1>
        <p className="text-sm text-gray-500">Radio internet diffusée depuis ce PC vers les enceintes. SACEM déjà couverte.</p>
      </div>

      {/* Lecteur */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-3xl p-6 text-white shadow-xl shadow-indigo-100">
        <p className="text-[11px] font-semibold uppercase tracking-wide opacity-80">En lecture</p>
        <p className="text-2xl font-extrabold mt-1 truncate">{station ? station.name : 'Aucune station'}</p>
        <div className="flex items-center gap-4 mt-5">
          <button onClick={toggle} disabled={!station} className="w-14 h-14 rounded-full bg-white text-indigo-700 flex items-center justify-center shadow-lg disabled:opacity-50 active:scale-95 transition-transform">
            {loading ? <Loader2 size={24} className="animate-spin" /> : playing ? <Pause size={26} /> : <Play size={26} className="ml-0.5" />}
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Volume2 size={18} className="opacity-80 shrink-0" />
            <input type="range" min={0} max={1} step={0.01} value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="w-full accent-white" />
          </div>
        </div>
        {err && <p className="mt-3 text-[12px] font-semibold bg-white/15 rounded-xl px-3 py-2">{err}</p>}
        <audio ref={audioRef} onPlaying={() => { setPlaying(true); setLoading(false); }} onPause={() => setPlaying(false)} onWaiting={() => setLoading(true)} onError={() => { setErr('Flux indisponible. Essaie une autre station.'); setLoading(false); setPlaying(false); }} hidden />
      </div>

      {/* Préréglages */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Préréglages</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {PRESETS.map((s) => {
            const active = station?.url === s.url;
            return (
              <button key={s.url} onClick={() => play(s)} className={`text-left px-4 py-3 rounded-2xl border-2 transition ${active ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                <span className="font-bold text-sm text-gray-900">{s.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Recherche */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">Chercher une autre station</h2>
        <form onSubmit={doSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="ex. workout, lo-fi, NRJ, FG…" className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
          </div>
          <button type="submit" disabled={searching} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50">{searching ? '…' : 'Chercher'}</button>
        </form>
        {results.length > 0 && (
          <div className="mt-3 space-y-1.5 max-h-72 overflow-y-auto">
            {results.map((s) => (
              <button key={s.url} onClick={() => play(s)} className="w-full flex items-center gap-2 text-left px-3 py-2.5 rounded-xl bg-white border border-gray-100 hover:border-indigo-300">
                <Radio size={14} className="text-gray-400 shrink-0" />
                <span className="text-sm font-semibold text-gray-800 truncate">{s.name}</span>
                <Play size={14} className="ml-auto text-indigo-600 shrink-0" />
              </button>
            ))}
          </div>
        )}
        {!searching && query && results.length === 0 && (
          <p className="text-[12px] text-gray-400 mt-2">Aucune station HTTPS trouvée pour « {query} ».</p>
        )}
      </div>

      {/* URL personnalisée */}
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-2">URL de flux personnalisée</h2>
        <div className="flex gap-2">
          <input value={customUrl} onChange={(e) => setCustomUrl(e.target.value)} placeholder="https://… (flux .mp3/.aac)" className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" />
          <button onClick={() => customUrl.trim().startsWith('https://') ? play({ name: 'Flux personnalisé', url: customUrl.trim() }) : setErr('L\'URL doit être en https://')} className="px-4 py-2.5 bg-gray-900 text-white rounded-xl font-bold text-sm flex items-center gap-1.5"><Plus size={15} /> Jouer</button>
        </div>
        <p className="text-[11px] text-gray-400 mt-1.5">Si tu as l'URL exacte de « FG Training », colle-la ici (flux HTTPS uniquement).</p>
      </div>
    </div>
  );
};

export default MusicPage;
