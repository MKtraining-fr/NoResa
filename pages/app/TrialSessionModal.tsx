import React, { useState } from 'react';
import { X, ClipboardCheck, AlertTriangle, Loader2 } from 'lucide-react';
import { createTrialSession, type TrialSessionResult } from '../../lib/trialSessionsApi';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const empty = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  postalAddress: '',
  phone: '',
  email: '',
  rgpdConsent: false,
  healthDeclaration: false,
  rulesAcknowledged: false,
  liabilityWaiver: false,
  medicalClearance: false,
  cgAccepted: false,
  signedName: '',
  notes: '',
};

const TrialSessionModal: React.FC<Props> = ({ open, onClose, onCreated }) => {
  const [form, setForm] = useState({ ...empty });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [already, setAlready] = useState<{ visitedAt?: string } | null>(null);

  if (!open) return null;

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const reset = () => {
    setForm({ ...empty });
    setError(null);
    setAlready(null);
  };

  const close = () => {
    reset();
    onClose();
  };

  const canSubmit =
    form.firstName.trim() &&
    form.lastName.trim() &&
    (form.phone.trim() || form.email.trim()) &&
    form.healthDeclaration &&
    form.rulesAcknowledged &&
    form.liabilityWaiver &&
    form.cgAccepted &&
    form.signedName.trim();

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    setAlready(null);
    try {
      const res: TrialSessionResult = await createTrialSession({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        postalAddress: form.postalAddress.trim() || undefined,
        rgpdConsent: form.rgpdConsent,
        healthDeclaration: form.healthDeclaration,
        rulesAcknowledged: form.rulesAcknowledged,
        liabilityWaiver: form.liabilityWaiver,
        medicalClearance: form.medicalClearance,
        cgAccepted: form.cgAccepted,
        signedName: form.signedName.trim(),
        notes: form.notes.trim() || undefined,
      });

      if (res.ok) {
        onCreated?.();
        close();
      } else if (res.alreadyDone) {
        const d = res.visitedAt ? new Date(res.visitedAt).toLocaleDateString('fr-FR') : null;
        setAlready({ visitedAt: res.visitedAt });
        setError(
          d
            ? `Cette personne a déjà effectué une séance d'essai le ${d}. Une seule séance est autorisée par personne.`
            : `Cette personne a déjà effectué une séance d'essai. Une seule séance est autorisée par personne.`
        );
      } else {
        setError(res.error ?? "Une erreur est survenue lors de l'enregistrement.");
      }
    } catch (e: any) {
      setError(e?.message ?? "Une erreur est survenue lors de l'enregistrement.");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    'w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
  const Check = ({
    k,
    label,
  }: {
    k: keyof typeof form;
    label: string;
  }) => (
    <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
      <input
        type="checkbox"
        checked={form[k] as boolean}
        onChange={(e) => set(k, e.target.checked as any)}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
      />
      <span>{label}</span>
    </label>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <ClipboardCheck size={18} />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Séance d'essai</h2>
              <p className="text-xs text-gray-500">Enregistrement du passage et de la décharge</p>
            </div>
          </div>
          <button onClick={close} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          {error && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertTriangle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Identité */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nom *</label>
              <input className={inputCls} value={form.lastName} onChange={(e) => set('lastName', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Prénom *</label>
              <input className={inputCls} value={form.firstName} onChange={(e) => set('firstName', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date de naissance</label>
              <input type="date" className={inputCls} value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Téléphone</label>
              <input className={inputCls} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="06…" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
              <input type="email" className={inputCls} value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Adresse postale</label>
              <input className={inputCls} value={form.postalAddress} onChange={(e) => set('postalAddress', e.target.value)} />
            </div>
          </div>
          <p className="text-xs text-gray-400 -mt-2">Téléphone ou email requis (pour éviter les doublons).</p>

          {/* Déclarations / décharge */}
          <div className="space-y-2.5 rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
            <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Décharge & déclarations</p>
            <Check k="healthDeclaration" label="Je déclare être en bonne condition physique et ne présenter aucune contre-indication médicale à la pratique d'activités sportives." />
            <Check k="rulesAcknowledged" label="J'ai pris connaissance du règlement intérieur et des consignes de sécurité, et m'engage à les respecter." />
            <Check k="liabilityWaiver" label="Je dégage La Salle, ses employés et représentants de toute responsabilité en cas de blessure ou accident (sauf faute lourde de la salle)." />
            <Check k="medicalClearance" label="J'ai fait contrôler par un médecin mon aptitude à pratiquer une activité sportive." />
            <Check k="cgAccepted" label="J'ai pris connaissance des Conditions Générales de la séance d'essai (gratuite, limitée à une seule par personne)." />
            <Check k="rgpdConsent" label="J'accepte d'être contacté(e) par La Salle (email/téléphone) concernant ses offres et services (RGPD — révocable à tout moment)." />
          </div>

          {/* Lu et approuvé */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">« Lu et approuvé » — Nom et prénom *</label>
            <input
              className={inputCls}
              value={form.signedName}
              onChange={(e) => set('signedName', e.target.value)}
              placeholder="Lu et approuvé — Prénom NOM"
            />
            <p className="text-xs text-gray-400 mt-1">Horodaté automatiquement à la validation (valeur probante).</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optionnel)</label>
            <textarea className={inputCls} rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl">
          <button onClick={close} className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Annuler
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit || submitting}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting && <Loader2 size={16} className="animate-spin" />}
            Enregistrer la séance
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrialSessionModal;
