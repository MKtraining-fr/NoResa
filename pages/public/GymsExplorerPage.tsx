import React, { useState, useEffect } from 'react';
import { getGyms, ExtendedGym } from '../../utils/storage';
import { Search, MapPin, Phone, Star, ArrowRight, Dumbbell, ShieldCheck, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

const GymsExplorerPage: React.FC = () => {
  const [gyms, setGyms] = useState<ExtendedGym[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('ALL');

  useEffect(() => {
    setGyms(getGyms());
  }, []);

  const getFilteredGyms = () => {
    return gyms.filter(gym => {
      const matchSearch = gym.name.toLowerCase().includes(search.toLowerCase()) || 
                          gym.address.toLowerCase().includes(search.toLowerCase()) ||
                          gym.description.toLowerCase().includes(search.toLowerCase());
      
      let matchFilter = true;
      if (filterType === 'STRENGTH') {
        matchFilter = gym.features.some(f => f.toLowerCase().includes('musculation') || f.toLowerCase().includes('force'));
      } else if (filterType === 'WELLNESS') {
        matchFilter = gym.features.some(f => f.toLowerCase().includes('yoga') || f.toLowerCase().includes('pilates') || f.toLowerCase().includes('bien-être'));
      } else if (filterType === 'CROSSFIT') {
        matchFilter = gym.features.some(f => f.toLowerCase().includes('crossfit'));
      }

      return matchSearch && matchFilter;
    });
  };

  const filteredList = getFilteredGyms();

  return (
    <div className="bg-slate-50 min-h-screen pb-24">
      {/* Header section with high-quality visual banner */}
      <section className="bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-800 text-white py-16 text-center px-4 relative overflow-hidden">
        {/* Abstract design blobs */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl -ml-20 -mb-20"></div>

        <div className="max-w-4xl mx-auto space-y-6 relative z-10">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 bg-white/10 text-indigo-300 rounded-full text-xs font-black uppercase tracking-wider border border-white/5 backdrop-blur-md">
            <Award size={14} />
            <span>Réseau Partenaire Certifié noResa</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
            Trouvez la salle de sport qui <br className="hidden md:block" /> vous correspond.
          </h1>
          <p className="text-slate-300 hover:text-white transition-colors max-w-xl mx-auto text-sm font-semibold">
            Explorez notre réseau d'établissements partenaires de haute qualité. Trouvez de l'équipement premium, d'excellents coachs et réservez votre séance d'essai gratuite en ligne.
          </p>
        </div>
      </section>

      {/* Explorer Tools and search */}
      <div className="max-w-7xl mx-auto px-6 lg:px-8 mt-12 grid grid-cols-1 gap-8">
        
        {/* Search bar and filters container */}
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par nom, ville ou code postal..."
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 pl-12 pr-4 outline-none focus:ring-4 focus:ring-indigo-600/10 text-xs font-bold font-medium"
            />
          </div>

          <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100 w-full md:w-auto overflow-x-auto pwa-hide-scrollbar">
            {[
              { id: 'ALL', label: 'Toutes les salles' },
              { id: 'STRENGTH', label: 'Force & Muscu' },
              { id: 'WELLNESS', label: 'Bien-être & Yoga' },
              { id: 'CROSSFIT', label: 'CrossFit WOD' },
            ].map((btn) => (
              <button 
                key={btn.id}
                onClick={() => setFilterType(btn.id)}
                className={`px-4.5 py-2 rounded-xl text-xs font-extrabold shrink-0 transition-all ${
                  filterType === btn.id 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

        </div>

        {/* Directory Listings Grid */}
        {filteredList.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredList.map((gym) => (
              <div 
                key={gym.id} 
                className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1.5 transition-all overflow-hidden flex flex-col justify-between group"
              >
                <div>
                  {/* Card Banner Image */}
                  <div className="relative h-56 bg-slate-100 overflow-hidden">
                    <img 
                      src={gym.bannerImage} 
                      alt={gym.name} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    />
                    <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md py-1.5 px-3 rounded-xl border border-white/20 flex items-center space-x-1 shadow-sm">
                      <Star size={12} className="text-amber-500 fill-amber-500" />
                      <span className="text-[10px] font-black text-slate-800">4.8</span>
                    </div>

                    <div className="absolute bottom-4 left-4 inline-flex items-center space-x-1.5 px-3 py-1 bg-indigo-600 text-white rounded-lg text-[9px] font-black uppercase tracking-wider">
                      <Dumbbell size={10} />
                      <span>{gym.plan} Club</span>
                    </div>
                  </div>

                  {/* Body information content */}
                  <div className="p-8 space-y-4">
                    <div className="space-y-1">
                      <h3 className="text-xl font-black text-slate-900 tracking-tight leading-tight group-hover:text-indigo-600 transition-colors">
                        {gym.name}
                      </h3>
                      <p className="flex items-center text-[11px] font-bold text-gray-400">
                        <MapPin size={12} className="text-indigo-500 mr-1 shrink-0" />
                        {gym.address}
                      </p>
                    </div>

                    <p className="text-xs text-gray-500 font-medium line-clamp-3 leading-relaxed">
                      {gym.description}
                    </p>

                    {/* Features list tags */}
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {gym.features.slice(0, 3).map((feat, idx) => (
                        <span key={idx} className="bg-slate-50 border border-slate-100 text-gray-500 py-1 px-2.5 rounded-lg text-[10px] uppercase font-black tracking-wider">
                          {feat}
                        </span>
                      ))}
                      {gym.features.length > 3 && (
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 py-1 px-2 rounded-lg">
                          +{gym.features.length - 3} plus
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card CTA Footer */}
                <div className="p-8 pt-0 border-t border-gray-50 bg-slate-50/20 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Formule club</p>
                    <p className="text-xs font-black text-indigo-600">{gym.pricing}</p>
                  </div>
                  <Link 
                    to={`/salle/${gym.id}`}
                    className="flex items-center space-x-1.5 bg-indigo-600 text-white font-black px-4.5 py-2.5 rounded-2xl text-xs hover:bg-indigo-700 transition-all shadow-md group-hover:shadow-indigo-100"
                  >
                    <span>S'inscrire en ligne</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 space-y-4">
            <p className="text-gray-400 text-sm font-semibold">Aucun club ne correspond à votre recherche pour le moment.</p>
            <button 
              onClick={() => { setSearch(''); setFilterType('ALL'); }}
              className="bg-indigo-50 text-indigo-600 px-5 py-2.5 rounded-xl text-xs font-black transition-all hover:bg-indigo-100"
            >
              Réinitialiser les filtres
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

export default GymsExplorerPage;
