import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Printer, Copy, Check } from 'lucide-react';
import { getGymBranding } from '../lib/gymApi';

/** Lien public de l'espace adhérent (PWA installable depuis le navigateur). */
export const MEMBER_APP_URL = 'https://noresa.pages.dev/#/membre';

/**
 * Affiche à imprimer : QR code vers l'app adhérent.
 * Les adhérents scannent, ouvrent l'app dans leur navigateur puis l'ajoutent
 * à leur écran d'accueil — pas de store, pas d'APK à diffuser.
 */
const AppQrPoster: React.FC = () => {
  // Le back-office n'a pas de BrandProvider : on lit le nom affiché directement.
  const [displayName, setDisplayName] = useState('');
  useEffect(() => { getGymBranding().then((b) => { if (b) setDisplayName(b.displayName || b.name); }).catch(() => {}); }, []);
  const qrRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(MEMBER_APP_URL);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    } catch { /* presse-papier indisponible */ }
  };

  const print = () => {
    const svg = qrRef.current?.querySelector('svg')?.outerHTML;
    if (!svg) return;
    const salle = displayName || 'La Salle';
    const w = window.open('', '_blank', 'width=800,height=1000');
    if (!w) { alert("Autorise les fenêtres pop-up pour imprimer l'affiche."); return; }
    w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Affiche — ${salle}</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; text-align: center;
         color: #111827; margin: 0; padding: 0; }
  h1 { font-size: 40px; margin: 0 0 6px; letter-spacing: -0.5px; }
  h2 { font-size: 22px; font-weight: 600; color: #4b5563; margin: 0 0 34px; }
  .qr { display: inline-block; padding: 22px; border: 3px solid #111827; border-radius: 24px; }
  .steps { margin-top: 34px; display: flex; justify-content: center; gap: 26px; }
  .step { width: 190px; }
  .num { width: 30px; height: 30px; border-radius: 999px; background: #111827; color: #fff;
         font-weight: 700; line-height: 30px; margin: 0 auto 8px; font-size: 15px; }
  .txt { font-size: 13px; color: #374151; line-height: 1.45; }
  .url { margin-top: 30px; font-size: 13px; color: #6b7280; word-break: break-all; }
</style></head><body>
  <h1>${salle}</h1>
  <h2>Scanne pour accéder à ton espace</h2>
  <div class="qr">${svg}</div>
  <div class="steps">
    <div class="step"><div class="num">1</div><div class="txt">Scanne le QR code avec l'appareil photo de ton téléphone</div></div>
    <div class="step"><div class="num">2</div><div class="txt">Connecte-toi avec ton adresse e-mail</div></div>
    <div class="step"><div class="num">3</div><div class="txt">Ajoute l'app à ton écran d'accueil pour la retrouver facilement</div></div>
  </div>
  <p class="url">${MEMBER_APP_URL}</p>
</body></html>`);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="bg-indigo-50 text-indigo-600 p-2.5 rounded-xl"><QrCode size={20} /></div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Affiche QR — app adhérent</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">À imprimer et afficher à l'accueil</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        <div ref={qrRef} className="bg-white p-3 rounded-2xl border-2 border-gray-900 shrink-0">
          <QRCodeSVG value={MEMBER_APP_URL} size={148} level="M" />
        </div>

        <div className="flex-1 space-y-3 text-center sm:text-left">
          <p className="text-sm text-gray-600 leading-relaxed">
            Vos adhérents scannent ce code, se connectent, puis ajoutent l'app à leur écran
            d'accueil. Aucune installation depuis un store, et les mises à jour sont automatiques.
          </p>
          <div className="text-[11px] font-mono bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-gray-500 break-all">
            {MEMBER_APP_URL}
          </div>
          <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
            <button onClick={print} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-semibold text-xs hover:bg-indigo-700">
              <Printer size={15} /> Imprimer l'affiche
            </button>
            <button onClick={copy} className="flex items-center gap-2 bg-white border border-slate-200 text-gray-700 px-4 py-2.5 rounded-xl font-semibold text-xs hover:bg-slate-50">
              {copied ? <Check size={15} className="text-green-600" /> : <Copy size={15} />} {copied ? 'Lien copié' : 'Copier le lien'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppQrPoster;
