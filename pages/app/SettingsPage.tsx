
import React, { useState, useEffect } from 'react';
import { Save, Bell, Shield, MapPin, Clock, Globe, User, ShieldCheck, Camera, ExternalLink, Sparkles, Plus, Trash2, Check, Phone, Mail, Layers, HelpCircle, Smartphone } from 'lucide-react';
import { getGyms, updateGym, ExtendedGym } from '../../utils/storage';
import { getOpeningHours, saveOpeningHours, defaultOpeningHours, dayLabel, DayHours } from '../../lib/messagesApi';
import { getGymInfo, saveGymInfo } from '../../lib/gymApi';
import GroupsSettingsPage from './GroupsSettingsPage';
import FaqSettingsPage from './FaqSettingsPage';
import AppIdentitySection from './AppIdentitySection';

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
  const [gymCity, setGymCity] = useState('');
  const [gymPostalCode, setGymPostalCode] = useState('');
  const [gymDescription, setGymDescription] = useState('');
  const [gymPhone, setGymPhone] = useState('');
  const [gymEmail, setGymEmail] = useState('');
  const [gymPricing, setGymPricing] = useState('');
  const [gymBanner, setGymBanner] = useState('');
  const [infoBusy, setInfoBusy] = useState(false);
  
  // Hours and Features Lists State
  const [gymHours, setGymHours] = useState<{ [key: string]: string }>({});
  // Horaires d'ouverture — vraie source : colonne gyms.opening_hours (et non le stockage local).
  const [hours, setHours] = useState<DayHours[]>(defaultOpeningHours());
  const [hoursBusy, setHoursBusy] = useState(false);
  const [hoursSaved, setHoursSaved] = useState(false);
  useEffect(() => { getOpeningHours().then(setHours).catch(() => {}); }, []);
  const patchDay = (day: number, patch: Partial<DayHours>) =>
    setHours((prev) => prev.map((h) => (h.day === day ? { ...h, ...patch } : h)));
  const saveHours = async () => {
    setHoursBusy(true);
    try { await saveOpeningHours(hours); setHoursSaved(true); setTimeout(() => setHoursSaved(false), 3000); }
    catch { alert("Enregistrement des horaires impossible."); }
    finally { setHoursBusy(false); }
  };
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

  // La liste locale ne sert plus qu'au sélecteur / lien d'aperçu : les champs du
  // formulaire viennent de la base (table gyms) via getGymInfo ci-dessous.
  const loadGymData = (gym: ExtendedGym) => setSelectedGym(gym);

  // Source de vérité : la table gyms.
  useEffect(() => {
    getGymInfo().then((info) => {
      if (!info) return;
      setGymName(info.name);
      setGymAddress(info.address);
      setGymCity(info.city);
      setGymPostalCode(info.postalCode);
      setGymDescription(info.description);
      setGymPhone(info.phone);
      setGymEmail(info.email);
      setGymPricing(info.pricing);
      setGymBanner(info.bannerImage);
      setGymFeatures(info.features);
    }).catch(() => {});
  }, []);

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

  const handleSave = async () => {
    setInfoBusy(true);
    try {
      await saveGymInfo({
        name: gymName,
        address: gymAddress,
        city: gymCity,
        postalCode: gymPostalCode,
        phone: gymPhone,
        email: gymEmail,
        description: gymDescription,
        pricing: gymPricing,
        bannerImage: gymBanner,
        features: gymFeatures,
      });
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      alert("Enregistrement impossible.");
    } finally {
      setInfoBusy(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">{activeSection === 'groupes' ? 'Groupes' : activeSection === 'faq' ? 'Aide rapide (FAQ)' : activeSection === 'app' ? 'App adhérent' : activeSection === 'compte' ? 'Mon compte' : 'Configuration'}</h1>
          <p className="text-sm text-gray-500">{activeSection === 'groupes' ? 'Organisez vos pratiquants en groupes et sous-groupes.' : activeSection === 'faq' ? 'Les questions/réponses affichées aux adhérents dans la messagerie.' : activeSection === 'app' ? "Nom, couleur et logo de l'application adhérent." : 'Personnalisez votre établissement et votre site vitrine public.'}</p>
        </div>
        {activeSection === 'salle' && (
          <div className="flex items-center space-x-3">
            {selectedGym && (
              <a
                href={`#/salle/${selectedGym.id}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-medium text-xs border border-slate-200 transition-all"
              >
                <span>Voir ma page publique</span>
                <ExternalLink size={14} />
              </a>
            )}
            <button
              onClick={handleSave}
              disabled={infoBusy}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2.5 rounded-xl font-semibold text-xs hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              <Save size={16} />
              <span>{infoBusy ? 'Enregistrement…' : 'Sauvegarder'}</span>
            </button>
          </div>
        )}
      </div>

      {saveStatus === 'saved' && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-2xl flex items-center space-x-3 animate-bounce">
          <div className="p-1 bg-green-500 text-white rounded-lg">
            <Check size={14} strokeWidth={3} />
          </div>
          <div>
            <p className="text-xs font-semibold text-green-800">Modifications enregistrées avec succès !</p>
            <p className="text-[10px] text-green-600 font-semibold font-bold">Votre site vitrine public pour "{gymName}" est à jour.</p>
          </div>
        </div>
      )}

      {/* Tabs navigation */}
      <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit">
        <button 
          onClick={() => setActiveSection('salle')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeSection === 'salle' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-750'}`}
        >
          <Globe size={16} />
          <span>Éditeur du Site Vitrine</span>
        </button>
        <button 
          onClick={() => setActiveSection('compte')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeSection === 'compte' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-750'}`}
        >
          <User size={16} />
          <span>Mon Compte Administrateur</span>
        </button>
        <button
          onClick={() => setActiveSection('groupes')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeSection === 'groupes' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-750'}`}
        >
          <Layers size={16} />
          <span>Groupes</span>
        </button>
        <button
          onClick={() => setActiveSection('faq')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeSection === 'faq' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-750'}`}
        >
          <HelpCircle size={16} />
          <span>FAQ</span>
        </button>
        <button
          onClick={() => setActiveSection('app')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all ${activeSection === 'app' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-750'}`}
        >
          <Smartphone size={16} />
          <span>App adhérent</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {activeSection === 'groupes' ? (
          <GroupsSettingsPage embedded />
        ) : activeSection === 'faq' ? (
          <FaqSettingsPage embedded />
        ) : activeSection === 'app' ? (
          <AppIdentitySection />
        ) : activeSection === 'salle' ? (
          <>
            {/* Gym Selector & Base Info Card */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-50 pb-5 gap-3">
                <div className="flex items-center space-x-3">
                  <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600"><Globe size={20} /></div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Choix de la salle à administrer</h3>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Multi-établissements NoResa</p>
                  </div>
                </div>
                <div>
                  <select 
                    value={selectedGym?.id || ''}
                    onChange={handleGymSelect}
                    className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-xs font-semibold text-gray-700 outline-none"
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
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Nom commercial de l'enseigne</label>
                  <input 
                    type="text" 
                    value={gymName}
                    onChange={(e) => setGymName(e.target.value)}
                    placeholder="Ex: Fitness Club Paris"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Tarification d'appel affichée</label>
                  <input 
                    type="text" 
                    value={gymPricing}
                    onChange={(e) => setGymPricing(e.target.value)}
                    placeholder="Ex: à partir de 29.99 € / mois"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Slogan / Description d'accroche pour les prospects</label>
                <textarea 
                  rows={4} 
                  value={gymDescription}
                  onChange={(e) => setGymDescription(e.target.value)}
                  placeholder="Présentez l'esprit de votre salle, le type d'équipement, et l'ambiance unique..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all font-medium"
                ></textarea>
              </div>

              {/* Contact de la salle */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center space-x-1">
                    <MapPin size={10} /> <span>Adresse Postale</span>
                  </label>
                  <input 
                    type="text" 
                    value={gymAddress}
                    onChange={(e) => setGymAddress(e.target.value)}
                    placeholder="3 route de Mazères"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 text-xs font-bold outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center space-x-1">
                    <MapPin size={10} /> <span>Code postal</span>
                  </label>
                  <input
                    type="text"
                    value={gymPostalCode}
                    onChange={(e) => setGymPostalCode(e.target.value)}
                    placeholder="11400"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 text-xs font-bold outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center space-x-1">
                    <MapPin size={10} /> <span>Ville</span>
                  </label>
                  <input
                    type="text"
                    value={gymCity}
                    onChange={(e) => setGymCity(e.target.value)}
                    placeholder="Villeneuve la Comptal"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 text-xs font-bold outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center space-x-1">
                    <Phone size={10} /> <span>Téléphone direct</span>
                  </label>
                  <input 
                    type="tel" 
                    value={gymPhone}
                    onChange={(e) => setGymPhone(e.target.value)}
                    placeholder="01 02 03 04 05"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 text-xs font-bold outline-none" 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center space-x-1">
                    <Mail size={10} /> <span>E-mail contact</span>
                  </label>
                  <input 
                    type="email" 
                    value={gymEmail}
                    onChange={(e) => setGymEmail(e.target.value)}
                    placeholder="contact@salle.com"
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 text-xs font-bold outline-none" 
                  />
                </div>
              </div>
            </div>

            {/* Banner Cover Customization */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center space-x-3 mb-2">
                <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600"><Camera size={20} /></div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Bannière de couverture</h3>
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
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/70 py-2.5 px-4 flex justify-between items-center text-white">
                  <p className="text-xs font-semibold">{gymName}</p>
                  <span className="text-[9px] uppercase font-semibold bg-indigo-600/80 px-2 py-0.5 rounded-md">Aperçu direct</span>
                </div>
              </div>

              {/* Input for manual URL */}
              <div className="space-y-2">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Adresse URL personnalisée de la photo de couverture</label>
                <input 
                  type="text" 
                  value={gymBanner}
                  onChange={(e) => setGymBanner(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 text-xs font-bold outline-none" 
                />
              </div>

              {/* Curated Presets */}
              <div className="space-y-3">
                <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Presets d'images de sport professionnelles</h4>
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
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center space-x-3 mb-2">
                <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600"><Sparkles size={20} /></div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Prestations & Matériel</h3>
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
                  className="flex-grow bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddFeature())}
                />
                <button 
                  type="button"
                  onClick={handleAddFeature}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-5 py-2.5 rounded-xl text-xs flex items-center space-x-1.5 shrink-0 shadow-md transition-all"
                >
                  <Plus size={14} />
                  <span>Ajouter</span>
                </button>
              </div>
            </div>

            {/* Hours Customization Grid */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center space-x-3 mb-2">
                <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600"><Clock size={20} /></div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Horaires de la salle</h3>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Configurez la grille d'ouverture hebdomadaire de votre club</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                  const h = hours.find((x) => x.day === d) ?? { day: d, closed: true, open: '09:00', close: '20:00' };
                  return (
                    <div key={d} className="flex items-center gap-3 p-4 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-colors">
                      <span className="text-xs font-semibold text-gray-700 w-20 shrink-0">{dayLabel(d)}</span>
                      <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={!h.closed}
                          onChange={(e) => patchDay(d, { closed: !e.target.checked })}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600"
                        />
                        <span className="text-[11px] font-semibold text-gray-500">Ouvert</span>
                      </label>
                      <div className="flex items-center gap-1.5 ml-auto">
                        <input
                          type="time" value={h.open} disabled={h.closed}
                          onChange={(e) => patchDay(d, { open: e.target.value })}
                          className="bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold text-indigo-600 outline-none disabled:opacity-40 focus:ring-4 focus:ring-indigo-500/10"
                        />
                        <span className="text-xs text-gray-400">–</span>
                        <input
                          type="time" value={h.close} disabled={h.closed}
                          onChange={(e) => patchDay(d, { close: e.target.value })}
                          className="bg-white border border-slate-200 rounded-xl px-2 py-1.5 text-xs font-semibold text-indigo-600 outline-none disabled:opacity-40 focus:ring-4 focus:ring-indigo-500/10"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={saveHours} disabled={hoursBusy}
                  className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold text-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {hoursBusy ? 'Enregistrement…' : 'Enregistrer les horaires'}
                </button>
                {hoursSaved && <span className="text-sm font-semibold text-green-600 flex items-center gap-1"><Check size={16} /> Horaires enregistrés</span>}
                <p className="text-[11px] text-gray-400 ml-auto hidden sm:block">Visibles par les adhérents dans l'app (onglet Infos).</p>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col items-center text-center space-y-4 mb-8">
               <img src="https://picsum.photos/seed/admin/120/120" className="w-24 h-24 rounded-2xl border-4 border-white shadow-sm" alt="" />
               <div>
                  <h3 className="text-xl font-bold text-gray-900">Admin NoResa</h3>
                  <p className="text-xs font-bold text-indigo-600">Super Administrateur de l'écosystème commercial</p>
               </div>
            </div>
            <div className="space-y-4">
               <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Email personnel</label>
                  <input type="email" defaultValue="admin@noresa.io" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm font-medium outline-none focus:ring-2 focus:ring-indigo-500/20" disabled />
               </div>
            </div>
            <div className="pt-6 border-t border-gray-50 flex items-center justify-between">
               <div className="flex items-center space-x-2">
                  <ShieldCheck size={18} className="text-green-500" />
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">Double authentification activée</span>
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

