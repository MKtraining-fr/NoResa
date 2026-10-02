import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Mail } from 'lucide-react';

const RED = '#C81E1E';

/**
 * Écran de confirmation après un paiement réussi sur la borne (retour Stripe).
 * Le code d'accès à 6 chiffres est envoyé par e-mail (webhook). Retour auto à l'accueil.
 */
const BorneMerciPaiementPage: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const t = setTimeout(() => navigate('/borne', { replace: true }), 8000);
    return () => clearTimeout(t);
  }, [navigate]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center text-white ui-crisp px-8 text-center"
      style={{ background: `linear-gradient(160deg, ${RED}, #8E1414)` }}>
      <CheckCircle2 size={80} />
      <h1 className="text-4xl font-extrabold mt-5">Merci, c’est payé !</h1>
      <p className="text-lg font-semibold text-white/90 mt-3 max-w-md flex items-center gap-2 justify-center">
        <Mail size={20} /> Ton code d’accès à 6 chiffres vient de t’être envoyé par e-mail.
      </p>
      <p className="text-sm font-semibold text-white/80 mt-2 max-w-md">Compose-le sur le clavier à l’entrée. À tout de suite !</p>
      <button onClick={() => navigate('/borne', { replace: true })}
        className="mt-8 bg-white text-gray-900 font-bold px-8 py-3.5 rounded-2xl shadow-xl">
        Terminer
      </button>
    </div>
  );
};

export default BorneMerciPaiementPage;
