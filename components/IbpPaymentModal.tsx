import React, { useEffect, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Loader2, Check, Copy, ExternalLink, Mail, Smartphone, AlertCircle } from 'lucide-react';
import { startStaffPayment, posOrderStatus } from '../lib/gocardless';

/**
 * Encaissement Instant Bank Pay au comptoir : génère un paiement (QR + lien),
 * le client paie sur son téléphone via sa banque, et on confirme en direct
 * (polling du statut). Réutilisable pour accès / produits / montant libre.
 */
const IbpPaymentModal: React.FC<{
  label: string;
  amount?: number;        // euros (si pas de produit d'accès)
  product?: string;       // 'seance' | 'carnet' | 'mois' (crédite l'accès)
  memberId?: string;
  email?: string;
  onClose: () => void;
  onPaid?: () => void;
}> = ({ label, amount, product, memberId, email, onClose, onPaid }) => {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [url, setUrl] = useState('');
  const [orderId, setOrderId] = useState('');
  const [amountCents, setAmountCents] = useState(0);
  const [paid, setPaid] = useState(false);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await startStaffPayment({ label, amount, product, memberId, email });
        if (!alive) return;
        setUrl(r.authorisation_url); setOrderId(r.order_id); setAmountCents(r.amount_cents); setLoading(false);
      } catch (e: any) {
        if (alive) { setErr(e?.message || 'Paiement indisponible.'); setLoading(false); }
      }
    })();
    return () => { alive = false; if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // Polling du statut jusqu'au paiement (max ~5 min)
  useEffect(() => {
    if (!orderId || paid) return;
    let tries = 0;
    pollRef.current = window.setInterval(async () => {
      tries++;
      const st = await posOrderStatus(orderId);
      if (st === 'done') { setPaid(true); onPaid?.(); if (pollRef.current) clearInterval(pollRef.current); }
      else if (tries > 100 && pollRef.current) clearInterval(pollRef.current);
    }, 3000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [orderId, paid]);

  const eur = (c: number) => `${(c / 100).toFixed(2).replace('.', ',')} €`;
  const copy = () => { navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => {}); };

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Paiement instantané</h3>
            <p className="text-[12px] text-gray-500">{label}{amountCents ? ` · ${eur(amountCents)}` : ''}</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><X size={18} /></button>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="py-12 flex flex-col items-center gap-3 text-gray-400"><Loader2 size={24} className="animate-spin" /> Génération du paiement…</div>
          ) : err ? (
            <div className="py-10 text-center"><AlertCircle size={30} className="mx-auto text-red-500" /><p className="mt-3 text-sm font-semibold text-gray-700">{err}</p></div>
          ) : paid ? (
            <div className="py-10 text-center">
              <div className="w-16 h-16 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto"><Check size={36} strokeWidth={2.5} /></div>
              <p className="mt-4 font-black text-xl text-gray-900">Paiement reçu 🎉</p>
              <p className="text-sm text-gray-500 mt-1">{eur(amountCents)} encaissés{product ? ' · accès crédité' : ''}.</p>
              <button onClick={onClose} className="mt-5 w-full bg-gray-900 text-white py-3 rounded-2xl font-bold">Terminer</button>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-3">Le client <b>scanne ce QR</b> avec son téléphone et paie via sa banque.</p>
              <div className="inline-block p-4 bg-white border border-gray-100 rounded-2xl shadow-inner">
                <QRCodeSVG value={url} size={200} level="M" />
              </div>
              <div className="flex items-center justify-center gap-2 mt-4 text-[12px] font-semibold text-amber-600">
                <Loader2 size={14} className="animate-spin" /> En attente du paiement…
              </div>
              <div className="grid grid-cols-3 gap-2 mt-5">
                <button onClick={() => window.open(url, '_blank')} className="flex flex-col items-center gap-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-[11px] font-bold"><ExternalLink size={16} /> Ouvrir</button>
                <button onClick={copy} className="flex flex-col items-center gap-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-[11px] font-bold">{copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />} {copied ? 'Copié' : 'Copier'}</button>
                <a href={`mailto:${email || ''}?subject=${encodeURIComponent('Votre paiement — La Salle')}&body=${encodeURIComponent('Réglez ici : ' + url)}`} className="flex flex-col items-center gap-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-[11px] font-bold"><Mail size={16} /> E-mail</a>
              </div>
              <a href={`sms:?&body=${encodeURIComponent('Réglez votre paiement La Salle ici : ' + url)}`} className="mt-2 w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 text-[12px] font-bold"><Smartphone size={15} /> Envoyer par SMS</a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IbpPaymentModal;
