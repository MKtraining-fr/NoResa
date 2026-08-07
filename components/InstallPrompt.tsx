import React, { useEffect, useState } from 'react';
import { Download, Share, Plus, X } from 'lucide-react';

export const INSTALL_PROMPT_KEY = 'noresa.installPromptSeen';

/**
 * Capture l'événement `beforeinstallprompt` le plus tôt possible (au chargement du
 * module) : les navigateurs ne le déclenchent qu'une fois et souvent avant le montage
 * de React. On le mémorise pour proposer l'installation en un clic (Android/Chromium).
 */
let deferredPrompt: any = null;
const subs = new Set<() => void>();
const notify = () => subs.forEach((f) => f());
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e: any) => { e.preventDefault(); deferredPrompt = e; notify(); });
  window.addEventListener('appinstalled', () => { deferredPrompt = null; notify(); });
}

const isStandalone = () =>
  window.matchMedia?.('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
const ua = () => navigator.userAgent || '';
const isMobile = () => /android|iphone|ipad|ipod|mobile/i.test(ua());
const isIOS = () => /iphone|ipad|ipod/i.test(ua());
const isIOSSafari = () => isIOS() && /safari/i.test(ua()) && !/crios|fxios|edgios/i.test(ua());

/**
 * Invite d'installation de la PWA, une seule fois à la première connexion (mobile).
 * Android/Chromium : bouton d'installation natif. iOS Safari : procédure manuelle.
 * Si rien n'est proposable (déjà installée, navigateur non concerné, PC), se ferme
 * tout seul pour laisser la place à la suite (invite notifications).
 */
const InstallPrompt: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [hasPrompt, setHasPrompt] = useState(!!deferredPrompt);
  useEffect(() => {
    const f = () => setHasPrompt(!!deferredPrompt);
    subs.add(f);
    return () => { subs.delete(f); };
  }, []);

  // Rien à proposer sur cet appareil : mode = null.
  const mode: 'android' | 'ios' | null =
    !isMobile() || isStandalone() ? null
    : hasPrompt ? 'android'
    : isIOSSafari() ? 'ios'
    : null;

  // Android : l'événement peut arriver après le montage. On attend un court instant,
  // puis on passe la main si toujours rien (sans marquer « vu », pour re-tenter plus tard).
  useEffect(() => {
    if (mode) return;
    if (!isMobile() || isStandalone()) { onClose(); return; }
    const t = setTimeout(() => { if (!deferredPrompt) onClose(); }, 1600);
    return () => clearTimeout(t);
  }, [mode, onClose]);

  const dismiss = () => { try { localStorage.setItem(INSTALL_PROMPT_KEY, '1'); } catch { /* noop */ } onClose(); };
  const install = async () => {
    if (!deferredPrompt) return dismiss();
    try { deferredPrompt.prompt(); await deferredPrompt.userChoice; } catch { /* noop */ }
    deferredPrompt = null;
    dismiss();
  };

  if (!mode) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex justify-end -mt-2 -mr-2">
          <button onClick={dismiss} className="p-2 text-gray-300 hover:text-gray-500" aria-label="Fermer"><X size={18} /></button>
        </div>

        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-brand-soft text-brand flex items-center justify-center">
            <Download size={28} />
          </div>
          <h2 className="text-lg font-extrabold text-gray-900">Installer l'application</h2>

          {mode === 'android' ? (
            <>
              <p className="text-[13px] text-gray-500 leading-relaxed px-2">
                Ajoute l'app à ton écran d'accueil pour un accès rapide, en plein écran, comme une vraie application.
              </p>
              <button onClick={install} disabled={false}
                className="w-full mt-1 bg-brand text-white font-bold py-3 rounded-2xl flex items-center justify-center gap-2">
                <Download size={18} /> Installer
              </button>
              <button onClick={dismiss} className="text-[13px] font-semibold text-gray-400">Plus tard</button>
            </>
          ) : (
            <>
              <p className="text-[13px] text-gray-500 leading-relaxed px-2">
                Ajoute l'app à ton écran d'accueil pour un accès rapide et en plein écran :
              </p>
              <div className="w-full text-left space-y-2.5 bg-gray-50 rounded-2xl p-4 mt-1">
                <p className="text-[13px] text-gray-700 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0 text-brand"><Share size={14} /></span>
                  Appuie sur <b>Partager</b> (en bas de Safari)
                </p>
                <p className="text-[13px] text-gray-700 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center shrink-0 text-brand"><Plus size={14} /></span>
                  Choisis <b>« Sur l'écran d'accueil »</b>
                </p>
              </div>
              <button onClick={dismiss} className="w-full mt-1 bg-brand text-white font-bold py-3 rounded-2xl">J'ai compris</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InstallPrompt;
