import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eraser, Check, ChevronDown, CheckCircle2, X } from 'lucide-react';
import { getPendingSign, sendSignResult, clearPendingSign } from '../../../lib/borneBridge';

const RED = '#C81E1E';

// Conditions générales d'adhésion — texte officiel, identique à celui du contrat signé
// (edge function generate-contract, tableau CGV). Inclut l'article 8 RGPD.
const CGA: { h?: string; t?: string }[] = [
  { t: "ENTRE l'association ARAPS (ci-après désignée « La SaLLe/ARAPS ») et toute personne adhérant (ci-après désigné « l'adhérent »)." },
  { h: "1. FORMULES D'ADHÉSION" },
  { t: "La SaLLe propose une adhésion : en paiement immédiat du prix, au moment de la souscription, d'une durée de 12 mois, soit en paiement mensuel avec engagement, d'une durée initiale de 12 mois, puis reconduit tacitement pour une durée illimitée par périodes successives d'un an, payé par prélèvement bancaire." },
  { t: "Pour les adhésions en paiement mensuel, l'adhérent peut à tout moment substituer au paiement par prélèvement bancaire un paiement en se présentant à l'accueil du club, entre 15 et 13 jours calendaires avant la date convenue pour le prélèvement susvisé. Dans le cadre du prélèvement SEPA, l'adhérent aura la possibilité de consulter à tout moment sa Référence Unique de Mandat (RUM) ainsi que son échéancier de paiement auprès du service administratif du club." },
  { t: "La non-utilisation temporaire ou définitive des prestations du contrat ne donne droit à aucune résiliation anticipée, prolongation ou suspension, sauf sur présentation d'éléments de preuves permettant de justifier de manière incontestable une incapacité entendue comme : I) un empêchement médical affectant totalement la pratique de l'activité, pour une période de plus d'un mois ; II) un déménagement lointain ou une mutation professionnelle (à plus de 30km de La SaLLe / ARAPS) ; III) un licenciement." },
  { t: "A) Incapacité temporaire supérieure à 1 mois : les justificatifs devront être fournis à La SaLLe / ARAPS dans un délai de 3 mois maximum à compter de la date de l'empêchement. Prolongation gratuite de la durée d'abonnement à l'issue des 12 mois d'engagement." },
  { t: "B) Incapacité définitive ou supérieure à 1 an : résiliation anticipée de l'abonnement avec engagement de durée, à date anniversaire mensuelle, moyennant un préavis de 3 semaines à réception des justificatifs par La SaLLe / ARAPS. Formule « paiement immédiat » : remboursement des sommes payées relatives à la période post-résiliation. Formule « paiement mensuel avec engagement » : suspension des prélèvements mensuels sur la période post-résiliation." },
  { h: "2. PRESTATIONS INCLUSES" },
  { t: "L'adhérent peut accéder aux différentes activités offertes par La SaLLe / ARAPS : plateaux de cardio-training et musculation. Sur les plateaux de cardio-training et de musculation, les conseillers sportifs renseignent les adhérents de 9h à 13h et de 17h à 20h du lundi au vendredi." },
  { t: "En dehors de ces horaires, l'adhérent peut être amené à solliciter les services d'un coach, cette prestation étant payante en sus de son abonnement. D'autres prestations ou abonnements optionnels et payants pourraient être proposés à l'adhérent : le cas échéant, ces prestations feront l'objet d'un contrat spécifique. Les horaires d'ouverture, dont l'adhérent déclare avoir pris connaissance en club, sont communiqués par courrier électronique ou postal dans les sept jours suivant la souscription et au recto de son contrat. Ils sont consultables, ainsi que les jours de fermeture (2 semaines maximum sur juillet/août, jours fériés et 1 jour entreprise) dans le club." },
  { h: "3. ACCÈS À LA SALLE" },
  { t: "L'adhérent reçoit une licence (dans le cadre des adhésions annuelles et trimestrielles) et un code unique. Ce code est strictement personnel et nécessaire pour accéder au club." },
  { h: "4. OBLIGATIONS DE L'ADHÉRENT" },
  { t: "L'adhésion est incessible. La SaLLe / ARAPS refusera l'accès à toute personne utilisant un code correspondant à une personne différente de celle enregistrée. L'adhérent s'engage à respecter les consignes et recommandations du personnel afin de pratiquer l'activité choisie en préservant sa santé et sa sécurité. Il déclare avoir pris connaissance du Règlement Intérieur, communiqué lors de l'inscription, et s'engage à le respecter strictement, ainsi que les règles d'hygiène et de sécurité." },
  { t: "En cas de non-respect du Règlement Intérieur, La SaLLe / ARAPS se réserve le droit de prendre toutes mesures propres à préserver les intérêts de ses adhérents : (I) avertissement formel ou (II) exclusion temporaire de 30 jours calendaires. En cas de violations graves (vol, violence, harcèlement, dégradation matérielle), ou de violations simples répétées sur 3 mois, l'adhérent sera exclu définitivement. Pour des raisons de sécurité collective, les effets personnels ne sont pas acceptés dans les salles de cours ni sur les plateaux." },
  { t: "L'adhérent pourra bénéficier d'une prolongation de 7 jours en cas de : non ouverture du club (hors fermetures de l'article 2) ; cours collectif annulé et non remplacé ; dysfonctionnement rendant inutilisable la totalité du parc de machines." },
  { h: "5. DURÉE" },
  { t: "Début : les adhésions prennent effet le jour d'inscription de l'adhérent ou à une autre date précisée par ses soins. Fin : I) les adhésions en paiement immédiat prennent fin 12 mois après la prise d'effet ; II) l'adhésion en paiement mensuel avec engagement est à durée indéterminée à l'issue de la durée initiale de 12 mois." },
  { h: "6. PRIX" },
  { t: "Les prix s'entendent toutes taxes comprises et sont ceux en vigueur au jour de la souscription. La SaLLe / ARAPS se réserve le droit de modifier ses tarifs : les nouveaux tarifs s'appliquent aux abonnements souscrits postérieurement à la modification, après publication sur les supports habituels. Pour l'abonnement mensuel, les modifications s'appliquent au renouvellement du contrat, l'adhérent étant informé par courrier électronique ou postal." },
  { h: "7. CONDITIONS DE RÉSILIATION DU CONTRAT" },
  { t: "I) La SaLLe / ARAPS se réserve le droit de résilier l'abonnement de plein droit, sans préavis ni mise en demeure, en cas de violation des lois applicables, notamment pénales, ou de celles protégeant les droits d'un tiers." },
  { t: "II) En cas de violation grave et/ou réitérée des présentes conditions et/ou du règlement intérieur (hygiène, sécurité), La SaLLe / ARAPS peut résilier le contrat et demander réparation des dommages subis, à compter de la réception par l'adhérent d'une LRAR notifiant la résiliation et ses motifs. L'adhérent se verra refuser l'accès et devra restituer sa carte-membre." },
  { t: "III) En cas de non-paiement (quel que soit le mode de paiement), l'accès est immédiatement refusé jusqu'à régularisation. L'adhérent dispose d'un délai de 30 jours, à compter de la réception par La SaLLe / ARAPS du courrier de la banque l'informant du rejet, pour régler le montant dû. À défaut, le dossier est transmis à un huissier ou à une société de recouvrement, le montant total de l'abonnement devant être acquitté en une seule fois. Toute inexécution de l'obligation de paiement donne lieu à une pénalité forfaitaire de 8 €." },
  { t: "IV) L'adhérent a la faculté de résilier l'abonnement en paiement mensuel par LRAR à l'adresse indiquée, chaque mois à la date anniversaire mensuelle de prise d'effet, moyennant un préavis de trois semaines, le paiement de chaque mois entamé étant intégralement dû ; ce délai court à compter de la réception de la lettre par La SaLLe / ARAPS." },
  { h: "8. INFORMATIQUE, FICHIERS ET LIBERTÉS" },
  { t: "Les données concernant l'adhérent sont destinées à la gestion de son abonnement par La SaLLe / ARAPS. Conformément à la loi du 6 janvier 1978 modifiée, La SaLLe / ARAPS pourra adresser des offres sur ses services, sauf opposition signifiée par courrier. L'adhérent dispose d'un droit d'accès, de rectification et de suppression des informations le concernant, qu'il peut exercer à tout moment, et peut, pour des motifs légitimes, s'opposer au traitement. La SaLLe / ARAPS se réserve le droit de communiquer les données à des partenaires ou prestataires (banques, société de recouvrement, partenaires marketing ou événementiel)." },
  { t: "Les conditions générales d'adhésion font partie intégrante du contrat et doivent être signées et datées par l'adhérent, qui atteste les avoir intégralement lues, comprises et acceptées." },
];

// « Comment nous avez-vous connu ? »
const SOURCES = ['Un ami / une connaissance', 'Réseaux sociaux', 'En passant devant', 'Publicité', 'Autre'];

const BorneSignaturePage: React.FC = () => {
  const navigate = useNavigate();
  const req = getPendingSign();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawing = useRef(false);
  const [empty, setEmpty] = useState(true);
  const [consentCga, setConsentCga] = useState(false);
  const [consentMed, setConsentMed] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [source, setSource] = useState('');
  const [code, setCode] = useState('');
  const [done, setDone] = useState(false);

  // Pas de demande en attente : on retourne à l'accueil.
  useEffect(() => { if (!req) navigate('/borne', { replace: true }); }, [req, navigate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#14100F';
  }, []);

  const pos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const start = (e: React.PointerEvent) => { drawing.current = true; const c = canvasRef.current!.getContext('2d')!; const p = pos(e); c.beginPath(); c.moveTo(p.x, p.y); };
  const move = (e: React.PointerEvent) => { if (!drawing.current) return; const c = canvasRef.current!.getContext('2d')!; const p = pos(e); c.lineTo(p.x, p.y); c.stroke(); if (empty) setEmpty(false); };
  const end = () => { drawing.current = false; };
  const clear = () => { const c = canvasRef.current!; c.getContext('2d')!.clearRect(0, 0, c.width, c.height); setEmpty(true); };

  const canValidate = !empty && consentCga && consentMed && !done;

  const validate = () => {
    if (!canValidate) return;
    const signature = canvasRef.current!.toDataURL('image/png');
    sendSignResult({ signature, acquisition: source || null, referralCode: code.trim() || null });
    setDone(true);
    setTimeout(() => navigate('/borne', { replace: true }), 2600);
  };

  const cancel = () => { clearPendingSign(); navigate('/borne', { replace: true }); };

  if (done) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center text-white ui-crisp" style={{ background: `linear-gradient(160deg, ${RED}, #8E1414)` }}>
        <CheckCircle2 size={72} />
        <h1 className="text-4xl font-extrabold mt-5">Merci !</h1>
        <p className="text-lg font-semibold text-white/90 mt-2">Ta signature est bien enregistrée.</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-50 ui-crisp flex flex-col overflow-y-auto">
      <div className="max-w-3xl w-full mx-auto px-6 py-8 flex-1 flex flex-col">
        <div className="flex items-center justify-between">
          <span className="text-2xl font-extrabold" style={{ color: RED }}>La SaLLe</span>
          <button onClick={cancel} className="text-gray-400 hover:text-gray-700 p-2" aria-label="Annuler"><X size={26} /></button>
        </div>

        <h1 className="text-3xl font-extrabold text-gray-900 mt-6">Bonjour {req?.signerName || ''} 👋</h1>
        <p className="text-gray-500 font-medium mt-1">Merci de signer ton contrat ci-dessous. Le contrat complet te sera envoyé par e-mail.</p>

        {/* Mentions légales */}
        <div className="mt-5 border border-gray-200 rounded-2xl bg-white overflow-hidden">
          <button onClick={() => setShowMentions((v) => !v)} className="w-full flex items-center justify-between px-4 py-3 text-left font-bold text-gray-800">
            Lire les conditions et la politique de confidentialité
            <ChevronDown size={20} className={`transition-transform ${showMentions ? 'rotate-180' : ''}`} style={{ color: RED }} />
          </button>
          {showMentions && (
            <div className="px-4 pb-4 max-h-72 overflow-y-auto">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Conditions générales d'adhésion — A.R.A.P.S (La SaLLe)</p>
              {CGA.map((p, i) => (
                p.h
                  ? <p key={i} className="text-sm font-extrabold mt-3 mb-1" style={{ color: RED }}>{p.h}</p>
                  : <p key={i} className="text-[13px] text-gray-600 leading-relaxed mb-1.5">{p.t}</p>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 space-y-2.5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={consentCga} onChange={(e) => setConsentCga(e.target.checked)} className="mt-1 w-5 h-5" style={{ accentColor: RED }} />
            <span className="text-sm font-medium text-gray-700">Je déclare avoir pris connaissance des Conditions générales d'adhésion et du Règlement intérieur.</span>
          </label>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={consentMed} onChange={(e) => setConsentMed(e.target.checked)} className="mt-1 w-5 h-5" style={{ accentColor: RED }} />
            <span className="text-sm font-medium text-gray-700">Je déclare avoir fait contrôler par un médecin mon aptitude à pratiquer une activité sportive.</span>
          </label>
        </div>

        {/* Comment nous avez-vous connu + code */}
        <div className="mt-6">
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Comment nous avez-vous connu ?</p>
          <div className="flex flex-wrap gap-2">
            {SOURCES.map((s) => (
              <button key={s} onClick={() => setSource(s === source ? '' : s)} className={`px-4 py-2 rounded-xl border font-semibold text-sm ${source === s ? 'text-white border-transparent' : 'border-gray-200 text-gray-600 bg-white'}`} style={{ backgroundColor: source === s ? RED : undefined }}>{s}</button>
            ))}
          </div>
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="As-tu un code ? (facultatif)"
            className="mt-3 w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-red-100" />
        </div>

        {/* Pavé de signature */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Signature (précédée de « lu et approuvé »)</p>
            <button onClick={clear} className="inline-flex items-center gap-1.5 text-[12px] font-bold text-gray-400 hover:text-gray-700"><Eraser size={14} /> Effacer</button>
          </div>
          <div className="relative rounded-2xl border-2 border-dashed border-gray-300 bg-white" style={{ height: '220px' }}>
            <canvas ref={canvasRef} onPointerDown={start} onPointerMove={move} onPointerUp={end} onPointerLeave={end} className="absolute inset-0 w-full h-full touch-none" />
            {empty && <span className="absolute inset-0 flex items-center justify-center text-gray-300 font-semibold pointer-events-none">Signez ici</span>}
          </div>
        </div>

        <button onClick={validate} disabled={!canValidate}
          className="mt-6 w-full inline-flex items-center justify-center gap-2 text-white font-bold py-4 rounded-2xl shadow-xl disabled:opacity-50"
          style={{ backgroundColor: RED }}>
          <Check size={20} /> Valider ma signature
        </button>
      </div>
    </div>
  );
};

export default BorneSignaturePage;
