
import React, { useState, useEffect } from 'react';
import { Save, Bell, Shield, MapPin, Clock, Globe, User, ShieldCheck, Camera, ExternalLink, Sparkles, Plus, Trash2, Check, Phone, Mail } from 'lucide-react';
import { getGyms, updateGym, ExtendedGym } from '../../utils/storage';

interface SettingsPageProps {
  section?: string;
}

const COVER_PRESETS = [
  {
    name: 'Musculation Hardcore',
    url: 'https://images.unsplash.com/photo-1540575314341-12136757d56a?auto=format&fit=crop&q=80&w=1200'
  },
  {
    name: 'Yoga & Pilates Zen',
    url: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=1200'
  },
  {
    name: 'CrossFit Intense',
    url: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=1200'
  },
  {
    name: 'Cardio Moderne Lumineux',
    url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=1200'
  },
  {
    name: 'Espace Boxe & Ring',
    url: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=1200'
  }
];

const SettingsPage: React.FC<SettingsPageProps> = ({ section = 'salle' }) => {
  const [activeSection, setActiveSection] = useState(section);
  const [gyms, setGyms] = useState<ExtendedGym[]>([]);
  const [selectedGym, setSelectedGym] = useState<ExtendedGym | null>(null);

  // Form Fields State
  const [gymName, setGymName] = useState('');
  const [gymAddress, setGymAddress] = useState('');
  const [gymDescription, setGymDescription] = useState('');
  const [gymPhone, setGymPhone] = useState('');
  const [gymEmail, setGymEmail] = useState('');
  const [gymPricing, setGymPricing] = useState('');
  const [gymBanner, setGymBanner] = useState('');
  
  // Hours and Features Lists State
  const [gymHours, setGymHours] = useState<{ [key: string]: string }>({});
  const [gymFeatures, setGymFeatures] = useState<string[]>([]);
  const [newFeatureText, setNewFeatureText] = useState('');

  // Notifications or saving status
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved'>('idle');

  useEffect(() => {
    setActiveSection(section);
  }, [section]);

  useEffect(() => {
    const list = getGyms();
    setGyms(list);
    if (list.length > 0) {
      loadGymData(list[0]);
    }
  }, []);

  const loadGymData = (gym: ExtendedGym) => {
    setSelectedGym(gym);
    setGymName(gym.name);
    setGymAddress(gym.address);
    setGymDescription(gym.description || '');
    setGymPhone(gym.phone || '');
    setGymEmail(gym.email || '');
    setGymPricing(gym.pricing || '');
    setGymBanner(gym.bannerImage || '');
    setGymHours(gym.hours || {});
    setGymFeatures(gym.features || []);
  };

  const handleGymSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const gym = gyms.find(g => g.id === e.target.value);
    if (gym) {
      loadGymData(gym);
    }
  };

  const handleHourChange = (day: string, value: string) => {
    setGymHours(prev => ({
      ...prev,
      [day]: value
    }));
  };

  const handleAddFeature = () => {
    if (newFeatureText.trim() !== '') {
      setGymFeatures(prev => [...prev, newFeatureText.trim()]);
      setNewFeatureText('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    setGymFeatures(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (!selectedGym) return;

    const updated: ExtendedGym = {
      ...selectedGym,
      name: gymName,
      address: gymAddress,
      description: gymDescription,
      phone: gymPhone,
      email: gymEmail,
      pricing: gymPricing,
      bannerImage: gymBanner,
      hours: gymHours,
      features: gymFeatures
    };

    updateGym(updated);
    
    // Refresh gyms list
    const refreshedList = getGyms();
    setGyms(refreshedList);
    const updatedSelected = refreshedList.find(g => g.id === selectedGym.id) || updated;
    setSelectedGym(updatedSelected);

    // Show success banner
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Configuration</h1>
          <p className="text-xs text-gray-500 font-bold">Personnalisez votre établissement, paramétrez vos services et éditez en direct votre site vitrine public.</p>
        </div>
        <div className="flex items-center space-x-3">
          {selectedGym && (
            <a 
              href={`#/salle/${selectedGym.id}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-3 rounded-2xl font-bold text-xs border border-slate-200 transition-all"
            >
              <span>Voir ma page publique</span>
              <ExternalLink size={14} />
            </a>
          )}
          <button 
            onClick={handleSave}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
          >
            <Save size={16} />
            <span>Sauvegarder</span>
          </button>
        </div>
      </div>

      {saveStatus === 'saved' && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center space-x-3 animate-bounce">
          <div className="p-1 bg-green-500 text-white rounded-lg">
            <Check size={14} strokeWidth={3} />
          </div>
          <div>
            <p className="text-xs font-black text-green-800">Modifications enregistrées avec succès !</p>
            <p className="text-[10px] text-green-600 font-semibold font-bold">Votre site vitrine public pour "{gymName}" est à jour.</p>
          </div>
        </div>
      )}

      {/* Tabs navigation */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit">
        <button 
          onClick={() => setActiveSection('salle')}
          className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeSection === 'salle' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-750'}`}
        >
          <Globe size={16} />
          <span>Éditeur du Site Vitrine</span>
        </button>
        <button 
          onClick={() => setActiveSection('compte')}
          className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeSection === 'compte' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-750'}`}
        >
          <User size={16} />
          <span>Mon Compte Administrateur</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {activeSection === 'salle' ? (
          <>
            {/* Gym Selector & Base Info Card */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-50 pb-5 gap-3">
                <div className="flex items-center space-x-3">
                  <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600"><Globe size={20} /></div>
                  <div>
                    <h3 className="text-lg font-black text-gray-900 tracking-tight">Choix de la salle à administrer</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Multi-établissements NoResa</p>
                  </div>
                </div>
                <div>
                  <select 
                    value={selectedGym?.id || ''}
                    onChange={handleGymSelect}
                    className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-black text-gray-700 outline-none"
                  >
                    {gyms.map(g => (
                      <option key={g.id} value={g.id}>{g.name} ({g.plan})</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Section: Identité de la marque */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nom commercial de l'enseigne</label>
                  <input 
                    type="text" 
                    value={gymName}
                    onChange={(e) => setGymName(e.target.value)}
                    placeholder="Ex: Fitness Club Paris"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tarification d'appel affichée</label>
                  <input 
                    type="text" 
                    value={gymPricing}
                    onChange={(e) => setGymPricing(e.target.value)}
                    placeholder="Ex: à partir de 29.99 € / mois"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Slogan / Description d'accroche pour les prospects</label>
                <textarea 
                  rows={4} 
                  value={gymDescription}
                  onChange={(e) => setGymDescription(e.target.value)}
                  placeholder="Présentez l'esprit de votre salle, le type d'équipement, et l'ambiance unique..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                ></textarea>
              </div>

              {/* Contact de la salle */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center space-x-1">
                    <MapPin size={10} /> <span>Adresse Postale</span>
                  </label>
                  <input 
                    type="text" 
                    value={gymAddress}
                    onChange={(e) => setGymAddress(e.target.value)}
                    placeholder="12 rue de Rivoli, Paris"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center space-x-1">
                    <Phone size={10} /> <span>Téléphone direct</span>
                  </label>
                  <input 
                    type="tel" 
                    value={gymPhone}
                    onChange={(e) => setGymPhone(e.target.value)}
                    placeholder="01 02 03 04 05"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center space-x-1">
                    <Mail size={10} /> <span>E-mail contact</span>
                  </label>
                  <input 
                    type="email" 
                    value={gymEmail}
                    onChange={(e) => setGymEmail(e.target.value)}
                    placeholder="contact@salle.com"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold outline-none" 
                  />
                </div>
              </div>
            </div>

            {/* Banner Cover Customization */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center space-x-3 mb-2">
                <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600"><Camera size={20} /></div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">Bannière de couverture</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Sélectionnez ou liez l'image de fond principale du site</p>
                </div>
              </div>

              {/* Live Preview of cover */}
              <div className="relative h-44 rounded-2xl overflow-hidden border border-slate-150 bg-slate-900 flex items-center justify-center">
                {gymBanner ? (
                  <img src={gymBanner} alt="Preview banner" className="w-full h-full object-cover opacity-60" />
                ) : (
                  <div className="text-slate-400 text-xs font-bold font-mono">Aucune couverture sélectionnée</div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/70 py-3 px-4 flex justify-between items-center text-white">
                  <p className="text-xs font-extrabold">{gymName}</p>
                  <span className="text-[9px] uppercase font-black bg-indigo-600/80 px-2 py-0.5 rounded-md">Aperçu direct</span>
                </div>
              </div>

              {/* Input for manual URL */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Adresse URL personnalisée de la photo de couverture</label>
                <input 
                  type="text" 
                  value={gymBanner}
                  onChange={(e) => setGymBanner(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold outline-none" 
                />
              </div>

              {/* Curated Presets */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Presets d'images de sport professionnelles</h4>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3.5">
                  {COVER_PRESETS.map((preset, idx) => {
                    const isSelected = gymBanner === preset.url;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setGymBanner(preset.url)}
                        className={`group relative h-20 rounded-xl overflow-hidden border-2 text-left transition-all ${
                          isSelected ? 'border-indigo-600 ring-4 ring-indigo-600/10' : 'border-transparent hover:border-slate-300'
                        }`}
                      >
                        <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors"></div>
                        <div className="absolute bottom-1 right-1 bg-black/60 text-white rounded p-0.5 text-[7px] font-bold">
                          {preset.name.split(' ')[0]}
                        </div>
                        {isSelected && (
                          <div className="absolute top-1 left-1 bg-indigo-600 text-white p-0.5 rounded-full">
                            <Check size={8} strokeWidth={4} />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Prestations/Services List Card */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center space-x-3 mb-2">
                <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600"><Sparkles size={20} /></div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">Prestations & Matériel</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Configurez la liste des services phares affichés sur votre vitrine</p>
                </div>
              </div>

              {/* List of current features */}
              <div className="space-y-2">
                {gymFeatures.map((feat, index) => (
                  <div key={index} className="flex items-center justify-between p-3.5 bg-slate-50/55 hover:bg-slate-50 border border-slate-100/50 rounded-2xl transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="bg-green-100 text-green-700 rounded-lg p-1.5">
                        <Check size={12} strokeWidth={3} />
                      </div>
                      <span className="text-xs font-bold text-gray-750">{feat}</span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleRemoveFeature(index)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* Box to add features */}
              <div className="flex gap-3">
                <input 
                  type="text" 
                  value={newFeatureText}
                  onChange={(e) => setNewFeatureText(e.target.value)}
                  placeholder="Ex: Espace Saunas & Hammam privatifs, Coachs diplômés d'État..."
                  className="flex-grow bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
                />
                <button 
                  type="button"
                  onClick={handleAddFeature}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black px-5 py-3 rounded-xl text-xs flex items-center space-x-1.5 shrink-0 shadow-md transition-all"
                >
                  <Plus size={14} />
                  <span>Ajouter</span>
                </button>
              </div>
            </div>

            {/* Hours Customization Grid */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center space-x-3 mb-2">
                <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600"><Clock size={20} /></div>
                <div>
                  <h3 className="text-lg font-black text-gray-900 tracking-tight">Horaires de la salle</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Configurez la grille d'ouverture hebdomadaire de votre club</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {Object.entries(gymHours).map(([day, hr]) => (
                   <div key={day} className="flex items-center justify-between p-4 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-colors">
                      <span className="text-xs font-black text-gray-700 capitalize">{day}</span>
                      <input 
                        type="text" 
                        value={hr} 
                        onChange={(e) => handleHourChange(day, e.target.value)}
                        className="bg-white border border-slate-150 rounded-xl px-3 py-1.5 text-xs font-black text-indigo-600 text-right focus:ring-4 focus:ring-indigo-500/10 w-36 outline-none" 
                      />
                   </div>
                 ))}
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col items-center text-center space-y-4 mb-8">
               <img src="https://picsum.photos/seed/admin/120/120" className="w-24 h-24 rounded-3xl border-4 border-white shadow-xl" alt="" />
               <div>
                  <h3 className="text-xl font-bold text-gray-900">Admin NoResa</h3>
                  <p className="text-xs font-bold text-indigo-600">Super Administrateur de l'écosystème commercial</p>
               </div>
            </div>
            <div className="space-y-4">
               <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Email personnel</label>
                  <input type="email" defaultValue="admin@noresa.io" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20" disabled />
               </div>
            </div>
            <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
               <div className="flex items-center space-x-2">
                  <ShieldCheck size={18} className="text-green-500" />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Double authentification activée</span>
               </div>
               <span className="text-xs font-bold text-gray-400">Géré par l'infrastructure SaaS</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;

