
import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Filter, MoreHorizontal, UserPlus, Mail, Phone, 
  Target, UserCheck, Briefcase, X, Save, Calendar, 
  MapPin, Activity, Award, Star, History, Building2,
  User, ChevronRight, CheckCircle2, Clock, Trash2,
  ShieldAlert, HeartPulse, ImageIcon, Briefcase as JobIcon,
  CreditCard, ShoppingBag, CalendarCheck, Zap, Edit2, Camera,
  RotateCcw, Link2, Hash, FileText, Layers, CornerDownRight
} from 'lucide-react';
import { getMembers, saveMember, deleteMember, uploadMemberPhoto, getPhotoUrl, createMember, patchMember, getGymId, getArchivedMembers, restoreMember, hardDeleteMember, updateMemberNumber, linkMandate, updateCardNumber, generateCardNumber, updateKeypadCode, generateKeypadCode } from '../../lib/membersApi';
import { getGroupTree, GroupNode } from '../../lib/groupsApi';
import { enqueueAccessCommand, getMemberVisits, getMemberVisitCount, getPackStatus, type MemberVisit, type PackStatus } from '../../lib/accessApi';
import { getMemberPayments, type MemberPayment } from '../../lib/paymentsApi';
import { getMemberSales, getInvoiceUrl, getProducts, viewInvoice } from '../../lib/boutiqueApi';
import { startMandateSetup, getMemberGocardlessPayments, changeFormula, type GocardlessPayment } from '../../lib/gocardless';
import { getMemberContracts, getContractUrl } from '../../lib/contractsApi';
import { Member, ContactStatus, Product } from '../../types';

// Initiales (ex. "Jean Dupont" -> "JD") pour les avatars, en attendant les photos webcam.
const getInitials = (first?: string, last?: string): string => {
  const a = (first || '').trim();
  const b = (last || '').trim();
  const initials = `${a.charAt(0)}${b.charAt(0)}`.toUpperCase();
  return initials || (a || b).charAt(0).toUpperCase() || '?';
};

interface CRMPageProps {
  tab?: string;
}

const CRMPage: React.FC<CRMPageProps> = ({ tab = 'membres' }) => {
  const [activeTab, setActiveTab] = useState(tab);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editBackup, setEditBackup] = useState<any | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [memberSales, setMemberSales] = useState<any[]>([]);
  const [memberContracts, setMemberContracts] = useState<any[]>([]);
  const [memberPayments, setMemberPayments] = useState<MemberPayment[]>([]);
  const [memberGcPayments, setMemberGcPayments] = useState<GocardlessPayment[]>([]);
  const [gcPaymentsLoading, setGcPaymentsLoading] = useState(false);
  const [memberVisits, setMemberVisits] = useState<MemberVisit[]>([]);
  const [visitCount, setVisitCount] = useState(0);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [visitsHasMore, setVisitsHasMore] = useState(true);
  const [packStatus, setPackStatus] = useState<PackStatus | null>(null);
  const [editingFormula, setEditingFormula] = useState(false);
  const [formulaDraft, setFormulaDraft] = useState<{ label: string; price: string; periodicity: string; start: string; end: string; method: string }>({ label: '', price: '', periodicity: '', start: '', end: '', method: '' });
  const [savingFormula, setSavingFormula] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [detailTab, setDetailTab] = useState<'profil' | 'activite' | 'finance'>('profil');
  const [financeTab, setFinanceTab] = useState<'paiements' | 'contrats' | 'ventes'>('paiements');
  
  // State database & search
  const [contacts, setContacts] = useState<Member[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name_asc');

  // Add form states
  const [addFirstName, setAddFirstName] = useState('');
  const [addLastName, setAddLastName] = useState('');
  const [addEmail, setAddEmail] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addDob, setAddDob] = useState('');
  const [addJob, setAddJob] = useState('');
  const [addAddress, setAddAddress] = useState('');
  const [addCity, setAddCity] = useState('');
  const [addPostalCode, setAddPostalCode] = useState('');
  const [addStatus, setAddStatus] = useState<ContactStatus>('PROSPECT_NEW');
  const [addNotes, setAddNotes] = useState('');
  const [trialSession, setTrialSession] = useState(false);

  // Inscription membre : formule, photo, mandat
  const [addFormula, setAddFormula] = useState('');
  const [addPrice, setAddPrice] = useState('');
  const [addPeriodicity, setAddPeriodicity] = useState('Mensuel');
  const [formulaOptions, setFormulaOptions] = useState<Product[]>([]);
  const [addPhotoFile, setAddPhotoFile] = useState<File | null>(null);
  const [addPhotoPreview, setAddPhotoPreview] = useState<string | null>(null);
  const [useMandate, setUseMandate] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  // Paiement hors GoCardless : mode, début, durée, fin
  const todayStr = new Date().toISOString().split('T')[0];
  const [addPaymentMethod, setAddPaymentMethod] = useState('Espèces');
  const [addStartDate, setAddStartDate] = useState(todayStr);
  const [addDuration, setAddDuration] = useState('1 mois');
  const [addEndDate, setAddEndDate] = useState(() => { const d = new Date(); d.setMonth(d.getMonth() + 1); return d.toISOString().split('T')[0]; });
  const [mandateResult, setMandateResult] = useState<{ authorisation_url: string; member_number?: string } | null>(null);
  const addPhotoInputRef = useRef<HTMLInputElement>(null);

  // Archivés (corbeille)
  const [showArchived, setShowArchived] = useState(false);
  const [archivedContacts, setArchivedContacts] = useState<Member[]>([]);

  // Édition du numéro d'adhérent dans la fiche
  const [editingNumber, setEditingNumber] = useState(false);
  const [numberDraft, setNumberDraft] = useState('');
  const [savingNumber, setSavingNumber] = useState(false);
  const [editingCard, setEditingCard] = useState(false);
  const [cardDraft, setCardDraft] = useState('');
  const [savingCard, setSavingCard] = useState(false);
  const [editingCode, setEditingCode] = useState(false);
  const [codeDraft, setCodeDraft] = useState('');
  const [savingCode, setSavingCode] = useState(false);

  // Rattacher un mandat GoCardless existant
  const [linkMandateId, setLinkMandateId] = useState('');
  const [linkCustomerId, setLinkCustomerId] = useState('');
  const [linkingMandate, setLinkingMandate] = useState(false);

  // Custom partner states
  const [partnerCompany, setPartnerCompany] = useState('');
  const [partnerCategory, setPartnerCategory] = useState('Équipementier');

  useEffect(() => {
    const load = () => getMembers().then(setContacts).catch(console.error);
    load();
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, []);

  useEffect(() => {
    setActiveTab(tab);
  }, [tab]);

  // Formules d'abonnement proposées à l'inscription (depuis la Boutique)
  useEffect(() => {
    getProducts()
      .then(ps => setFormulaOptions(ps.filter(p => p.category === 'Abonnements & Séances')))
      .catch(() => {});
  }, []);

  // Groupes / sous-groupes (pour les menus de la fiche)
  const [groupTree, setGroupTree] = useState<GroupNode[]>([]);
  const [savingGroup, setSavingGroup] = useState(false);
  const [filterGroup, setFilterGroup] = useState('');
  const [filterSubgroup, setFilterSubgroup] = useState('');
  useEffect(() => { getGroupTree().then(setGroupTree).catch(() => {}); }, []);

  const saveGroupField = async (field: 'group_name' | 'subgroup_name', value: string) => {
    if (!selectedContact) return;
    setSavingGroup(true);
    // maj optimiste (camelCase côté UI) ; changer de groupe vide le sous-groupe
    setSelectedContact((prev: any) => ({
      ...prev,
      ...(field === 'group_name' ? { groupName: value || undefined, subgroupName: undefined } : { subgroupName: value || undefined }),
    }));
    try {
      const patch: any = { [field]: value || null };
      if (field === 'group_name') patch.subgroup_name = null;
      await patchMember(selectedContact.id, patch);
      setContacts(await getMembers());
    } catch (e) { console.error('saveGroupField', e); } finally { setSavingGroup(false); }
  };

  const openContactDetails = (contact: any) => {
    setSelectedContact({ ...contact });
    setIsDetailModalOpen(true);
    setIsEditing(false);
    setDetailTab('profil');
    setPhotoUrl(null);
  };

  // Ouverture directe d'une fiche depuis une autre page (ex. Contrôle d'accès) via #/app/crm?member=<id>
  const deepLinkedRef = useRef<string | null>(null);
  useEffect(() => {
    const m = window.location.hash.match(/[?&]member=([^&]+)/);
    if (!m || contacts.length === 0) return;
    const id = decodeURIComponent(m[1]);
    if (deepLinkedRef.current === id) return;
    const found = contacts.find((c) => c.id === id);
    if (found) {
      deepLinkedRef.current = id;
      openContactDetails(found);
      window.history.replaceState(null, '', window.location.hash.split('?')[0]);
    }
  }, [contacts]);

  // --- Édition d'une fiche depuis la fenêtre de détail ---
  const startEditing = () => {
    setDetailTab('profil');
    setEditBackup({ ...selectedContact });
    setIsEditing(true);
  };

  const cancelEditing = () => {
    if (editBackup) setSelectedContact(editBackup);
    setIsEditing(false);
  };

  const updateField = (field: string, value: any) => {
    setSelectedContact((prev: any) => ({ ...prev, [field]: value }));
  };

  const handleUpdateContact = async () => {
    try {
      await saveMember(selectedContact);
      setContacts(await getMembers());
      setIsEditing(false);
    } catch (err) {
      console.error(err);
      alert("La sauvegarde a échoué. Vérifie ta connexion et réessaie.");
    }
  };

  // --- Archivés (corbeille) ---
  const loadArchived = async () => {
    try { setArchivedContacts(await getArchivedMembers()); }
    catch (err) { console.error(err); }
  };
  const openArchived = async () => { await loadArchived(); setShowArchived(true); };
  const handleRestore = async (id: string) => {
    try {
      await restoreMember(id);
      await loadArchived();
      setContacts(await getMembers());
    } catch (err) { console.error(err); alert("La restauration a échoué."); }
  };
  const handleHardDelete = async (id: string) => {
    if (!window.confirm('Supprimer DÉFINITIVEMENT cette fiche et toutes ses données ? Cette action est irréversible.')) return;
    try {
      await hardDeleteMember(id);
      await loadArchived();
    } catch (err) { console.error(err); alert("La suppression définitive a échoué."); }
  };

  // --- Édition du numéro d'adhérent ---
  const startEditNumber = () => { setNumberDraft(selectedContact?.memberNumber || ''); setEditingNumber(true); };
  const handleSaveNumber = async () => {
    if (!selectedContact) return;
    setSavingNumber(true);
    try {
      await updateMemberNumber(selectedContact.id, numberDraft);
      updateField('memberNumber', numberDraft.trim());
      setContacts(await getMembers());
      setEditingNumber(false);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Impossible de modifier le numéro.");
    } finally { setSavingNumber(false); }
  };

  // --- Édition du numéro de badge (carte) ---
  const startEditCard = () => { setCardDraft(selectedContact?.cardNumber || ''); setEditingCard(true); };
  const handleGenerateCard = async () => {
    try { setCardDraft(await generateCardNumber()); }
    catch (err: any) { alert(err?.message || 'Génération impossible.'); }
  };
  const handleSaveCard = async () => {
    if (!selectedContact) return;
    setSavingCard(true);
    try {
      await updateCardNumber(selectedContact.id, cardDraft);
      updateField('cardNumber', cardDraft.trim());
      setContacts(await getMembers());
      setEditingCard(false);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Impossible de modifier le numéro de badge.");
    } finally { setSavingCard(false); }
  };

  const startEditCode = () => { setCodeDraft((selectedContact as any)?.keypadCode || ''); setEditingCode(true); };
  const handleGenerateCode = async () => {
    try { setCodeDraft(await generateKeypadCode()); }
    catch (err: any) { alert(err?.message || 'Génération impossible.'); }
  };
  const handleSaveCode = async () => {
    if (!selectedContact) return;
    setSavingCode(true);
    try {
      const code = codeDraft.trim();
      await updateKeypadCode(selectedContact.id, code);
      updateField('keypadCode' as any, code);
      // Pousse le code au contrôleur (sinon il reste en base sans être actif à la porte).
      const pin = selectedContact.memberNumber ? String(selectedContact.memberNumber) : '';
      let pushed = false;
      if (pin && code) {
        await enqueueAccessCommand({
          memberId: selectedContact.id, pin,
          cardNumber: selectedContact.cardNumber || null,
          keypadCode: code,
          name: `${selectedContact.firstName || ''} ${selectedContact.lastName || ''}`.trim(),
          action: 'grant',
        });
        pushed = true;
      }
      setContacts(await getMembers());
      setEditingCode(false);
      if (pushed) alert("Code enregistré et envoyé au contrôleur. Il sera actif à la porte dans quelques secondes.");
      else if (!pin) alert("Code enregistré. ⚠️ Ce membre n'a pas de numéro d'adhérent : impossible de l'activer au contrôleur.");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Impossible de modifier le code clavier.");
    } finally { setSavingCode(false); }
  };

  // --- Accès contrôleur (via le pont) : bloquer / débloquer / (re)créer ---
  const [accessBusy, setAccessBusy] = useState(false);
  const sendAccess = async (action: 'grant' | 'block' | 'unblock' | 'revoke') => {
    if (!selectedContact) return;
    const pin = selectedContact.memberNumber ? String(selectedContact.memberNumber) : '';
    if (!pin) { alert("Ce membre n'a pas de numéro d'adhérent."); return; }
    setAccessBusy(true);
    try {
      await enqueueAccessCommand({
        memberId: selectedContact.id, pin,
        cardNumber: selectedContact.cardNumber || null,
        keypadCode: (selectedContact as any).keypadCode || null,
        name: `${selectedContact.firstName || ''} ${selectedContact.lastName || ''}`.trim(),
        action,
      });
      const label = { grant: 'Création/activation', block: 'Blocage', unblock: 'Déblocage', revoke: 'Suppression' }[action];
      alert(`${label} de l'accès demandé. Le pont l'appliquera sur le contrôleur dans quelques secondes.`);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Impossible d'envoyer la commande d'accès.");
    } finally { setAccessBusy(false); }
  };

  // --- Rattacher un mandat GoCardless existant ---
  const handleLinkMandate = async () => {
    if (!selectedContact) return;
    if (!linkMandateId.trim()) { alert('Renseigne au moins le mandate_id (colonne du fichier).'); return; }
    setLinkingMandate(true);
    try {
      await linkMandate(selectedContact.id, { mandateId: linkMandateId, customerId: linkCustomerId });
      updateField('gocardlessMandateId', linkMandateId.trim());
      updateField('gocardlessStatus', 'mandate_active');
      if (linkCustomerId.trim()) updateField('gocardlessCustomerId', linkCustomerId.trim());
      setLinkMandateId(''); setLinkCustomerId('');
      setContacts(await getMembers());
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Le rattachement a échoué.");
    } finally { setLinkingMandate(false); }
  };

  // Charge l'URL signée de la photo quand on ouvre une fiche
  useEffect(() => {
    let active = true;
    if (selectedContact?.photoPath) {
      getPhotoUrl(selectedContact.photoPath).then((url) => {
        if (active) setPhotoUrl(url);
      });
    } else {
      setPhotoUrl(null);
    }
    return () => { active = false; };
  }, [selectedContact?.id, selectedContact?.photoPath]);

  // Charge l'historique d'achats du client
  useEffect(() => {
    let active = true;
    if (selectedContact?.id) {
      getMemberSales(selectedContact.id).then((s) => { if (active) setMemberSales(s); });
      getMemberContracts(selectedContact.id).then((c) => { if (active) setMemberContracts(c); });
      getMemberPayments(selectedContact.id).then((p) => { if (active) setMemberPayments(p); });
      if (selectedContact.gocardlessCustomerId || selectedContact.gocardlessMandateId) {
        setGcPaymentsLoading(true); setMemberGcPayments([]);
        getMemberGocardlessPayments(selectedContact.id).then((p) => { if (active) { setMemberGcPayments(p); setGcPaymentsLoading(false); } });
      } else {
        setMemberGcPayments([]); setGcPaymentsLoading(false);
      }
      getMemberVisitCount(selectedContact.id).then((n) => { if (active) setVisitCount(n); });
      getPackStatus(selectedContact.id).then((p) => { if (active) setPackStatus(p); });
      setVisitsLoading(true); setVisitsHasMore(true);
      getMemberVisits(selectedContact.id, { limit: 15 }).then((v) => {
        if (active) { setMemberVisits(v); setVisitsHasMore(v.length === 15); setVisitsLoading(false); }
      });
    } else {
      setMemberSales([]); setMemberContracts([]); setMemberPayments([]);
      setMemberVisits([]); setVisitCount(0); setVisitsHasMore(true);
      setPackStatus(null);
      setMemberGcPayments([]); setGcPaymentsLoading(false);
    }
    return () => { active = false; };
  }, [selectedContact?.id]);

  const loadMoreVisits = async () => {
    if (!selectedContact?.id || visitsLoading || memberVisits.length === 0) return;
    setVisitsLoading(true);
    const before = memberVisits[memberVisits.length - 1].access_datetime;
    const more = await getMemberVisits(selectedContact.id, { limit: 15, before });
    setMemberVisits((prev) => [...prev, ...more]);
    setVisitsHasMore(more.length === 15);
    setVisitsLoading(false);
  };

  const startEditFormula = () => {
    setFormulaDraft({
      label: selectedContact?.subscription || '',
      price: selectedContact?.price != null ? String(selectedContact.price) : '',
      periodicity: selectedContact?.periodicity || '',
      start: selectedContact?.subscriptionStart || '',
      end: selectedContact?.subscriptionEnd || '',
      method: selectedContact?.paymentMethod || '',
    });
    setEditingFormula(true);
  };
  const handleSaveFormula = async () => {
    if (!selectedContact?.id) return;
    if (!formulaDraft.label || formulaDraft.price === '') { alert('Choisis une formule.'); return; }
    const isPrelevement = !!(selectedContact.gocardlessMandateId) && (selectedContact.gocardlessStatus === 'mandate_active' || selectedContact.gocardlessStatus === 'mandate_submitted');
    if (isPrelevement) {
      const ok = window.confirm(`Changer la formule de ce membre prélevé pour « ${formulaDraft.label} » (${Number(formulaDraft.price).toFixed(2).replace('.', ',')} €) ?\n\nL'abonnement GoCardless actuel sera annulé et un nouveau sera créé au montant de la formule. À ne faire que si le client est d'accord.`);
      if (!ok) return;
    }
    setSavingFormula(true);
    try {
      const res = await changeFormula(selectedContact.id, formulaDraft.label, Number(formulaDraft.price));
      if (res.error) { alert('Échec : ' + res.error); return; }
      updateField('subscription', formulaDraft.label);
      updateField('price', Number(formulaDraft.price));
      setContacts(await getMembers());
      if (selectedContact.gocardlessCustomerId || selectedContact.gocardlessMandateId) {
        getMemberGocardlessPayments(selectedContact.id).then((p) => setMemberGcPayments(p));
      }
      setEditingFormula(false);
      if (res.skipped) alert('Formule mise à jour. GoCardless était déjà au bon montant, rien n\u2019a changé côté prélèvement.');
      else if (res.gocardless) alert(`Formule mise à jour et GoCardless synchronisé (ancien abonnement annulé, nouveau créé).`);
      else alert('Formule mise à jour.');
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Impossible de changer la formule.');
    } finally { setSavingFormula(false); }
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permet de re-sélectionner le même fichier
    if (!file || !selectedContact?.id) return;
    setPhotoUploading(true);
    try {
      const path = await uploadMemberPhoto(selectedContact.id, file);
      const url = await getPhotoUrl(path);
      setPhotoUrl(url);
      setSelectedContact((prev: any) => ({ ...prev, photoPath: path }));
      setContacts(await getMembers());
    } catch (err) {
      console.error(err);
      alert("L'envoi de la photo a échoué. Réessaie.");
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setAddPhotoFile(file);
    setAddPhotoPreview(URL.createObjectURL(file));
  };

  const resetAddForm = () => {
    setAddFirstName(''); setAddLastName(''); setAddEmail(''); setAddPhone('');
    setAddDob(''); setAddJob(''); setAddAddress(''); setAddCity(''); setAddPostalCode('');
    setAddStatus('PROSPECT_NEW'); setAddNotes(''); setPartnerCompany('');
    setAddFormula(''); setAddPrice(''); setAddPeriodicity('Mensuel');
    setAddPhotoFile(null); setAddPhotoPreview(null); setUseMandate(true);
    setMandateResult(null); setTrialSession(false);
    setAddPaymentMethod('Espèces'); setAddStartDate(todayStr); setAddDuration('1 mois'); setAddEndDate(computeEnd(todayStr, '1 mois'));
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
    if (m === 0) return start; // ponctuel : fin = début
    dt.setMonth(dt.getMonth() + m);
    return dt.toISOString().split('T')[0];
  };
  const onStartChange = (v: string) => { setAddStartDate(v); setAddEndDate(computeEnd(v, addDuration)); };
  const onDurationChange = (v: string) => { setAddDuration(v); setAddEndDate(computeEnd(addStartDate, v)); };

  const closeAddModal = () => { setIsAddModalOpen(false); resetAddForm(); };

  // Inscription d'un membre par le staff (avec ou sans mandat GoCardless)
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
        // Complète la fiche créée par la fonction (adresse, notes, périodicité)
        await patchMember(res.member_id, {
          address: addAddress || null,
          city: addCity || null,
          postal_code: addPostalCode || null,
          notes: addNotes || null,
          periodicity: addPeriodicity || null,
        });
        if (addPhotoFile) { try { await uploadMemberPhoto(res.member_id, addPhotoFile); } catch (err) { console.error(err); } }
        setContacts(await getMembers());
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
        setContacts(await getMembers());
        closeAddModal();
        alert(`Membre créé (n° ${m.memberNumber || ''}).`);
      }
    } catch (e) {
      alert("Échec de l'inscription : " + ((e as Error)?.message || ''));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (activeTab === 'partenaires') {
      const newPartner: Member = {
        id: `partner_${Date.now()}`,
        firstName: 'Contact',
        lastName: partnerCompany || 'Partenaire sans nom',
        email: addEmail,
        phone: addPhone || '',
        address: addAddress,
        status: 'PARTNER',
        joinDate: new Date().toISOString().split('T')[0],
        trialSessionDone: false,
        notes: `Catégorie: ${partnerCategory}`
      };
      await saveMember(newPartner);
    } else {
      const newMember: Member = {
        id: `member_${Date.now()}`,
        firstName: addFirstName,
        lastName: addLastName,
        email: addEmail,
        phone: addPhone || '',
        address: addAddress,
        dob: addDob,
        job: addJob,
        status: activeTab === 'membres' ? 'MEMBER_ACTIVE' : addStatus,
        joinDate: new Date().toISOString().split('T')[0],
        trialSessionDone: trialSession,
        notes: addNotes
      };
      await saveMember(newMember);
    }

    setIsAddModalOpen(false);
    setContacts(await getMembers());
    
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
        (m.memberNumber && m.memberNumber.toLowerCase().includes(query)) ||
        (m.email && m.email.toLowerCase().includes(query)) ||
        (m.phone && m.phone.toLowerCase().includes(query)) ||
        (m.notes && m.notes.toLowerCase().includes(query))
      );
    }

    if (filterGroup) {
      filtered = filtered.filter(m =>
        (m as any).groupName === filterGroup &&
        (!filterSubgroup || (m as any).subgroupName === filterSubgroup)
      );
    }

    const num = (m: any) => parseInt(m.memberNumber || '0', 10) || 0;
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name_desc': return (b.lastName || '').localeCompare(a.lastName || '', 'fr');
        case 'number_asc': return num(a) - num(b);
        case 'number_desc': return num(b) - num(a);
        case 'date_desc': return (b.joinDate || '').localeCompare(a.joinDate || '');
        case 'date_asc': return (a.joinDate || '').localeCompare(b.joinDate || '');
        case 'name_asc':
        default: return (a.lastName || '').localeCompare(b.lastName || '', 'fr');
      }
    });

    return sorted;
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
          onClick={() => { if (activeTab === 'membres' || activeTab === undefined) { window.location.hash = '#/app/inscription'; } else { setIsAddModalOpen(true); } }}
          className="flex items-center justify-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all"
        >
          <UserPlus size={18} />
          <span>{activeTab === 'partenaires' ? 'Ajouter un Partenaire' : activeTab === 'prospects' ? 'Ajouter un Prospect' : 'Nouvelle inscription'}</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-full">
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
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Layers size={15} className="text-gray-400" />
            <select
              value={filterGroup}
              onChange={(e) => { setFilterGroup(e.target.value); setFilterSubgroup(''); }}
              className="bg-white border border-gray-200 rounded-xl py-2.5 px-3 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium text-gray-700"
            >
              <option value="">Tous les groupes</option>
              {groupTree.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
            </select>
            {filterGroup && (groupTree.find((g) => g.name === filterGroup)?.subgroups.length ?? 0) > 0 && (
              <select
                value={filterSubgroup}
                onChange={(e) => setFilterSubgroup(e.target.value)}
                className="bg-white border border-gray-200 rounded-xl py-2.5 px-3 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium text-gray-700"
              >
                <option value="">Tous les sous-groupes</option>
                {(groupTree.find((g) => g.name === filterGroup)?.subgroups ?? []).map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            )}
            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Trier</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-white border border-gray-200 rounded-xl py-2.5 px-3 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold text-gray-700"
            >
              <option value="name_asc">Nom (A → Z)</option>
              <option value="name_desc">Nom (Z → A)</option>
              <option value="number_asc">N° client (croissant)</option>
              <option value="number_desc">N° client (décroissant)</option>
              <option value="date_desc">Inscription (récent)</option>
              <option value="date_asc">Inscription (ancien)</option>
            </select>
            <button
              type="button"
              onClick={openArchived}
              className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl py-2.5 px-4 text-sm font-bold text-gray-600 hover:bg-gray-50 transition-colors"
              title="Voir les fiches archivées"
            >
              <Trash2 size={16} /> Archivés
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-gray-400 text-xs font-bold uppercase tracking-wider border-y border-gray-100">
                <th className="px-6 py-4">{activeTab === 'partenaires' ? 'Entreprise / Contact' : 'Nom / Prénom'}</th>
                <th className="px-6 py-4">N° Client</th>
                <th className="px-6 py-4">Téléphone</th>
                <th className="px-6 py-4">Statut</th>
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
                      <div className="w-10 h-10 rounded-xl shadow-sm bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold uppercase shrink-0" aria-hidden="true">
                        {getInitials(member.firstName, member.lastName)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          {member.status === 'PARTNER' ? member.lastName : `${member.firstName} ${member.lastName}`}
                        </p>
                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">{member.email || 'Pas d\'email'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-gray-900">{member.memberNumber || '—'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-gray-700">{member.phone || '—'}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      member.status === 'MEMBER_ACTIVE' || member.status === 'PARTNER' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                    }`}>
                      {member.status.replace('MEMBER_', '').replace('PROSPECT_', '')}
                    </span>
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
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-xl overflow-hidden animate-in zoom-in duration-300 flex flex-col">
            
            <div className="p-5 bg-indigo-600 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-4">
                <div className="bg-white/20 p-3 rounded-2xl shadow-inner">
                  <UserPlus size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">Ajouter un {activeTab.slice(0, -1)}</h2>
                  <p className="text-indigo-100 text-xs font-bold uppercase tracking-wide mt-0.5">Enregistrement complet du profil</p>
                </div>
              </div>
              <button onClick={closeAddModal} className="p-2 hover:bg-white/10 rounded-xl transition-all"><X size={24} /></button>
            </div>

            {mandateResult && (
              <div className="p-6 space-y-6 text-center overflow-y-auto">
                <div className="mx-auto w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><CheckCircle2 size={32} /></div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Fiche créée{mandateResult.member_number ? ` (n° ${mandateResult.member_number})` : ''}</h3>
                  <p className="text-sm font-medium text-gray-500 mt-1">Dernière étape : le client signe son mandat de prélèvement (sur place ou via ce lien).</p>
                </div>
                <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-left break-all text-xs font-bold text-gray-600">{mandateResult.authorisation_url}</div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <a href={mandateResult.authorisation_url} target="_blank" rel="noreferrer" className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-semibold text-sm uppercase tracking-wide hover:bg-indigo-700 transition-colors">Ouvrir la signature</a>
                  <button type="button" onClick={() => { try { navigator.clipboard?.writeText(mandateResult.authorisation_url); } catch (_) {} }} className="px-8 py-4 bg-gray-100 text-gray-700 rounded-2xl font-semibold text-sm uppercase tracking-wide hover:bg-gray-200 transition-colors">Copier le lien</button>
                </div>
                <button type="button" onClick={closeAddModal} className="text-xs font-bold text-gray-400 hover:text-gray-600 underline">Terminer</button>
              </div>
            )}

            {!mandateResult && (
            <form onSubmit={handleSaveAdd} className="flex-grow overflow-y-auto p-5 space-y-6 pwa-hide-scrollbar">
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                <div className="space-y-6">
                  <h3 className="text-xs font-semibold text-indigo-600 uppercase tracking-wide flex items-center space-x-2">
                    <User size={14} /> <span>1. Informations Générales</span>
                  </h3>

                  {activeTab !== 'partenaires' && (
                    <div className="flex items-center space-x-4">
                      <button type="button" onClick={() => addPhotoInputRef.current?.click()} className="w-20 h-20 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden hover:border-indigo-400 transition-all shrink-0">
                        {addPhotoPreview ? <img src={addPhotoPreview} alt="" className="w-full h-full object-cover" /> : <Camera size={22} className="text-gray-300" />}
                      </button>
                      <div>
                        <p className="text-xs font-semibold text-gray-700">Photo du membre</p>
                        <p className="text-[10px] font-bold text-gray-400">Importer un fichier ou prendre une photo (tablette/mobile)</p>
                      </div>
                      <input ref={addPhotoInputRef} type="file" accept="image/*" capture="user" onChange={handleAddPhoto} className="hidden" />
                    </div>
                  )}
                  
                  {activeTab === 'partenaires' ? (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Nom de l'entreprise</label>
                        <input type="text" required value={partnerCompany} onChange={(e) => setPartnerCompany(e.target.value)} placeholder="FitSupply Ltd" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Catégorie</label>
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
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Prénom</label>
                        <input type="text" required value={addFirstName} onChange={(e) => setAddFirstName(e.target.value)} placeholder="Jean" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Nom</label>
                        <input type="text" required value={addLastName} onChange={(e) => setAddLastName(e.target.value)} placeholder="Dupont" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                      </div>
                    </div>
                  )}

                  {activeTab !== 'partenaires' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Date de Naissance</label>
                        <input type="date" required value={addDob} onChange={(e) => setAddDob(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Métier</label>
                        <input type="text" value={addJob} onChange={(e) => setAddJob(e.target.value)} placeholder="Ingénieur, Chef..." className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center space-x-1">
                        <Mail size={10} /> <span>Email {activeTab === 'partenaires' ? 'de contact' : ''}</span>
                      </label>
                      <input type="email" required value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="contact@domaine.com" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center space-x-1">
                        <Phone size={10} /> <span>Téléphone</span>
                      </label>
                      <input type="tel" required value={addPhone} onChange={(e) => setAddPhone(e.target.value)} placeholder="06 12 34 56 78" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center space-x-1">
                        <MapPin size={10} /> <span>Adresse</span>
                      </label>
                      <input type="text" value={addAddress} onChange={(e) => setAddAddress(e.target.value)} placeholder="12 rue des Lilas" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Code postal</label>
                        <input type="text" value={addPostalCode} onChange={(e) => setAddPostalCode(e.target.value)} placeholder="11400" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Ville</label>
                        <input type="text" value={addCity} onChange={(e) => setAddCity(e.target.value)} placeholder="Castelnaudary" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xs font-semibold text-indigo-600 uppercase tracking-wide flex items-center space-x-2">
                    <Target size={14} /> <span>2. {activeTab === 'membres' ? 'Formule & Paiement' : 'Qualification & Suivi'}</span>
                  </h3>

                  {activeTab === 'membres' ? (
                    <div className="space-y-5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Formule d'abonnement</label>
                        <select value={addFormula} onChange={(e) => selectFormula(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10">
                          <option value="">— Choisir une formule —</option>
                          {formulaOptions.map(f => <option key={f.id} value={f.name}>{f.name} ({f.price.toFixed(2).replace('.', ',')} €)</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Prix (€)</label>
                          <input type="text" value={addPrice} onChange={(e) => setAddPrice(e.target.value)} placeholder="29.90" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Périodicité</label>
                          <select value={addPeriodicity} onChange={(e) => setAddPeriodicity(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none">
                            <option>Mensuel</option>
                            <option>Trimestriel</option>
                            <option>Annuel</option>
                            <option>Ponctuel</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-5 bg-indigo-50 rounded-2xl border border-indigo-100">
                        <div className="flex items-center space-x-3">
                          <div className="bg-white p-2 rounded-xl text-indigo-600 shadow-sm"><CreditCard size={20} /></div>
                          <div>
                            <p className="text-sm font-semibold text-indigo-900">Prélèvement GoCardless</p>
                            <p className="text-[10px] font-bold text-indigo-400 uppercase">Génère un mandat à faire signer</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => setUseMandate(!useMandate)} className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${useMandate ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                          <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${useMandate ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                      {useMandate && <p className="text-[11px] font-bold text-gray-400 px-1">Un lien de signature sera généré : le client le signe sur place (tablette) ou via le lien. L'email est alors obligatoire.</p>}

                      {!useMandate && (
                        <div className="space-y-3 p-5 bg-gray-50 rounded-2xl border border-gray-100">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Paiement & période (sans prélèvement)</p>
                          <div className="space-y-1">
                            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Mode de paiement</label>
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
                              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Début</label>
                              <input type="date" value={addStartDate} onChange={(e) => onStartChange(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Durée</label>
                              <select value={addDuration} onChange={(e) => onDurationChange(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none">
                                <option>1 mois</option>
                                <option>3 mois</option>
                                <option>6 mois</option>
                                <option>12 mois</option>
                                <option>Ponctuel</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Fin</label>
                              <input type="date" value={addEndDate} onChange={(e) => setAddEndDate(e.target.value)} className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                            </div>
                          </div>
                          <p className="text-[11px] font-bold text-gray-400 px-1">La date de fin se calcule automatiquement selon la durée, et reste modifiable. Elle sert aux alertes de renouvellement du tableau de bord.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                        <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Étape de conversion</label>
                        <div className="grid grid-cols-1 gap-2">
                          {activeTab === 'prospects' ? (
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

                      {activeTab === 'prospects' && (
                        <div className="flex items-center justify-between p-6 bg-indigo-50 rounded-2xl border border-indigo-100">
                          <div className="flex items-center space-x-3">
                            <div className="bg-white p-2 rounded-xl text-indigo-600 shadow-sm"><Activity size={20} /></div>
                            <div>
                              <p className="text-sm font-semibold text-indigo-900">Séance d'essai</p>
                              <p className="text-[10px] font-bold text-indigo-400 uppercase">A-t-il testé la salle ?</p>
                            </div>
                          </div>
                          <button type="button" onClick={() => setTrialSession(!trialSession)} className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${trialSession ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${trialSession ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  <div className="p-6 bg-red-50/50 rounded-2xl border border-red-100 space-y-4">
                    <div className="flex items-center space-x-2 text-red-600">
                      <ShieldAlert size={16} />
                      <span className="text-[10px] font-semibold uppercase tracking-wide">Notes & Informations complémentaires</span>
                    </div>
                    <div className="w-full">
                      <textarea rows={3} value={addNotes} onChange={(e) => setAddNotes(e.target.value)} placeholder="Commentaires ou objectifs du membre/prospect..." className="w-full bg-white border border-red-100 rounded-2xl px-4 py-3 text-xs font-bold outline-none focus:ring-4 focus:ring-red-100"></textarea>
                    </div>
                  </div>
                </div>
              </div>
            </form>
            )}

            {!mandateResult && (
            <div className="p-5 border-t border-gray-100 flex items-center justify-between shrink-0 bg-white">
               <button onClick={closeAddModal} className="px-6 py-4 text-gray-400 font-bold text-sm hover:text-gray-600">Annuler</button>
               {activeTab === 'membres' ? (
                 <button
                   onClick={handleInscribeMember}
                   disabled={submitting}
                   className="flex items-center space-x-2 bg-indigo-600 text-white px-10 py-4 rounded-2xl font-semibold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-60"
                 >
                   <Save size={18} />
                   <span>{submitting ? 'Création…' : (useMandate ? 'Inscrire + générer le mandat' : 'Inscrire le membre')}</span>
                 </button>
               ) : (
                 <button
                  onClick={handleSaveAdd}
                  className="flex items-center space-x-2 bg-indigo-600 text-white px-10 py-4 rounded-2xl font-semibold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
                 >
                   <Save size={18} />
                   <span>Enregistrer le {activeTab.slice(0, -1)}</span>
                 </button>
               )}
            </div>
            )}
          </div>
        </div>
      )}

      {/* MODALE DE DETAIL CONTACT ENRICHE (Consultation) */}
      {isDetailModalOpen && selectedContact && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-xl overflow-hidden animate-in zoom-in duration-300 flex flex-col">
            
            <div className={`p-10 ${activeTab === 'membres' ? 'bg-indigo-600' : activeTab === 'prospects' ? 'bg-amber-500' : 'bg-slate-800'} text-white flex items-center justify-between shrink-0 relative overflow-hidden`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
              <div className="flex items-center space-x-8 relative z-10">
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="w-24 h-24 rounded-2xl border-4 border-white/20 shadow-xl bg-white/20 flex items-center justify-center text-3xl font-semibold uppercase overflow-hidden group relative"
                    title="Ajouter ou changer la photo"
                  >
                    {photoUrl ? (
                      <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{getInitials(selectedContact.firstName, selectedContact.lastName)}</span>
                    )}
                    <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera size={22} className="text-white" />
                    </span>
                  </button>
                  {photoUploading && (
                    <span className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center text-white text-[10px] font-semibold uppercase tracking-wide">Envoi…</span>
                  )}
                  <input ref={photoInputRef} type="file" accept="image/*" capture="user" onChange={handlePhotoChange} className="hidden" />
                </div>
                <div>
                  <h2 className="text-3xl font-semibold">{activeTab === 'partenaires' ? selectedContact.company : `${selectedContact.firstName} ${selectedContact.lastName}`}</h2>
                  <div className="flex items-center space-x-3 mt-2">
                    <span className="bg-white/20 px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wide">
                      {activeTab === 'prospects' ? 'Prospect chaud' : activeTab === 'membres' ? (selectedContact.subscription || 'Membre Actif') : selectedContact.category}
                    </span>
                    {activeTab === 'membres' && (
                      <span className="flex items-center text-[10px] font-bold">
                        <Zap size={10} className="mr-1" /> N° adhérent {selectedContact.memberNumber || '—'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setIsDetailModalOpen(false)} className="p-3 hover:bg-white/10 rounded-2xl transition-colors relative z-10"><X size={28} /></button>
            </div>

            {/* Onglets de navigation interne à la fiche client */}
            {activeTab === 'membres' && (
              <div className="px-10 border-b border-gray-100 flex items-center bg-gray-50/50">
                <button onClick={() => setDetailTab('profil')} className={`px-6 py-4 text-xs font-semibold uppercase tracking-wide border-b-4 transition-all ${detailTab === 'profil' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}>Profil</button>
                <button onClick={() => setDetailTab('activite')} className={`px-6 py-4 text-xs font-semibold uppercase tracking-wide border-b-4 transition-all ${detailTab === 'activite' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}>Visites & Cours</button>
                <button onClick={() => setDetailTab('finance')} className={`px-6 py-4 text-xs font-semibold uppercase tracking-wide border-b-4 transition-all ${detailTab === 'finance' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400'}`}>Abonnement & Achats</button>
              </div>
            )}

            <div className="flex-grow overflow-y-auto p-6 sm:p-8 space-y-6 pwa-hide-scrollbar">

              {isEditing ? (
                <div className="max-w-2xl mx-auto space-y-6">
                  <h3 className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide flex items-center space-x-2">
                    <Edit2 size={14} /> <span>Modifier la fiche</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Prénom</label>
                      <input type="text" value={selectedContact.firstName || ''} onChange={(e) => updateField('firstName', e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Nom</label>
                      <input type="text" value={selectedContact.lastName || ''} onChange={(e) => updateField('lastName', e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Email</label>
                      <input type="email" value={selectedContact.email || ''} onChange={(e) => updateField('email', e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Téléphone</label>
                      <input type="tel" value={selectedContact.phone || ''} onChange={(e) => updateField('phone', e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Abonnement</label>
                      <input type="text" value={selectedContact.subscription || ''} onChange={(e) => updateField('subscription', e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Tarif (€)</label>
                      <input type="number" step="0.01" value={selectedContact.price ?? ''} onChange={(e) => updateField('price', e.target.value === '' ? undefined : Number(e.target.value))} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Statut</label>
                      <select value={selectedContact.status === 'MEMBER_ACTIVE' ? 'MEMBER_ACTIVE' : 'MEMBER_INACTIVE'} onChange={(e) => updateField('status', e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none">
                        <option value="MEMBER_ACTIVE">Actif</option>
                        <option value="MEMBER_INACTIVE">Inactif</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Mode de paiement</label>
                      <input type="text" value={selectedContact.paymentMethod || ''} onChange={(e) => updateField('paymentMethod', e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Notes</label>
                    <textarea rows={3} value={selectedContact.notes || ''} onChange={(e) => updateField('notes', e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10"></textarea>
                  </div>
                  <p className="text-[11px] font-bold text-gray-400">L'adresse et la photo (webcam) seront modifiables dans une prochaine étape.</p>
                </div>
              ) : (
              <>
              {/* VUE PROFIL (Commune à tous) */}
              {detailTab === 'profil' && (
                <div className="space-y-6">
                  {/* Identifiants compacts : n° adhérent · badge · code clavier */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* N° adhérent */}
                    <div className="bg-gray-50 rounded-2xl px-4 py-3">
                      <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1"><Hash size={11} /> N° adhérent</p>
                      {editingNumber ? (
                        <div className="flex items-center gap-1">
                          <input type="text" value={numberDraft} onChange={(e) => setNumberDraft(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg py-1.5 px-2 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-bold" placeholder="ex. 338" />
                          <button type="button" onClick={handleSaveNumber} disabled={savingNumber} className="p-1.5 bg-indigo-600 text-white rounded-lg disabled:opacity-50"><Save size={13} /></button>
                          <button type="button" onClick={() => setEditingNumber(false)} className="p-1.5 bg-gray-200 text-gray-500 rounded-lg"><X size={13} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-semibold text-gray-900">{selectedContact.memberNumber || '—'}</span>
                          <button type="button" onClick={startEditNumber} className="p-1 text-gray-300 hover:text-indigo-600 transition-colors"><Edit2 size={13} /></button>
                        </div>
                      )}
                    </div>
                    {/* Badge */}
                    <div className="bg-gray-50 rounded-2xl px-4 py-3">
                      <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1"><CreditCard size={11} /> Badge</p>
                      {editingCard ? (
                        <div className="flex items-center gap-1">
                          <input type="text" value={cardDraft} onChange={(e) => setCardDraft(e.target.value)} className="w-full bg-white border border-gray-200 rounded-lg py-1.5 px-2 outline-none focus:ring-2 focus:ring-red-500/20 text-sm font-bold" placeholder="ex. 3616701" />
                          <button type="button" onClick={handleGenerateCard} title="Générer" className="p-1.5 bg-gray-200 text-gray-600 rounded-lg"><RotateCcw size={13} /></button>
                          <button type="button" onClick={handleSaveCard} disabled={savingCard} className="p-1.5 bg-red-600 text-white rounded-lg disabled:opacity-50"><Save size={13} /></button>
                          <button type="button" onClick={() => setEditingCard(false)} className="p-1.5 bg-gray-200 text-gray-500 rounded-lg"><X size={13} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-semibold text-gray-900">{selectedContact.cardNumber || '—'}</span>
                          <button type="button" onClick={startEditCard} className="p-1 text-gray-300 hover:text-red-600 transition-colors"><Edit2 size={13} /></button>
                        </div>
                      )}
                    </div>
                    {/* Code clavier */}
                    <div className="bg-gray-50 rounded-2xl px-4 py-3">
                      <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1"><Hash size={11} /> Code clavier</p>
                      {editingCode ? (
                        <div className="flex items-center gap-1">
                          <input type="text" inputMode="numeric" value={codeDraft} onChange={(e) => setCodeDraft(e.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full bg-white border border-gray-200 rounded-lg py-1.5 px-2 outline-none focus:ring-2 focus:ring-amber-500/20 text-sm font-bold tracking-wide" placeholder="6 chiffres" />
                          <button type="button" onClick={handleGenerateCode} title="Générer" className="p-1.5 bg-gray-200 text-gray-600 rounded-lg"><RotateCcw size={13} /></button>
                          <button type="button" onClick={handleSaveCode} disabled={savingCode} className="p-1.5 bg-amber-600 text-white rounded-lg disabled:opacity-50"><Save size={13} /></button>
                          <button type="button" onClick={() => setEditingCode(false)} className="p-1.5 bg-gray-200 text-gray-500 rounded-lg"><X size={13} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-semibold text-gray-900 tracking-wide">{(selectedContact as any).keypadCode || '—'}</span>
                          <button type="button" onClick={startEditCode} className="p-1 text-gray-300 hover:text-amber-600 transition-colors"><Edit2 size={13} /></button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Groupe / sous-groupe */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-2xl px-4 py-3">
                      <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1"><Layers size={11} /> Groupe</p>
                      <select
                        value={(selectedContact as any).groupName || ''}
                        onChange={(e) => saveGroupField('group_name', e.target.value)}
                        disabled={savingGroup}
                        className="w-full bg-white border border-gray-200 rounded-lg py-1.5 px-2 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-semibold disabled:opacity-50"
                      >
                        <option value="">— Aucun —</option>
                        {groupTree.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
                      </select>
                    </div>
                    <div className="bg-gray-50 rounded-2xl px-4 py-3">
                      <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-wide mb-1 flex items-center gap-1"><CornerDownRight size={11} /> Sous-groupe</p>
                      {(() => {
                        const subs = groupTree.find((g) => g.name === (selectedContact as any).groupName)?.subgroups ?? [];
                        return (
                          <select
                            value={(selectedContact as any).subgroupName || ''}
                            onChange={(e) => saveGroupField('subgroup_name', e.target.value)}
                            disabled={savingGroup || !(selectedContact as any).groupName || subs.length === 0}
                            className="w-full bg-white border border-gray-200 rounded-lg py-1.5 px-2 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-semibold disabled:opacity-50"
                          >
                            <option value="">{!(selectedContact as any).groupName ? '— Choisir un groupe —' : subs.length === 0 ? '— Aucun sous-groupe —' : '— Aucun —'}</option>
                            {subs.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                          </select>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Carte 10 séances : séances restantes */}
                  {packStatus?.is_pack && (
                    <div className={`rounded-2xl p-4 border ${packStatus.remaining === 0 ? 'bg-red-50 border-red-100' : packStatus.remaining <= 3 ? 'bg-amber-50 border-amber-100' : 'bg-green-50 border-green-100'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1.5"><CalendarCheck size={13} /> {packStatus.total === 1 ? 'Séance unique' : `Carte ${packStatus.total} séances`}</span>
                        <span className={`text-sm font-semibold ${packStatus.remaining === 0 ? 'text-red-700' : packStatus.remaining <= 3 ? 'text-amber-700' : 'text-green-700'}`}>
                          {packStatus.remaining === 0 ? 'Épuisée — accès bloqué' : `${packStatus.remaining} séance${packStatus.remaining > 1 ? 's' : ''} restante${packStatus.remaining > 1 ? 's' : ''}`}
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-white/70 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${packStatus.remaining === 0 ? 'bg-red-500' : packStatus.remaining <= 3 ? 'bg-amber-500' : 'bg-green-500'}`} style={{ width: `${Math.min(100, (packStatus.used / packStatus.total) * 100)}%` }} />
                      </div>
                      <p className="text-[11px] font-bold text-gray-400 mt-1.5">{packStatus.used} / {packStatus.total} séances utilisées</p>
                    </div>
                  )}

                  {/* Contrôle d'accès (compact) */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5 mr-1"><ShieldAlert size={13} /> Accès</span>
                    <button type="button" onClick={() => sendAccess('grant')} disabled={accessBusy} className="flex items-center gap-1.5 bg-gray-900 text-white px-3 py-2 rounded-xl font-semibold text-[11px] uppercase tracking-wide hover:bg-black disabled:opacity-50"><UserCheck size={13} /> Activer</button>
                    <button type="button" onClick={() => sendAccess('unblock')} disabled={accessBusy} className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-2 rounded-xl font-semibold text-[11px] uppercase tracking-wide hover:bg-green-700 disabled:opacity-50"><CheckCircle2 size={13} /> Débloquer</button>
                    <button type="button" onClick={() => sendAccess('block')} disabled={accessBusy} className="flex items-center gap-1.5 bg-red-600 text-white px-3 py-2 rounded-xl font-semibold text-[11px] uppercase tracking-wide hover:bg-red-700 disabled:opacity-50"><X size={13} /> Bloquer</button>
                  </div>

                  {/* Contact + abonnement résumé */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center space-x-2"><User size={14} /> <span>Contact</span></h3>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <span className="text-xs font-bold text-gray-400">Email</span>
                        <span className="text-sm font-semibold text-gray-900 truncate ml-3">{selectedContact.email || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <span className="text-xs font-bold text-gray-400">Téléphone</span>
                        <span className="text-sm font-semibold text-gray-900">{selectedContact.phone || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <span className="text-xs font-bold text-gray-400">Adresse</span>
                        <span className="text-sm font-semibold text-gray-900 text-right ml-3">{selectedContact.address || '—'}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center space-x-2"><Award size={14} /> <span>Abonnement</span></h3>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <span className="text-xs font-bold text-gray-400">Formule</span>
                        <span className="text-sm font-semibold text-gray-900 text-right ml-3">{selectedContact.subscription || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <span className="text-xs font-bold text-gray-400">Tarif</span>
                        <span className="text-sm font-semibold text-gray-900">{selectedContact.price != null ? `${Number(selectedContact.price).toFixed(2).replace('.', ',')} €` : '—'}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                        <span className="text-xs font-bold text-gray-400">Inscription</span>
                        <span className="text-sm font-semibold text-gray-900">{selectedContact.joinDate || '—'}</span>
                      </div>
                      {selectedContact.emergencyContact?.phone && (
                        <div className="p-3 bg-red-50/50 rounded-xl border border-red-100 flex items-center justify-between">
                          <span className="text-xs font-semibold text-red-600">Urgence</span>
                          <span className="text-sm font-semibold text-red-900">{selectedContact.emergencyContact.phone}</span>
                        </div>
                      )}
                      {selectedContact.notes && (
                        <div className="flex flex-col p-3 bg-amber-50/60 rounded-xl border border-amber-100 space-y-1">
                          <span className="text-xs font-bold text-amber-600">Notes</span>
                          <span className="text-sm font-bold text-gray-800 leading-relaxed">{selectedContact.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* VUE ACTIVITE (Spécifique Client) */}
              {detailTab === 'activite' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center space-x-2"><CalendarCheck size={14} /> <span>Derniers passages</span></h3>
                    <div className="flex items-center gap-2">
                      {packStatus?.is_pack && (
                        <span className={`text-[11px] font-semibold px-3 py-1.5 rounded-full ${packStatus.remaining === 0 ? 'bg-red-100 text-red-700' : packStatus.remaining <= 3 ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                          {packStatus.remaining === 0 ? 'Carte épuisée' : `${packStatus.remaining}/${packStatus.total} restantes`}
                        </span>
                      )}
                      <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">{visitCount} ce mois-ci</span>
                    </div>
                  </div>

                  {memberVisits.length === 0 && !visitsLoading ? (
                    <div className="flex flex-col items-center justify-center text-center py-16 px-6 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                      <div className="bg-gray-100 p-4 rounded-2xl text-gray-400 mb-4"><CalendarCheck size={28} /></div>
                      <p className="text-sm font-semibold text-gray-700">Aucun passage enregistré</p>
                      <p className="text-xs font-bold text-gray-400 mt-2 max-w-md">Les passages au tripode et à la porte apparaîtront ici dès que le membre badgera (ou tapera son code).</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {memberVisits.map((v) => {
                          const dt = new Date(v.access_datetime);
                          const denied = v.status === 'denied';
                          return (
                            <div key={v.id} className="flex items-center justify-between p-3.5 bg-white border border-gray-100 rounded-2xl">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-xl ${denied ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                  {denied ? <X size={16} /> : <CheckCircle2 size={16} />}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900 capitalize">{dt.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })}</p>
                                  <p className="text-[11px] font-bold text-gray-400">{dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}{v.identification_method === 'qr_code' ? '' : ''}</p>
                                </div>
                              </div>
                              <span className={`text-[10px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full ${denied ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                                {denied ? 'Refusé' : 'Entrée'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {visitsHasMore && (
                        <div className="flex justify-center pt-2">
                          <button type="button" onClick={loadMoreVisits} disabled={visitsLoading} className="flex items-center gap-2 bg-gray-100 text-gray-600 px-6 py-3 rounded-2xl font-semibold text-xs uppercase tracking-wide hover:bg-gray-200 disabled:opacity-50">
                            <History size={14} /> {visitsLoading ? 'Chargement…' : 'Charger plus'}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* VUE FINANCE (Spécifique Client) */}
              {detailTab === 'finance' && (activeTab === 'membres') && (
                <div className="space-y-5">
                  <div className="space-y-3">
                    <div className="p-5 bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-indigo-100">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">Abonnement actuel</p>
                          <button type="button" onClick={editingFormula ? () => setEditingFormula(false) : startEditFormula} className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide bg-white/20 hover:bg-white/30 px-2.5 py-1 rounded-lg transition-colors">
                            <Edit2 size={11} /> {editingFormula ? 'Fermer' : 'Changer de formule'}
                          </button>
                        </div>
                        <h4 className="text-xl font-semibold">{selectedContact.subscription || 'Non renseigné'}</h4>
                        <p className="text-sm opacity-90">
                          {selectedContact.paymentMethod ? `Paiement : ${selectedContact.paymentMethod}` : 'Mode de paiement non renseigné'}
                          {selectedContact.periodicity ? ` • ${selectedContact.periodicity}` : ''}
                        </p>
                        {selectedContact.paidBy && (
                          <p className="text-xs opacity-75">Réglé par : {selectedContact.paidBy}</p>
                        )}
                        {(selectedContact.subscriptionStart || selectedContact.subscriptionEnd) && (
                          <p className="text-xs opacity-90 font-bold mt-1">
                            Période : {selectedContact.subscriptionStart || '—'} → {selectedContact.subscriptionEnd || '—'}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-semibold">{selectedContact.price != null ? `${Number(selectedContact.price).toFixed(2).replace('.', ',')} €` : '—'}</p>
                        <p className="text-[10px] font-semibold opacity-80 uppercase mt-1">
                          Statut : {selectedContact.status === 'MEMBER_ACTIVE' ? 'ACTIF' : 'INACTIF'}
                        </p>
                      </div>
                    </div>

                    {editingFormula && (() => {
                      const RECURRING = [25.9, 29.9, 59.9];
                      const recurring = (formulaOptions || [])
                        .filter((p: any) => RECURRING.includes(Number(p.price)))
                        .map((p: any) => ({ label: p.name as string, price: Number(p.price) }));
                      const fallback = [
                        { label: 'Abo famille/étudiant', price: 25.9 },
                        { label: 'Abo classique', price: 29.9 },
                        { label: 'Abo suivi et formation', price: 59.9 },
                      ];
                      const options = recurring.length ? recurring : fallback;
                      const isPrelevement = !!(selectedContact.gocardlessMandateId) && (selectedContact.gocardlessStatus === 'mandate_active' || selectedContact.gocardlessStatus === 'mandate_submitted');
                      return (
                        <div className="p-5 bg-white border border-gray-100 rounded-2xl space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Nouvelle formule</label>
                            <div className="grid grid-cols-1 gap-2">
                              {options.map((o) => {
                                const active = formulaDraft.label === o.label && Number(formulaDraft.price) === o.price;
                                return (
                                  <button key={o.label + o.price} type="button"
                                    onClick={() => setFormulaDraft({ ...formulaDraft, label: o.label, price: String(o.price) })}
                                    className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-colors ${active ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}>
                                    <span className="text-sm font-semibold text-gray-900">{o.label}</span>
                                    <span className={`text-sm font-semibold ${active ? 'text-indigo-600' : 'text-gray-500'}`}>{o.price.toFixed(2).replace('.', ',')} €</span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          {isPrelevement ? (
                            <p className="text-[11px] font-bold text-amber-600 bg-amber-50 rounded-xl px-3 py-2 leading-relaxed">
                              Ce membre est en prélèvement : GoCardless sera mis à jour automatiquement (ancien abonnement annulé, nouveau créé au montant de la formule, prélevé le 10).
                            </p>
                          ) : (
                            <p className="text-[11px] font-bold text-gray-400 px-1">Ce membre n'est pas en prélèvement : seule la formule NoResa sera modifiée.</p>
                          )}
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={handleSaveFormula} disabled={savingFormula} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-semibold text-xs uppercase tracking-wide hover:bg-indigo-700 disabled:opacity-50"><Save size={14} /> {savingFormula ? 'Application…' : 'Appliquer la formule'}</button>
                            <button type="button" onClick={() => setEditingFormula(false)} className="text-xs font-bold text-gray-400 hover:text-gray-600 px-3">Annuler</button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Sous-onglets finance */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {([['paiements', 'Paiements'], ['contrats', 'Contrats'], ['ventes', 'Ventes']] as const).map(([key, label]) => (
                      <button key={key} type="button" onClick={() => setFinanceTab(key)} className={`px-4 py-2 rounded-xl font-semibold text-[11px] uppercase tracking-wide transition-colors ${financeTab === key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{label}</button>
                    ))}
                  </div>

                  {financeTab === 'paiements' && (<>
                  {/* Paiements */}
                  <div className="space-y-3">
                    <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center space-x-2"><CreditCard size={14} /> <span>Paiements</span></h3>
                    {memberPayments.length === 0 ? (
                      <p className="text-xs font-bold text-gray-400 px-1">Aucun paiement enregistré pour ce membre.</p>
                    ) : (
                      <div className="space-y-2">
                        {memberPayments.map((pay) => {
                          const ok = (pay.status || '').toLowerCase() === 'paid' || (pay.status || '').toLowerCase() === 'completed' || (pay.status || '').toLowerCase() === 'confirmed';
                          const failed = (pay.status || '').toLowerCase() === 'failed' || (pay.status || '').toLowerCase() === 'cancelled';
                          return (
                            <div key={pay.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 capitalize truncate">{pay.payment_type || 'Paiement'}{pay.payment_method ? ` · ${pay.payment_method}` : ''}</p>
                                <p className="text-[11px] font-bold text-gray-400">{pay.payment_date ? new Date(pay.payment_date).toLocaleDateString('fr-FR') : '—'}</p>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-base font-semibold text-gray-900">{pay.amount != null ? `${Number(pay.amount).toFixed(2).replace('.', ',')} €` : '—'}</span>
                                {pay.status && (
                                  <span className={`text-[9px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full ${ok ? 'bg-green-100 text-green-700' : failed ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{pay.status}</span>
                                )}
                                {pay.invoice_url && (
                                  <a href={pay.invoice_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-3 py-2 rounded-xl text-[11px] font-semibold uppercase tracking-wide hover:bg-indigo-100"><FileText size={13} /> Reçu</a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {(selectedContact.gocardlessStatus || selectedContact.gocardlessMandateId) ? (
                    <div className="p-4 bg-white rounded-2xl border border-gray-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center space-x-2"><CreditCard size={14} /> <span>Prélèvement GoCardless</span></h3>
                        <span className={`text-[10px] font-semibold uppercase px-3 py-1 rounded-full ${
                          selectedContact.gocardlessStatus === 'mandate_active' ? 'bg-green-100 text-green-700'
                          : selectedContact.gocardlessStatus === 'pending' ? 'bg-amber-100 text-amber-700'
                          : selectedContact.gocardlessStatus === 'mandate_submitted' ? 'bg-blue-100 text-blue-700'
                          : selectedContact.gocardlessStatus === 'cancelled' || selectedContact.gocardlessStatus === 'failed' ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'}`}>
                          {selectedContact.gocardlessStatus === 'mandate_active' ? 'Mandat actif'
                            : selectedContact.gocardlessStatus === 'pending' ? 'En attente de signature'
                            : selectedContact.gocardlessStatus === 'mandate_submitted' ? 'Mandat soumis'
                            : selectedContact.gocardlessStatus === 'cancelled' ? 'Annulé'
                            : selectedContact.gocardlessStatus === 'failed' ? 'Échec'
                            : selectedContact.gocardlessStatus === 'expired' ? 'Expiré'
                            : (selectedContact.gocardlessStatus || 'Inconnu')}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="bg-gray-50 rounded-xl px-4 py-3">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase">Mandat</p>
                          <p className="text-xs font-bold text-gray-800 break-all">{selectedContact.gocardlessMandateId || '—'}</p>
                        </div>
                        <div className="bg-gray-50 rounded-xl px-4 py-3">
                          <p className="text-[10px] font-semibold text-gray-400 uppercase">Client GoCardless</p>
                          <p className="text-xs font-bold text-gray-800 break-all">{selectedContact.gocardlessCustomerId || '—'}</p>
                        </div>
                      </div>
                      {selectedContact.gocardlessCustomerId && (
                        <a href={`https://manage.gocardless.com/customers/${selectedContact.gocardlessCustomerId}`} target="_blank" rel="noreferrer" className="inline-flex items-center space-x-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800">
                          <ChevronRight size={14} /> <span>Ouvrir la fiche dans GoCardless</span>
                        </a>
                      )}

                      {/* Prélèvements GoCardless (temps réel) */}
                      <div className="pt-2 border-t border-gray-100">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Prélèvements</p>
                        {gcPaymentsLoading ? (
                          <p className="text-xs font-bold text-gray-400">Chargement des prélèvements…</p>
                        ) : memberGcPayments.length === 0 ? (
                          <p className="text-xs font-bold text-gray-400">Aucun prélèvement pour ce membre.</p>
                        ) : (
                          <div className="space-y-2">
                            {memberGcPayments.map((gp) => {
                              const st = (gp.status || '').toLowerCase();
                              const green = st === 'paid_out' || st === 'confirmed';
                              const red = st === 'failed' || st === 'charged_back' || st === 'customer_approval_denied';
                              const gray = st === 'cancelled';
                              const label = green ? 'Encaissé' : red ? 'Échec' : gray ? 'Annulé' : 'En cours';
                              const when = gp.charge_date || gp.created_at;
                              return (
                                <div key={gp.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5 gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-gray-900">{gp.amount != null ? `${gp.amount.toFixed(2).replace('.', ',')} €` : '—'}</p>
                                    <p className="text-[11px] font-bold text-gray-400 truncate">{when ? new Date(when).toLocaleDateString('fr-FR') : '—'}{gp.description ? ` · ${gp.description}` : ''}</p>
                                  </div>
                                  <span className={`text-[9px] font-semibold uppercase tracking-wide px-2 py-1 rounded-full shrink-0 ${green ? 'bg-green-100 text-green-700' : red ? 'bg-red-100 text-red-700' : gray ? 'bg-gray-200 text-gray-600' : 'bg-amber-100 text-amber-700'}`}>{label}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 space-y-3">
                      <div>
                        <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center space-x-2"><Link2 size={14} /> <span>Rattacher un mandat existant</span></h3>
                        <p className="text-[11px] font-medium text-gray-400 mt-1">Aucun mandat de prélèvement pour l'instant. Si ce client a déjà un mandat GoCardless (voir le fichier de rapprochement), colle ses identifiants ici.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-semibold text-gray-400 uppercase">mandate_id</label>
                          <input type="text" value={linkMandateId} onChange={(e) => setLinkMandateId(e.target.value)} placeholder="MD000..." className="w-full mt-1 bg-white border border-gray-200 rounded-xl py-2.5 px-3 outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs font-bold break-all" />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold text-gray-400 uppercase">customer_id (optionnel)</label>
                          <input type="text" value={linkCustomerId} onChange={(e) => setLinkCustomerId(e.target.value)} placeholder="CU000..." className="w-full mt-1 bg-white border border-gray-200 rounded-xl py-2.5 px-3 outline-none focus:ring-2 focus:ring-indigo-500/20 text-xs font-bold break-all" />
                        </div>
                      </div>
                      <button type="button" onClick={handleLinkMandate} disabled={linkingMandate} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-semibold text-xs uppercase tracking-wide hover:bg-indigo-700 transition-colors disabled:opacity-50">
                        <Link2 size={14} /> {linkingMandate ? 'Rattachement…' : 'Lier ce mandat'}
                      </button>
                    </div>
                  )}
                  </>)}

                  {financeTab === 'contrats' && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center space-x-2">
                      <FileText size={14} /> <span>Contrat d'adhésion</span>
                    </h3>
                    {memberContracts.length === 0 ? (
                      <p className="text-xs font-bold text-gray-400 px-1">Aucun contrat signé pour ce membre.</p>
                    ) : (
                      <div className="space-y-3">
                        {memberContracts.map((c: any) => (
                          <div key={c.id} className="p-4 border border-gray-100 rounded-2xl bg-white flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">Contrat {c.contract_number || '—'}</p>
                              <p className="text-[11px] font-bold text-gray-400">
                                {(c.signed_at || c.created_at) ? new Date(c.signed_at || c.created_at).toLocaleDateString('fr-FR') : ''}
                                {c.formula_label ? ' · ' + c.formula_label : ''}
                                {c.total_due != null ? ' · ' + Number(c.total_due).toFixed(2).replace('.', ',') + ' €' : ''}
                              </p>
                            </div>
                            {c.pdf_path ? (
                              <button
                                onClick={async () => {
                                  try {
                                    const u = await getContractUrl(c.pdf_path);
                                    if (u) window.open(u, '_blank');
                                    else alert("Impossible d'ouvrir le contrat.");
                                  } catch (e) { alert('Échec : ' + ((e as Error)?.message || '')); }
                                }}
                                title="Voir / télécharger le contrat signé (PDF)"
                                className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-3 py-2 rounded-xl text-[11px] font-semibold uppercase tracking-wide hover:bg-indigo-100 transition-colors shrink-0"
                              >
                                <FileText size={14} /> Contrat
                              </button>
                            ) : (
                              <span className="text-[11px] font-semibold text-amber-600 uppercase shrink-0">En cours</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  )}

                  {financeTab === 'ventes' && (
                  <div className="space-y-4">
                    <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center space-x-2">
                      <ShoppingBag size={14} /> <span>Historique des achats Boutique</span>
                    </h3>
                    {memberSales.length === 0 ? (
                      <div className="flex flex-col items-center justify-center text-center py-10 px-6 border border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                        <div className="bg-gray-100 p-3 rounded-2xl text-gray-400 mb-3"><ShoppingBag size={24} /></div>
                        <p className="text-sm font-semibold text-gray-700">Aucun achat enregistré</p>
                        <p className="text-xs font-bold text-gray-400 mt-2 max-w-md">Les ventes rattachées à ce client apparaîtront ici.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {memberSales.map((s: any) => (
                          <div key={s.id} className="p-4 border border-gray-100 rounded-2xl bg-white">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="text-sm font-semibold text-gray-900">Facture {s.invoice_number || '—'}</p>
                                <p className="text-[11px] font-bold text-gray-400">{s.sale_date ? new Date(s.sale_date).toLocaleDateString('fr-FR') : ''} · {s.payment_method || '—'}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-lg font-semibold text-indigo-600">{Number(s.total_ttc || 0).toFixed(2).replace('.', ',')} €</span>
                                <button
                                  onClick={async () => {
                                    try {
                                      const u = await viewInvoice(s.id, s.invoice_pdf_path);
                                      if (u) { window.open(u, '_blank'); if (selectedContact?.id) setMemberSales(await getMemberSales(selectedContact.id)); }
                                      else alert("Impossible d'ouvrir la facture.");
                                    } catch (e) { alert('Échec : ' + ((e as Error)?.message || '')); }
                                  }}
                                  title="Voir / télécharger la facture PDF"
                                  className="flex items-center gap-1.5 bg-indigo-50 text-indigo-600 px-3 py-2 rounded-xl text-[11px] font-semibold uppercase tracking-wide hover:bg-indigo-100 transition-colors"
                                >
                                  <FileText size={14} /> Facture
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {(s.lines || []).map((l: any, i: number) => (
                                <span key={i} className="inline-flex items-center bg-gray-50 border border-gray-100 rounded-lg px-2 py-1 text-[11px] font-bold text-gray-600">
                                  {l.quantity}× {l.product?.name || 'Article'}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  )}
                </div>
              )}
              </>
              )}
            </div>

            {/* Footer de la modale */}
            <div className="p-6 border-t border-gray-100 flex items-center justify-between shrink-0 bg-white">
               {isEditing ? (
                 <>
                   <button onClick={cancelEditing} className="text-xs font-bold text-gray-400 hover:text-gray-600">Annuler</button>
                   <button
                     onClick={handleUpdateContact}
                     className="flex items-center space-x-2 bg-indigo-600 text-white px-10 py-4 rounded-2xl font-semibold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
                   >
                     <Save size={18} />
                     <span>Enregistrer</span>
                   </button>
                 </>
               ) : (
                 <>
                   <button
                     onClick={async () => {
                       if (!window.confirm('Archiver ce contact ? Sa fiche et toutes ses données seront conservées dans les Archivés, et restaurables à tout moment.')) return;
                       await deleteMember(selectedContact.id);
                       setContacts(await getMembers());
                       setIsDetailModalOpen(false);
                     }}
                     className="text-xs font-bold text-red-500 hover:underline"
                   >
                     Archiver le contact
                   </button>
                   <div className="flex space-x-4">
                     <button onClick={() => setIsDetailModalOpen(false)} className="px-8 py-4 bg-gray-100 text-gray-600 font-bold rounded-2xl text-sm transition-all hover:bg-gray-200">Fermer</button>
                     <button onClick={startEditing} className="flex items-center space-x-2 bg-indigo-600 text-white px-10 py-4 rounded-2xl font-semibold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">
                       <Edit2 size={18} />
                       <span>Modifier la fiche</span>
                     </button>
                   </div>
                 </>
               )}
            </div>
          </div>
        </div>
      )}

      {/* MODALE ARCHIVÉS (corbeille) */}
      {showArchived && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-3xl max-h-[85vh] rounded-2xl shadow-xl overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-gray-100 text-gray-500 p-2.5 rounded-xl"><Trash2 size={18} /></div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Fiches archivées</h3>
                  <p className="text-xs font-bold text-gray-400">{archivedContacts.length} fiche(s) · données conservées · restaurables</p>
                </div>
              </div>
              <button onClick={() => setShowArchived(false)} className="p-2 text-gray-400 hover:text-gray-700"><X size={22} /></button>
            </div>
            <div className="overflow-y-auto p-4">
              {archivedContacts.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-sm font-semibold text-gray-700">Aucune fiche archivée</p>
                  <p className="text-xs font-bold text-gray-400 mt-1">Les contacts archivés apparaîtront ici.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {archivedContacts.map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between gap-4 py-3 px-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-500 flex items-center justify-center text-xs font-semibold uppercase shrink-0">{getInitials(m.firstName, m.lastName)}</div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-gray-900 truncate">{m.firstName} {m.lastName} {m.memberNumber ? <span className="text-gray-400 font-semibold">· n° {m.memberNumber}</span> : null}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide truncate">{m.email || 'Pas d\'email'}{m.archivedAt ? ` · archivé le ${String(m.archivedAt).split('T')[0]}` : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button type="button" onClick={() => handleRestore(m.id)} className="flex items-center gap-1 bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold text-[11px] uppercase tracking-wide hover:bg-indigo-700"><RotateCcw size={14} /> Restaurer</button>
                        <button type="button" onClick={() => handleHardDelete(m.id)} className="flex items-center gap-1 bg-red-50 text-red-600 px-3 py-2 rounded-xl font-semibold text-[11px] uppercase tracking-wide hover:bg-red-100"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRMPage;
