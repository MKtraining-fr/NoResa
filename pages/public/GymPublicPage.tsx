import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  getGyms, 
  registerProspect, 
  ExtendedGym 
} from '../../utils/storage';
import { 
  MapPin, Phone, Mail, Clock, Check, ChevronRight, 
  Calendar, Award, ShieldCheck, Dumbbell, Star, 
  ArrowLeft, ArrowRight, CheckCircle2, QrCode, Ticket 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const FAQItem: React.FC<{ q: string; a: string }> = ({ q, a }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border border-slate-100 rounded-2xl overflow-hidden transition-all bg-white">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4.5 bg-slate-50/20 text-left hover:bg-slate-50/50 transition-colors"
      >
        <span className="text-xs font-bold text-slate-800">{q}</span>
        <span className="text-indigo-600 text-xs font-extrabold">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="p-4.5 bg-white border-t border-slate-50 text-xs text-slate-500 font-medium leading-relaxed">
          {a}
        </div>
      )}
    </div>
  );
};

const GymPublicPage: React.FC = () => {
  const { gymId } = useParams<{ gymId: string }>();
  const [gym, setGym] = useState<ExtendedGym | null>(null);
  const [loading, setLoading] = useState(true);

  // Form State
  const [step, setStep] = useState(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [interest, setInterest] = useState('Musculation libre');
  const [wantsTrial, setWantsTrial] = useState(true);
  const [trialDate, setTrialDate] = useState('');
  const [trialTime, setTrialTime] = useState('18:00');
  const [notes, setNotes] = useState('');
  
  // Submission State
  const [registeredProspectData, setRegisteredProspectData] = useState<any | null>(null);

  useEffect(() => {
    const list = getGyms();
    // Par défaut, s'il n'y a pas d'ID ou si on veut la courante, prendre iron-paradise
    const idToFind = gymId || 'iron-paradise';
    const found = list.find(g => g.id === idToFind) || list[0];
    setGym(found);
    setLoading(false);
  }, [gymId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gym) return;

    const data = {
      gymId: gym.id,
      firstName,
      lastName,
      email,
      phone,
      interest,
      trialDate: wantsTrial ? trialDate : undefined,
      trialTime: wantsTrial ? trialTime : undefined,
      notes
    };

    const newProspect = registerProspect(data);
    setRegisteredProspectData({
      ...newProspect,
      passCode: `PASS-${gym.id.slice(0, 3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
      interest,
      trialDate,
      trialTime,
      gymName: gym.name,
      gymAddress: gym.address,
      gymPhone: gym.phone
    });
    setStep(3);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500 font-bold">Chargement de la page de la salle...</p>
      </div>
    );
  }

  if (!gym) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <p className="text-red-500 font-bold mb-4">Établissement introuvable.</p>
        <Link to="/" className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-bold">Retour à l'accueil</Link>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pb-16">
      {/* Visual Header Banner */}
      <div className="relative h-80 lg:h-96 md:h-88 bg-slate-900 overflow-hidden">
        <img 
          src={gym.bannerImage} 
          alt={gym.name} 
          className="w-full h-full object-cover opacity-60" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
        
        <div className="absolute top-6 left-6 z-10">
          <Link 
            to="/salles" 
            className="inline-flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-bold backdrop-blur-md border border-white/10 transition-all"
          >
            <ArrowLeft size={16} />
            <span>Découvrir d'autres salles</span>
          </Link>
        </div>

        <div className="absolute bottom-10 left-0 right-0">
          <div className="max-w-7xl mx-auto px-6 lg:px-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3 text-white">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-bold uppercase tracking-wider border border-indigo-500/30 backdrop-blur-sm">
                <Dumbbell size={12} />
                <span>Page Publique Certifiée</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight">{gym.name}</h1>
              <p className="flex items-center text-sm md:text-base font-semibold text-slate-300">
                <MapPin size={16} className="text-indigo-400 mr-1.5 shrink-0" />
                {gym.address}
              </p>
            </div>
            <div className="flex items-center space-x-4 shrink-0 bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
              <div className="bg-indigo-600 p-2.5 rounded-xl text-white">
                <Star size={20} fill="currentColor" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-black text-slate-400 tracking-wider">Avis Google</p>
                <p className="text-lg font-black text-white">4.8 / 5 <span className="text-xs font-semibold text-slate-400">(240+ avis)</span></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container Content */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 mt-12 grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left Side: Gym Details & Presentation */}
        <div className="lg:col-span-7 space-y-10">
          
          {/* Section 1: Qui sommes-nous */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center space-x-2">
              <span className="w-1.5 h-6 bg-indigo-600 rounded-full inline-block"></span>
              <span>À propos du Club</span>
            </h2>
            <p className="text-gray-600 line-height-relaxed text-sm font-medium leading-relaxed">
              {gym.description}
            </p>
            
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold">
                  <Award size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Équipement</p>
                  <p className="text-xs font-bold text-gray-900">Gammes Premium</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider">Sécurité</p>
                  <p className="text-xs font-bold text-gray-900">Accès sécurisé QR</p>
                </div>
              </div>
            </div>
                {/* Section 2: Nos Équipements / Services */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center space-x-2">
              <span className="w-1.5 h-6 bg-indigo-600 rounded-full inline-block"></span>
              <span>Prestations & Matériel</span>
            </h2>
            <p className="text-sm text-gray-500 font-bold">Un espace pensé dans les moindres détails pour vos plus belles performances.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {gym.features.map((feature, i) => (
                <div key={i} className="flex items-center space-x-3 p-4 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-gray-100 transition-colors">
                  <div className="bg-indigo-600 text-white rounded-lg p-1">
                    <Check size={14} strokeWidth={3} />
                  </div>
                  <span className="text-xs font-bold text-gray-750">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section New A: Affluence en Direct */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <h2 className="text-xl font-extrabold text-gray-900 flex items-center space-x-2">
                <span className="w-1.5 h-6 bg-indigo-600 rounded-full inline-block"></span>
                <span>Affluence en Temps Réel</span>
              </h2>
              <div className="flex items-center space-x-2 bg-emerald-55 text-emerald-700 py-1 px-3 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>En Direct : Calme</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 font-bold">Consultez l'historique de fréquentation pour planifier vos séances d'entraînement dans les meilleures conditions.</p>
            
            {/* Hour charts simulation */}
            <div className="space-y-4">
              <div className="flex items-end justify-between h-20 pt-4 px-2 border-b border-gray-150">
                {[
                  { hour: '08h', pct: 30, active: false },
                  { hour: '10h', pct: 45, active: false },
                  { hour: '12h', pct: 70, active: false },
                  { hour: '14h', pct: 35, active: false },
                  { hour: '16h', pct: 50, active: false },
                  { hour: '18h', pct: 90, active: true },
                  { hour: '20h', pct: 65, active: false },
                  { hour: '22h', pct: 20, active: false },
                ].map((item, idx) => (
                  <div key={idx} className="flex flex-col items-center flex-grow group">
                    <div className="w-full max-w-[1.25rem] bg-indigo-100 rounded-t-lg transition-all group-hover:bg-indigo-300 relative" style={{ height: `${item.pct}%` }}>
                      {item.active && (
                        <div className="absolute inset-0 bg-indigo-600 rounded-t-lg"></div>
                      )}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[8px] font-black py-0.5 px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity mb-1 whitespace-nowrap">
                        {item.pct}% rempli
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-gray-400 mt-2">{item.hour}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-gray-400 font-bold text-center">💡 Astuce : Les créneaux entre 06h-09h et 14h-16h sont particulièrement calmes et agréables.</p>
            </div>
          </div>

          {/* Section New B: Tarifs & Formules d'Abonnement */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center space-x-2">
              <span className="w-1.5 h-6 bg-indigo-600 rounded-full inline-block"></span>
              <span>Nos Abonnements & Formules</span>
            </h2>
            <p className="text-xs text-gray-500 font-bold col-span-full">Des options sur-mesure pour s'adapter à vos objectifs et votre budget, sans engagement.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              <div className="bg-slate-50 border border-slate-100/50 p-6 rounded-3xl flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-indigo-600 bg-indigo-55/60 px-2.5 py-1 rounded-md">Pack Standard</span>
                  <h4 className="text-lg font-black text-gray-900">Accès Illimité Free</h4>
                  <p className="text-2xl font-black text-indigo-600">{gym.pricing || "29.99 € / mois"}</p>
                  <p className="text-[10px] text-gray-400 font-bold">Sans engagement de durée, résiliation simplifiée</p>
                </div>
                <div className="space-y-2 pt-2 border-t border-gray-100 font-medium text-xs text-gray-600">
                  <p className="flex items-center"><Check size={12} className="text-indigo-600 mr-2 shrink-0" /> Accès au plateau cardio & muscu 7j/7</p>
                  <p className="flex items-center"><Check size={12} className="text-indigo-600 mr-2 shrink-0" /> Douches individuelles et vestiaires inclus</p>
                  <p className="flex items-center"><Check size={12} className="text-indigo-600 mr-2 shrink-0" /> Suivi d'initiation sur application</p>
                </div>
              </div>

              <div className="border-2 border-indigo-600 bg-indigo-600/5 p-6 rounded-3xl flex flex-col justify-between space-y-4 relative overflow-hidden">
                <div className="absolute top-3 right-3 bg-indigo-600 text-white rounded-full py-0.5 px-2.5 text-[8px] font-black uppercase tracking-wider">
                  Recommandé
                </div>
                <div className="space-y-2">
                  <span className="text-[9px] font-black uppercase tracking-wider text-white bg-indigo-600 px-2.5 py-1 rounded-md">Pack Élite</span>
                  <h4 className="text-lg font-black text-gray-900">Premium Coaching Plus</h4>
                  <p className="text-2xl font-black text-indigo-600">
                    {gym.pricing ? `${parseFloat(gym.pricing) + 20} €` : "49.99 €"} <span className="text-xs font-bold text-gray-400">/ mois</span>
                  </p>
                  <p className="text-[10px] text-gray-450 font-bold">Le meilleur compromis pour progresser activement</p>
                </div>
                <div className="space-y-2 pt-2 border-t border-indigo-100 font-medium text-xs text-gray-600">
                  <p className="flex items-center"><Check size={12} className="text-indigo-600 mr-2 shrink-0" /> 1 séance de Coaching Privé par mois</p>
                  <p className="flex items-center"><Check size={12} className="text-indigo-600 mr-2 shrink-0" /> Accès à tous les cours collectifs WOD</p>
                  <p className="flex items-center"><Check size={12} className="text-indigo-600 mr-2 shrink-0" /> Espace Sauna & détente en illimité</p>
                </div>
              </div>
            </div>
          </div>

          {/* Section New C: Témoignages clients de confiance */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center space-x-2">
              <span className="w-1.5 h-6 bg-indigo-600 rounded-full inline-block"></span>
              <span>L'avis de nos Membres</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  name: "Sophie Laurent",
                  role: "Membre depuis 1 an",
                  comment: "Une infrastructure de rêve, des coachs à l'écoute et du matériel de très haut niveau toujours propre.",
                  rating: 5
                },
                {
                  name: "Thomas Dubois",
                  role: "Inscrit le mois dernier",
                  comment: "L'ambiance est hyper saine et motivante. Le pass de séance d'essai m'a immédiatement convaincu !",
                  rating: 5
                }
              ].map((rev, idx) => (
                <div key={idx} className="p-5 bg-slate-50/50 rounded-2xl border border-gray-100 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h5 className="text-xs font-black text-slate-900">{rev.name}</h5>
                      <p className="text-[9px] text-slate-400 font-semibold">{rev.role}</p>
                    </div>
                    <div className="flex text-amber-500">
                      {Array.from({ length: rev.rating }).map((_, i) => (
                        <Star key={i} size={10} fill="currentColor" />
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 italic font-medium leading-relaxed">"{rev.comment}"</p>
                </div>
              ))}
            </div>
          </div>

          {/* Section New D: FAQ Interactive Accordion */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center space-x-2">
              <span className="w-1.5 h-6 bg-indigo-600 rounded-full inline-block"></span>
              <span>Vos Questions Fréquentes</span>
            </h2>
            <div className="space-y-3">
              {[
                {
                  q: "Comment se déroule la première séance d'essai gratuite ?",
                  a: "Une fois inscrit sur cette page, vous recevrez un ticket-pass personnel par e-mail. Munissez-vous simplement d'une tenue de rechange sportive, de baskets propres, d'une serviette et d'une bouteille d'eau. Notre équipe d'accueil vous fera visiter !"
                },
                {
                  q: "Les douches et les vestiaires sont-ils accessibles ?",
                  a: "Absolument ! Tous nos partenaires disposent de vestiaires équipés, de douches individuelles propres et de casiers de rangement sécurisés."
                },
                {
                  q: "Y a-t-il un engagement minimum sur les offres ?",
                  a: "Non ! Chez noResa, nos abonnements sont d'une flexibilité absolue, résiliables en un clic ou d'un simple e-mail auprès de votre club sans frais cachés."
                }
              ].map((faq, idx) => (
                <FAQItem key={idx} q={faq.q} a={faq.a} />
              ))}
            </div>
          </div>

          {/* Section 3: Horaires & Contact */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Hours card */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-5 md:col-span-7">
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center space-x-2">
                <Clock size={16} className="text-indigo-600" />
                <span>Horaires d'Ouverture</span>
              </h3>
              <div className="space-y-2.5">
                {Object.entries(gym.hours).map(([day, hr]) => {
                  const todayName = new Intl.DateTimeFormat('fr-FR', { weekday: 'long' }).format(new Date());
                  const isToday = day.toLowerCase() === todayName.toLowerCase();
                  return (
                    <div 
                      key={day} 
                      className={`flex items-center justify-between text-xs py-1.5 px-3 rounded-xl font-bold ${
                        isToday ? 'bg-indigo-50 text-indigo-900 border border-indigo-100/30' : 'text-gray-600'
                      }`}
                    >
                      <span className="capitalize">{day}</span>
                      <span>{hr}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Support / Location Info card */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6 md:col-span-5 flex flex-col justify-between">
              <div className="space-y-5">
                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Nous Contacter</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600"><Phone size={16} /></div>
                    <span className="font-extrabold text-gray-700 text-xs">{gym.phone}</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm block">
                    <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600"><Mail size={16} /></div>
                    <span className="font-extrabold text-gray-700 text-xs break-all">{gym.email}</span>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-indigo-600/5 border border-indigo-600/10 rounded-2xl">
                <p className="text-[10px] font-black text-indigo-800 uppercase tracking-wider mb-1">Période d'essai d'or</p>
                <p className="text-[11px] font-bold text-gray-600">Venez tester une séance gratuitement avant de vous engager.</p>
              </div>
            </div>
          </div>
        </div>

      </div>

        {/* Right Side: Online Prospect Registration Box */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 h-fit">
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
            
            {/* Header Form Card */}
            {step < 3 && (
              <div className="p-8 bg-indigo-600 text-white space-y-2">
                <h3 className="text-xl font-black">Inscription en Ligne</h3>
                <p className="text-xs text-indigo-100 font-bold uppercase tracking-wider">Réservez votre séance d'essai gratuite !</p>
                
                {/* Visual Step indicators */}
                <div className="flex items-center space-x-2 pt-4">
                  <div className={`h-1 flex-grow rounded-full transition-colors ${step >= 1 ? 'bg-white' : 'bg-white/30'}`}></div>
                  <div className={`h-1 flex-grow rounded-full transition-colors ${step >= 2 ? 'bg-white' : 'bg-white/30'}`}></div>
                </div>
              </div>
            )}

            <div className="p-8">
              <AnimatePresence mode="wait">
                
                {/* STEP 1: General Info */}
                {step === 1 && (
                  <motion.div 
                    key="step1"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="space-y-5"
                  >
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Prénom</label>
                      <input 
                        type="text" 
                        required 
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Jean" 
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-600/10 transition-all font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nom</label>
                      <input 
                        type="text" 
                        required 
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Dupont" 
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-600/10 transition-all font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Adresse Email</label>
                      <input 
                        type="email" 
                        required 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="jean.dupont@email.com" 
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-600/10 transition-all font-medium"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Numéro de Téléphone</label>
                      <input 
                        type="tel" 
                        required 
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="06 12 34 56 78" 
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-600/10 transition-all font-medium"
                      />
                    </div>
                    
                    <button 
                      type="button"
                      disabled={!firstName || !lastName || !email || !phone}
                      onClick={() => setStep(2)}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                    >
                      <span>Continuer</span>
                      <ChevronRight size={18} />
                    </button>
                  </motion.div>
                )}

                {/* STEP 2: Preferences & Trial Booking */}
                {step === 2 && (
                  <motion.div 
                    key="step2"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-5"
                  >
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Discipline d'intérêt</label>
                      <select 
                        value={interest}
                        onChange={(e) => setInterest(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none"
                      >
                        <option>Musculation libre / Force</option>
                        <option>Cardio-Training / Perte de poids</option>
                        <option>Yoga / Mobilité / Pilates</option>
                        <option>CrossFit / Cours haute intensité</option>
                        <option>Suivi avec Coach Privé</option>
                      </select>
                    </div>

                    <div className="p-4 bg-indigo-50 rounded-2xl flex items-center justify-between border border-indigo-100/30">
                      <div>
                        <p className="text-xs font-black text-indigo-950">Planifier une séance d'essai ?</p>
                        <p className="text-[10px] font-bold text-indigo-400 uppercase">Complètement gratuit, sans engagement</p>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setWantsTrial(!wantsTrial)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${wantsTrial ? 'bg-indigo-600' : 'bg-gray-300'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${wantsTrial ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    {wantsTrial && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="grid grid-cols-2 gap-3 pt-1 space-y-0 text-left"
                      >
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</label>
                          <input 
                            type="date" 
                            required={wantsTrial}
                            value={trialDate}
                            onChange={(e) => setTrialDate(e.target.value)}
                            min={new Date().toISOString().split('T')[0]}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-bold outline-none"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Créneau horaire</label>
                          <select 
                            value={trialTime}
                            onChange={(e) => setTrialTime(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5 text-xs font-bold outline-none"
                          >
                            <option value="09:00">09:00 (Matinée)</option>
                            <option value="12:30">12:30 (Midi)</option>
                            <option value="15:00">15:00 (Après-midi)</option>
                            <option value="18:00">18:00 (Soirée)</option>
                            <option value="20:00">20:00 (Fin de soirée)</option>
                          </select>
                        </div>
                      </motion.div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vos objectifs en quelques mots</label>
                      <textarea 
                        rows={3} 
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Ex: Être plus fort, me sentir en meilleure santé..." 
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-600/10 transition-all"
                      ></textarea>
                    </div>

                    <div className="flex space-x-3 pt-3">
                      <button 
                        type="button"
                        onClick={() => setStep(1)}
                        className="w-1/3 bg-slate-100 font-bold hover:bg-slate-200 text-gray-600 py-4 rounded-2xl text-xs transition-all"
                      >
                        Retour
                      </button>
                      <button 
                        type="button"
                        onClick={handleSubmit}
                        disabled={wantsTrial && !trialDate}
                        className="w-2/3 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle2 size={16} />
                        <span>Confirmer l'inscription</span>
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* STEP 3: SUCCESS STATE WITH TICKET COUPON */}
                {step === 3 && registeredProspectData && (
                  <motion.div 
                    key="success"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="space-y-6 text-center py-4"
                  >
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600">
                      <CheckCircle2 size={36} />
                    </div>
                    
                    <div className="space-y-2">
                      <h4 className="text-xl font-extrabold text-gray-900">Bienvenue à bord !</h4>
                      <p className="text-xs text-gray-500 max-w-sm mx-auto">
                        Votre demande d'inscription prospect a été validée avec succès sur NoResa. Un e-mail de confirmation vient de vous être envoyé.
                      </p>
                    </div>

                    {/* VOUCHER TICKET PASS DESIGN */}
                    <div className="relative bg-slate-900 text-white rounded-3xl overflow-hidden shadow-2xl border border-slate-800 text-left">
                      {/* Ticket top decoration */}
                      <div className="p-6 pb-4 border-b-2 border-dashed border-slate-800 relative bg-gradient-to-br from-slate-950 to-slate-900">
                        {/* Side circle cutouts */}
                        <div className="absolute -left-3 bottom-0 w-6 h-6 bg-white rounded-full translate-y-3"></div>
                        <div className="absolute -right-3 bottom-0 w-6 h-6 bg-white rounded-full translate-y-3"></div>

                        <div className="flex items-center justify-between">
                          <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-green-500/20 text-green-400 rounded-lg text-[9px] font-black uppercase tracking-wider">
                            <Ticket size={10} />
                            <span>Pass d'Essai Offert</span>
                          </span>
                          <span className="text-[10px] font-black text-indigo-400 tracking-wider font-mono">
                            {registeredProspectData.passCode}
                          </span>
                        </div>
                        <h5 className="text-lg font-black mt-3">{registeredProspectData.gymName}</h5>
                        <p className="text-[10px] text-slate-400 mt-1 flex items-center">
                          <MapPin size={10} className="mr-1 inline shrink-0" /> {registeredProspectData.gymAddress}
                        </p>
                      </div>

                      {/* Ticket bottom content */}
                      <div className="p-6 pt-4 bg-slate-950 text-slate-300 font-medium text-xs space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Bordereau invité</p>
                            <p className="font-extrabold text-white text-xs truncate">{registeredProspectData.firstName} {registeredProspectData.lastName}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Activité ciblée</p>
                            <p className="font-extrabold text-indigo-400 text-xs truncate">{registeredProspectData.interest}</p>
                          </div>
                        </div>

                        {registeredProspectData.trialDate ? (
                          <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center space-x-3">
                            <div className="bg-indigo-600 text-white p-2 rounded-lg">
                              <Calendar size={14} />
                            </div>
                            <div>
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Rendez-vous séance</p>
                              <p className="font-extrabold text-white text-xs">
                                {registeredProspectData.trialDate} à {registeredProspectData.trialTime}
                              </p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-[11px] italic text-yellow-400/80">Veuillez contacter le club pour planifier votre essai.</p>
                        )}

                        <div className="pt-2 border-t border-slate-900/40 flex items-center justify-between text-[11px] font-bold text-slate-400">
                          <div className="space-y-0.5">
                            <p>Présentez ce pass à l'accueil</p>
                            <p className="text-slate-500 text-[10px]">Tél : {registeredProspectData.gymPhone}</p>
                          </div>
                          <QrCode size={38} className="text-white bg-white p-1 rounded-md shrink-0 block" />
                        </div>
                      </div>
                    </div>

                    <button 
                      type="button"
                      onClick={() => {
                        setStep(1);
                        setFirstName('');
                        setLastName('');
                        setEmail('');
                        setPhone('');
                        setTrialDate('');
                        setRegisteredProspectData(null);
                      }}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors block mx-auto underline"
                    >
                      Inscrire une autre personne
                    </button>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};

export default GymPublicPage;
