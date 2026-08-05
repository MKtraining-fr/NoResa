import React, { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Plus, Loader2, X, Ticket, CreditCard, Banknote, Check } from 'lucide-react';
import {
  AccessPeriod, listAccessPeriods, grantAccessPeriod,
  sellAccessPeriodCash, sellAccessPeriodStripe, cancelAccessPeriod,
} from '../lib/accessPeriodsApi';

const todayStr = () => new Date().toISOString().slice(0, 10);
const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });

const STATUS: Record<AccessPeriod['status'], { label: string; cls: string }> = {
  scheduled: { label: 'À venir', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  active: { label: 'En cours', cls: 'bg-green-50 text-green-700 border-green-200' },
  ended: { label: 'Terminé', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  cancelled: { label: 'Annulé', cls: 'bg-gray-100 text-gray-400 border-gray-200 line-through' },
};

const PAYMENTS = ['Espèces', 'Carte bancaire', 'Chèque', 'Virement'];

interface Props {
  memberId: string;
  /** Notifie la fiche pour rafraîchir l'état « bloqué » (une ouverture débloque). */
  onChanged?: () => void;
}

const AccessPeriodsPanel: React.FC<Props> = ({ memberId, onChanged }) => {
  const [periods, setPeriods] = useState<AccessPeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Formulaire
  const [mode, setMode] = useState<'sale' | 'manual'>('sale');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');
  const [startsOn, setStartsOn] = useState(todayStr());
  const [endsOn, setEndsOn] = useState(todayStr());
  const [payment, setPayment] = useState(PAYMENTS[0]);

  const load = useCallback(async () => {
    setLoading(true);
    setPeriods(await listAccessPeriods(memberId));
    setLoading(false);
  }, [memberId]);
  useEffect(() => { load(); }, [load]);

  const reset = () => {
    setOpen(false); setMode('sale'); setLabel(''); setAmount('');
    setStartsOn(todayStr()); setEndsOn(todayStr()); setPayment(PAYMENTS[0]); setMsg(null);
  };

  const validCommon = label.trim() && startsOn && endsOn && endsOn >= startsOn;
  const validSale = validCommon && Number(amount) > 0;

  const doManual = async () => {
    if (!validCommon) return;
    setBusy(true); setMsg(null);
    try {
      await grantAccessPeriod({ memberId, label, startsOn, endsOn });
      reset(); await load(); onChanged?.();
    } catch (e: any) { setMsg(e?.message || 'Échec.'); }
    finally { setBusy(false); }
  };

  const doCash = async () => {
    if (!validSale) return;
    setBusy(true); setMsg(null);
    try {
      await sellAccessPeriodCash({ memberId, label, amount: Number(amount), paymentMethod: payment, startsOn, endsOn });
      reset(); await load(); onChanged?.();
    } catch (e: any) { setMsg(e?.message || 'Échec.'); }
    finally { setBusy(false); }
  };

  const doStripe = async () => {
    if (!validSale) return;
    setBusy(true); setMsg(null);
    try {
      const { authorisation_url } = await sellAccessPeriodStripe({ memberId, label, amount: Number(amount), startsOn, endsOn });
      window.open(authorisation_url, '_blank', 'noopener');
      reset(); await load(); onChanged?.();
    } catch (e: any) { setMsg(e?.message || 'Échec.'); }
    finally { setBusy(false); }
  };

  const doCancel = async (p: AccessPeriod) => {
    if (!window.confirm(`Annuler « ${p.label} » ?${p.status === 'active' ? "\n\nL'accès sera coupé si rien d'autre ne le couvre." : ''}`)) return;
    setBusy(true);
    try { await cancelAccessPeriod(p.id); await load(); onChanged?.(); }
    catch (e: any) { setMsg(e?.message || 'Échec.'); }
    finally { setBusy(false); }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
          <CalendarClock size={13} /> Ventes à la période
        </span>
        {!open && (
          <button type="button" onClick={() => setOpen(true)}
            className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-800">
            <Plus size={13} /> Nouvelle vente
          </button>
        )}
      </div>

      {/* Liste des passes */}
      {loading ? (
        <div className="py-3 flex justify-center text-gray-300"><Loader2 size={16} className="animate-spin" /></div>
      ) : periods.length === 0 ? (
        <p className="text-[12px] text-gray-400">Aucune vente à la période. Utilise « Nouvelle vente » pour une entrée à la semaine, etc.</p>
      ) : (
        <div className="space-y-1.5">
          {periods.map((p) => {
            const st = STATUS[p.status];
            const cancellable = p.status === 'active' || p.status === 'scheduled';
            return (
              <div key={p.id} className="flex items-center gap-2 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                <Ticket size={14} className="text-gray-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-gray-900 truncate">
                    {p.label}
                    {p.amount_cents != null && <span className="text-gray-400 font-normal"> · {(p.amount_cents / 100).toFixed(2)} €</span>}
                  </p>
                  <p className="text-[11px] text-gray-500">{fmt(p.starts_on)} → {fmt(p.ends_on)}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${st.cls}`}>{st.label}</span>
                {cancellable && (
                  <button type="button" onClick={() => doCancel(p)} disabled={busy}
                    className="p-1 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-50" title="Annuler">
                    <X size={14} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Formulaire de création */}
      {open && (
        <div className="border-t border-gray-100 pt-3 space-y-2.5">
          <div className="flex gap-1.5">
            <button type="button" onClick={() => setMode('sale')}
              className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg border ${mode === 'sale' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200'}`}>
              Vente (encaissement)
            </button>
            <button type="button" onClick={() => setMode('manual')}
              className={`flex-1 text-[11px] font-bold py-1.5 rounded-lg border ${mode === 'manual' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-500 border-gray-200'}`}>
              Accès simple (sans vente)
            </button>
          </div>

          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Libellé (ex. Entrée semaine)"
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20" />

          {mode === 'sale' && (
            <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Montant €"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20" />
          )}

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Début</label>
              <input type="date" value={startsOn} max={endsOn || undefined} onChange={(e) => setStartsOn(e.target.value)}
                className="w-full mt-0.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-medium outline-none" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Fin (incluse)</label>
              <input type="date" value={endsOn} min={startsOn || undefined} onChange={(e) => setEndsOn(e.target.value)}
                className="w-full mt-0.5 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-medium outline-none" />
            </div>
          </div>

          {mode === 'sale' && (
            <div className="flex items-center gap-2">
              <select value={payment} onChange={(e) => setPayment(e.target.value)}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 text-sm font-medium outline-none">
                {PAYMENTS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}

          {msg && <p className="text-[12px] text-red-600 font-semibold">{msg}</p>}

          <div className="flex items-center gap-2 pt-0.5">
            {mode === 'manual' ? (
              <button type="button" onClick={doManual} disabled={busy || !validCommon}
                className="flex-1 flex items-center justify-center gap-1.5 bg-gray-900 text-white py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide hover:bg-black disabled:opacity-40">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Activer sur la période
              </button>
            ) : (
              <>
                <button type="button" onClick={doCash} disabled={busy || !validSale}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-gray-900 text-white py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide hover:bg-black disabled:opacity-40">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Banknote size={14} />} Encaisser
                </button>
                <button type="button" onClick={doStripe} disabled={busy || !validSale}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 text-white py-2 rounded-lg text-[11px] font-bold uppercase tracking-wide hover:bg-indigo-700 disabled:opacity-40">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />} Payer par carte
                </button>
              </>
            )}
            <button type="button" onClick={reset} disabled={busy} className="px-2 text-[11px] font-bold text-gray-400 hover:text-gray-600">Fermer</button>
          </div>
          {mode === 'sale' && (
            <p className="text-[10.5px] text-gray-400">Espèces/CB : encaissement enregistré tout de suite. Carte : un onglet de paiement s'ouvre, l'encaissement est enregistré à la confirmation.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default AccessPeriodsPanel;
