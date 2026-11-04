import React, { useCallback, useEffect, useState } from 'react';
import { CalendarClock, Plus, Loader2, X, Ticket, CreditCard, Banknote, Check } from 'lucide-react';
import {
  AccessPeriod, listAccessPeriods, grantAccessPeriod,
  sellAccessPeriodCash, sellAccessPeriodStripe, cancelAccessPeriod,
} from '../lib/accessPeriodsApi';

const todayStr = () => new Date().toISOString().slice(0, 10);
const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: '2-digit' });

const STATUS: Record<AccessPeriod['status'], { label: string; cls: string }> = {
  scheduled: { label: 'À venir', cls: 'bg-warning-soft text-warning-text border-warning-soft' },
  active: { label: 'En cours', cls: 'bg-success-soft text-success-text border-success-soft' },
  ended: { label: 'Terminé', cls: 'bg-line-soft text-muted border-line' },
  cancelled: { label: 'Annulé', cls: 'bg-line-soft text-muted border-line line-through' },
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
    <div className="bg-surface border border-line p-3 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted flex items-center gap-1.5">
          <CalendarClock size={13} /> Ventes à la période
        </span>
        {!open && (
          <button type="button" onClick={() => setOpen(true)}
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary-dark">
            <Plus size={13} /> Nouvelle vente
          </button>
        )}
      </div>

      {/* Liste des passes */}
      {loading ? (
        <div className="py-3 flex justify-center text-subtle"><Loader2 size={16} className="animate-spin" /></div>
      ) : periods.length === 0 ? (
        <p className="text-xs text-muted">Aucune vente à la période. Utilise « Nouvelle vente » pour une entrée à la semaine, etc.</p>
      ) : (
        <div className="space-y-1.5">
          {periods.map((p) => {
            const st = STATUS[p.status];
            const cancellable = p.status === 'active' || p.status === 'scheduled';
            return (
              <div key={p.id} className="flex items-center gap-2 bg-ground-2 border border-line px-3 py-2">
                <Ticket size={14} className="text-muted shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink truncate">
                    {p.label}
                    {p.amount_cents != null && <span className="text-muted font-normal"> · {(p.amount_cents / 100).toFixed(2)} €</span>}
                  </p>
                  <p className="text-xs text-muted">{fmt(p.starts_on)} → {fmt(p.ends_on)}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 border ${st.cls}`}>{st.label}</span>
                {cancellable && (
                  <button type="button" onClick={() => doCancel(p)} disabled={busy}
                    className="p-1 text-muted hover:text-danger-text hover:bg-danger-soft disabled:opacity-50" title="Annuler">
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
        <div className="border-t border-line pt-3 space-y-2.5">
          <div className="flex gap-1.5">
            <button type="button" onClick={() => setMode('sale')}
              className={`flex-1 text-xs font-semibold py-1.5 border ${mode === 'sale' ? 'bg-primary text-white border-primary' : 'bg-surface text-muted border-line'}`}>
              Vente (encaissement)
            </button>
            <button type="button" onClick={() => setMode('manual')}
              className={`flex-1 text-xs font-semibold py-1.5 border ${mode === 'manual' ? 'bg-primary text-white border-primary' : 'bg-surface text-muted border-line'}`}>
              Accès simple (sans vente)
            </button>
          </div>

          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Libellé (ex. Entrée semaine)"
            className="w-full bg-ground-2 border border-line px-2.5 py-2 text-sm font-semibold outline-none" />

          {mode === 'sale' && (
            <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Montant €"
              className="w-full bg-ground-2 border border-line px-2.5 py-2 text-sm font-semibold outline-none" />
          )}

          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label className="text-xs font-semibold text-muted">Début</label>
              <input type="date" value={startsOn} max={endsOn || undefined} onChange={(e) => setStartsOn(e.target.value)}
                className="w-full mt-0.5 bg-ground-2 border border-line px-2.5 py-1.5 text-sm outline-none" />
            </div>
            <div className="flex-1">
              <label className="text-xs font-semibold text-muted">Fin (incluse)</label>
              <input type="date" value={endsOn} min={startsOn || undefined} onChange={(e) => setEndsOn(e.target.value)}
                className="w-full mt-0.5 bg-ground-2 border border-line px-2.5 py-1.5 text-sm outline-none" />
            </div>
          </div>

          {mode === 'sale' && (
            <div className="flex items-center gap-2">
              <select value={payment} onChange={(e) => setPayment(e.target.value)}
                className="flex-1 bg-ground-2 border border-line px-2.5 py-2 text-sm outline-none">
                {PAYMENTS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          )}

          {msg && <p className="text-xs text-danger-text font-semibold">{msg}</p>}

          <div className="flex items-center gap-2 pt-0.5">
            {mode === 'manual' ? (
              <button type="button" onClick={doManual} disabled={busy || !validCommon}
                className="flex-1 flex items-center justify-center gap-1.5 bg-ink text-white py-2 text-xs font-semibold hover:bg-black disabled:opacity-40">
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Activer sur la période
              </button>
            ) : (
              <>
                <button type="button" onClick={doCash} disabled={busy || !validSale}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-ink text-white py-2 text-xs font-semibold hover:bg-black disabled:opacity-40">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <Banknote size={14} />} Encaisser
                </button>
                <button type="button" onClick={doStripe} disabled={busy || !validSale}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-white py-2 text-xs font-semibold hover:bg-primary-dark disabled:opacity-40">
                  {busy ? <Loader2 size={14} className="animate-spin" /> : <CreditCard size={14} />} Payer par carte
                </button>
              </>
            )}
            <button type="button" onClick={reset} disabled={busy} className="px-2 text-xs font-semibold text-muted hover:text-ink-2">Fermer</button>
          </div>
          {mode === 'sale' && (
            <p className="text-[10.5px] text-muted">Espèces/CB : encaissement enregistré tout de suite. Carte : un onglet de paiement s'ouvre, l'encaissement est enregistré à la confirmation.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default AccessPeriodsPanel;
