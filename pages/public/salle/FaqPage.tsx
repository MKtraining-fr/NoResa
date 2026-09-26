import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, MessageCircle } from 'lucide-react';

const RED = '#C81E1E';

/** FAQ La SaLLe — réponses basées sur le fonctionnement réel de la salle. */
const FAQ: { q: string; a: React.ReactNode }[] = [
  { q: 'Quels sont les horaires ?', a: <>Du lundi au vendredi : <b>6h00 – 23h00</b>. Samedi et dimanche : <b>7h00 – 20h00</b>.</> },
  { q: 'Comment je m’inscris ?', a: <>Sur la <b>borne</b> à l'accueil ou depuis l'appli : bouton <b>« M'inscrire »</b>, tu crées ton compte et tu choisis ta formule. Ça prend 2 minutes.</> },
  { q: 'Comment j’accède à la salle ?', a: <>Avec ton <b>code d'accès</b> à taper sur le clavier de la porte (ou ton badge si tu en prends un). Ton code apparaît dans ton <Link to="/connexion" className="underline font-semibold" style={{ color: RED }}>espace membre</Link> dès l'inscription.</> },
  { q: 'Puis-je venir sans engagement ?', a: <>Oui : <b>séance à l'unité (5 €)</b>, <b>carnet de 10 séances (45 €)</b> ou <b>1 mois (40 €)</b>. Voir les <Link to="/tarifs" className="underline font-semibold" style={{ color: RED }}>tarifs</Link>.</> },
  { q: 'Comment se passe le paiement ?', a: <>Par <b>carte bancaire</b> (paiement instantané) pour les séances, carnets et mois. Pour les abonnements mensuels, par <b>prélèvement SEPA automatique</b>.</> },
  { q: 'Le badge est-il obligatoire ?', a: <>Non, il est <b>optionnel</b> (15 €). Sans badge, tu entres avec ton <b>code d'accès</b> personnel.</> },
  { q: 'Comment résilier mon abonnement ?', a: <>Depuis ton espace membre : fais une <b>demande de résiliation</b>. Pour les formules avec engagement, un <b>préavis d'un mois</b> s'applique.</> },
  { q: 'J’ai une question ou un souci ?', a: <>Écris-nous via la <b>messagerie</b> de ton espace membre, ou contacte la salle au <b>06 22 91 49 56</b> / lasalle.11400@gmail.com.</> },
];

const FaqPage: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <div className="max-w-3xl mx-auto px-5 py-12">
      <p className="text-sm font-bold uppercase tracking-widest" style={{ color: RED }}>FAQ</p>
      <h1 className="text-4xl font-extrabold text-gray-900 mt-1 text-balance">Les questions fréquentes.</h1>
      <p className="text-gray-500 font-medium mt-3">Tout ce qu'il faut savoir avant de commencer.</p>

      <div className="mt-8 space-y-3">
        {FAQ.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={i} className="border border-gray-100 rounded-2xl overflow-hidden bg-white">
              <button onClick={() => setOpen(isOpen ? null : i)} className="w-full flex items-center justify-between gap-4 text-left px-5 py-4">
                <span className="font-extrabold text-gray-900">{item.q}</span>
                <ChevronDown size={20} className={`shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} style={{ color: RED }} />
              </button>
              {isOpen && <div className="px-5 pb-5 -mt-1 text-[15px] leading-relaxed text-gray-600 font-medium">{item.a}</div>}
            </div>
          );
        })}
      </div>

      <div className="mt-10 rounded-3xl p-6 text-white flex items-center gap-4" style={{ background: `linear-gradient(160deg, ${RED}, #8E1414)` }}>
        <MessageCircle size={28} className="shrink-0" />
        <div className="flex-1">
          <p className="font-extrabold text-lg">Une autre question ?</p>
          <p className="text-sm opacity-90 font-medium">On te répond via la messagerie de ton espace membre.</p>
        </div>
        <Link to="/connexion" className="bg-white font-bold text-sm px-5 py-3 rounded-xl whitespace-nowrap" style={{ color: RED }}>Nous écrire</Link>
      </div>
    </div>
  );
};

export default FaqPage;
