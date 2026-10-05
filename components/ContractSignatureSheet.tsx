import React, { useEffect, useRef, useState } from 'react';
import { Eraser, Check, ChevronDown, X, Loader2 } from 'lucide-react';
import { CGA } from '../lib/legalText';

const RED = '#C81E1E';

interface Props {
  open: boolean;
  /** Récapitulatif affiché en tête (ex. « Abo classique · 29,90 €/mois »). */
  summary?: string;
  signerName?: string;
  submitLabel?: string;
  busy?: boolean;
  onClose: () => void;
  onSubmit: (r: { consentCga: boolean; consentMedical: boolean; consentImage: boolean; signature: string }) => void;
}

/**
 * Écran de signature du contrat d'adhésion (self-service : app + borne).
 * Mêmes obligations qu'au comptoir : CGA consultables, déclarations obligatoires
 * (conditions/règlement, aptitude médicale, lu et approuvé) + signature.
 * Le contrat signé est ensuite envoyé par e-mail (serveur).
 */
const ContractSignatureSheet: React.FC<Props> = ({ open, summary, signerName, submitLabel, busy, onClose, onSubmit }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);
  const [consentCga, setConsentCga] = useState(false);
  const [consentMed, setConsentMed] = useState(false);
  const [readApproved, setReadApproved] = useState(false);
  const [showMentions, setShowMentions] = useState(false);

  useEffect(() => {
    if (!open) { setEmpty(true); setConsentCga(false); setConsentMed(false); setReadApproved(false); setShowMentions(false); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Dimensionne le pavé dès que sa taille réelle est connue, et le réajuste si elle
    // change (évite un canvas de largeur 0 figée au montage → tracé non inscrit).
    const setup = () => {
      const ratio = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const w = Math.round(rect.width * ratio);
      const h = Math.round(rect.height * ratio);
      if (canvas.width === w && canvas.height === h) return;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(ratio, ratio);
      ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#14100F';
    };
    setup();
    const ro = new ResizeObserver(setup);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [open]);

  if (!open) return null;

  const pos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const start = (e: React.PointerEvent) => { drawing.current = true; const c = canvasRef.current!.getContext('2d')!; const p = pos(e); c.beginPath(); c.moveTo(p.x, p.y); };
  const move = (e: React.PointerEvent) => { if (!drawing.current) return; const c = canvasRef.current!.getContext('2d')!; const p = pos(e); c.lineTo(p.x, p.y); c.stroke(); if (empty) setEmpty(false); };
  const end = () => { drawing.current = false; };
  const clear = () => { const c = canvasRef.current!; c.getContext('2d')!.clearRect(0, 0, c.width, c.height); setEmpty(true); };

  const canValidate = !empty && consentCga && consentMed && readApproved && !busy;

  const validate = () => {
    if (!canValidate) return;
    const signature = canvasRef.current!.toDataURL('image/png');
    onSubmit({ consentCga, consentMedical: consentMed, consentImage: true, signature });
  };

  return (
    <div className="fixed inset-0 z-[70] bg-slate-50 ui-crisp flex flex-col overflow-y-auto">
      <div className="max-w-3xl w-full mx-auto px-6 py-8 flex-1 flex flex-col">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-extrabold" style={{ color: RED }}>La SaLLe</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 p-2" aria-label="Fermer"><X size={26} /></button>
        </div>

        <h1 className="text-2xl font-extrabold text-gray-900 mt-5">Signature du contrat d'adhésion</h1>
        {signerName && <p className="text-gray-500 font-medium mt-1">{signerName}</p>}
        {summary && <p className="text-sm font-bold mt-2" style={{ color: RED }}>{summary}</p>}
        <p className="text-gray-500 font-medium mt-2 text-sm">Merci de lire et signer ton contrat. Le contrat complet te sera envoyé par e-mail.</p>

        {/* Conditions générales */}
        <div className="mt-5 border border-gray-200 rounded-2xl bg-white overflow-hidden">
          <button onClick={() => setShowMentions((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 text-left font-bold text-gray-800">
            Lire les conditions et la politique de confidentialité
            <ChevronDown size={20} className={`transition-transform ${showMentions ? 'rotate-180' : ''}`} style={{ color: RED }} />
          </button>
          {showMentions && (
            <div className="px-4 pb-4 max-h-72 overflow-y-auto">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Conditions générales d'adhésion — A.R.A.P.S (La SaLLe)</p>
              {CGA.map((p, i) => (
                p.h
                  ? <p key={i} className="text-sm font-extrabold mt-3 mb-1" style={{ color: RED }}>{p.h}</p>
                  : <p key={i} className="text-[13px] text-gray-600 leading-relaxed mb-1.5">{p.t}</p>
              ))}
            </div>
          )}
        </div>

        {/* Déclarations obligatoires */}
        <div className="mt-4 space-y-2.5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={consentCga} onChange={(e) => setConsentCga(e.target.checked)} className="mt-1 w-5 h-5" style={{ accentColor: RED }} />
            <span className="text-sm font-medium text-gray-700">Je déclare avoir pris connaissance des Conditions générales d'adhésion et du Règlement intérieur.</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={consentMed} onChange={(e) => setConsentMed(e.target.checked)} className="mt-1 w-5 h-5" style={{ accentColor: RED }} />
            <span className="text-sm font-medium text-gray-700">Je déclare avoir fait contrôler par un médecin mon aptitude à pratiquer une activité sportive.</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={readApproved} onChange={(e) => setReadApproved(e.target.checked)} className="mt-1 w-5 h-5" style={{ accentColor: RED }} />
            <span className="text-sm font-medium text-gray-700"><b>Lu et approuvé</b> : je certifie avoir lu et approuvé l'ensemble du contrat d'adhésion.</span>
          </label>
        </div>

        {/* Info photo / droit à l'image */}
        <div className="mt-4 rounded-2xl bg-gray-100 p-4 text-[13px] text-gray-600 leading-relaxed">
          <b>Ta photo.</b> Une photo pourra être prise à la salle pour t'identifier (sécurité). Elle sert uniquement de photo de ton profil adhérent : jamais diffusée ni communiquée, retirable à tout moment.
        </div>

        {/* Pavé de signature */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Signature</p>
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
          {busy ? <><Loader2 size={20} className="animate-spin" /> Validation…</> : <><Check size={20} /> {submitLabel || 'Valider et continuer'}</>}
        </button>
      </div>
    </div>
  );
};

export default ContractSignatureSheet;
