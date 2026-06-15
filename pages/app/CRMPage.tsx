
import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, MoreHorizontal, UserPlus, Mail, Phone, 
  Target, UserCheck, Briefcase, X, Save, Calendar, 
  MapPin, Activity, Award, Star, History, Building2,
  User, ChevronRight, CheckCircle2, Clock, Trash2,
  ShieldAlert, HeartPulse, ImageIcon, Briefcase as JobIcon,
  CreditCard, ShoppingBag, CalendarCheck, Zap, Edit2
} from 'lucide-react';
import { getMembers, saveMember, deleteMember } from '../../utils/storage';
import { Member, ContactStatus } from '../../types';

interface CRMPageProps {
  tab?: string;
}

const CRMPage: React.FC<CRMPageProps> = ({ tab = 'membres' }) => {
  const [activeTab, setActiveTab] = useState(tab);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [detailTab, setDetailTab] = useState<'profil' | 'activite' | 'finance'>('profil');
  
  // State database & search
  const [contacts, setContacts] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Add form states
  const [addFirstName, setAddFirstName] = useState('');
  const [addLastName, setAddLastName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addDob, setAddDob] = useState('');
  const [addJob, setAddJob] = useState('');
  const [addAddress, setAddAddress] = useState('');
  const [addStatus, setAddStatus] = useState<ContactStatus>('PROSPECT_NEW');
  const [addNotes, setAddNotes] = useState('');
  const [trialSession, setTrialSession] = useState(false);

  // Custom partner states
  const [partnerCompany, setPartnerCompany] = useState('');
  const [partnerCategory, setPartnerCategory] = useState('Équipementier');

  useEffect(() => {
    setContacts(getMembers());
  }, []);

  useEffect(() => {
    setActiveTab(tab);
  }, [tab]);

  const openContactDetails = (contact: any) => {
    setSelectedContact({ ...contact });
    setIsDetailModalOpen(true);
    setIsEditing(false);
    setDetailTab('profil');
  };

  const handleSaveAdd = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (activeTab === 'partenaires') {
      const newPartner: Member = {
        id: `partner_${Date.now()}`,
        firstName: 'Contact',
        lastName: partnerCompany || 'Partenaire sans nom',
        email: addEmail,
        phone: addPhone || '01 02 03 04 05',
        address: addAddress,
        status: 'PARTNER',
        joinDate: new Date().toISOString().split('T')[0],
        trialSessionDone: false,
        notes: `Catégorie: ${partnerCategory}`
      };
      saveMember(newPartner);
    } else {
      const newMember: Member = {
        id: `member_${Date.now()}`,
        firstName: addFirstName,
        lastName: addLastName,
        email: addEmail,
        phone: addPhone || '06 12 34 56 78',
        address: addAddress,
        dob: addDob,
        job: addJob,
        status: activeTab === 'membres' ? 'MEMBER_ACTIVE' : addStatus,
        joinDate: new Date().toISOString().split('T')[0],
        trialSessionDone: trialSession,
        notes: addNotes
      };
      saveMember(newMember);
    }

    setIsAddModalOpen(false);
    setContacts(getMembers());
    
    // Reset forms
    setAddFirstName('');
    setAddLastName('');
    setAddEmail('');
    setAddPhone('');
    setAddDob('');
    setAddJob('');
    setAddAddress('');
    setAddStatus('PROSPECT_NEW');
    setAddNotes('');
    setPartnerCompany('');
    setTrialSession(false);
  };

  const getFilteredData = () => {
    let filtered = contacts;

    if (activeTab === 'membres') {
      filtered = contacts.filter(m => m.status === 'MEMBER_ACTIVE' || m.status === 'MEMBER_INACTIVE');
    } else if (activeTab === 'prospects') {
      filtered = contacts.filter(m => m.status === 'PROSPECT_NEW' || m.status === 'PROSPECT_FOLLOWUP' || m.status === 'PROSPECT_TRIAL');
    } else if (activeTab === 'partenaires') {
      filtered = contacts.filter(m => m.status === 'PARTNER');
    }

    if (searchTerm.trim() !== '') {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(m => 
        m.firstName.toLowerCase().includes(query) || 
        m.lastName.toLowerCase().includes(query) ||
        (m.email && m.email.toLowerCase().includes(query)) ||
        (m.phone && m.phone.toLowerCase().includes(query)) ||
        (m.notes && m.notes.toLowerCase().includes(query))
      );
    }

    return filtered;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <span className="bg-indigo-100 text-indigo-600 p-2 rounded-xl">
              {activeTab === 'prospects' ? <Target size={18} /> : activeTab === 'membres' ? <UserCheck size={18} /> : <Briefcase size={18} />}
            </span>
            <span>CRM - {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Gestion et suivi de votre base de données.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center justify-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
        >
          <UserPlus size={18} />
          <span>Ajouter un {activeTab === 'partenaires' ? 'Partenaire' : activeTab === 'prospects' ? 'Prospect' : 'Membre'}</span>
        </button>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
        <div className="px-6 border-b border-gray-100 flex items-center overflow-x-auto pwa-hide-scrollbar">
          {['Membres', 'Prospects', 'Partenaires'].map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t.toLowerCase())}
              className={`px-6 py-4 text-sm font-bold border-b-2 transition-all shrink-0 ${
                activeTab === t.toLowerCase() 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="p-6 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-grow max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Rechercher un ${activeTab.slice(0, -1)}...`}
              className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pl-12 pr-4 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-gray-400 text-xs font-bold uppercase tracking-wider border-y border-gray-100">
                <th className="px-6 py-4">{activeTab === 'partenaires' ? 'Entreprise / Contact' : 'Nom / Prénom'}</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">{activeTab === 'partenaires' ? 'Catégorie' : 'Séance d\'Essai'}</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {getFilteredData().map((member: any) => (
                <tr 
                  key={member.id} 
                  onClick={() => openContactDetails(member)}
                  className="hover:bg-indigo-50/30 cursor-pointer transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <img src={`https://picsum.photos/seed/${member.id}/40/40`} className="w-10 h-10 rounded-xl shadow-sm" alt="" />
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          {member.status === 'PARTNER' ? member.lastName : `${member.firstName} ${member.lastName}`}
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{member.email || 'Pas d\'email'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      member.status === 'MEMBER_ACTIVE' || member.status === 'PARTNER' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {member.status.replace('MEMBER_', '').replace('PROSPECT_', '')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {member.status === 'PARTNER' ? (
                       <span className="text-xs font-bold text-gray-500">{member.notes?.replace('Catégorie: ', '') || 'Autre'}</span>
                    ) : member.status.startsWith('PROSPECT') ? (
                       <div className="flex items-center space-x-2">
                         <div className={`w-2 h-2 rounded-full ${member.trialSessionDone ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                         <span className="text-xs font-bold text-gray-500">{member.trialSessionDone ? 'Effectuée' : 'S\'est inscrit'}</span>
                       </div>
                    ) : (
                      <span className="text-xs text-gray-400 font-bold">Client Actif</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"><ChevronRight size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALE AJOUT UNIFIEE */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col">
            
            <div className="p-8 bg-indigo-600 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 p-3 rounded-2xl shadow-inner">
                  <UserPlus size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black">Ajouter un {activeTab.slice(0, -1)}</h2>
                  <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mt-0.5">Enregistrement complet du profil</p>
                </div>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={24} /></button>
            </div>

            <form onSubmit={handleSaveAdd} className="flex-grow overflow-y-auto p-8 space-y-10 pwa-hide-scrollbar">
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                
                <div className="space-y-8">
                  <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center space-x-2">
                    <User size={14} /> <span>1. Informations Générales</span>
                  </h3>
                  
                  {activeTab === 'partenaires' ? (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nom de l'entreprise</label>
                        <input type="text" required value={partnerCompany} onChange={(e) => setPartnerCompany(e.target.value)} placeholder="FitSupply Ltd" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Catégorie</label>
                        <select value={partnerCategory} onChange={(e) => setPartnerCategory(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none">
                          <option value="Équipementier">Équipementier</option>
                          <option value="Nutrition">Nutrition</option>
                          <option value="Santé / Kiné">Santé / Kiné</option>
                          <option value="Autre">Autre</option>
                        </select>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Prénom</label>
                        <input type="text" required value={addFirstName} onChange={(e) => setAddFirstName(e.target.value)} placeholder="Jean" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nom</label>
                        <input type="text" required value={addLastName} onChange={(e) => setAddLastName(e.target.value)} placeholder="Dupont" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                      </div>
                    </div>
                  )}

                  {activeTab !== 'partenaires' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date de Naissance</label>
                        <input type="date" required value={addDob} onChange={(e) => setAddDob(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Métier</label>
                        <input type="text" value={addJob} onChange={(e) => setAddJob(e.target.value)} placeholder="Ingénieur, Chef..." className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center space-x-1">
                        <Mail size={10} /> <span>Email {activeTab === 'partenaires' ? 'de contact' : ''}</span>
                      </label>
                      <input type="email" required value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="contact@domaine.com" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center space-x-1">
                        <Phone size={10} /> <span>Téléphone</span>
                      </label>
                      <input type="tel" required value={addPhone} onChange={(e) => setAddPhone(e.target.value)} placeholder="06 12 34 56 78" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center space-x-1">
                      <MapPin size={10} /> <span>Adresse Postale</span>
                    </label>
                    <textarea rows={2} value={addAddress} onChange={(e) => setAddAddress(e.target.value)} placeholder="12 rue des Lilas, 75000 Paris" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10"></textarea>
                  </div>
                </div>

                <div className="space-y-8">
                  <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center space-x-2">
                    <Target size={14} /> <span>2. Qualification & Suivi</span>
                  </h3>

                  <div className="space-y-4 p-6 bg-gray-50 rounded-[2rem] border border-gray-100">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Étape de conversion</label>
                    <div className="grid grid-cols-1 gap-2">
                      {activeTab === 'membres' ? (
                        <div className="p-3 bg-green-50 rounded-xl border border-green-100 text-green-700 text-xs font-bold flex items-center space-x-2">
                          <UserCheck size={16} /> <span>Membre Actif du Club</span>
                        </div>
                      ) : activeTab === 'prospects' ? (
                        ['PROSPECT_NEW', 'PROSPECT_FOLLOWUP', 'PROSPECT_TRIAL'].map(status => (
                          <label key={status} className="flex items-center space-x-3 p-3 bg-white rounded-xl border border-transparent hover:border-indigo-200 cursor-pointer transition-all">
                            <input type="radio" name="status" value={status} checked={addStatus === status} onChange={() => setAddStatus(status as ContactStatus)} className="w-4 h-4 text-indigo-600" />
                            <span className="text-xs font-bold">
                              {status === 'PROSPECT_NEW' ? 'Nouveau Prospect' : status === 'PROSPECT_FOLLOWUP' ? 'Relancé' : 'En période d\'essai'}
                            </span>
                          </label>
                        ))
                      ) : (
                        <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-indigo-700 text-xs font-bold flex items-center space-x-2">
                          <Briefcase size={16} /> <span>Partenaire Officiel</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {activeTab !== 'partenaires' && (
                    <div className="flex items-center justify-between p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                      <div className="flex items-center space-x-3">
                        <div className="bg-white p-2 rounded-xl text-indigo-600 shadow-sm"><Activity size={20} /></div>
                        <div>
                          <p className="text-sm font-black text-indigo-900">Séance d'essai</p>
                          <p className="text-[10px] font-bold text-indigo-400 uppercase">A-t-il testé la salle ?</p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => setTrialSession(!trialSession)}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${trialSession ? 'bg-indigo-600' : 'bg-gray-300'}`}
                      >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${trialSession ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  )}

                  <div className="p-6 bg-red-50/50 rounded-3xl border border-red-100 space-y-4">
                    <div className="flex items-center space-x-2 text-red-600">
                      <ShieldAlert size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Notes & Informations complémentaires</span>
                    </div>
                    <div className="w-full">
                      <textarea rows={3} value={addNotes} onChange={(e) => setAddNotes(e.target.value)} placeholder="Commentaires ou objectifs du membre/prospect..." className="w-full bg-white border border-red-100 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-red-100"></textarea>
                    </div>
                  </div>
                </div>
              </div>
            </form>

            <div className="p-8 border-t border-gray-100 flex items-center justify-between shrink-0 bg-white">
               <button onClick={() => setIsAddModalOpen(false)} className="px-6 py-4 text-gray-400 font-bold text-sm hover:text-gray-600">Annuler</button>
               <button 
                onClick={handleSaveAdd}
                className="flex items-center space-x-2 bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
               >
                 <Save size={18} />
                 <span>Enregistrer le {activeTab.slice(0, -1)}</span>
               </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE DE DETAIL CONTACT ENRICHE (Consultation) */}
      {isDetailModalOpen && selectedContact && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col">
            
            <div className={`p-10 ${activeTab === 'membres' ? 'bg-indigo-600' : activeTab === 'prospects' ? 'bg-amber-500' : 'bg-slate-800'} text-white flex items-center justify-between shrink-0 relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
              <div className="flex items-center space-x-8 relative z-10">
                <img src={`https://picsum.photos/seed/${selectedContact.id}/150/150`} className="w-24 h-24 rounded-[2rem] border-4 border-white/20 shadow-xl" alt="" />
                <div>
                  <h2 className="text-3xl font-black">{activeTab === 'partenaires' ? selectedContact.company : `${selectedContact.firstName} ${selectedContact.lastName}`}</h2>
                  <div className="flex items-center space-x-3 mt-2">
                    <span className="bg-white/20 px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest">
                      {activeTab === 'prospects' ? 'Prospect chaud' : activeTab === 'membres' ? (selectedContact.subscription || 'Membre Actif') : selectedContact.category}
                    </span>
                    {activeTab === 'membres' && <span className="flex items-center text-[10px] font-bold"><Zap size={10} className="mr-1" /> Score engagement : 92%</span>}
                  </div>
                </div>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors relative z-10"><X size={28} /></button>
            </div>

            {/* Onglets de navigation interne à la fiche client */}
            {activeTab === 'membres' && (
              <div className="px-10 border-b border-gray-100 flex items-center bg-gray-50/50">
                <button onClick={() => setDetailTab('profil')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-4 transition-all ${detailTab === 'profil' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}>Profil</button>
                <button onClick={() => setDetailTab('activite')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-4 transition-all ${detailTab === 'activite' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}>Visites & Cours</button>
                <button onClick={() => setDetailTab('finance')} className={`px-6 py-4 text-xs font-black uppercase tracking-widest border-b-4 transition-all ${detailTab === 'finance' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}>Abonnement & Achats</button>
              </div>
            )}

            <div className="flex-grow overflow-y-auto p-10 space-y-12 pwa-hide-scrollbar">
              
              {/* VUE PROFIL (Commune à tous) */}
              {detailTab === 'profil' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center space-x-2">
                      <User size={14} /> <span>Informations de contact</span>
                    </h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                        <span className="text-xs font-bold text-gray-400">Email</span>
                        <span className="text-sm font-black text-gray-900">{selectedContact.email}</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                        <span className="text-xs font-bold text-gray-400">Téléphone</span>
                        <span className="text-sm font-black text-gray-900">{selectedContact.phone || '06 12 34 56 78'}</span>
                      </div>
                      <div className="flex flex-col p-4 bg-gray-50 rounded-2xl space-y-2">
                        <span className="text-xs font-bold text-gray-400">Adresse postale</span>
                        <span className="text-sm font-black text-gray-900 leading-relaxed">{selectedContact.address || '12 Rue de la Paix, 75000 Paris'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center space-x-2">
                      <ShieldAlert size={14} /> <span>Qualification & Divers</span>
                    </h3>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                        <span className="text-xs font-bold text-gray-400">Profession</span>
                        <span className="text-sm font-black text-gray-900">Architecte Logiciel</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                        <span className="text-xs font-bold text-gray-400">Date de naissance</span>
                        <span className="text-sm font-black text-gray-900">12 Mai 1988</span>
                      </div>
                      <div className="p-4 bg-red-50/50 rounded-2xl border border-red-100 flex items-center justify-between">
                        <span className="text-xs font-black text-red-600">Urgence : Julie Pesquet</span>
                        <span className="text-sm font-black text-red-900">06 52 41 87 96</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* VUE ACTIVITE (Spécifique Client) */}
              {detailTab === 'activite' && (
                <div className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Visites ce mois</p>
                      <p className="text-3xl font-black text-indigo-900 mt-1">14</p>
                    </div>
                    <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Temps moyen</p>
                      <p className="text-3xl font-black text-indigo-900 mt-1">72 min</p>
                    </div>
                    <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Cours favori</p>
                      <p className="text-lg font-black text-indigo-900 mt-2 uppercase">CrossFit WOD</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center space-x-2">
                      <CalendarCheck size={14} /> <span>Dernières visites & Réservations</span>
                    </h3>
                    <div className="divide-y divide-gray-100 border border-gray-100 rounded-[2rem] overflow-hidden bg-white">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className="p-5 flex items-center justify-between hover:bg-gray-50">
                          <div className="flex items-center space-x-4">
                            <div className="bg-gray-100 p-2.5 rounded-xl"><Activity size={18} className="text-gray-400" /></div>
                            <div>
                              <p className="text-sm font-black text-gray-900">{i % 2 === 0 ? 'CrossFit WOD' : 'Accès Libre Plateau'}</p>
                              <p className="text-[10px] font-bold text-gray-400">Coach: David Strong • Mardi 12 Mars, 18:00</p>
                            </div>
                          </div>
                          <span className="text-[10px] font-black px-3 py-1 bg-green-100 text-green-700 rounded-lg">EFFECTUÉ</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* VUE FINANCE (Spécifique Client) */}
              {detailTab === 'finance' && (activeTab === 'membres') && (
                <div className="space-y-12">
                  <div className="p-8 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2.5rem] text-white flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl shadow-indigo-100">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Abonnement Actuel</p>
                      <h4 className="text-2xl font-black">Plan Premium (Engagement 12 mois)</h4>
                      <p className="text-sm opacity-90">Prochain prélèvement : 01 Avril 2024</p>
                    </div>
                    <div className="text-right">
                      <p className="text-4xl font-black">49.90 €</p>
                      <p className="text-[10px] font-black opacity-80 uppercase mt-1">Status : ACTIF</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center space-x-2">
                      <ShoppingBag size={14} /> <span>Historique des achats Boutique</span>
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[
                        { item: 'Protéine Whey 1kg', price: '34.90', date: '05 Mars 2024' },
                        { item: 'Shaker NoResa', price: '9.90', date: '12 Fév. 2024' }
                      ].map((buy, idx) => (
                        <div key={idx} className="p-5 border border-gray-100 rounded-3xl flex items-center justify-between hover:bg-gray-50 transition-all">
                           <div className="flex items-center space-x-3">
                             <div className="bg-gray-100 p-2 rounded-xl text-gray-400"><ShoppingBag size={16} /></div>
                             <div>
                               <p className="text-xs font-black text-gray-900">{buy.item}</p>
                               <p className="text-[10px] font-bold text-gray-400">{buy.date}</p>
                             </div>
                           </div>
                           <p className="text-sm font-black text-indigo-600">{buy.price} €</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer de la modale */}
            <div className="p-10 border-t border-gray-100 flex items-center justify-between shrink-0 bg-white">
               <button 
                 onClick={() => {
                   deleteMember(selectedContact.id);
                   setContacts(getMembers());
                   setIsDetailModalOpen(false);
                 }}
                 className="text-xs font-bold text-red-500 hover:underline"
               >
                 Supprimer le contact
               </button>
               <div className="flex space-x-4">
                 <button onClick={() => setIsDetailModalOpen(false)} className="px-8 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl text-sm transition-all hover:bg-gray-200">Fermer</button>
                 <button className="flex items-center space-x-2 bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">
                   <Edit2 size={18} />
                   <span>Modifier la fiche</span>
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMPage;
