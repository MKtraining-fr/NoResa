import React, { useEffect, useRef, useState } from 'react';
import { Search, Loader2, ArrowRightLeft, GitMerge, AlertTriangle, Check, X } from 'lucide-react';
import { searchMembers, mergeMembers } from '../lib/membersApi';

const RED = '#e11d2a';

interface Props {
  open: boolean;
  current: any;                 // la fiche ouverte (point de départ)
  onClose: () => void;
  onMerged: (keeperId: string) => void; // le parent recharge la liste + rouvre la fiche gardée
}

/**
 * Fusion de deux fiches en doublon. Le staff choisit l'autre fiche, désigne
 * laquelle garder (par défaut celle qui a un n° adhérent), puis confirme.
 * Toute l'historique (contrats, paiements, passages, compte app…) est déplacée
 * vers la fiche conservée ; l'autre est archivée. Opération côté serveur (RPC).
 */
const MergeMembersModal: React.FC<Props> = ({ open, current, onClose, onMerged }) => {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [other, setOther] = useState<any | null>(null);
  const [keeperIsCurrent, setKeeperIsCurrent] = useState(true); // current = fiche à conserver ?
  const [preferOtherLogin, setPreferOtherLogin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const timer = useRef<any>(null);

  useEffect(() => {
    if (!open) { setQ(''); setResults([]); setOther(null); setKeeperIsCurrent(true); setPreferOtherLogin(false); setErr(''); }
  }, [open]);

  // Recherche live (débounce), en excluant la fiche courante.
  useEffect(() => {
    if (!open) return;
    if (timer.current) clearTimeout(timer.current);
    const term = q.trim();
    if (term.length < 2) { setResults([]); return; }
    timer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const list = await searchMembers(term, 8);
        setResults(list.filter((m) => m.id !== current?.id));
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 250);
    return () => timer.current && clearTimeout(timer.current);
  }, [q, open, current?.id]);

  if (!open) return null;

  const nameOf = (m: any) => `${m?.firstName || ''} ${m?.lastName || ''}`.trim() || '—';
  const hasNumber = (m: any) => !!(m?.memberNumber && String(m.memberNumber).trim());

  // Quand on choisit l'autre fiche, on garde par défaut celle qui a un n° adhérent.
  const pickOther = (m: any) => {
    setOther(m); setErr(''); setResults([]); setQ('');
    if (hasNumber(current) && !hasNumber(m)) setKeeperIsCurrent(true);
    else if (!hasNumber(current) && hasNumber(m)) setKeeperIsCurrent(false);
  };

  const keeper = keeperIsCurrent ? current : other;
  const duplicate = keeperIsCurrent ? other : current;

  const confirm = async () => {
    if (!keeper || !duplicate) return;
    if (!window.confirm(
      `Fusionner définitivement ?\n\n` +
      `• À CONSERVER : ${nameOf(keeper)}${hasNumber(keeper) ? ` (n°${keeper.memberNumber})` : ''}\n` +
      `• À ARCHIVER : ${nameOf(duplicate)}${hasNumber(duplicate) ? ` (n°${duplicate.memberNumber})` : ''}\n\n` +
      `Tout l'historique du doublon (contrats, paiements, passages, compte app) est transféré vers la fiche conservée. Le doublon est archivé (non supprimé).`
    )) return;
    setBusy(true); setErr('');
    try {
      await mergeMembers(keeper.id, duplicate.id, preferOtherLogin);
      onMerged(keeper.id);
    } catch (e: any) { setErr(e?.message || 'Fusion impossible.'); }
    finally { setBusy(false); }
  };

  const Card: React.FC<{ m: any; tone: 'keep' | 'drop' }> = ({ m, tone }) => (
    <div className={`flex-1 rounded-2xl border-2 p-4 ${tone === 'keep' ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
      <div className={`text-[10px] font-extrabold uppercase tracking-wide ${tone === 'keep' ? 'text-green-700' : 'text-gray-400'}`}>
        {tone === 'keep' ? '✓ À conserver' : 'À archiver'}
      </div>
      <div className="font-bold text-gray-900 mt-1">{nameOf(m)}</div>
      <div className="text-[12px] text-gray-500 mt-0.5">
        {hasNumber(m) ? `N° ${m.memberNumber}` : 'sans n° adhérent'}{m?.email ? ` · ${m.email}` : ''}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2 font-extrabold text-gray-900"><GitMerge size={18} style={{ color: RED }} /> Fusionner deux fiches</div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-4">
          {!other ? (
            <>
              <p className="text-[13px] text-gray-500">
                Cherchez la fiche en doublon de <span className="font-bold text-gray-800">{nameOf(current)}</span> (nom, e-mail, n° adhérent…).
              </p>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={17} />
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher l'autre fiche…"
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 pl-11 pr-4 outline-none focus:ring-2 focus:ring-red-100 text-sm" />
                {searching && <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-300 animate-spin" size={16} />}
              </div>
              <div className="space-y-1.5">
                {results.map((m) => (
                  <button key={m.id} onClick={() => pickOther(m)}
                    className="w-full text-left p-3 rounded-xl border border-gray-100 hover:border-red-200 hover:bg-red-50/40 transition-colors">
                    <div className="font-semibold text-sm text-gray-900">{nameOf(m)}</div>
                    <div className="text-[12px] text-gray-500">{hasNumber(m) ? `N° ${m.memberNumber}` : 'sans n° adhérent'}{m.email ? ` · ${m.email}` : ''}</div>
                  </button>
                ))}
                {q.trim().length >= 2 && !searching && results.length === 0 && (
                  <p className="text-[12px] text-gray-400 py-2 text-center">Aucune autre fiche trouvée.</p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-stretch gap-2">
                <Card m={keeper} tone="keep" />
                <Card m={duplicate} tone="drop" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button type="button" onClick={() => setKeeperIsCurrent((v) => !v)}
                  className="inline-flex items-center gap-1.5 text-[12px] font-bold text-indigo-600 hover:text-indigo-800">
                  <ArrowRightLeft size={14} /> Inverser (garder l'autre)
                </button>
                <button type="button" onClick={() => setOther(null)} className="text-[12px] font-bold text-gray-400 hover:text-gray-700">Changer de fiche</button>
              </div>

              <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50 border border-amber-100 cursor-pointer">
                <input type="checkbox" checked={preferOtherLogin} onChange={(e) => setPreferOtherLogin(e.target.checked)} className="mt-0.5" />
                <span className="text-[12px] text-amber-800">
                  Utiliser plutôt le <span className="font-bold">compte de connexion du doublon</span> (à cocher seulement si les deux fiches ont déjà un compte app et que le bon e-mail est sur le doublon).
                </span>
              </label>

              <div className="flex items-start gap-2 text-[11.5px] text-gray-500">
                <AlertTriangle size={14} className="shrink-0 mt-0.5 text-amber-500" />
                <span>La fiche « à archiver » quitte toutes les listes ; ses contrats, paiements, passages et son compte app passent sur la fiche conservée. Réversible via les archives.</span>
              </div>

              {err && <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-[13px] font-medium">{err}</div>}

              <button onClick={confirm} disabled={busy}
                className="w-full inline-flex items-center justify-center gap-2 text-white font-bold py-3 rounded-2xl disabled:opacity-60" style={{ backgroundColor: RED }}>
                {busy ? <Loader2 size={17} className="animate-spin" /> : <Check size={17} />} Fusionner les deux fiches
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MergeMembersModal;
