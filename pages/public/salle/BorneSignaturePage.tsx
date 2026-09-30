import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eraser, Check, ChevronDown, CheckCircle2, X } from 'lucide-react';
import { getPendingSign, sendSignResult, clearPendingSign } from '../../../lib/borneBridge';

const RED = '#C81E1E';

// Provisoire — sera remplacé par les vraies mentions (CGA/règlement + confidentialité).
const MENTIONS_LEGALES = `Conditions générales, règlement intérieur et politique de confidentialité de La SaLLe (A.R.A.P.S).\n\n(Texte à compléter : conditions d'abonnement, durée/engagement et résiliation, traitement des données personnelles (RGPD), droit à l'image.)`;

// « Comment nous avez-vous connu ? » — placeholder, à ajuster selon la salle.
const SOURCES = ['Un ami / une connaissance', 'Réseaux sociaux', 'En passant devant', 'Publicité', 'Autre'];

const BorneSignaturePage: React.FC = () => {
  const navigate = useNavigate();
  const req = getPendingSign();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);
  const [consentCga, setConsentCga] = useState(false);
  const [consentMed, setConsentMed] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [source, setSource] = useState('');
  const [code, setCode] = useState('');
  const [done, setDone] = useState(false);

  // Pas de demande en attente : on retourne à l'accueil.
  useEffect(() => { if (!req) navigate('/borne', { replace: true }); }, [req, navigate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#14100F';
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const start = (e: React.PointerEvent) => { drawing.current = true; const c = canvasRef.current!.getContext('2d')!; const p = pos(e); c.beginPath(); c.moveTo(p.x, p.y); };
  const move = (e: React.PointerEvent) => { if (!drawing.current) return; const c = canvasRef.current!.getContext('2d')!; const p = pos(e); c.lineTo(p.x, p.y); c.stroke(); if (empty) setEmpty(false); };
  const end = () => { drawing.current = false; };
  const clear = () => { const c = canvasRef.current!; c.getContext('2d')!.clearRect(0, 0, c.width, c.height); setEmpty(true); };

  const canValidate = !empty && consentCga && consentMed && !done;

  const validate = () => {
    if (!canValidate) return;
    const signature = canvasRef.current!.toDataURL('image/png');
    sendSignResult({ signature, acquisition: source || null, referralCode: code.trim() || null });
    setDone(true);
    setTimeout(() => navigate('/borne', { replace: true }), 2600);
  };

  const cancel = () => { clearPendingSign(); navigate('/borne', { replace: true }); };

  if (done) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center text-white ui-crisp" style={{ background: `linear-gradient(160deg, ${RED}, #8E1414)` }}>
        <CheckCircle2 size={72} />
        <h1 className="text-4xl font-extrabold mt-5">Merci !</h1>
        <p className="text-lg font-semibold text-white/90 mt-2">Ta signature est bien enregistrée.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-50 ui-crisp flex flex-col overflow-y-auto">
      <div className="max-w-3xl w-full mx-auto px-6 py-8 flex-1 flex flex-col">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-extrabold" style={{ color: RED }}>La SaLLe</span>
          <button onClick={cancel} className="text-gray-400 hover:text-gray-700 p-2" aria-label="Annuler"><X size={26} /></button>
        </div>

        <h1 className="text-3xl font-extrabold text-gray-900 mt-6">Bonjour {req?.signerName || ''} 👋</h1>
        <p className="text-gray-500 font-medium mt-1">Merci de signer ton contrat ci-dessous. Le contrat complet te sera envoyé par e-mail.</p>

        {/* Mentions légales */}
        <div className="mt-5 border border-gray-200 rounded-2xl bg-white overflow-hidden">
          <button onClick={() => setShowMentions((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 text-left font-bold text-gray-800">
            Lire les conditions et la politique de confidentialité
            <ChevronDown size={20} className={`transition-transform ${showMentions ? 'rotate-180' : ''}`} style={{ color: RED }} />
          </button>
          {showMentions && <div className="px-4 pb-4 text-sm text-gray-600 whitespace-pre-line leading-relaxed max-h-48 overflow-y-auto">{MENTIONS_LEGALES}</div>}
        </div>

        <div className="mt-4 space-y-2.5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={consentCga} onChange={(e) => setConsentCga(e.target.checked)} className="mt-1 w-5 h-5" style={{ accentColor: RED }} />
            <span className="text-sm font-medium text-gray-700">J'ai lu et j'accepte les conditions générales, le règlement intérieur et la politique de confidentialité.</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={consentMed} onChange={(e) => setConsentMed(e.target.checked)} className="mt-1 w-5 h-5" style={{ accentColor: RED }} />
            <span className="text-sm font-medium text-gray-700">Je déclare être apte à la pratique d'une activité sportive.</span>
          </label>
        </div>

        {/* Comment nous avez-vous connu + code */}
        <div className="mt-6">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Comment nous avez-vous connu ?</p>
          <div className="flex flex-wrap gap-2">
            {SOURCES.map((s) => (
              <button key={s} onClick={() => setSource(s === source ? '' : s)} className={`px-4 py-2 rounded-xl border font-semibold text-sm ${source === s ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 bg-white'}`} style={{ backgroundColor: source === s ? RED : undefined }}>{s}</button>
            ))}
          </div>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="As-tu un code ? (facultatif)"
            className="mt-3 w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-red-100" />
        </div>

        {/* Pavé de signature */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Signature (précédée de « lu et approuvé »)</p>
            <button onClick={clear} className="inline-flex items-center gap-1.5 text-[12px] font-bold text-gray-400 hover:text-gray-700"><Eraser size={14} /> Effacer</button>
          </div>
          <div className="relative rounded-2xl border-2 border-dashed border-gray-300 bg-white" style={{ height: '220px' }}>
            <canvas ref={canvasRef} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end} className="absolute inset-0 w-full h-full touch-none" />
            {empty && <span className="absolute inset-0 flex items-center justify-center text-gray-300 font-semibold pointer-events-none">Signez ici</span>}
          </div>
        </div>

        <button onClick={validate} disabled={!canValidate}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 text-white font-bold py-4 rounded-2xl shadow-xl disabled:opacity-50"
          style={{ backgroundColor: RED }}>
          <Check size={20} /> Valider ma signature
        </button>
      </div>
    </div>
  );
};

export default BorneSignaturePage;
