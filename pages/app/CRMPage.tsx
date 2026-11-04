
import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { norm, closeEnough } from '../../lib/fuzzy';
import AccessPeriodsPanel from '../../components/AccessPeriodsPanel';
import { 
  Search, Filter, MoreHorizontal, UserPlus, Mail, Phone, 
  Target, UserCheck, Briefcase, X, Save, Calendar, 
  MapPin, Activity, Award, Star, History, Building2,
  User, ChevronRight, CheckCircle2, Clock, Trash2,
  ShieldAlert, HeartPulse, ImageIcon, Briefcase as JobIcon,
  CreditCard, ShoppingBag, CalendarCheck, Zap, Edit2, Camera, Upload, StickyNote,
  RotateCcw, Link2, Hash, FileText, Layers, CornerDownRight, AlertTriangle
} from 'lucide-react';
import { getMembers, saveMember, deleteMember, uploadMemberPhoto, getPhotoUrl, createMember, patchMember, getGymId, getArchivedMembers, restoreMember, hardDeleteMember, updateMemberNumber, linkMandate, updateCardNumber, generateCardNumber, updateKeypadCode, generateKeypadCode, setMemberStaff, resendActivationEmail, findMemberDuplicates, type MemberDuplicate } from '../../lib/membersApi';
import { getGroupTree, GroupNode } from '../../lib/groupsApi';
import { enqueueAccessCommand, getMemberVisits, getMemberVisitCount, getPackStatus, type MemberVisit, type PackStatus } from '../../lib/accessApi';
import { getMemberPayments, regularizePayments, recordFormulaPayment, REGULARIZE_METHODS, type MemberPayment } from '../../lib/paymentsApi';
import { getMemberSales, getInvoiceUrl, getProducts, viewInvoice } from '../../lib/boutiqueApi';
import { startMandateSetup, getMemberGocardlessPayments, changeFormula, setupMandateForMember, cancelSubscriptionKeepMandate, type GocardlessPayment } from '../../lib/gocardless';
import { getMemberContracts, getContractUrl, deleteContract } from '../../lib/contractsApi';
import WebcamCapture from '../../components/WebcamCapture';
import MergeMembersModal from '../../components/MergeMembersModal';
import { Member, ContactStatus, Product } from '../../types';
import { listProspects, type ProspectContact } from '../../lib/prospectsApi';
import { Button, ChevronCell, EmptyState, Input, MemberCell, PageHeader, Select, Skeleton, Table, Tabs, Tag, Td, Th, Tr } from '../../components/ui';
import type { TagTone } from '../../components/ui/Tag';
import { phone as formatPhone } from '../../lib/format';

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


// Statut affiché : jamais la valeur brute de la base.
const contactStatus = (m: any): { label: string; tone: TagTone } => {
  if (m.accessBlocked) return { label: 'Bloqué', tone: 'danger' };
  switch (m.status) {
    case 'MEMBER_ACTIVE': return { label: 'Actif', tone: 'success' };
    case 'MEMBER_INACTIVE': return { label: 'Inactif', tone: 'neutral' };
    case 'PARTNER': return { label: 'Partenaire', tone: 'neutral' };
    case 'PROSPECT_TRIAL': return { label: "Séance d'essai", tone: 'warning' };
    case 'PROSPECT_FOLLOWUP': return { label: 'À relancer', tone: 'warning' };
    default: return { label: 'Prospect', tone: 'neutral' };
  }
};

const CRMPage: React.FC<CRMPageProps> = ({ tab = 'membres' }) => {
  const [activeTab, setActiveTab] = useState(tab);
  const [selectedContact, setSelectedContact] = useState<any | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editBackup, setEditBackup] = useState<any | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [mergePrefill, setMergePrefill] = useState<any | null>(null);
  const [emailDupes, setEmailDupes] = useState<MemberDuplicate[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [memberSales, setMemberSales] = useState<any[]>([]);
  const [memberContracts, setMemberContracts] = useState<any[]>([]);
  const [memberPayments, setMemberPayments] = useState<MemberPayment[]>([]);
  // Régularisation des impayés : sélection de lignes + mode/date d'encaissement.
  const [regulSel, setRegulSel] = useState<Set<string>>(new Set<string>());
  const [regulMethod, setRegulMethod] = useState<'cash' | 'credit_card' | 'bank_transfer'>('cash');
  const [regulDate, setRegulDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [regulBusy, setRegulBusy] = useState(false);
  const [memberGcPayments, setMemberGcPayments] = useState<GocardlessPayment[]>([]);
  const [gcPaymentsLoading, setGcPaymentsLoading] = useState(false);
  const [memberVisits, setMemberVisits] = useState<MemberVisit[]>([]);
  const [visitCount, setVisitCount] = useState(0);
  const [visitsLoading, setVisitsLoading] = useState(false);
  const [visitsHasMore, setVisitsHasMore] = useState(true);
  const [packStatus, setPackStatus] = useState<PackStatus | null>(null);
  const [editingFormula, setEditingFormula] = useState(false);
  const [formulaDraft, setFormulaDraft] = useState<{ label: string; price: string; periodicity: string; start: string; end: string; method: string; amount: string }>({ label: '', price: '', periodicity: '', start: '', end: '', method: '', amount: '' });
  const [savingFormula, setSavingFormula] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [detailTab, setDetailTab] = useState<'profil' | 'activite' | 'finance'>('profil');
  const [financeTab, setFinanceTab] = useState<'paiements' | 'contrats' | 'ventes'>('paiements');
  
  // State database & search
  const [contacts, setContacts] = useState<Member[]>([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [prospectContacts, setProspectContacts] = useState<ProspectContact[]>([]);
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
    const load = () => {
      getMembers().then(setContacts).catch(console.error).finally(() => setContactsLoading(false));
      listProspects().then(setProspectContacts).catch(console.error);
    };
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
  const [filterStatus, setFilterStatus] = useState('');
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

  // Ouverture directe d'une fiche via ?member=<id> (recherche du header, Contrôle d'accès, etc.).
  // On dépend de `location` (et pas seulement de `contacts`) : sinon, quand on est DÉJÀ sur la
  // page, changer le paramètre d'URL ne rechargeait pas le composant et rien ne s'ouvrait.
  const location = useLocation();
  const navigate = useNavigate();
  // Page d'origine à laquelle revenir en fermant la fiche (ex. ?from=/app/finance/impayes).
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const deepLinkedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (contacts.length === 0) return;
    // Le paramètre est dans le hash (HashRouter) : location.search le contient, avec repli sur le hash brut.
    const raw = location.search || (window.location.hash.includes('?') ? '?' + window.location.hash.split('?')[1] : '');
    const params = new URLSearchParams(raw);
    const id = params.get('member');
    if (!id) return;
    if (deepLinkedKeyRef.current === location.key) return; // navigation déjà traitée
    const found = contacts.find((c) => c.id === id);
    if (found) {
      deepLinkedKeyRef.current = location.key;
      setReturnTo(params.get('from'));
      openContactDetails(found);
    }
  }, [contacts, location.key, location.search]);

  // Ferme la fiche : revient à la page d'origine si on y est arrivé via ?from=…, sinon reste sur le CRM.
  // Convertit un membre en profil staff : il quitte les vues membres (géré dans « Équipe »).
  const convertToStaff = async () => {
    if (!selectedContact) return;
    if (!window.confirm(`Passer ${selectedContact.firstName} ${selectedContact.lastName} en profil staff ?\n\nLa fiche quitte les listes membres et le contrôle d'accès (le badge reste actif). Elle sera gérée dans « Équipe & Staff ».`)) return;
    try {
      await setMemberStaff(selectedContact.id, true);
      setContacts(await getMembers());
      setIsDetailModalOpen(false);
      if (returnTo) { const dest = returnTo; setReturnTo(null); navigate(dest); }
      alert('Profil converti en staff. Retrouve-le dans « Équipe & Staff ».');
    } catch (e: any) { alert(e?.message || 'Conversion impossible.'); }
  };

  const closeDetail = () => {
    setIsDetailModalOpen(false);
    if (returnTo) { const dest = returnTo; setReturnTo(null); navigate(dest); }
  };

  // Renvoie l'e-mail d'activation (création de mot de passe app) à l'adhérent.
  const [resendingActivation, setResendingActivation] = useState(false);
  const resendActivation = async () => {
    if (!selectedContact?.id) return;
    if (!selectedContact.email) { alert("Cette fiche n'a pas d'e-mail. Ajoutez-en un d'abord."); return; }
    setResendingActivation(true);
    try {
      await resendActivationEmail(selectedContact.id);
      alert(`E-mail d'activation envoyé à ${selectedContact.email}.`);
    } catch (e: any) {
      alert("Envoi impossible :" + (e?.message || ''));
    } finally { setResendingActivation(false); }
  };

  // Après une fusion : recharge la liste et rouvre la fiche conservée.
  const handleMerged = async (keeperId: string) => {
    setMergeOpen(false); setMergePrefill(null);
    try {
      const list = await getMembers();
      setContacts(list);
      const keeper: any = list.find((x: any) => x.id === keeperId);
      if (keeper) setSelectedContact((prev: any) => ({ ...(prev || {}), ...keeper }));
    } catch { /* noop */ }
    alert('Fiches fusionnées : l\'historique et le compte ont été transférés, le doublon est archivé.');
  };

  // Au retour de la signature du mandat GoCardless (#/app/crm?member=<id>&gcpoll=1),
  // on rafraîchit le statut quelques fois — le webhook met ~quelques secondes à synchroniser.
  useEffect(() => {
    const hash = window.location.hash;
    if (!/[?&]gcpoll=1/.test(hash)) return;
    const mm = hash.match(/[?&]member=([^&]+)/);
    const id = mm ? decodeURIComponent(mm[1]) : null;
    if (!id) return;
    let tries = 0; let stopped = false;
    const tick = async () => {
      if (stopped) return;
      tries++;
      try {
        const list = await getMembers();
        setContacts(list);
        const mem: any = list.find((x: any) => x.id === id);
        if (mem) {
          setSelectedContact((prev: any) => (prev && prev.id === id ? { ...prev, ...mem } : prev));
          if (mem.gocardlessStatus === 'mandate_active' || mem.gocardlessStatus === 'mandate_submitted') return;
        }
      } catch { /* noop */ }
      if (tries < 10) setTimeout(tick, 3000);
    };
    setTimeout(tick, 2500);
    return () => { stopped = true; };
  }, []);

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
      const card = cardDraft.trim();
      await updateCardNumber(selectedContact.id, cardDraft);
      updateField('cardNumber', card);
      // Pousse le badge au contrôleur (sinon il reste en base sans être actif à la porte).
      const pin = selectedContact.memberNumber ? String(selectedContact.memberNumber) : '';
      let pushed = false;
      if (pin && card) {
        await enqueueAccessCommand({
          memberId: selectedContact.id, pin,
          cardNumber: card,
          keypadCode: (selectedContact as any).keypadCode || null,
          name: `${selectedContact.firstName || ''} ${selectedContact.lastName || ''}`.trim(),
          action: 'grant',
        });
        pushed = true;
      }
      setContacts(await getMembers());
      setEditingCard(false);
      if (pushed) alert("Badge enregistré et envoyé au contrôleur. Il sera actif à la porte dans quelques secondes.");
      else if (!pin) alert("Badge enregistré. ⚠️ Ce membre n'a pas de numéro d'adhérent : impossible de l'activer au contrôleur.");
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
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const openBlockModal = () => { setBlockReason((selectedContact as any)?.accessBlockReason || ''); setBlockModalOpen(true); };

  // Régularise les impayés sélectionnés (encaissement enregistré au mode + date choisis).
  const regularizeSelected = async () => {
    if (!selectedContact || regulSel.size === 0) return;
    const ids = memberPayments.filter((p) => regulSel.has(p.id)).map((p) => p.id);
    setRegulBusy(true);
    try {
      const n = await regularizePayments(ids, regulMethod, regulDate);
      setRegulSel(new Set<string>());
      setMemberPayments(await getMemberPayments(selectedContact.id));
      const mLabel = REGULARIZE_METHODS.find((m) => m.code === regulMethod)?.label || '';
      alert(`${n} impayé(s) régularisé(s) (${mLabel}, ${new Date(regulDate).toLocaleDateString('fr-FR')}).`);
    } catch (e: any) {
      alert(e?.message || 'Régularisation impossible.');
    } finally { setRegulBusy(false); }
  };

  const sendAccess = async (action: 'grant' | 'unblock' | 'revoke') => {
    if (!selectedContact) return;
    const pin = selectedContact.memberNumber ? String(selectedContact.memberNumber) : '';
    if (!pin) { alert("Ce membre n'a pas de numéro d'adhérent."); return; }
    setAccessBusy(true);
    try {
      // Date de fin transmise au contrôleur UNIQUEMENT si elle est dans le futur.
      // Réactiver un accès dont la date est déjà passée avec une date passée ferait
      // expirer le badge aussitôt — dans ce cas on ouvre l'accès (NoResa gère l'expiration).
      const subEnd = (selectedContact as any).subscriptionEnd as string | undefined;
      const todayIso = new Date().toISOString().slice(0, 10);
      const endTime = subEnd && subEnd.slice(0, 10) > todayIso ? subEnd.slice(0, 10).replace(/-/g, '') : null;
      await enqueueAccessCommand({
        memberId: selectedContact.id, pin,
        cardNumber: selectedContact.cardNumber || null,
        keypadCode: (selectedContact as any).keypadCode || null,
        name: `${selectedContact.firstName || ''} ${selectedContact.lastName || ''}`.trim(),
        action,
        endTime,
      });
      // Activer / Débloquer lèvent le statut « bloqué » ET annulent tout blocage programmé
      // encore en attente (sinon il pourrait re-couper l'accès juste après la réactivation).
      if (action === 'grant' || action === 'unblock') {
        await patchMember(selectedContact.id, {
          access_blocked: false, access_block_reason: null, access_blocked_at: null,
          access_block_scheduled_at: null, access_block_scheduled_reason: null,
        });
        updateField('accessBlocked' as any, false);
        updateField('accessBlockReason' as any, undefined);
        updateField('accessBlockScheduledAt' as any, undefined);
      }
      const label = { grant: 'Création/activation', unblock: 'Déblocage', revoke: 'Suppression' }[action];
      alert(`${label} de l'accès demandé. Le pont l'appliquera sur le contrôleur dans quelques secondes.`);
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Impossible d'envoyer la commande d'accès.");
    } finally { setAccessBusy(false); }
  };

  const confirmBlock = async () => {
    if (!selectedContact) return;
    const pin = selectedContact.memberNumber ? String(selectedContact.memberNumber) : '';
    if (!pin) { alert("Ce membre n'a pas de numéro d'adhérent."); return; }
    setAccessBusy(true);
    try {
      const reason = blockReason.trim();
      await patchMember(selectedContact.id, { access_blocked: true, access_block_reason: reason || null, access_blocked_at: new Date().toISOString() });
      await enqueueAccessCommand({
        memberId: selectedContact.id, pin,
        cardNumber: selectedContact.cardNumber || null,
        keypadCode: (selectedContact as any).keypadCode || null,
        name: `${selectedContact.firstName || ''} ${selectedContact.lastName || ''}`.trim(),
        action: 'block',
      });
      updateField('accessBlocked' as any, true);
      updateField('accessBlockReason' as any, reason || undefined);
      setBlockModalOpen(false);
      alert("Accès bloqué. Le pont l'appliquera sur le contrôleur dans quelques secondes.");
    } catch (err: any) {
      console.error(err);
      alert(err?.message || "Impossible de bloquer l'accès.");
    } finally { setAccessBusy(false); }
  };

  // --- Blocage programmé (date future, appliqué par un job quotidien) ---
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleReason, setScheduleReason] = useState('');
  const saveScheduledBlock = async () => {
    if (!selectedContact || !scheduleDate) { alert('Choisis une date.'); return; }
    setAccessBusy(true);
    try {
      await patchMember(selectedContact.id, { access_block_scheduled_at: scheduleDate, access_block_scheduled_reason: scheduleReason.trim() || null });
      updateField('accessBlockScheduledAt' as any, scheduleDate);
      updateField('accessBlockScheduledReason' as any, scheduleReason.trim() || undefined);
      setScheduleOpen(false); setScheduleDate(''); setScheduleReason('');
      alert(`Blocage programmé le ${new Date(scheduleDate).toLocaleDateString('fr-FR')}. L'accès sera coupé automatiquement ce jour-là.`);
    } catch (e: any) { console.error(e); alert(e?.message || 'Impossible de programmer le blocage.'); }
    finally { setAccessBusy(false); }
  };
  // Note interne (consultable sur la fiche + signalée sur le contrôle d'accès)
  const [savingNote, setSavingNote] = useState(false);
  const saveNote = async () => {
    if (!selectedContact?.id) return;
    setSavingNote(true);
    try {
      await patchMember(selectedContact.id, { notes: (selectedContact.notes || '').trim() || null });
      setContacts(await getMembers());
    } catch (e: any) { console.error(e); alert(e?.message || 'Enregistrement impossible.'); }
    finally { setSavingNote(false); }
  };

  const cancelScheduledBlock = async () => {
    if (!selectedContact) return;
    setAccessBusy(true);
    try {
      await patchMember(selectedContact.id, { access_block_scheduled_at: null, access_block_scheduled_reason: null });
      updateField('accessBlockScheduledAt' as any, undefined);
      updateField('accessBlockScheduledReason' as any, undefined);
    } catch (e: any) { console.error(e); alert(e?.message || 'Erreur.'); }
    finally { setAccessBusy(false); }
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
    setRegulSel(new Set<string>()); // repart d'une sélection vide à chaque fiche
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
      setPackStatus(null); setEmailDupes([]);
      setMemberGcPayments([]); setGcPaymentsLoading(false);
    }
    return () => { active = false; };
  }, [selectedContact?.id]);

  // Rapprochement : détection réactive à l'e-mail/nom (une autre fiche partage le même
  // e-mail OU le même nom → compte app auto-inscrit à relier). Se relance dès qu'on
  // ajoute/modifie l'e-mail sur la fiche, sans rouvrir.
  useEffect(() => {
    let active = true;
    const id = selectedContact?.id;
    if (!id) { setEmailDupes([]); return; }
    const t = setTimeout(() => {
      findMemberDuplicates(
        { email: selectedContact?.email, firstName: selectedContact?.firstName, lastName: selectedContact?.lastName },
        id,
      ).then((d) => { if (active) setEmailDupes(d); });
    }, 300);
    return () => { active = false; clearTimeout(t); };
  }, [selectedContact?.id, selectedContact?.email, selectedContact?.firstName, selectedContact?.lastName]);

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
      method: selectedContact?.paymentMethod || 'Prélèvement',
      amount: '',
    });
    setEditingFormula(true);
  };
  // (Re)ouvre la page GoCardless de signature du mandat (RIB) pour un membre en attente.
  const [resumingMandate, setResumingMandate] = useState(false);
  const resumeMandateSignature = async () => {
    if (!selectedContact?.id) return;
    setResumingMandate(true);
    try {
      const redirect = `${window.location.origin}/#/app/crm`;
      const r = await setupMandateForMember(selectedContact.id, selectedContact.subscription || 'Abonnement', Number(selectedContact.price) || 0, redirect);
      window.location.href = r.authorisation_url; // page RIB GoCardless (le client signe sur place)
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Impossible d'ouvrir la signature du mandat.");
      setResumingMandate(false);
    }
  };

  const handleSaveFormula = async () => {
    if (!selectedContact?.id) return;
    if (!formulaDraft.label || formulaDraft.price === '') { alert('Choisis une formule.'); return; }
    const price = Number(formulaDraft.price);
    const method = formulaDraft.method || 'Prélèvement';
    const hasMandate = !!(selectedContact.gocardlessMandateId) && (selectedContact.gocardlessStatus === 'mandate_active' || selectedContact.gocardlessStatus === 'mandate_submitted');

    // ========================================================================
    // ENCAISSEMENT DIRECT (CB / Espèces / Chèque / Virement) — pas de prélèvement.
    // On met à jour la formule, on encaisse le montant (CA) et on ouvre l'accès
    // jusqu'à la date de fin éventuelle. Un prélèvement en cours est ARRÊTÉ (mandat gardé).
    // ========================================================================
    if (method !== 'Prélèvement') {
      const amount = formulaDraft.amount !== '' ? Number(formulaDraft.amount) : price;
      if (isNaN(amount) || amount < 0) { alert('Montant à encaisser invalide.'); return; }
      const end = formulaDraft.end || null;
      const msg = `Changer pour « ${formulaDraft.label} » et encaisser ${amount.toFixed(2).replace('.', ',')} € en ${method}`
        + (end ? `, accès jusqu'au ${new Date(end).toLocaleDateString('fr-FR')}` : '')
        + (hasMandate ? `.\n\n⚠️ Le prélèvement automatique en cours sera ARRÊTÉ (mandat conservé).` : '.')
        + `\n\nContinuer ?`;
      if (!window.confirm(msg)) return;
      setSavingFormula(true);
      try {
        // Stoppe le prélèvement en cours s'il y en a un (conserve le mandat réutilisable).
        if (hasMandate) {
          const resCancel = await cancelSubscriptionKeepMandate(selectedContact.id, formulaDraft.label, price, method, formulaDraft.periodicity || undefined);
          if (resCancel.error) { alert("Échec de l'arrêt du prélèvement :" + resCancel.error); return; }
        }
        await recordFormulaPayment({
          memberId: selectedContact.id, label: formulaDraft.label, price, method,
          amount, date: todayStr, end,
        });
        updateField('subscription', formulaDraft.label);
        updateField('price', price);
        if (end) updateField('subscriptionEnd', end);
        setContacts(await getMembers());
        setMemberPayments(await getMemberPayments(selectedContact.id));
        if (selectedContact.gocardlessCustomerId || selectedContact.gocardlessMandateId) getMemberGocardlessPayments(selectedContact.id).then((p) => setMemberGcPayments(p));
        setEditingFormula(false);
        alert(`Formule changée et ${amount.toFixed(2).replace('.', ',')} € encaissé(s) en ${method}.`);
      } catch (err: any) { console.error(err); alert(err?.message || "Échec de l'encaissement."); }
      finally { setSavingFormula(false); }
      return;
    }

    // ========================================================================
    // PRÉLÈVEMENT SEPA (GoCardless)
    // ========================================================================
    // CAS B — membre SANS mandat : mise en place du mandat (RIB).
    if (!hasMandate) {
      const okSetup = window.confirm(`« ${formulaDraft.label} » est une formule en prélèvement SEPA.\n\nCe membre n'a pas encore de mandat : il va être redirigé vers GoCardless pour saisir son RIB et signer le mandat. L'abonnement sera créé automatiquement après la signature.\n\nContinuer ?`);
      if (!okSetup) return;
      setSavingFormula(true);
      try {
        const redirect = `${window.location.origin}/#/app/crm?member=${selectedContact.id}&gcpoll=1`;
        const r = await setupMandateForMember(selectedContact.id, formulaDraft.label, price, redirect);
        window.location.href = r.authorisation_url; // page RIB GoCardless (le client signe sur place)
        return;
      } catch (err: any) {
        console.error(err);
        alert(err?.message || 'Impossible de démarrer la mise en place du mandat.');
        setSavingFormula(false);
      }
      return;
    }

    // CAS C — formule à prélèvement + mandat existant : bascule de l'abonnement (ci-dessous).
    {
      const ok = window.confirm(`Changer la formule de ce membre prélevé pour « ${formulaDraft.label} » (${price.toFixed(2).replace('.', ',')} €) ?\n\nL'abonnement GoCardless actuel sera annulé et un nouveau sera créé au montant de la formule. À ne faire que si le client est d'accord.`);
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

  const applyFichePhoto = async (file: File) => {
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
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permet de re-sélectionner le même fichier
    if (file) applyFichePhoto(file);
  };

  const applyAddPhoto = (file: File) => {
    setAddPhotoFile(file);
    setAddPhotoPreview(URL.createObjectURL(file));
  };
  const handleAddPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) applyAddPhoto(file);
  };

  // Cible de la capture webcam : fiche membre existant ou formulaire d'ajout
  const [webcamFor, setWebcamFor] = useState<null | 'member' | 'add'>(null);

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
      alert("Échec de l'inscription :" + ((e as Error)?.message || ''));
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

  // Conversion prospect -> membre : on dépose les infos puis on ouvre l'inscription
  // (qui pré-remplit et marquera le prospect "converti" après création du membre).
  const convertProspect = (p: any) => {
    try {
      sessionStorage.setItem('noresa_prospect_prefill', JSON.stringify({
        prospectId: p.id,
        firstName: p.firstName,
        lastName: p.lastName,
        phone: p.phone,
        email: p.email,
      }));
    } catch { /* ignore */ }
    window.location.hash = '#/app/inscription';
  };

  const getFilteredData = () => {
    let filtered = contacts;

    if (activeTab === 'membres') {
      filtered = contacts.filter(m => m.status === 'MEMBER_ACTIVE' || m.status === 'MEMBER_INACTIVE');
    } else if (activeTab === 'prospects') {
      // Prospects = union : leads sans compte (table `prospects`, ex. séances d'essai)
      // + inscrits via l'app non encore payés (membres en statut 'prospect').
      const leads = prospectContacts.map(p => ({ ...p, __kind: 'lead' as const }));
      const memberProspects = contacts
        .filter(m => m.status === 'PROSPECT_NEW' || m.status === 'PROSPECT_FOLLOWUP' || m.status === 'PROSPECT_TRIAL')
        .map(m => ({ ...m, __kind: 'member' as const }));
      filtered = [...leads, ...memberProspects] as any;
    } else if (activeTab === 'partenaires') {
      filtered = contacts.filter(m => m.status === 'PARTNER');
    }

    if (searchTerm.trim() !== '') {
      // Recherche souple : accents ignorés, groupe/sous-groupe inclus, et
      // rattrapage des fautes de frappe (distance de Levenshtein sur les mots).
      const words = norm(searchTerm).split(/\s+/).filter(Boolean);
      filtered = filtered.filter((m) => {
        const hay = norm([
          m.firstName, m.lastName, m.memberNumber, m.email, m.phone, m.notes,
          (m as any).groupName, (m as any).subgroupName, (m as any).cardNumber,
        ].filter(Boolean).join(' '));
        const tokens = hay.split(/\s+/).filter((t) => t.length > 2);
        return words.every((w) =>
          hay.includes(w) || tokens.some((t) => closeEnough(t, w)));
      });
    }

    if (filterGroup) {
      filtered = filtered.filter(m =>
        (m as any).groupName === filterGroup &&
        (!filterSubgroup || (m as any).subgroupName === filterSubgroup)
      );
    }

    if (activeTab === 'membres' && filterStatus) {
      filtered = filtered.filter((m: any) =>
        filterStatus === 'blocked' ? m.accessBlocked
          : filterStatus === 'active' ? m.status === 'MEMBER_ACTIVE' && !m.accessBlocked
            : m.status === 'MEMBER_INACTIVE');
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

  const filteredRows = getFilteredData();
  const memberCount = contacts.filter((m) => m.status === 'MEMBER_ACTIVE').length;
  const listSubtitle = contactsLoading ? '\u00a0'
    : activeTab === 'membres' ? `${memberCount} actifs${searchTerm || filterGroup || filterStatus ? ` · ${filteredRows.length} affichés` : ''}`
      : `${filteredRows.length} fiche${filteredRows.length > 1 ? 's' : ''}`;

  return (
    <div className="space-y-4">
      <PageHeader
        title={activeTab === 'prospects' ? 'Prospects' : activeTab === 'partenaires' ? 'Partenaires' : 'Membres'}
        subtitle={listSubtitle}
        ruled={false}
        actions={<>
          <Button variant="secondary" icon={Trash2} onClick={openArchived}>Archivés</Button>
          <Button
            icon={UserPlus}
            onClick={() => { if (activeTab === 'membres' || activeTab === undefined) { window.location.hash = '#/app/inscription'; } else { setIsAddModalOpen(true); } }}
          >
            {activeTab === 'partenaires' ? 'Ajouter un partenaire' : activeTab === 'prospects' ? 'Ajouter un prospect' : 'Nouvelle inscription'}
          </Button>
        </>}
      />

      <Tabs
        value={activeTab}
        onChange={setActiveTab}
        items={[{ value: 'membres', label: 'Membres' }, { value: 'prospects', label: 'Prospects' }, { value: 'partenaires', label: 'Partenaires' }]}
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" size={16} />
          <Input
            aria-label="Rechercher"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={activeTab === 'partenaires' ? 'Nom, téléphone…' : 'Nom, n° client, téléphone…'}
            className="pl-9"
          />
        </div>
        <Select aria-label="Groupe" value={filterGroup} onChange={(e) => { setFilterGroup(e.target.value); setFilterSubgroup(''); }}>
          <option value="">Tous les groupes</option>
          {groupTree.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
        </Select>
        {filterGroup && (groupTree.find((g) => g.name === filterGroup)?.subgroups.length ?? 0) > 0 && (
          <Select aria-label="Sous-groupe" value={filterSubgroup} onChange={(e) => setFilterSubgroup(e.target.value)}>
            <option value="">Tous les sous-groupes</option>
            {(groupTree.find((g) => g.name === filterGroup)?.subgroups ?? []).map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
          </Select>
        )}
        {activeTab === 'membres' && (
          <Select aria-label="Statut" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">Statut : tous</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
            <option value="blocked">Bloqués</option>
          </Select>
        )}
        <Select aria-label="Trier" value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="ml-auto">
          <option value="name_asc">Trier : nom A → Z</option>
          <option value="name_desc">Trier : nom Z → A</option>
          <option value="number_asc">Trier : n° client croissant</option>
          <option value="number_desc">Trier : n° client décroissant</option>
          <option value="date_desc">Trier : inscription récente</option>
          <option value="date_asc">Trier : inscription ancienne</option>
        </Select>
      </div>

      <Table>
        <thead>
          <tr>
            <Th>{activeTab === 'partenaires' ? 'Entreprise' : 'Membre'}</Th>
            <Th>N° client</Th>
            <Th>Téléphone</Th>
            <Th>Abonnement</Th>
            <Th>Statut</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          {contactsLoading && contacts.length === 0 && [0, 1, 2, 3, 4, 5].map((i) => (
            <tr key={i}><td colSpan={6} className="px-4 py-2.5 border-b border-line-soft"><Skeleton className="h-8 w-full" /></td></tr>
          ))}
          {filteredRows.map((member: any) => {
            const status = contactStatus(member);
            const isLead = activeTab === 'prospects' && member.__kind === 'lead';
            return (
              <Tr key={member.id} onClick={isLead ? undefined : () => openContactDetails(member)}>
                <Td><MemberCell name={member.status === 'PARTNER' ? member.lastName : `${member.firstName} ${member.lastName}`} email={member.email} /></Td>
                <Td>{member.memberNumber}</Td>
                <Td className="whitespace-nowrap">{member.phone ? formatPhone(member.phone) : null}</Td>
                <Td>{member.subscription}</Td>
                <Td><Tag tone={status.tone}>{status.label}</Tag></Td>
                {isLead ? (
                  <td className="px-4 py-2.5 border-b border-line-soft text-right">
                    <Button variant="secondary" onClick={(e) => { e.stopPropagation(); convertProspect(member); }}>Convertir en membre</Button>
                  </td>
                ) : <ChevronCell />}
              </Tr>
            );
          })}
        </tbody>
      </Table>
      {!contactsLoading && filteredRows.length === 0 && (
        <EmptyState title={searchTerm || filterGroup || filterStatus ? 'Aucun résultat' : 'Aucune fiche'}>
          {searchTerm || filterGroup || filterStatus ? 'Essaie un autre filtre ou un autre terme.' : undefined}
        </EmptyState>
      )}

      {/* MODALE AJOUT UNIFIEE */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-ink/50 animate-in fade-in duration-300">
          <div className="bg-surface w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in duration-300 flex flex-col">
            
            <div className="p-5 bg-primary text-white flex justify-between items-center shrink-0">
              <div className="flex items-center space-x-4">
                <div className="p-3 bg-ink-2">
                  <UserPlus size={28} />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold">Ajouter un {activeTab.slice(0, -1)}</h2>
                  <p className="text-primary-soft text-xs font-semibold mt-0.5">Enregistrement complet du profil</p>
                </div>
              </div>
              <button onClick={closeAddModal} className="p-2 hover:bg-white/10 transition-colors"><X size={24} /></button>
            </div>

            {mandateResult && (
              <div className="p-6 space-y-6 text-center overflow-y-auto">
                <div className="mx-auto w-16 h-16 rounded-full bg-success-soft text-success-text flex items-center justify-center"><CheckCircle2 size={32} /></div>
                <div>
                  <h3 className="text-xl font-semibold text-ink">Fiche créée{mandateResult.member_number ? ` (n° ${mandateResult.member_number})` : ''}</h3>
                  <p className="text-sm text-muted mt-1">Dernière étape : le client signe son mandat de prélèvement (sur place ou via ce lien).</p>
                </div>
                <div className="bg-ground-2 border border-line p-4 text-left break-all text-xs font-semibold text-ink-2">{mandateResult.authorisation_url}</div>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <a href={mandateResult.authorisation_url} target="_blank" rel="noreferrer" className="px-8 py-4 bg-primary text-white font-semibold text-sm hover:bg-primary-dark transition-colors">Ouvrir la signature</a>
                  <button type="button" onClick={() => { try { navigator.clipboard?.writeText(mandateResult.authorisation_url); } catch (_) {} }} className="px-8 py-4 bg-line-soft text-ink-2 font-semibold text-sm hover:bg-line transition-colors">Copier le lien</button>
                </div>
                <button type="button" onClick={closeAddModal} className="text-xs font-semibold text-muted hover:text-ink-2 underline">Terminer</button>
              </div>
            )}

            {!mandateResult && (
            <form onSubmit={handleSaveAdd} className="flex-grow overflow-y-auto p-5 space-y-6 pwa-hide-scrollbar">
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                <div className="space-y-6">
                  <h3 className="text-xs font-semibold text-primary flex items-center space-x-2">
                    <User size={14} /> <span>1. Informations Générales</span>
                  </h3>

                  {activeTab !== 'partenaires' && (
                    <div className="flex items-center space-x-4">
                      <button type="button" onClick={() => addPhotoInputRef.current?.click()} className="w-20 h-20 bg-ground-2 border-2 border-dashed border-line flex items-center justify-center overflow-hidden hover:border-primary transition-colors shrink-0">
                        {addPhotoPreview ? <img src={addPhotoPreview} alt="" className="w-full h-full object-cover" /> : <Camera size={22} className="text-subtle" />}
                      </button>
                      <div>
                        <p className="text-xs font-semibold text-ink-2">Photo du membre</p>
                        <div className="flex items-center gap-3 mt-1">
                          <button type="button" onClick={() => addPhotoInputRef.current?.click()} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"><Upload size={13} /> Importer</button>
                          <button type="button" onClick={() => setWebcamFor('add')} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"><Camera size={13} /> Webcam</button>
                        </div>
                      </div>
                      <input ref={addPhotoInputRef} type="file" accept="image/*" onChange={handleAddPhoto} className="hidden" />
                    </div>
                  )}
                  
                  {activeTab === 'partenaires' ? (
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted">Nom de l'entreprise</label>
                        <input type="text" required value={partnerCompany} onChange={(e) => setPartnerCompany(e.target.value)} placeholder="FitSupply Ltd" className="w-full bg-ground-2 border border-line px-4 py-3 text-sm font-semibold outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted">Catégorie</label>
                        <select value={partnerCategory} onChange={(e) => setPartnerCategory(e.target.value)} className="w-full bg-ground-2 border border-line px-4 py-3 text-sm font-semibold outline-none">
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
                        <label className="text-xs font-semibold text-muted">Prénom</label>
                        <input type="text" required value={addFirstName} onChange={(e) => setAddFirstName(e.target.value)} placeholder="Jean" className="w-full bg-ground-2 border border-line px-4 py-3 text-sm font-semibold outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted">Nom</label>
                        <input type="text" required value={addLastName} onChange={(e) => setAddLastName(e.target.value)} placeholder="Dupont" className="w-full bg-ground-2 border border-line px-4 py-3 text-sm font-semibold outline-none" />
                      </div>
                    </div>
                  )}

                  {activeTab !== 'partenaires' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted">Date de Naissance</label>
                        <input type="date" required value={addDob} onChange={(e) => setAddDob(e.target.value)} className="w-full bg-ground-2 border border-line px-4 py-3 text-sm font-semibold outline-none" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted">Métier</label>
                        <input type="text" value={addJob} onChange={(e) => setAddJob(e.target.value)} placeholder="Ingénieur, Chef..." className="w-full bg-ground-2 border border-line px-4 py-3 text-sm font-semibold outline-none" />
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted flex items-center space-x-1">
                        <Mail size={10} /> <span>Email {activeTab === 'partenaires' ? 'de contact' : ''}</span>
                      </label>
                      <input type="email" required value={addEmail} onChange={(e) => setAddEmail(e.target.value)} placeholder="contact@domaine.com" className="w-full bg-ground-2 border border-line px-4 py-3 text-sm font-semibold outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted flex items-center space-x-1">
                        <Phone size={10} /> <span>Téléphone</span>
                      </label>
                      <input type="tel" required value={addPhone} onChange={(e) => setAddPhone(e.target.value)} placeholder="06 12 34 56 78" className="w-full bg-ground-2 border border-line px-4 py-3 text-sm font-semibold outline-none" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted flex items-center space-x-1">
                        <MapPin size={10} /> <span>Adresse</span>
                      </label>
                      <input type="text" value={addAddress} onChange={(e) => setAddAddress(e.target.value)} placeholder="12 rue des Lilas" className="w-full bg-ground-2 border border-line px-4 py-3 text-sm font-semibold outline-none" />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted">Code postal</label>
                        <input type="text" value={addPostalCode} onChange={(e) => setAddPostalCode(e.target.value)} placeholder="11400" className="w-full bg-ground-2 border border-line px-4 py-3 text-sm font-semibold outline-none" />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <label className="text-xs font-semibold text-muted">Ville</label>
                        <input type="text" value={addCity} onChange={(e) => setAddCity(e.target.value)} placeholder="Castelnaudary" className="w-full bg-ground-2 border border-line px-4 py-3 text-sm font-semibold outline-none" />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <h3 className="text-xs font-semibold text-primary flex items-center space-x-2">
                    <Target size={14} /> <span>2. {activeTab === 'membres' ? 'Formule & Paiement' : 'Qualification & Suivi'}</span>
                  </h3>

                  {activeTab === 'membres' ? (
                    <div className="space-y-5">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-muted">Formule d'abonnement</label>
                        <select value={addFormula} onChange={(e) => selectFormula(e.target.value)} className="w-full bg-ground-2 border border-line px-4 py-3 text-sm font-semibold outline-none">
                          <option value="">— Choisir une formule —</option>
                          {formulaOptions.map(f => <option key={f.id} value={f.name}>{f.name} ({f.price.toFixed(2).replace('.', ',')} €)</option>)}
                        </select>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-muted">Prix (€)</label>
                          <input type="text" value={addPrice} onChange={(e) => setAddPrice(e.target.value)} placeholder="29.90" className="w-full bg-ground-2 border border-line px-4 py-3 text-sm font-semibold outline-none" />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-muted">Périodicité</label>
                          <select value={addPeriodicity} onChange={(e) => setAddPeriodicity(e.target.value)} className="w-full bg-ground-2 border border-line px-4 py-3 text-sm font-semibold outline-none">
                            <option>Mensuel</option>
                            <option>Trimestriel</option>
                            <option>Annuel</option>
                            <option>Ponctuel</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-5 bg-primary-soft border border-line">
                        <div className="flex items-center space-x-3">
                          <div className="bg-surface p-2 text-primary"><CreditCard size={20} /></div>
                          <div>
                            <p className="text-sm font-semibold text-primary-dark">Prélèvement GoCardless</p>
                            <p className="text-xs font-semibold text-primary">Génère un mandat à faire signer</p>
                          </div>
                        </div>
                        <button type="button" onClick={() => setUseMandate(!useMandate)} className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${useMandate ? 'bg-primary' : 'bg-subtle'}`}>
                          <span className={`inline-block h-5 w-5 transform rounded-full bg-surface transition-transform ${useMandate ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                      {useMandate && <p className="text-xs font-semibold text-muted px-1">Un lien de signature sera généré : le client le signe sur place (tablette) ou via le lien. L'email est alors obligatoire.</p>}

                      {!useMandate && (
                        <div className="space-y-3 p-5 bg-ground-2 border border-line">
                          <p className="text-xs font-semibold text-muted">Paiement & période (sans prélèvement)</p>
                          <div className="space-y-1">
                            <label className="text-xs font-semibold text-muted">Mode de paiement</label>
                            <select value={addPaymentMethod} onChange={(e) => setAddPaymentMethod(e.target.value)} className="w-full bg-surface border border-line px-4 py-3 text-sm font-semibold outline-none">
                              <option>Espèces</option>
                              <option>Carte bancaire</option>
                              <option>Chèque</option>
                              <option>Virement</option>
                              <option>Chèque(s) vacances / ANCV</option>
                            </select>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-muted">Début</label>
                              <input type="date" value={addStartDate} onChange={(e) => onStartChange(e.target.value)} className="w-full bg-surface border border-line px-4 py-3 text-sm font-semibold outline-none" />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-muted">Durée</label>
                              <select value={addDuration} onChange={(e) => onDurationChange(e.target.value)} className="w-full bg-surface border border-line px-4 py-3 text-sm font-semibold outline-none">
                                <option>1 mois</option>
                                <option>3 mois</option>
                                <option>6 mois</option>
                                <option>12 mois</option>
                                <option>Ponctuel</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-semibold text-muted">Fin</label>
                              <input type="date" value={addEndDate} onChange={(e) => setAddEndDate(e.target.value)} className="w-full bg-surface border border-line px-4 py-3 text-sm font-semibold outline-none" />
                            </div>
                          </div>
                          <p className="text-xs font-semibold text-muted px-1">La date de fin se calcule automatiquement selon la durée, et reste modifiable. Elle sert aux alertes de renouvellement du tableau de bord.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4 p-6 bg-ground-2 border border-line">
                        <label className="text-xs font-semibold text-muted">Étape de conversion</label>
                        <div className="grid grid-cols-1 gap-2">
                          {activeTab === 'prospects' ? (
                            ['PROSPECT_NEW', 'PROSPECT_FOLLOWUP', 'PROSPECT_TRIAL'].map(status => (
                              <label key={status} className="flex items-center space-x-3 p-3 bg-surface border border-transparent hover:border-line cursor-pointer transition-colors">
                                <input type="radio" name="status" value={status} checked={addStatus === status} onChange={() => setAddStatus(status as ContactStatus)} className="w-4 h-4 text-primary" />
                                <span className="text-xs font-semibold">
                                  {status === 'PROSPECT_NEW' ? 'Nouveau Prospect' : status === 'PROSPECT_FOLLOWUP' ? 'Relancé' : 'En période d\'essai'}
                                </span>
                              </label>
                            ))
                          ) : (
                            <div className="p-3 bg-primary-soft border border-line text-primary-dark text-xs font-semibold flex items-center space-x-2">
                              <Briefcase size={16} /> <span>Partenaire Officiel</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {activeTab === 'prospects' && (
                        <div className="flex items-center justify-between p-6 bg-primary-soft border border-line">
                          <div className="flex items-center space-x-3">
                            <div className="bg-surface p-2 text-primary"><Activity size={20} /></div>
                            <div>
                              <p className="text-sm font-semibold text-primary-dark">Séance d'essai</p>
                              <p className="text-xs font-semibold text-primary">A-t-il testé la salle ?</p>
                            </div>
                          </div>
                          <button type="button" onClick={() => setTrialSession(!trialSession)} className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none ${trialSession ? 'bg-primary' : 'bg-subtle'}`}>
                            <span className={`inline-block h-5 w-5 transform rounded-full bg-surface transition-transform ${trialSession ? 'translate-x-6' : 'translate-x-1'}`} />
                          </button>
                        </div>
                      )}
                    </>
                  )}

                  <div className="p-6 bg-danger-soft border border-danger-soft space-y-4">
                    <div className="flex items-center space-x-2 text-danger-text">
                      <ShieldAlert size={16} />
                      <span className="text-xs font-semibold">Notes & Informations complémentaires</span>
                    </div>
                    <div className="w-full">
                      <textarea rows={3} value={addNotes} onChange={(e) => setAddNotes(e.target.value)} placeholder="Commentaires ou objectifs du membre/prospect..." className="w-full bg-surface border border-danger-soft px-4 py-3 text-xs font-semibold outline-none"></textarea>
                    </div>
                  </div>
                </div>
              </div>
            </form>
            )}

            {!mandateResult && (
            <div className="p-5 border-t border-line flex items-center justify-between shrink-0 bg-surface">
               <button onClick={closeAddModal} className="px-6 py-4 text-muted font-semibold text-sm hover:text-ink-2">Annuler</button>
               {activeTab === 'membres' ? (
                 <button
                   onClick={handleInscribeMember}
                   disabled={submitting}
                   className="flex items-center space-x-2 bg-primary text-white px-10 py-4 font-semibold text-sm hover:bg-primary-dark transition-colors disabled:opacity-60"
                 >
                   <Save size={18} />
                   <span>{submitting ? 'Création…' : (useMandate ? 'Inscrire + générer le mandat' : 'Inscrire le membre')}</span>
                 </button>
               ) : (
                 <button
                  onClick={handleSaveAdd}
                  className="flex items-center space-x-2 bg-primary text-white px-10 py-4 font-semibold text-sm hover:bg-primary-dark transition-colors"
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ink/50 animate-in fade-in duration-300">
          <div className="bg-surface w-full max-w-4xl max-h-[90vh] overflow-hidden animate-in duration-300 flex flex-col">
            
            <div className="px-6 py-4 bg-surface border-b-2 border-ink flex items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-5 min-w-0">
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="w-16 h-16 rounded-full bg-line-soft text-ink-2 flex items-center justify-center text-xl font-semibold overflow-hidden group relative"
                    title="Ajouter ou changer la photo"
                  >
                    {photoUrl ? (
                      <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span>{getInitials(selectedContact.firstName, selectedContact.lastName)}</span>
                    )}
                    <span className="absolute inset-0 bg-ink/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera size={22} className="text-white" />
                    </span>
                  </button>
                  {photoUploading && (
                    <span className="absolute inset-0 bg-ink/50 rounded-full flex items-center justify-center text-white text-xs font-semibold">Envoi…</span>
                  )}
                  <button type="button" onClick={() => setWebcamFor('member')} title="Prendre une photo (webcam)" className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-surface text-primary flex items-center justify-center border border-line hover:bg-primary-soft"><Camera size={13} /></button>
                  <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                </div>
                <div>
                  <h2 className="text-2xl font-extrabold text-ink truncate">{activeTab === 'partenaires' ? selectedContact.company : `${selectedContact.firstName} ${selectedContact.lastName}`}</h2>
                  <div className="flex items-center space-x-3 mt-2">
                    <span className="bg-line-soft text-ink-2 px-2 py-0.5 text-xs font-semibold">
                      {activeTab === 'prospects' ? 'Prospect' : activeTab === 'membres' ? (selectedContact.subscription || 'Membre actif') : selectedContact.category}
                    </span>
                    {activeTab === 'membres' && (
                      <span className="text-sm text-muted">
                        N° adhérent {selectedContact.memberNumber || '—'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button aria-label="Fermer" onClick={closeDetail} className="h-9 w-9 inline-flex items-center justify-center shrink-0 text-ink hover:bg-ground transition-colors"><X size={18} /></button>
            </div>

            {/* Onglets de navigation interne à la fiche client */}
            {activeTab === 'membres' && (
              <div className="px-10 border-b border-line flex items-center bg-ground-2">
                <button onClick={() => setDetailTab('profil')} className={`px-6 py-4 text-xs font-semibold border-b-4 transition-colors ${detailTab === 'profil' ? 'border-primary text-primary' : 'border-transparent text-muted'}`}>Profil</button>
                <button onClick={() => setDetailTab('activite')} className={`px-6 py-4 text-xs font-semibold border-b-4 transition-colors ${detailTab === 'activite' ? 'border-primary text-primary' : 'border-transparent text-muted'}`}>Visites & Cours</button>
                <button onClick={() => setDetailTab('finance')} className={`px-6 py-4 text-xs font-semibold border-b-4 transition-colors ${detailTab === 'finance' ? 'border-primary text-primary' : 'border-transparent text-muted'}`}>Abonnement & Achats</button>
              </div>
            )}

            <div className="flex-grow overflow-y-auto p-6 sm:p-8 space-y-6 pwa-hide-scrollbar">

              {isEditing ? (
                <div className="max-w-2xl mx-auto space-y-6">
                  <h3 className="text-xs font-semibold text-primary flex items-center space-x-2">
                    <Edit2 size={14} /> <span>Modifier la fiche</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted">Prénom</label>
                      <input type="text" value={selectedContact.firstName || ''} onChange={(e) => updateField('firstName', e.target.value)} className="w-full bg-ground-2 border border-line px-4 py-3 text-sm font-semibold outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted">Nom</label>
                      <input type="text" value={selectedContact.lastName || ''} onChange={(e) => updateField('lastName', e.target.value)} className="w-full bg-ground-2 border border-line px-4 py-3 text-sm font-semibold outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted">Email</label>
                      <input type="email" value={selectedContact.email || ''} onChange={(e) => updateField('email', e.target.value)} className="w-full bg-ground-2 border border-line px-4 py-3 text-sm font-semibold outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted">Téléphone</label>
                      <input type="tel" value={selectedContact.phone || ''} onChange={(e) => updateField('phone', e.target.value)} className="w-full bg-ground-2 border border-line px-4 py-3 text-sm font-semibold outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted">Abonnement</label>
                      <input type="text" value={selectedContact.subscription || ''} onChange={(e) => updateField('subscription', e.target.value)} className="w-full bg-ground-2 border border-line px-4 py-3 text-sm font-semibold outline-none" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted">Tarif (€)</label>
                      <input type="number" step="0.01" value={selectedContact.price ?? ''} onChange={(e) => updateField('price', e.target.value === '' ? undefined : Number(e.target.value))} className="w-full bg-ground-2 border border-line px-4 py-3 text-sm font-semibold outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted">Statut</label>
                      <select value={selectedContact.status === 'MEMBER_ACTIVE' ? 'MEMBER_ACTIVE' : 'MEMBER_INACTIVE'} onChange={(e) => updateField('status', e.target.value)} className="w-full bg-ground-2 border border-line px-4 py-3 text-sm font-semibold outline-none">
                        <option value="MEMBER_ACTIVE">Actif</option>
                        <option value="MEMBER_INACTIVE">Inactif</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-muted">Mode de paiement</label>
                      <input type="text" value={selectedContact.paymentMethod || ''} onChange={(e) => updateField('paymentMethod', e.target.value)} className="w-full bg-ground-2 border border-line px-4 py-3 text-sm font-semibold outline-none" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted">Notes</label>
                    <textarea rows={3} value={selectedContact.notes || ''} onChange={(e) => updateField('notes', e.target.value)} className="w-full bg-ground-2 border border-line px-4 py-3 text-sm font-semibold outline-none"></textarea>
                  </div>
                  <p className="text-xs font-semibold text-muted">L'adresse et la photo (webcam) seront modifiables dans une prochaine étape.</p>
                </div>
              ) : (
              <>
              {/* VUE PROFIL (Commune à tous) */}
              {detailTab === 'profil' && (
                <div className="space-y-6">
                  {/* Identifiants compacts : n° adhérent · badge · code clavier */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* N° adhérent */}
                    <div className="bg-ground-2 px-4 py-3">
                      <p className="text-xs font-semibold text-muted mb-1 flex items-center gap-1"><Hash size={11} /> N° adhérent</p>
                      {editingNumber ? (
                        <div className="flex items-center gap-1">
                          <input type="text" value={numberDraft} onChange={(e) => setNumberDraft(e.target.value)} className="w-full bg-surface border border-line py-1.5 px-2 outline-none text-sm font-semibold" placeholder="ex. 338" />
                          <button type="button" onClick={handleSaveNumber} disabled={savingNumber} className="p-1.5 bg-primary text-white disabled:opacity-50"><Save size={13} /></button>
                          <button type="button" onClick={() => setEditingNumber(false)} className="p-1.5 bg-line text-muted"><X size={13} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-semibold text-ink">{selectedContact.memberNumber || '—'}</span>
                          <button type="button" onClick={startEditNumber} className="p-1 text-subtle hover:text-primary transition-colors"><Edit2 size={13} /></button>
                        </div>
                      )}
                    </div>
                    {/* Badge */}
                    <div className="bg-ground-2 px-4 py-3">
                      <p className="text-xs font-semibold text-muted mb-1 flex items-center gap-1"><CreditCard size={11} /> Badge</p>
                      {editingCard ? (
                        <div className="flex items-center gap-1">
                          <input type="text" value={cardDraft} onChange={(e) => setCardDraft(e.target.value)} className="w-full bg-surface border border-line py-1.5 px-2 outline-none text-sm font-semibold" placeholder="ex. 3616701" />
                          <button type="button" onClick={handleGenerateCard} title="Générer" className="p-1.5 bg-line text-ink-2"><RotateCcw size={13} /></button>
                          <button type="button" onClick={handleSaveCard} disabled={savingCard} className="p-1.5 bg-primary text-white disabled:opacity-50"><Save size={13} /></button>
                          <button type="button" onClick={() => setEditingCard(false)} className="p-1.5 bg-line text-muted"><X size={13} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-semibold text-ink">{selectedContact.cardNumber || '—'}</span>
                          <button type="button" onClick={startEditCard} className="p-1 text-subtle hover:text-danger-text transition-colors"><Edit2 size={13} /></button>
                        </div>
                      )}
                    </div>
                    {/* Code clavier */}
                    <div className="bg-ground-2 px-4 py-3">
                      <p className="text-xs font-semibold text-muted mb-1 flex items-center gap-1"><Hash size={11} /> Code clavier</p>
                      {editingCode ? (
                        <div className="flex items-center gap-1">
                          <input type="text" inputMode="numeric" value={codeDraft} onChange={(e) => setCodeDraft(e.target.value.replace(/\D/g, '').slice(0, 6))} className="w-full bg-surface border border-line py-1.5 px-2 outline-none text-sm font-semibold" placeholder="6 chiffres" />
                          <button type="button" onClick={handleGenerateCode} title="Générer" className="p-1.5 bg-line text-ink-2"><RotateCcw size={13} /></button>
                          <button type="button" onClick={handleSaveCode} disabled={savingCode} className="p-1.5 bg-warning text-white disabled:opacity-50"><Save size={13} /></button>
                          <button type="button" onClick={() => setEditingCode(false)} className="p-1.5 bg-line text-muted"><X size={13} /></button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-semibold text-ink">{(selectedContact as any).keypadCode || '—'}</span>
                          <button type="button" onClick={startEditCode} className="p-1 text-subtle hover:text-warning-text transition-colors"><Edit2 size={13} /></button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Groupe / sous-groupe */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-ground-2 px-4 py-3">
                      <p className="text-xs font-semibold text-muted mb-1 flex items-center gap-1"><Layers size={11} /> Groupe</p>
                      <select
                        value={(selectedContact as any).groupName || ''}
                        onChange={(e) => saveGroupField('group_name', e.target.value)}
                        disabled={savingGroup}
                        className="w-full bg-surface border border-line py-1.5 px-2 outline-none text-sm font-semibold disabled:opacity-50"
                      >
                        <option value="">— Aucun —</option>
                        {groupTree.map((g) => <option key={g.id} value={g.name}>{g.name}</option>)}
                      </select>
                    </div>
                    <div className="bg-ground-2 px-4 py-3">
                      <p className="text-xs font-semibold text-muted mb-1 flex items-center gap-1"><CornerDownRight size={11} /> Sous-groupe</p>
                      {(() => {
                        const subs = groupTree.find((g) => g.name === (selectedContact as any).groupName)?.subgroups ?? [];
                        return (
                          <select
                            value={(selectedContact as any).subgroupName || ''}
                            onChange={(e) => saveGroupField('subgroup_name', e.target.value)}
                            disabled={savingGroup || !(selectedContact as any).groupName || subs.length === 0}
                            className="w-full bg-surface border border-line py-1.5 px-2 outline-none text-sm font-semibold disabled:opacity-50"
                          >
                            <option value="">{!(selectedContact as any).groupName ? '— Choisir un groupe —' : subs.length === 0 ? '— Aucun sous-groupe —' : '— Aucun —'}</option>
                            {subs.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                          </select>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Note interne (compacte) */}
                  <div className="border border-line p-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold text-muted flex items-center gap-1.5"><StickyNote size={12} className="text-warning-text" /> Note interne <span className="normal-case text-subtle">· visible au contrôle d'accès</span></p>
                      <button type="button" onClick={saveNote} disabled={savingNote} className="text-xs font-semibold text-warning-text hover:text-warning-text disabled:opacity-40">{savingNote ? '…' : 'Enregistrer'}</button>
                    </div>
                    <textarea rows={2} value={selectedContact.notes || ''} onChange={(e) => updateField('notes', e.target.value)} placeholder="Ex. paiement en attente, blessure, consigne accueil…" className="w-full bg-ground-2 border border-line px-3 py-2 text-sm outline-none resize-none" />
                  </div>

                  {/* Carte 10 séances : séances restantes */}
                  {packStatus?.is_pack && (
                    <div className={`p-4 border ${packStatus.remaining === 0 ? 'bg-danger-soft border-danger-soft' : packStatus.remaining <= 3 ? 'bg-warning-soft border-warning-soft' : 'bg-success-soft border-success-soft'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-semibold text-muted flex items-center gap-1.5"><CalendarCheck size={13} /> {packStatus.total === 1 ? 'Séance unique' : `Carte ${packStatus.total} séances`}</span>
                        <span className={`text-sm font-semibold ${packStatus.remaining === 0 ? 'text-danger-text' : packStatus.remaining <= 3 ? 'text-warning-text' : 'text-success-text'}`}>
                          {packStatus.remaining === 0 ? 'Épuisée — accès bloqué' : `${packStatus.remaining} séance${packStatus.remaining > 1 ? 's' : ''} restante${packStatus.remaining > 1 ? 's' : ''}`}
                        </span>
                      </div>
                      <div className="h-2.5 w-full bg-white/70 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${packStatus.remaining === 0 ? 'bg-primary' : packStatus.remaining <= 3 ? 'bg-warning' : 'bg-success'}`} style={{ width: `${Math.min(100, (packStatus.used / packStatus.total) * 100)}%` }} />
                      </div>
                      <p className="text-xs font-semibold text-muted mt-1.5">{packStatus.used} / {packStatus.total} séances utilisées</p>
                    </div>
                  )}

                  {/* Bandeau « accès bloqué » + motif */}
                  {(selectedContact as any).accessBlocked && (
                    <div className="flex items-start gap-2.5 bg-danger-soft border border-danger-soft px-4 py-3">
                      <ShieldAlert size={16} className="text-danger-text shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-danger-text">Accès bloqué</p>
                        <p className="text-sm font-semibold text-danger-text break-words">{(selectedContact as any).accessBlockReason || 'Sans motif précisé'}</p>
                      </div>
                    </div>
                  )}

                  {/* Contrôle d'accès (compact) */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-muted flex items-center gap-1.5 mr-1"><ShieldAlert size={13} /> Accès</span>
                    <button type="button" onClick={() => sendAccess('grant')} disabled={accessBusy} className="flex items-center gap-1.5 bg-ink text-white px-3 py-2 font-semibold text-xs hover:bg-black disabled:opacity-50"><UserCheck size={13} /> Activer</button>
                    <button type="button" onClick={() => sendAccess('unblock')} disabled={accessBusy} className="flex items-center gap-1.5 bg-success text-white px-3 py-2 font-semibold text-xs hover:bg-success-text disabled:opacity-50"><CheckCircle2 size={13} /> Débloquer</button>
                    <button type="button" onClick={openBlockModal} disabled={accessBusy} className="flex items-center gap-1.5 bg-primary text-white px-3 py-2 font-semibold text-xs hover:bg-primary-dark disabled:opacity-50"><X size={13} /> Bloquer</button>
                  </div>

                  {/* Blocage programmé (date future) */}
                  {(selectedContact as any).accessBlockScheduledAt ? (
                    <div className="flex items-center gap-2 bg-warning-soft border border-warning-soft px-3 py-2">
                      <Clock size={14} className="text-warning-text shrink-0" />
                      <p className="text-xs font-semibold text-warning-text flex-1 min-w-0">
                        Blocage programmé le {new Date((selectedContact as any).accessBlockScheduledAt).toLocaleDateString('fr-FR')}
                        {(selectedContact as any).accessBlockScheduledReason ? ` · ${(selectedContact as any).accessBlockScheduledReason}` : ''}
                      </p>
                      <button type="button" onClick={cancelScheduledBlock} disabled={accessBusy} className="text-xs font-semibold text-warning-text hover:text-warning-text underline shrink-0">Annuler</button>
                    </div>
                  ) : scheduleOpen ? (
                    <div className="bg-ground-2 border border-line p-3 space-y-2">
                      <p className="text-xs font-semibold text-muted">Programmer un blocage</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <input type="date" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} className="bg-surface border border-line px-2.5 py-1.5 text-sm font-semibold outline-none" />
                        <input type="text" value={scheduleReason} onChange={(e) => setScheduleReason(e.target.value)} placeholder="Motif (facultatif)" className="flex-1 min-w-[140px] bg-surface border border-line px-2.5 py-1.5 text-sm outline-none" />
                        <button type="button" onClick={saveScheduledBlock} disabled={accessBusy || !scheduleDate} className="bg-ink text-white px-3 py-1.5 font-semibold text-xs disabled:opacity-50">Programmer</button>
                        <button type="button" onClick={() => { setScheduleOpen(false); setScheduleDate(''); setScheduleReason(''); }} className="text-xs font-semibold text-muted px-2">Fermer</button>
                      </div>
                      <p className="text-[10.5px] text-muted">L'accès sera coupé automatiquement à cette date (sans tolérance).</p>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setScheduleOpen(true)} className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-warning-text">
                      <Clock size={13} /> Programmer un blocage à une date
                    </button>
                  )}

                  {/* Conversion en profil staff (quitte les vues membres) */}
                  <button type="button" onClick={convertToStaff} className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-primary">
                    <ShieldAlert size={13} /> Passer en profil staff (masquer des membres)
                  </button>

                  {/* Rapprochement : une autre fiche partage l'e-mail (sûr) ou le nom (à vérifier) */}
                  {emailDupes.length > 0 && (() => {
                    const d = emailDupes[0];
                    const dname = `${d.firstName} ${d.lastName}`.trim() || '—';
                    const byEmail = d.matchType === 'email';
                    return (
                      <div className="border border-warning-soft bg-warning-soft p-3.5">
                        <div className="flex items-start gap-2">
                          <AlertTriangle size={16} className="text-warning-text shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-warning-text">{byEmail ? 'Rapprochement possible' : 'Doublon potentiel (même nom)'}</p>
                            <p className="text-[11.5px] text-warning-text mt-0.5 leading-relaxed">
                              {byEmail ? 'Une autre fiche utilise le même e-mail : ' : 'Une autre fiche porte le même nom : '}
                              <b>{dname}</b>
                              {d.memberNumber ? ` (n° ${d.memberNumber})` : ''}{d.hasAccount ? ' · a un compte app' : ''}.
                              {byEmail
                                ?" C'est sûrement le compte créé sur l'app à relier à cette fiche."
                                : ' Vérifie qu’il s’agit bien de la même personne avant de rapprocher (homonyme possible).'}
                              {emailDupes.length > 1 ? ` (+${emailDupes.length - 1} autre${emailDupes.length - 1 > 1 ? 's' : ''})` : ''}
                            </p>
                            <button type="button" onClick={() => { setMergePrefill(d); setMergeOpen(true); }}
                              className="mt-2 inline-flex items-center gap-1.5 bg-warning text-white px-3.5 py-2 text-xs font-semibold hover:bg-warning">
                              <Link2 size={13} /> {byEmail ? 'Rapprocher les fiches' : 'Vérifier et rapprocher'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Fusion de deux fiches en doublon */}
                  <button type="button" onClick={() => { setMergePrefill(null); setMergeOpen(true); }} className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-danger-text">
                    <Link2 size={13} /> Fusionner avec une fiche en doublon
                  </button>

                  {/* Renvoi de l'e-mail d'activation (création de mot de passe app) */}
                  <button type="button" onClick={resendActivation} disabled={resendingActivation} className="flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-primary disabled:opacity-50">
                    <Mail size={13} /> {resendingActivation ? 'Envoi…' : "Renvoyer l'e-mail d'activation (app)"}
                  </button>

                  {/* Contact + abonnement résumé */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-muted flex items-center space-x-2"><User size={14} /> <span>Contact</span></h3>
                      <div className="flex items-center justify-between p-3 bg-ground-2">
                        <span className="text-xs font-semibold text-muted">Email</span>
                        <span className="text-sm font-semibold text-ink truncate ml-3">{selectedContact.email || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-ground-2">
                        <span className="text-xs font-semibold text-muted">Téléphone</span>
                        <span className="text-sm font-semibold text-ink">{selectedContact.phone || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-ground-2">
                        <span className="text-xs font-semibold text-muted">Adresse</span>
                        <span className="text-sm font-semibold text-ink text-right ml-3">{selectedContact.address || '—'}</span>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold text-muted flex items-center space-x-2"><Award size={14} /> <span>Abonnement</span></h3>
                      <div className="flex items-center justify-between p-3 bg-ground-2">
                        <span className="text-xs font-semibold text-muted">Formule</span>
                        <span className="text-sm font-semibold text-ink text-right ml-3">{selectedContact.subscription || '—'}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-ground-2">
                        <span className="text-xs font-semibold text-muted">Tarif</span>
                        <span className="text-sm font-semibold text-ink">{selectedContact.price != null ? `${Number(selectedContact.price).toFixed(2).replace('.', ',')} €` : '—'}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-ground-2">
                        <span className="text-xs font-semibold text-muted">Inscription</span>
                        <span className="text-sm font-semibold text-ink">{selectedContact.joinDate || '—'}</span>
                      </div>
                      {selectedContact.emergencyContact?.phone && (
                        <div className="p-3 bg-danger-soft border border-danger-soft flex items-center justify-between">
                          <span className="text-xs font-semibold text-danger-text">Urgence</span>
                          <span className="text-sm font-semibold text-danger-text">{selectedContact.emergencyContact.phone}</span>
                        </div>
                      )}
                      {selectedContact.notes && (
                        <div className="flex flex-col p-3 bg-warning-soft border border-warning-soft space-y-1">
                          <span className="text-xs font-semibold text-warning-text">Notes</span>
                          <span className="text-sm font-semibold text-ink leading-relaxed">{selectedContact.notes}</span>
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
                    <h3 className="text-xs font-semibold text-muted flex items-center space-x-2"><CalendarCheck size={14} /> <span>Derniers passages</span></h3>
                    <div className="flex items-center gap-2">
                      {packStatus?.is_pack && (
                        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${packStatus.remaining === 0 ? 'bg-danger-soft text-danger-text' : packStatus.remaining <= 3 ? 'bg-warning-soft text-warning-text' : 'bg-success-soft text-success-text'}`}>
                          {packStatus.remaining === 0 ? 'Carte épuisée' : `${packStatus.remaining}/${packStatus.total} restantes`}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-primary bg-primary-soft px-3 py-1.5 rounded-full">{visitCount} ce mois-ci</span>
                    </div>
                  </div>

                  {memberVisits.length === 0 && !visitsLoading ? (
                    <div className="flex flex-col items-center justify-center text-center py-16 px-6 border border-dashed border-line bg-ground-2">
                      <div className="bg-line-soft p-4 text-muted mb-4"><CalendarCheck size={28} /></div>
                      <p className="text-sm font-semibold text-ink-2">Aucun passage enregistré</p>
                      <p className="text-xs font-semibold text-muted mt-2 max-w-md">Les passages au tripode et à la porte apparaîtront ici dès que le membre badgera (ou tapera son code).</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        {memberVisits.map((v) => {
                          const dt = new Date(v.access_datetime);
                          const denied = v.status === 'denied';
                          return (
                            <div key={v.id} className="flex items-center justify-between p-3.5 bg-surface border border-line">
                              <div className="flex items-center gap-3">
                                <div className={`p-2 ${denied ? 'bg-danger-soft text-danger-text' : 'bg-success-soft text-success-text'}`}>
                                  {denied ? <X size={16} /> : <CheckCircle2 size={16} />}
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-ink capitalize">{dt.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'short' })}</p>
                                  <p className="text-xs font-semibold text-muted">{dt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}{v.identification_method === 'qr_code' ? '' : ''}</p>
                                </div>
                              </div>
                              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${denied ? 'bg-danger-soft text-danger-text' : 'bg-success-soft text-success-text'}`}>
                                {denied ? 'Refusé' : 'Entrée'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      {visitsHasMore && (
                        <div className="flex justify-center pt-2">
                          <button type="button" onClick={loadMoreVisits} disabled={visitsLoading} className="flex items-center gap-2 bg-line-soft text-ink-2 px-6 py-3 font-semibold text-xs hover:bg-line disabled:opacity-50">
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
                    <div className="p-5 bg-ink text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <p className="text-xs font-semibold opacity-80">Abonnement actuel</p>
                          <button type="button" onClick={editingFormula ? () => setEditingFormula(false) : startEditFormula} className="flex items-center gap-1 text-xs font-semibold bg-white/20 hover:bg-white/30 px-2.5 py-1 transition-colors">
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
                        {(selectedContact as any).commercialName && (
                          <p className="text-xs opacity-75">Commercial : {(selectedContact as any).commercialName}</p>
                        )}
                        {(selectedContact.subscriptionStart || selectedContact.subscriptionEnd) && (
                          <p className="text-xs opacity-90 font-semibold mt-1">
                            Période : {selectedContact.subscriptionStart || '—'} → {selectedContact.subscriptionEnd || '—'}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-3xl font-semibold">{selectedContact.price != null ? `${Number(selectedContact.price).toFixed(2).replace('.', ',')} €` : '—'}</p>
                        <p className="text-xs font-semibold opacity-80 mt-1">
                          Statut : {selectedContact.status === 'MEMBER_ACTIVE' ? 'ACTIF' : 'INACTIF'}
                        </p>
                      </div>
                    </div>

                    {editingFormula && (() => {
                      const RECURRING = [25.9, 29.9, 59.9];
                      const all = (formulaOptions || []).map((p: any) => ({ label: p.name as string, price: Number(p.price) }));
                      const recurring = all.filter((o) => RECURRING.includes(o.price));
                      const downgrade = all.filter((o) => !RECURRING.includes(o.price));
                      const recurringList = recurring.length ? recurring : [
                        { label: 'Abo famille/étudiant', price: 25.9 },
                        { label: 'Abo classique', price: 29.9 },
                        { label: 'Abo suivi et formation', price: 59.9 },
                      ];
                      const downgradeList = downgrade.length ? downgrade : [
                        { label: 'Mensuel sans engagement', price: 40 },
                        { label: 'Carnet 10 séances', price: 45 },
                        { label: 'Séance', price: 5 },
                      ];
                      const hasMandate = !!(selectedContact.gocardlessMandateId) && (selectedContact.gocardlessStatus === 'mandate_active' || selectedContact.gocardlessStatus === 'mandate_submitted');
                      const selPrice = Number(formulaDraft.price);
                      const selDowngrade = !!formulaDraft.label && !RECURRING.includes(selPrice);
                      const Opt = (o: { label: string; price: number }) => {
                        const active = formulaDraft.label === o.label && Number(formulaDraft.price) === o.price;
                        return (
                          <button key={o.label + o.price} type="button"
                            onClick={() => setFormulaDraft({ ...formulaDraft, label: o.label, price: String(o.price) })}
                            className={`flex items-center justify-between px-4 py-3 border text-left transition-colors ${active ? 'border-primary bg-primary-soft' : 'border-line bg-ground-2 hover:bg-line-soft'}`}>
                            <span className="text-sm font-semibold text-ink">{o.label}</span>
                            <span className={`text-sm font-semibold ${active ? 'text-primary' : 'text-muted'}`}>{o.price.toFixed(2).replace('.', ',')} €</span>
                          </button>
                        );
                      };
                      const METHODS = ['Prélèvement', 'CB', 'Espèces', 'Chèque', 'Virement'];
                      const method = formulaDraft.method || 'Prélèvement';
                      const isCash = method !== 'Prélèvement';
                      const amountStr = formulaDraft.amount !== '' ? formulaDraft.amount : (formulaDraft.price || '');
                      return (
                        <div className="p-5 bg-surface border border-line space-y-4">
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted">Formules à prélèvement (engagement)</label>
                            <div className="grid grid-cols-1 gap-2">{recurringList.map(Opt)}</div>
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-muted">Sans engagement / produits</label>
                            <div className="grid grid-cols-1 gap-2">{downgradeList.map(Opt)}</div>
                          </div>

                          {/* Mode de paiement */}
                          <div className="space-y-1.5 pt-1">
                            <label className="text-xs font-semibold text-muted">Mode de paiement</label>
                            <div className="flex flex-wrap gap-2">
                              {METHODS.map((m) => (
                                <button key={m} type="button" onClick={() => setFormulaDraft({ ...formulaDraft, method: m })}
                                  className={`px-4 py-2 border text-sm font-semibold transition-colors ${method === m ? 'border-primary bg-primary-soft text-primary-dark' : 'border-line bg-ground-2 text-ink-2 hover:bg-line-soft'}`}>
                                  {m}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Encaissement direct (hors prélèvement) : montant + date de fin d'accès */}
                          {isCash && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted">Montant encaissé (€)</label>
                                <input type="number" step="0.01" min="0" value={amountStr}
                                  onChange={(e) => setFormulaDraft({ ...formulaDraft, amount: e.target.value })}
                                  placeholder={formulaDraft.price || '0'}
                                  className="w-full bg-ground-2 border border-line px-3 py-2.5 text-sm font-semibold outline-none" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-muted">Accès jusqu'au (facultatif)</label>
                                <input type="date" value={formulaDraft.end || ''}
                                  onChange={(e) => setFormulaDraft({ ...formulaDraft, end: e.target.value })}
                                  className="w-full bg-ground-2 border border-line px-3 py-2.5 text-sm font-semibold outline-none" />
                              </div>
                            </div>
                          )}

                          {/* Info selon le mode choisi */}
                          {isCash ? (
                            <p className="text-xs font-semibold text-success-text bg-success-soft px-3 py-2 leading-relaxed">
                              Encaissement direct en <b>{method}</b> : la formule est mise à jour et le montant entre dans le CA.
                              {hasMandate && <> Le <b>prélèvement automatique en cours sera arrêté</b> (mandat conservé).</>}
                              {formulaDraft.end && <> Accès ouvert jusqu'au <b>{new Date(formulaDraft.end).toLocaleDateString('fr-FR')}</b>.</>}
                            </p>
                          ) : hasMandate ? (
                            <p className="text-xs font-semibold text-warning-text bg-warning-soft px-3 py-2 leading-relaxed">
                              Prélèvement : GoCardless sera mis à jour (ancien abonnement annulé, nouveau créé, prélevé le 10).
                            </p>
                          ) : (
                            <p className="text-xs font-semibold text-primary bg-primary-soft px-3 py-2 leading-relaxed">
                              Prélèvement : le membre sera redirigé vers GoCardless pour saisir son RIB (création du mandat).
                            </p>
                          )}

                          <div className="flex items-center gap-2">
                            <button type="button" onClick={handleSaveFormula} disabled={savingFormula} className="flex items-center gap-2 bg-primary text-white px-6 py-3 font-semibold text-xs hover:bg-primary-dark disabled:opacity-50"><Save size={14} /> {savingFormula ? 'Application…' : (isCash ? 'Encaisser et appliquer' : 'Appliquer la formule')}</button>
                            <button type="button" onClick={() => setEditingFormula(false)} className="text-xs font-semibold text-muted hover:text-ink-2 px-3">Annuler</button>
                          </div>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Vente à la période (entrée semaine, etc.) — accès ouvert/coupé selon les dates */}
                  {(selectedContact as any).id && (
                    <AccessPeriodsPanel
                      memberId={(selectedContact as any).id}
                      onChanged={async () => {
                        try {
                          const list = await getMembers();
                          setContacts(list);
                          const mem: any = list.find((x: any) => x.id === (selectedContact as any).id);
                          if (mem) setSelectedContact((prev: any) => (prev && prev.id === mem.id ? { ...prev, ...mem } : prev));
                        } catch { /* noop */ }
                      }}
                    />
                  )}

                  {/* Sous-onglets finance */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {([['paiements', 'Paiements'], ['contrats', 'Contrats'], ['ventes', 'Ventes']] as const).map(([key, label]) => (
                      <button key={key} type="button" onClick={() => setFinanceTab(key)} className={`px-4 py-2 font-semibold text-xs transition-colors ${financeTab === key ? 'bg-primary text-white' : 'bg-line-soft text-muted hover:bg-line'}`}>{label}</button>
                    ))}
                  </div>

                  {financeTab === 'paiements' && (<>
                  {/* Paiements */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold text-muted flex items-center space-x-2"><CreditCard size={14} /> <span>Paiements</span></h3>

                    {/* Barre de régularisation des impayés cochés */}
                    {regulSel.size > 0 && (
                      <div className="flex flex-wrap items-center gap-2 bg-primary-soft border border-line px-3 py-2.5">
                        <span className="text-xs font-semibold text-primary-dark">{regulSel.size} impayé(s) — régulariser en</span>
                        <select value={regulMethod} onChange={(e) => setRegulMethod(e.target.value as any)} className="bg-surface border border-line px-2.5 py-1.5 text-sm font-semibold outline-none">
                          {REGULARIZE_METHODS.map((m) => <option key={m.code} value={m.code}>{m.label}</option>)}
                        </select>
                        <span className="text-xs font-semibold text-primary-dark">le</span>
                        <input type="date" value={regulDate} onChange={(e) => setRegulDate(e.target.value)} className="bg-surface border border-line px-2.5 py-1.5 text-sm font-semibold outline-none" />
                        <button type="button" onClick={regularizeSelected} disabled={regulBusy} className="ml-auto flex items-center gap-1.5 bg-primary text-white px-4 py-1.5 text-xs font-semibold hover:bg-primary-dark disabled:opacity-50">
                          <CheckCircle2 size={13} /> {regulBusy ? 'Validation…' : 'Valider'}
                        </button>
                        <button type="button" onClick={() => setRegulSel(new Set<string>())} className="text-xs font-semibold text-primary hover:text-primary px-1">Annuler</button>
                      </div>
                    )}

                    {memberPayments.length === 0 ? (
                      <p className="text-xs font-semibold text-muted px-1">Aucun paiement enregistré pour ce membre.</p>
                    ) : (
                      <div className="space-y-2">
                        {memberPayments.map((pay) => {
                          const st = (pay.status || '').toLowerCase();
                          const ok = st === 'succeeded' || st === 'paid' || st === 'completed' || st === 'confirmed';
                          const impaye = st === 'failed';                 // seul l'impayé est régularisable
                          const history = st === 'cancelled';             // régularisé / écarté : conservé en historique
                          const selected = regulSel.has(pay.id);
                          const method = ({ cash: 'Espèces', credit_card: 'CB', sepa_debit: 'Prélèvement', bank_transfer: 'Virement', stripe: 'Carte' } as Record<string, string>)[pay.payment_method || ''] || pay.payment_method;
                          const badge = ok ? { c: 'bg-success-soft text-success-text', t: 'Payé' }
                            : impaye ? { c: 'bg-danger-soft text-danger-text', t: 'Impayé' }
                            : history ? { c: 'bg-line-soft text-muted', t: 'Historique' }
                            : { c: 'bg-warning-soft text-warning-text', t: pay.status || '' };
                          return (
                            <div key={pay.id} className={`flex items-center justify-between p-4 bg-surface border gap-3 ${impaye && selected ? 'border-line ring-2 ring-primary' : 'border-line'}`}>
                              <div className="flex items-center gap-3 min-w-0">
                                {impaye && (
                                  <input type="checkbox" checked={selected} title="Sélectionner pour régulariser"
                                    onChange={() => setRegulSel((prev) => { const s = new Set(prev); if (s.has(pay.id)) s.delete(pay.id); else s.add(pay.id); return s; })}
                                    className="w-4 h-4 accent-primary shrink-0" />
                                )}
                                <div className="min-w-0">
                                  <p className={`text-sm font-semibold capitalize truncate ${history ? 'text-muted line-through' : 'text-ink'}`}>{pay.payment_type || 'Paiement'}{method ? ` · ${method}` : ''}</p>
                                  <p className="text-xs font-semibold text-muted truncate">{pay.payment_date ? new Date(pay.payment_date).toLocaleDateString('fr-FR') : '—'}{history && pay.notes ? ` · ${pay.notes}` : ''}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className={`text-base font-semibold ${history ? 'text-muted line-through' : 'text-ink'}`}>{pay.amount != null ? `${Number(pay.amount).toFixed(2).replace('.', ',')} €` : '—'}</span>
                                {pay.status && (
                                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${badge.c}`}>{badge.t}</span>
                                )}
                                {pay.invoice_url && (
                                  <a href={pay.invoice_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 bg-primary-soft text-primary px-3 py-2 text-xs font-semibold hover:bg-primary-soft"><FileText size={13} /> Reçu</a>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {(selectedContact.gocardlessStatus || selectedContact.gocardlessMandateId) ? (
                    <div className="p-4 bg-surface border border-line space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold text-muted flex items-center space-x-2"><CreditCard size={14} /> <span>Prélèvement GoCardless</span></h3>
                        <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                          selectedContact.gocardlessStatus === 'mandate_active' ? 'bg-success-soft text-success-text'
                          : selectedContact.gocardlessStatus === 'pending' ? 'bg-warning-soft text-warning-text'
                          : selectedContact.gocardlessStatus === 'mandate_submitted' ? 'bg-line-soft text-ink-2'
                          : selectedContact.gocardlessStatus === 'cancelled' || selectedContact.gocardlessStatus === 'failed' ? 'bg-danger-soft text-danger-text'
                          : 'bg-line-soft text-ink-2'}`}>
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
                        <div className="bg-ground-2 px-4 py-3">
                          <p className="text-xs font-semibold text-muted">Mandat</p>
                          <p className="text-xs font-semibold text-ink break-all">{selectedContact.gocardlessMandateId || '—'}</p>
                        </div>
                        <div className="bg-ground-2 px-4 py-3">
                          <p className="text-xs font-semibold text-muted">Client GoCardless</p>
                          <p className="text-xs font-semibold text-ink break-all">{selectedContact.gocardlessCustomerId || '—'}</p>
                        </div>
                      </div>
                      {selectedContact.gocardlessStatus === 'pending' && (
                        <div className="space-y-1.5">
                          <button type="button" onClick={resumeMandateSignature} disabled={resumingMandate}
                            className="w-full flex items-center justify-center gap-2 bg-warning text-white px-4 py-2.5 font-semibold text-xs hover:bg-warning disabled:opacity-50">
                            <CreditCard size={14} /> {resumingMandate ? 'Ouverture…' : 'Faire signer le mandat (RIB)'}
                          </button>
                          <p className="text-[10.5px] text-muted px-1">Ouvre la page GoCardless de saisie du RIB — le client signe sur place, ici.</p>
                        </div>
                      )}
                      {selectedContact.gocardlessCustomerId && (
                        <a href={`https://manage.gocardless.com/customers/${selectedContact.gocardlessCustomerId}`} target="_blank" rel="noreferrer" className="inline-flex items-center space-x-2 text-xs font-semibold text-primary hover:text-primary-dark">
                          <ChevronRight size={14} /> <span>Ouvrir la fiche dans GoCardless</span>
                        </a>
                      )}

                      {/* Prélèvements GoCardless (temps réel) */}
                      <div className="pt-2 border-t border-line">
                        <p className="text-xs font-semibold text-muted mb-2">Prélèvements</p>
                        {gcPaymentsLoading ? (
                          <p className="text-xs font-semibold text-muted">Chargement des prélèvements…</p>
                        ) : memberGcPayments.length === 0 ? (
                          <p className="text-xs font-semibold text-muted">Aucun prélèvement pour ce membre.</p>
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
                                <div key={gp.id} className="flex items-center justify-between bg-ground-2 px-3 py-2.5 gap-3">
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-ink">{gp.amount != null ? `${gp.amount.toFixed(2).replace('.', ',')} €` : '—'}</p>
                                    <p className="text-xs font-semibold text-muted truncate">{when ? new Date(when).toLocaleDateString('fr-FR') : '—'}{gp.description ? ` · ${gp.description}` : ''}</p>
                                  </div>
                                  <span className={`text-xs font-semibold px-2 py-1 rounded-full shrink-0 ${green ? 'bg-success-soft text-success-text' : red ? 'bg-danger-soft text-danger-text' : gray ? 'bg-line text-ink-2' : 'bg-warning-soft text-warning-text'}`}>{label}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-ground-2 border border-line space-y-3">
                      <div>
                        <h3 className="text-xs font-semibold text-muted flex items-center space-x-2"><Link2 size={14} /> <span>Rattacher un mandat existant</span></h3>
                        <p className="text-xs text-muted mt-1">Aucun mandat de prélèvement pour l'instant. Si ce client a déjà un mandat GoCardless (voir le fichier de rapprochement), colle ses identifiants ici.</p>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-muted">mandate_id</label>
                          <input type="text" value={linkMandateId} onChange={(e) => setLinkMandateId(e.target.value)} placeholder="MD000..." className="w-full mt-1 bg-surface border border-line py-2.5 px-3 outline-none text-xs font-semibold break-all" />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-muted">customer_id (optionnel)</label>
                          <input type="text" value={linkCustomerId} onChange={(e) => setLinkCustomerId(e.target.value)} placeholder="CU000..." className="w-full mt-1 bg-surface border border-line py-2.5 px-3 outline-none text-xs font-semibold break-all" />
                        </div>
                      </div>
                      <button type="button" onClick={handleLinkMandate} disabled={linkingMandate} className="flex items-center gap-2 bg-primary text-white px-6 py-3 font-semibold text-xs hover:bg-primary-dark transition-colors disabled:opacity-50">
                        <Link2 size={14} /> {linkingMandate ? 'Rattachement…' : 'Lier ce mandat'}
                      </button>
                    </div>
                  )}
                  </>)}

                  {financeTab === 'contrats' && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold text-muted flex items-center space-x-2">
                      <FileText size={14} /> <span>Contrat d'adhésion</span>
                    </h3>
                    {memberContracts.length === 0 ? (
                      <p className="text-xs font-semibold text-muted px-1">Aucun contrat signé pour ce membre.</p>
                    ) : (
                      <div className="space-y-3">
                        {memberContracts.map((c: any) => (
                          <div key={c.id} className="p-4 border border-line bg-surface flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-ink">Contrat {c.contract_number || '—'}</p>
                              <p className="text-xs font-semibold text-muted">
                                {(c.signed_at || c.created_at) ? new Date(c.signed_at || c.created_at).toLocaleDateString('fr-FR') : ''}
                                {c.formula_label ? ' · ' + c.formula_label : ''}
                                {c.total_due != null ? ' · ' + Number(c.total_due).toFixed(2).replace('.', ',') + ' €' : ''}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
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
                                  className="flex items-center gap-1.5 bg-primary-soft text-primary px-3 py-2 text-xs font-semibold hover:bg-primary-soft transition-colors"
                                >
                                  <FileText size={14} /> Contrat
                                </button>
                              ) : (
                                <span className="text-xs font-semibold text-warning-text">En cours</span>
                              )}
                              <button
                                onClick={async () => {
                                  if (!window.confirm(`Supprimer définitivement le contrat ${c.contract_number || ''} ?\nCette action est irréversible (ligne + PDF).`)) return;
                                  try {
                                    await deleteContract(c.id);
                                    if (selectedContact) {
                                      const list = await getMemberContracts(selectedContact.id);
                                      setMemberContracts(list);
                                    }
                                  } catch (e) { alert('Échec de la suppression : ' + ((e as Error)?.message || '')); }
                                }}
                                title="Supprimer définitivement ce contrat"
                                className="flex items-center gap-1.5 bg-danger-soft text-danger-text px-3 py-2 text-xs font-semibold hover:bg-danger-soft transition-colors"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  )}

                  {financeTab === 'ventes' && (
                  <div className="space-y-4">
                    <h3 className="text-xs font-semibold text-muted flex items-center space-x-2">
                      <ShoppingBag size={14} /> <span>Historique des achats Boutique</span>
                    </h3>
                    {memberSales.length === 0 ? (
                      <div className="flex flex-col items-center justify-center text-center py-10 px-6 border border-dashed border-line bg-ground-2">
                        <div className="bg-line-soft p-3 text-muted mb-3"><ShoppingBag size={24} /></div>
                        <p className="text-sm font-semibold text-ink-2">Aucun achat enregistré</p>
                        <p className="text-xs font-semibold text-muted mt-2 max-w-md">Les ventes rattachées à ce client apparaîtront ici.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {memberSales.map((s: any) => (
                          <div key={s.id} className="p-4 border border-line bg-surface">
                            <div className="flex items-center justify-between mb-2">
                              <div>
                                <p className="text-sm font-semibold text-ink">Facture {s.invoice_number || '—'}</p>
                                <p className="text-xs font-semibold text-muted">{s.sale_date ? new Date(s.sale_date).toLocaleDateString('fr-FR') : ''} · {s.payment_method || '—'}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-lg font-semibold text-primary">{Number(s.total_ttc || 0).toFixed(2).replace('.', ',')} €</span>
                                <button
                                  onClick={async () => {
                                    try {
                                      const u = await viewInvoice(s.id, s.invoice_pdf_path);
                                      if (u) { window.open(u, '_blank'); if (selectedContact?.id) setMemberSales(await getMemberSales(selectedContact.id)); }
                                      else alert("Impossible d'ouvrir la facture.");
                                    } catch (e) { alert('Échec : ' + ((e as Error)?.message || '')); }
                                  }}
                                  title="Voir / télécharger la facture PDF"
                                  className="flex items-center gap-1.5 bg-primary-soft text-primary px-3 py-2 text-xs font-semibold hover:bg-primary-soft transition-colors"
                                >
                                  <FileText size={14} /> Facture
                                </button>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {(s.lines || []).map((l: any, i: number) => (
                                <span key={i} className="inline-flex items-center bg-ground-2 border border-line px-2 py-1 text-xs font-semibold text-ink-2">
                                  {l.quantity}× {l.product?.name || l.label || 'Article'}
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
            <div className="p-6 border-t border-line flex items-center justify-between shrink-0 bg-surface">
               {isEditing ? (
                 <>
                   <button onClick={cancelEditing} className="text-xs font-semibold text-muted hover:text-ink-2">Annuler</button>
                   <button
                     onClick={handleUpdateContact}
                     className="flex items-center space-x-2 bg-primary text-white px-10 py-4 font-semibold text-sm hover:bg-primary-dark transition-colors"
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
                       closeDetail();
                     }}
                     className="text-xs font-semibold text-danger-text hover:underline"
                   >
                     Archiver le contact
                   </button>
                   <div className="flex space-x-4">
                     <button onClick={closeDetail} className="px-8 py-4 bg-line-soft text-ink-2 font-semibold text-sm transition-colors hover:bg-line">Fermer</button>
                     <button onClick={startEditing} className="flex items-center space-x-2 bg-primary text-white px-10 py-4 font-semibold text-sm hover:bg-primary-dark transition-colors">
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
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-ink/50 animate-in fade-in duration-300">
          <div className="bg-surface w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-line flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-line-soft text-muted p-2.5"><Trash2 size={18} /></div>
                <div>
                  <h3 className="text-lg font-semibold text-ink">Fiches archivées</h3>
                  <p className="text-xs font-semibold text-muted">{archivedContacts.length} fiche(s) · données conservées · restaurables</p>
                </div>
              </div>
              <button onClick={() => setShowArchived(false)} className="p-2 text-muted hover:text-ink-2"><X size={22} /></button>
            </div>
            <div className="overflow-y-auto p-4">
              {archivedContacts.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-sm font-semibold text-ink-2">Aucune fiche archivée</p>
                  <p className="text-xs font-semibold text-muted mt-1">Les contacts archivés apparaîtront ici.</p>
                </div>
              ) : (
                <div className="divide-y divide-line-soft">
                  {archivedContacts.map((m: any) => (
                    <div key={m.id} className="flex items-center justify-between gap-4 py-3 px-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-line-soft text-muted flex items-center justify-center text-xs font-semibold shrink-0">{getInitials(m.firstName, m.lastName)}</div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink truncate">{m.firstName} {m.lastName} {m.memberNumber ? <span className="text-muted font-semibold">· n° {m.memberNumber}</span> : null}</p>
                          <p className="text-xs text-muted font-semibold truncate">{m.email || 'Pas d\'email'}{m.archivedAt ? ` · archivé le ${String(m.archivedAt).split('T')[0]}` : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button type="button" onClick={() => handleRestore(m.id)} className="flex items-center gap-1 bg-primary text-white px-4 py-2 font-semibold text-xs hover:bg-primary-dark"><RotateCcw size={14} /> Restaurer</button>
                        <button type="button" onClick={() => handleHardDelete(m.id)} className="flex items-center gap-1 bg-danger-soft text-danger-text px-3 py-2 font-semibold text-xs hover:bg-danger-soft"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modale de confirmation de blocage (+ motif optionnel) */}
      {blockModalOpen && selectedContact && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-ink/50 animate-in fade-in duration-200" onClick={() => !accessBusy && setBlockModalOpen(false)}>
          <div className="bg-surface w-full max-w-md shadow-modal p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-11 h-11 bg-danger-soft text-danger-text flex items-center justify-center shrink-0"><ShieldAlert size={22} /></div>
              <div>
                <h3 className="font-semibold text-ink text-lg leading-tight">Bloquer l'accès</h3>
                <p className="text-sm text-muted">{selectedContact.firstName} {selectedContact.lastName}{selectedContact.memberNumber ? ` · n° ${selectedContact.memberNumber}` : ''}</p>
              </div>
            </div>
            <p className="text-sm text-ink-2 mb-3">Le badge et le code de ce membre seront retirés du contrôleur. Tu peux préciser un motif (facultatif) — il restera visible sur sa fiche et sur la page contrôle d'accès.</p>
            <label className="text-xs font-semibold text-muted">Motif (facultatif)</label>
            <textarea rows={3} value={blockReason} onChange={(e) => setBlockReason(e.target.value)} autoFocus placeholder="Ex. impayé, comportement, badge perdu…" className="mt-1 w-full bg-ground-2 border border-line px-4 py-3 text-sm outline-none" />
            <div className="flex gap-2 mt-5">
              <button type="button" onClick={() => setBlockModalOpen(false)} disabled={accessBusy} className="flex-1 bg-line-soft text-ink-2 py-3 font-semibold text-sm">Annuler</button>
              <button type="button" onClick={confirmBlock} disabled={accessBusy} className="flex-1 bg-primary text-white py-3 font-semibold text-sm hover:bg-primary-dark disabled:opacity-60 flex items-center justify-center gap-1.5"><X size={16} /> {accessBusy ? 'Blocage…' : "Bloquer l'accès"}</button>
            </div>
          </div>
        </div>
      )}

      {webcamFor && <WebcamCapture onCapture={(f) => { if (webcamFor === 'member') applyFichePhoto(f); else applyAddPhoto(f); }} onClose={() => setWebcamFor(null)} />}

      {mergeOpen && selectedContact && (
        <MergeMembersModal open={mergeOpen} current={selectedContact} initialOther={mergePrefill} onClose={() => { setMergeOpen(false); setMergePrefill(null); }} onMerged={handleMerged} />
      )}
    </div>
  );
};

export default CRMPage;
