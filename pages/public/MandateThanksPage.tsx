import React from 'react';
import { CheckCircle2, ArrowLeft } from 'lucide-react';

/**
 * Page de retour après signature du mandat SEPA (GoCardless).
 * Cible du `redirectUrl` passé à startMandateSetup : `${origin}/#/merci-inscription`.
 *
 * Publique et SANS authentification : elle s'ouvre dans l'onglet dédié au RIB
 * (souvent la tablette client). Elle ne touche pas la session ni le back-office —
 * l'inscription se finalise dans l'onglet d'origine (le mandat y est déjà rattaché).
 */
const MandateThanksPage: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-slate-50 font-sans">
      <div className="max-w-md w-full text-center">
        <div className="bg-white p-8 rounded-3xl shadow-2xl border border-gray-100">
          <div className="w-20 h-20 rounded-full bg-green-50 text-green-600 flex items-center justify-center mx-auto">
            <CheckCircle2 size={44} strokeWidth={2.2} />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-5">Mandat SEPA signé 🎉</h1>
          <p className="text-gray-500 mt-3 text-sm leading-relaxed">
            Votre autorisation de prélèvement a bien été enregistrée. Il ne reste plus
            qu'à finaliser votre inscription avec votre conseiller.
          </p>
          <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-100 text-[13px] text-gray-600 font-medium">
            Vous pouvez <span className="font-bold text-gray-800">fermer cet onglet</span> et
            revenir vers votre conseiller pour terminer la signature du contrat.
          </div>
        </div>
        <a href="#/" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft size={16} /> Retour à l'accueil
        </a>
      </div>
    </div>
  );
};

export default MandateThanksPage;
