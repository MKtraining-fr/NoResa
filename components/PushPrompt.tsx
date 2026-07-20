import React, { useState } from 'react';
import { Bell, Loader2, X } from 'lucide-react';
import { enablePush } from '../lib/pushApi';

export const PUSH_PROMPT_KEY = 'noresa.pushPromptSeen';

/**
 * Modale proposée une seule fois, à la première connexion.
 * Les navigateurs exigent un geste explicite pour autoriser les notifications :
 * cette modale est ce geste. Ensuite, le réglage reste accessible dans le profil.
 */
const PushPrompt: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const close = () => { try { localStorage.setItem(PUSH_PROMPT_KEY, '1'); } catch { /* noop */ } onClose(); };

  const activate = async () => {
    setBusy(true); setErr('');
    try {
      const r = await enablePush();
      if (r.ok) close();
      else { setErr(r.error || "Activation impossible."); setBusy(false); }
    } catch (e: any) { setErr(e?.message || "Activation impossible."); setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-4 duration-300">
        <div className="flex justify-end -mt-2 -mr-2">
          <button onClick={close} className="p-2 text-gray-300 hover:text-gray-500" aria-label="Fermer"><X size={18} /></button>
        </div>

        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-brand-soft text-brand flex items-center justify-center">
            <Bell size={28} />
          </div>
          <h2 className="text-lg font-extrabold text-gray-900">Rester informé</h2>
          <p className="text-[13px] text-gray-500 leading-relaxed px-2">
            Reçois une notification quand la salle publie une annonce importante :
            fermeture exceptionnelle, événement, nouveauté…
          </p>
          {err && <p className="text-[12px] text-red-600 font-semibold px-2">{err}</p>}
        </div>

        <div className="mt-5 space-y-2">
          <button onClick={activate} disabled={busy}
            className="w-full bg-gray-900 text-white py-3.5 rounded-2xl font-extrabold text-sm flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.99] transition-transform">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />} Activer les notifications
          </button>
          <button onClick={close} className="w-full py-3 rounded-2xl font-bold text-[13px] text-gray-400">
            Plus tard
          </button>
        </div>

        <p className="text-[10px] text-gray-300 text-center mt-2">
          Modifiable à tout moment depuis ton profil.
        </p>
      </div>
    </div>
  );
};

export default PushPrompt;
