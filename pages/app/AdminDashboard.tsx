import React, { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { 
  Users, CreditCard, Calendar, TrendingUp, ArrowUpRight, 
  ArrowDownRight, Activity, UserPlus, X, Save, ShieldAlert, 
  MapPin, Phone, Mail, Briefcase, HeartPulse, Target,
  Image as ImageIcon, CheckCircle2, UserCheck, Camera, AlertTriangle, Clock
} from 'lucide-react';
import { MOCK_REVENUE_DATA } from '../../constants.tsx';
import { createMember, patchMember, getGymId, uploadMemberPhoto, getDashboardStats, DashboardStats, getExpiringSubscriptions, ExpiringMember } from '../../lib/membersApi';
import { getProducts } from '../../lib/boutiqueApi';
import { startMandateSetup, getGocardlessStats, GocardlessStats } from '../../lib/gocardless';
import { Product } from '../../types';

const AdminDashboard: React.FC = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Champs du formulaire d'inscription
  const [addFirstName, setAddFirstName] = useState('');
  const [addLastName, setAddLastName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addDob, setAddDob] = useState('');
  const [addJob, setAddJob] = useState('');
  const [addAddress, setAddAddress] = useState('');
  const [addCity, setAddCity] = useState('');
  const [addPostalCode, setAddPostalCode] = useState('');
  const [addNotes, setAddNotes] = useState('');

  // Formule, photo, mandat
  const [addFormula, setAddFormula] = useState('');
  const [addPrice, setAddPrice] = useState('');
  const [addPeriodicity, setAddPeriodicity] = useState('Mensuel');
  const [formulaOptions, setFormulaOptions] = useState<Product[]>([]);
  const [addPhotoFile, setAddPhotoFile] = useState<File | null>(null);
  const [addPhotoPreview, setAddPhotoPreview] = useState<string | null>(null);
  const [useMandate, setUseMandate] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [mandateResult, setMandateResult] = useState<{ authorisation_url: string; member_number?: string } | null>(null);
  // Paiement hors GoCardless : mode, début, durée, fin
  const todayStr = new Date().toISOString().split('T')[0];
  const [addPaymentMethod, setAddPaymentMethod] = useState('Espèces');
  const [addStartDate, setAddStartDate] = useState(todayStr);
  const [addDuration, setAddDuration] = useState('1 mois');
  const [addEndDate, setAddEndDate] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().split('T')[0]; });
  const addPhotoInputRef = useRef<HTMLInputElement>(null);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [gc, setGc] = useState<GocardlessStats | null>(null);
  const [expiring, setExpiring] = useState<ExpiringMember[]>([]);
  useEffect(() => {
    getDashboardStats().then(setStats).catch(() => {});
    getGocardlessStats().then(setGc).catch(() => {});
    getExpiringSubscriptions(30).then(setExpiring).catch(() => {});
  }, []);

  const fmtEUR = (n: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

  const cards = stats ? [
    { label: 'Membres actifs', value: String(stats.active_members), sub: `${stats.total_members} au total`, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { label: 'Mandats actifs', value: gc ? String(gc.mandates_active) : '…', sub: 'Mandats actifs · GoCardless', icon: UserCheck, color: 'text-indigo-600', bg: 'bg-indigo-100' },
    { label: 'Encaissé confirmé (30 j)', value: gc ? fmtEUR(gc.collected_30d) : '…', sub: 'Paiements confirmés · GoCardless', icon: CreditCard, color: 'text-green-600', bg: 'bg-green-100' },
    { label: 'Revenu récurrent (app)', value: fmtEUR(stats.mrr), sub: `${stats.mandates_active} mandats rattachés à une fiche`, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-100' },
  ] : [];

  const monthFr = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { month: 'short' });
  const revenueData = (gc?.revenue_series ?? stats?.revenue_series ?? []).map((r) => ({ name: monthFr(r.month), revenue: Number(r.revenue) }));
  const statusFr: Record<string, string> = {
    paid_out: 'Versé', confirmed: 'Confirmé', submitted: 'Soumis', pending_submission: 'En attente',
    failed: 'Échec', cancelled: 'Annulé', charged_back: 'Rejeté', customer_approval_denied: 'Refusé',
  };

  // Formules d'abonnement proposées (depuis la Boutique)
  useEffect(() => {
    getProducts()
      .then(ps => setFormulaOptions(ps.filter(p => p.category === 'Abonnements & Séances')))
      .catch(() => {});
  }, []);

  const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAddPhotoFile(file);
    setAddPhotoPreview(URL.createObjectURL(file));
  };

  const selectFormula = (name: string) => {
    setAddFormula(name);
    const p = formulaOptions.find(o => o.name === name);
    if (p) setAddPrice(String(p.price));
  };

  const monthsForDuration = (d: string) => d === '3 mois' ? 3 : d === '6 mois' ? 6 : d === '12 mois' ? 12 : d === 'Ponctuel' ? 0 : 1;
  const computeEnd = (start: string, duration: string) => {
    if (!start) return '';
    const dt = new Date(start + 'T00:00:00');
    const m = monthsForDuration(duration);
    if (m === 0) return start;
    dt.setMonth(dt.getMonth() + m);
    return dt.toISOString().split('T')[0];
  };
  const onStartChange = (v: string) => { setAddStartDate(v); setAddEndDate(computeEnd(v, addDuration)); };
  const onDurationChange = (v: string) => { setAddDuration(v); setAddEndDate(computeEnd(addStartDate, v)); };

  const resetForm = () => {
    setAddFirstName(''); setAddLastName(''); setAddEmail(''); setAddPhone('');
    setAddDob(''); setAddJob(''); setAddAddress(''); setAddCity(''); setAddPostalCode('');
    setAddNotes(''); setAddFormula(''); setAddPrice(''); setAddPeriodicity('Mensuel');
    setAddPhotoFile(null); setAddPhotoPreview(null); setUseMandate(true); setMandateResult(null);
    setAddPaymentMethod('Espèces'); setAddStartDate(todayStr); setAddDuration('1 mois'); setAddEndDate(computeEnd(todayStr, '1 mois'));
  };

  const closeModal = () => { setIsAddModalOpen(false); resetForm(); };

  const handleInscribeMember = async () => {
    if (!addFirstName.trim() || !addLastName.trim()) { alert('Le prénom et le nom sont requis.'); return; }
    if (submitting) return;
    setSubmitting(true);
    try {
      const priceNum = addPrice ? parseFloat(addPrice.replace(',', '.')) : undefined;

      if (useMandate) {
        if (!addEmail.trim()) { alert("Un email est requis pour générer le mandat GoCardless."); setSubmitting(false); return; }
        const gymId = await getGymId();
        if (!gymId) throw new Error("Salle introuvable (gym_id).");
        const res = await startMandateSetup({
          firstName: addFirstName.trim(),
          lastName: addLastName.trim(),
          email: addEmail.trim(),
          phone: addPhone || undefined,
          gymId,
          subscriptionLabel: addFormula || undefined,
          price: priceNum,
          redirectUrl: `${window.location.origin}/#/app`,
        });
        await patchMember(res.member_id, {
          address: addAddress || null,
          city: addCity || null,
          postal_code: addPostalCode || null,
          notes: addNotes || null,
          periodicity: addPeriodicity || null,
        });
        if (addPhotoFile) { try { await uploadMemberPhoto(res.member_id, addPhotoFile); } catch (err) { console.error(err); } }
        setMandateResult({ authorisation_url: res.authorisation_url, member_number: (res as any).member_number });
      } else {
        const m = await createMember({
          firstName: addFirstName.trim(),
          lastName: addLastName.trim(),
          email: addEmail || undefined,
          phone: addPhone || undefined,
          address: addAddress || undefined,
          city: addCity || undefined,
          postalCode: addPostalCode || undefined,
          subscriptionLabel: addFormula || undefined,
          price: priceNum ?? null,
          periodicity: addPeriodicity || undefined,
          paymentMethodLabel: addPaymentMethod || undefined,
          subscriptionStart: addStartDate || undefined,
          subscriptionEnd: addEndDate || computeEnd(addStartDate, addDuration) || undefined,
          notes: addNotes || undefined,
        });
        if (addPhotoFile) { try { await uploadMemberPhoto(m.id, addPhotoFile); } catch (err) { console.error(err); } }
        closeModal();
        alert(`Membre créé (n° ${m.memberNumber || ''}).`);
      }
    } catch (e) {
      alert("Échec de l'inscription : " + ((e as Error)?.message || ''));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de Bord</h1>
          <p className="text-sm text-gray-500">Bienvenue, voici un aperçu de l'activité de votre salle aujourd'hui.</p>
        </div>
        <div className="flex space-x-3">
          <button className="px-4 py-2 bg-white border border-gray-200 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors">Exporter</button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-indigo-600 text-white text-sm font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
          >
            <UserPlus size={18} />
            <span>Ajouter un Membre</span>
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {!stats && [0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm animate-pulse">
            <div className="w-12 h-12 bg-gray-100 rounded-2xl mb-4" />
            <div className="h-3 w-24 bg-gray-100 rounded mb-2" />
            <div className="h-7 w-20 bg-gray-100 rounded" />
          </div>
        ))}
        {stats && cards.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.bg} ${stat.color} p-3 rounded-2xl`}>
                <stat.icon size={24} />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
            <p className="text-3xl font-extrabold text-gray-900">{stat.value}</p>
            <p className="text-[11px] font-bold text-gray-400 mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-lg font-bold text-gray-900">Revenu encaissé <span className="text-xs font-bold text-gray-400">(6 mois · GoCardless)</span></h3>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}} />
                <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
          <h3 className="text-lg font-bold text-gray-900 mb-6">Activité Récente</h3>
          <div className="space-y-6 flex-grow overflow-y-auto pwa-hide-scrollbar">
            {(gc?.recent && gc.recent.length > 0) ? gc.recent.map((p, i) => (
              <div key={i} className="flex items-start space-x-4">
                <div className="bg-green-100 text-green-600 w-10 h-10 rounded-xl flex items-center justify-center shrink-0"><CreditCard size={18} /></div>
                <div className="flex-grow">
                  <p className="text-sm font-bold text-gray-900">{fmtEUR(p.amount)}</p>
                  <p className="text-xs text-gray-500">Prélèvement · {statusFr[p.status] ?? p.status}</p>
                </div>
                <span className="text-[10px] text-gray-400 font-medium">{new Date(p.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span>
              </div>
            )) : gc ? (
              <p className="text-sm text-gray-400 font-medium">Aucun paiement GoCardless récent.</p>
            ) : (
              [0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center space-x-4 animate-pulse">
                  <div className="bg-gray-100 w-10 h-10 rounded-xl shrink-0" />
                  <div className="flex-grow space-y-2"><div className="h-3 w-24 bg-gray-100 rounded" /><div className="h-2 w-32 bg-gray-100 rounded" /></div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Abonnements à renouveler (hors prélèvement GoCardless) */}
      <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${expiring.length ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'}`}><AlertTriangle size={18} /></span>
            Abonnements à renouveler
          </h3>
          {expiring.length > 0 && (
            <span className="text-xs font-black uppercase tracking-widest bg-amber-100 text-amber-700 px-3 py-1.5 rounded-full">{expiring.length} sous 30 j</span>
          )}
        </div>
        {expiring.length === 0 ? (
          <p className="text-sm font-bold text-gray-400 py-6 text-center">Aucun abonnement (hors prélèvement) n'arrive à expiration dans les 30 prochains jours.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {expiring.map((m) => {
              const late = m.days_left < 0;
              return (
                <div key={m.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{m.first_name} {m.last_name} {m.member_number ? <span className="text-gray-400 font-black">· n° {m.member_number}</span> : null}</p>
                    <p className="text-[11px] font-bold text-gray-400 truncate">{m.subscription_label || 'Abonnement'}{m.payment_method ? ` · ${m.payment_method}` : ''}</p>
                  </div>
                  <div className={`flex items-center gap-2 shrink-0 text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-full ${late ? 'bg-red-100 text-red-700' : m.days_left <= 7 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'}`}>
                    <Clock size={13} />
                    {late ? `Expiré (${Math.abs(m.days_left)} j)` : m.days_left === 0 ? "Expire aujourd'hui" : `${m.days_left} j`}
                    <span className="hidden sm:inline text-gray-400 font-bold normal-case">· {m.subscription_end}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODALE INSCRIPTION MEMBRE (branchée à la base + mandat GoCardless) */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col">

            <div className="p-8 bg-indigo-600 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 p-3 rounded-2xl shadow-inner">
                  <UserPlus size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-black">Ajouter un Membre</h2>
                  <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mt-0.5">Inscription &amp; mandat de prélèvement</p>
                </div>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={24} /></button>
            </div>

            {mandateResult && (
              <div className="p-10 space-y-6 text-center overflow-y-auto">
                <div className="mx-auto w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><CheckCircle2 size={32} /></div>
                <div>
                  <h3 className="text-xl font-black text-gray-900">Fiche créée{mandateResult.member_number ? ` (n° ${mandateResult.member_number})` : ''}</h3>
                  <p className="text-sm font-medium text-gray-500 mt-1">Dernière étape : le client signe son mandat de prélèvement (sur place ou via ce lien).</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-left break-all text-xs font-bold text-gray-600">{mandateResult.authorisation_url}</div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <a href={mandateResult.authorisation_url} target="_blank" rel="noreferrer" className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-colors">Ouvrir la signature</a>
                  <button type="button" onClick={() => { try { navigator.clipboard?.writeText(mandateResult.authorisation_url); } catch (_) {} }} className="px-8 py-4 bg-gray-100 text-gray-700 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-200 transition-colors">Copier le lien</button>
                </div>
                <button type="button" onClick={closeModal} className="text-xs font-bold text-gray-400 hover:text-gray-600 underline">Terminer</button>
              </div>
            )}

            {!mandateResult && (
            <div className="flex-grow overflow-y-auto p-8 space-y-10 pwa-hide-scrollbar">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

                {/* Colonne 1: Identité & Contact */}
                <div className="space-y-8">
                  <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center space-x-2">
                    <Users size={14} /> <span>1. Informations Personnelles</span>
                  </h3>

                  <div className="flex items-center space-x-4">
                    <button type="button" onClick={() => addPhotoInputRef.current?.click()} className="w-20 h-20 rounded-3xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden hover:border-indigo-400 transition-all shrink-0">
                      {addPhotoPreview ? <img src={addPhotoPreview} alt="" className="w-full h-full object-cover" /> : <Camera size={22} className="text-gray-300" />}
                    </button>
                    <div>
                      <p className="text-xs font-black text-gray-700">Photo du membre</p>
                      <p className="text-[10px] font-bold text-gray-400">Importer un fichier ou prendre une photo (tablette/mobile)</p>
                    </div>
                    <input ref={addPhotoInputRef} type="file" accept="image/*" capture="user" onChange={handleAddPhoto} className="hidden" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Prénom</label>
                      <input type="text" value={addFirstName} onChange={(e) => setAddFirstName(e.target.value)} placeholder="Jean" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nom</label>
                      <input type="text" value={addLastName} onChange={(e) => setAddLastName(e.target.value)} placeholder="Dupont" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Date de Naissance</label>
                      <input type="date" value={addDob} onChange={(e) => setAddDob(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Métier</label>
                      <input type="text" value={addJob} onChange={(e) => setAddJob(e.target.value)} placeholder="Ingénieur, Chef..." className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</label>
                    <input type="email" value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="jean.dupont@email.com" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Téléphone</label>
                    <input type="tel" value={addPhone} onChange={(e) => setAddPhone(e.target.value)} placeholder="06 12 34 56 78" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center space-x-1">
                        <MapPin size={10} /> <span>Adresse</span>
                      </label>
                      <input type="text" value={addAddress} onChange={(e) => setAddAddress(e.target.value)} placeholder="12 rue des Lilas" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Code postal</label>
                        <input type="text" value={addPostalCode} onChange={(e) => setAddPostalCode(e.target.value)} placeholder="11400" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ville</label>
                        <input type="text" value={addCity} onChange={(e) => setAddCity(e.target.value)} placeholder="Castelnaudary" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Colonne 2: Formule & Paiement */}
                <div className="space-y-8">
                  <h3 className="text-xs font-black text-indigo-600 uppercase tracking-[0.2em] flex items-center space-x-2">
                    <Target size={14} /> <span>2. Formule &amp; Paiement</span>
                  </h3>

                  <div className="space-y-5">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Formule d'abonnement</label>
                      <select value={addFormula} onChange={(e) => selectFormula(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10">
                        <option value="">— Choisir une formule —</option>
                        {formulaOptions.map(f => <option key={f.id} value={f.name}>{f.name} ({f.price.toFixed(2)} €)</option>)}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Prix (€)</label>
                        <input type="text" value={addPrice} onChange={(e) => setAddPrice(e.target.value)} placeholder="29.90" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Périodicité</label>
                        <select value={addPeriodicity} onChange={(e) => setAddPeriodicity(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none">
                          <option>Mensuel</option>
                          <option>Trimestriel</option>
                          <option>Annuel</option>
                          <option>Ponctuel</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-5 bg-indigo-50 rounded-3xl border border-indigo-100">
                      <div className="flex items-center space-x-3">
                        <div className="bg-white p-2 rounded-xl text-indigo-600 shadow-sm"><CreditCard size={20} /></div>
                        <div>
                          <p className="text-sm font-black text-indigo-900">Prélèvement GoCardless</p>
                          <p className="text-[10px] font-bold text-indigo-400 uppercase">Génère un mandat à faire signer</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => setUseMandate(!useMandate)} className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${useMandate ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${useMandate ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                    {useMandate && <p className="text-[11px] font-bold text-gray-400 px-1">Un lien de signature sera généré : le client le signe sur place (tablette) ou via le lien. L'email est alors obligatoire.</p>}

                    {!useMandate && (
                      <div className="space-y-3 p-5 bg-gray-50 rounded-3xl border border-gray-100">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Paiement & période (sans prélèvement)</p>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mode de paiement</label>
                          <select value={addPaymentMethod} onChange={(e) => setAddPaymentMethod(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10">
                            <option>Espèces</option>
                            <option>Carte bancaire</option>
                            <option>Chèque</option>
                            <option>Virement</option>
                            <option>Chèque(s) vacances / ANCV</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Début</label>
                            <input type="date" value={addStartDate} onChange={(e) => onStartChange(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Durée</label>
                            <select value={addDuration} onChange={(e) => onDurationChange(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none">
                              <option>1 mois</option>
                              <option>3 mois</option>
                              <option>6 mois</option>
                              <option>12 mois</option>
                              <option>Ponctuel</option>
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fin</label>
                            <input type="date" value={addEndDate} onChange={(e) => setAddEndDate(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                          </div>
                        </div>
                        <p className="text-[11px] font-bold text-gray-400 px-1">La date de fin se calcule selon la durée et reste modifiable. Elle alimente les alertes de renouvellement du tableau de bord.</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Notes additionnelles</label>
                    <textarea rows={4} value={addNotes} onChange={(e) => setAddNotes(e.target.value)} placeholder="Motivation, limitations physiques, parrainage..." className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10"></textarea>
                  </div>
                </div>
              </div>
            </div>
            )}

            {!mandateResult && (
            <div className="p-8 border-t border-gray-100 flex items-center justify-between shrink-0 bg-white">
               <button onClick={closeModal} className="px-6 py-4 text-gray-400 font-bold text-sm hover:text-gray-600">Annuler</button>
               <button
                 onClick={handleInscribeMember}
                 disabled={submitting}
                 className="flex items-center space-x-2 bg-indigo-600 text-white px-10 py-4 rounded-2xl font-black text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-60"
               >
                 <Save size={18} />
                 <span>{submitting ? 'Création…' : (useMandate ? 'Inscrire + générer le mandat' : 'Inscrire le membre')}</span>
               </button>
            </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
