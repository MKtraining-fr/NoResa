
import React from 'react';
import { Link } from 'react-router-dom';
// Fixed: Added 'Calendar' to the imports from lucide-react
import { CheckCircle, Shield, Rocket, Smartphone, Users, Zap, ArrowRight, Play, Calendar } from 'lucide-react';

const HomePage: React.FC = () => {
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative pt-20 pb-32 overflow-hidden bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-12">
            <div className="lg:w-1/2 text-center lg:text-left space-y-8 animate-in fade-in slide-in-from-left-8 duration-700">
              <div className="inline-flex items-center space-x-2 px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm font-semibold border border-indigo-100">
                <Zap size={16} />
                <span>Nouveau : Version 3.0 maintenant disponible</span>
              </div>
              <h1 className="text-5xl lg:text-7xl font-extrabold text-gray-900 tracking-tight leading-[1.1]">
                La gestion de votre salle <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">réinventée.</span>
              </h1>
              <p className="text-xl text-gray-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                NoResa est la solution complète pour les salles de sport modernes. Gérez vos membres, vos cours et vos paiements en toute simplicité.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <Link
                  to="/inscription-salle"
                  className="w-full sm:w-auto px-8 py-4 bg-indigo-600 text-white font-bold rounded-2xl shadow-xl hover:bg-indigo-700 hover:-translate-y-1 transition-all flex items-center justify-center space-x-2"
                >
                  <span>Démarrer maintenant</span>
                  <ArrowRight size={20} />
                </Link>
                <Link
                  to="/fonctionnalites"
                  className="w-full sm:w-auto px-8 py-4 bg-white text-gray-700 font-bold rounded-2xl border border-gray-200 hover:bg-gray-50 transition-all flex items-center justify-center space-x-2"
                >
                  <Play size={18} fill="currentColor" />
                  <span>Voir la démo</span>
                </Link>
              </div>
              <div className="flex items-center justify-center lg:justify-start space-x-6 pt-4 text-gray-500">
                <div className="flex items-center space-x-2">
                  <CheckCircle size={18} className="text-green-500" />
                  <span className="text-sm">Sans engagement</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle size={18} className="text-green-500" />
                  <span className="text-sm">Essai 14 jours</span>
                </div>
              </div>
            </div>

            <div className="lg:w-1/2 relative animate-in fade-in slide-in-from-right-8 duration-700 delay-100">
               <div className="absolute -top-12 -left-12 w-64 h-64 bg-indigo-200/50 rounded-full blur-3xl"></div>
               <div className="absolute -bottom-12 -right-12 w-64 h-64 bg-violet-200/50 rounded-full blur-3xl"></div>
               <div className="relative bg-white p-2 rounded-3xl shadow-2xl border border-gray-100 overflow-hidden transform hover:scale-[1.02] transition-transform duration-500">
                  <img 
                    src="https://picsum.photos/seed/dashboard/1200/800" 
                    alt="Dashboard NoResa" 
                    className="rounded-2xl"
                  />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <div className="bg-indigo-600/90 text-white p-4 rounded-full shadow-2xl animate-pulse cursor-pointer">
                       <Play size={40} fill="white" />
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats / Proof */}
      <section className="bg-white py-20 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          <div>
            <p className="text-4xl font-bold text-gray-900 mb-1">500+</p>
            <p className="text-gray-500 font-medium">Salles partenaires</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-indigo-600 mb-1">200k+</p>
            <p className="text-gray-500 font-medium">Membres actifs</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-gray-900 mb-1">99.9%</p>
            <p className="text-gray-500 font-medium">Disponibilité</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-indigo-600 mb-1">24/7</p>
            <p className="text-gray-500 font-medium">Support expert</p>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-indigo-600 font-bold tracking-widest uppercase text-sm">Fonctionnalités</h2>
            <p className="text-4xl font-bold text-gray-900">Tout ce dont vous avez besoin pour réussir</p>
            <p className="text-gray-500 max-w-2xl mx-auto">
              NoResa centralise l'ensemble de vos opérations pour que vous puissiez vous concentrer sur l'essentiel : vos sportifs.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Users className="text-indigo-600" />}
              title="CRM & Gestion de Membres"
              desc="Suivez vos prospects et fidélisez vos membres avec des outils de communication automatisés."
            />
            <FeatureCard 
              icon={<Calendar className="text-indigo-600" />}
              title="Planning Intelligent"
              desc="Optimisez vos cours collectifs et permettez à vos membres de réserver en un clic."
            />
            <FeatureCard 
              icon={<Smartphone className="text-indigo-600" />}
              title="Application PWA Membre"
              desc="Une expérience fluide sur mobile sans téléchargement pour l'accès et les réservations."
            />
            <FeatureCard 
              icon={<Shield className="text-indigo-600" />}
              title="Paiements Sécurisés"
              desc="Automatisez vos prélèvements et facturations avec les standards de sécurité bancaire."
            />
            <FeatureCard 
              icon={<Rocket className="text-indigo-600" />}
              title="Marketing & Analytics"
              desc="Analysez vos KPIs en temps réel pour prendre les meilleures décisions pour votre business."
            />
            <FeatureCard 
              icon={<Zap className="text-indigo-600" />}
              title="Intégration Matérielle"
              desc="Synchronisez vos tourniquets et accès QR code avec notre API temps réel."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-indigo-600">
        <div className="max-w-5xl mx-auto px-4 text-center space-y-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white leading-tight">
            Prêt à faire passer votre salle au niveau supérieur ?
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Link
              to="/inscription-salle"
              className="w-full sm:w-auto px-10 py-5 bg-white text-indigo-600 font-bold rounded-2xl text-lg hover:bg-gray-100 shadow-2xl transition-all"
            >
              Créer mon compte gratuit
            </Link>
            <Link
              to="/contact"
              className="w-full sm:w-auto px-10 py-5 bg-transparent text-white border-2 border-white/30 font-bold rounded-2xl text-lg hover:bg-white/10 transition-all"
            >
              Demander une démo
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

const FeatureCard = ({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) => (
  <div className="bg-white p-10 rounded-3xl border border-gray-100 shadow-sm hover:shadow-xl transition-all hover:-translate-y-2 group">
    <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h3 className="text-xl font-bold text-gray-900 mb-4">{title}</h3>
    <p className="text-gray-600 leading-relaxed">{desc}</p>
  </div>
);

export default HomePage;
