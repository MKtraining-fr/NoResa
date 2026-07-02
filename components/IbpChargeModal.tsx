import React, { useState } from 'react';
import { X, Zap } from 'lucide-react';
import IbpPaymentModal from './IbpPaymentModal';

/**
 * Choix de ce qu'on encaisse par Instant Bank Pay (accès prédéfini OU montant libre),
 * puis bascule sur le QR/lien de paiement (IbpPaymentModal). Réutilisable caisse + fiche.
 */
const PRESETS = [
  { product: 'seance', label: "Séance à l'unité", price: '5,00 €' },
  { product: 'carnet', label: 'Carnet de 10 séances', price: '45,00 €' },
  { product: 'mois', label: "1 mois d'accès", price: '40,00 €' },
];

const IbpChargeModal: React.FC<{ memberId?: string; email?: string; onClose: () => void; onPaid?: () => void }> = ({ memberId, email, onClose, onPaid }) => {
  const [charge, setCharge] = useState<null | { product?: string; amount?: number; label: string }>(null);
  const [freeAmount, setFreeAmount] = useState('');
  const [freeLabel, setFreeLabel] = useState('');

  if (charge) {
    return <IbpPaymentModal label={charge.label} product={charge.product} amount={charge.amount} memberId={memberId} email={email} onClose={onClose} onPaid={onPaid} />;
  }

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-bold text-gray-900 flex items-center gap-2"><Zap size={18} className="text-amber-500" /> Encaisser par Instant Bank Pay</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">Accès {memberId ? '(crédité automatiquement)' : '· sélectionne un membre pour créditer'}</p>
            <div className="grid gap-2">
              {PRESETS.map((p) => (
                <button key={p.product} onClick={() => setCharge({ product: p.product, label: p.label })}
                  className="flex items-center justify-between px-4 py-3 rounded-2xl border-2 border-gray-200 hover:border-amber-400 text-left transition-colors">
                  <span className="font-bold text-sm text-gray-900">{p.label}</span>
                  <span className="font-black text-amber-600">{p.price}</span>
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-2">Montant libre / complément</p>
            <div className="flex gap-2">
              <input type="number" step="0.01" min="0" value={freeAmount} onChange={(e) => setFreeAmount(e.target.value)} placeholder="€" className="w-24 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500/20" />
              <input value={freeLabel} onChange={(e) => setFreeLabel(e.target.value)} placeholder="Libellé (ex. complément)" className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-500/20" />
            </div>
            <button disabled={!(Number(freeAmount) > 0)} onClick={() => setCharge({ amount: Number(freeAmount), label: freeLabel.trim() || 'Encaissement' })}
              className="mt-2 w-full bg-gray-900 text-white py-2.5 rounded-xl font-bold text-sm disabled:opacity-50">Encaisser ce montant</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IbpChargeModal;
