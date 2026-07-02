
import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingBag, Plus, Package, TrendingUp, Search, Truck, 
  ShoppingCart, ArrowUpRight, X, Minus, Trash2, CheckCircle2, 
  CreditCard, Banknote, User, UserPlus, Check, ChevronDown,
  Edit2, Save, Calendar, Camera, Tag, AlertTriangle, Download, Send, Pencil, FileText, Zap
} from 'lucide-react';
import { Product, Member } from '../../types';
import IbpPaymentModal from '../../components/IbpPaymentModal';
import IbpChargeModal from '../../components/IbpChargeModal';
import { getProducts, recordSale, getRecentSales, sendInvoice, getStats, getInvoiceUrl, BoutiqueStats, getSuppliers, SupplierRow, deleteSale, updateProductStock, generateInvoice, viewInvoice } from '../../lib/boutiqueApi';
import { searchMembers, createQuickMember } from '../../lib/membersApi';
import { activatePurchasedAccess } from '../../lib/accessApi';

const initials = (a?: string, b?: string) =>
  `${(a || '').charAt(0)}${(b || '').charAt(0)}`.toUpperCase() || '?';

interface BoutiquePageProps {
  view?: string;
}

const BoutiquePage: React.FC<BoutiquePageProps> = ({ view = 'produits' }) => {
  const [activeView, setActiveView] = useState(view);
  const [isSelling, setIsSelling] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isSearchingMember, setIsSearchingMember] = useState(false);
  
  const memberSearchRef = useRef<HTMLDivElement>(null);
  const [cart, setCart] = useState<{ product: Product, quantity: number }[]>([]);
  const [saleStep, setSaleStep] = useState<'cart' | 'payment' | 'success'>('cart');

  const [products, setProducts] = useState<Product[]>([]);
  const [memberResults, setMemberResults] = useState<Member[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [ibpOpen, setIbpOpen] = useState(false);
  const [chargeOpen, setChargeOpen] = useState(false);
  const [saleResult, setSaleResult] = useState<{ sale_id: string; invoice_number: string; total_ttc: number } | null>(null);
  const [invoiceMsg, setInvoiceMsg] = useState<string | null>(null);
  const [accessMsg, setAccessMsg] = useState<string | null>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [stats, setStats] = useState<BoutiqueStats | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);
  const [stockEdit, setStockEdit] = useState<Product | null>(null);
  const [stockValue, setStockValue] = useState('');
  const [alertValue, setAlertValue] = useState('');
  const [posSearch, setPosSearch] = useState('');
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickFirst, setQuickFirst] = useState('');
  const [quickLast, setQuickLast] = useState('');
  const [quickEmail, setQuickEmail] = useState('');
  const [creatingMember, setCreatingMember] = useState(false);

  const lowStock = (p: Product) => p.stock <= (p.minStockAlert ?? 3);
  const lowStockProducts = products.filter(lowStock);

  useEffect(() => {
    const load = () => getProducts().then(setProducts);
    load();
    window.addEventListener('focus', load);
    return () => window.removeEventListener('focus', load);
  }, []);
  useEffect(() => {
    if (activeView === 'ventes') {
      getRecentSales().then(setSales);
      getStats().then(setStats);
    }
    if (activeView === 'fournisseurs') {
      getSuppliers().then(setSuppliers);
    }
  }, [activeView]);

  // Recherche client en direct (nom, n° client, email, téléphone)
  useEffect(() => {
    const q = memberSearchTerm.trim();
    if (!q) { setMemberResults([]); return; }
    const t = setTimeout(() => { searchMembers(q, 6).then(setMemberResults); }, 250);
    return () => clearTimeout(t);
  }, [memberSearchTerm]);

  useEffect(() => {
    setActiveView(view);
  }, [view]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (memberSearchRef.current && !memberSearchRef.current.contains(event.target as Node)) {
        setIsSearchingMember(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const addToCart = (product: Product) => {
    // On autorise la vente même si le stock affiché est à 0 ou négatif
    // (les stocks importés ne sont pas fiables ; ils se régularisent à l'usage).
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const cartTva = cart.reduce((sum, item) => {
    const lineTtc = item.product.price * item.quantity;
    const rate = item.product.vatRate || 0;
    return sum + (lineTtc - lineTtc / (1 + rate));
  }, 0);

  const resetSale = () => {
    setCart([]);
    setSelectedMember(null);
    setMemberSearchTerm('');
    setPaymentMethod(null);
    setSaleResult(null);
    setInvoiceMsg(null);
    setAccessMsg(null);
    setSaleStep('cart');
    setIsSelling(false);
  };

  const handleCheckout = async () => {
    if (cart.length === 0 || processing) return;
    setProcessing(true);
    try {
      const res = await recordSale(
        selectedMember?.id ?? null,
        paymentMethod || 'Espèces',
        cart.map(i => ({ product_id: i.product.id, quantity: i.quantity })),
      );
      setSaleResult(res);
      setSaleStep('success');
      getProducts().then(setProducts); // rafraîchit les stocks

      // Active l'accès pour les produits ponctuels (1 mois / 10 séances / 1 séance)
      setAccessMsg(null);
      if (selectedMember?.id) {
        try {
          const labels: string[] = [];
          for (const item of cart) {
            const kind = await activatePurchasedAccess(
              selectedMember as any,
              { name: item.product.name, price: item.product.price },
              paymentMethod || 'Espèces',
            );
            if (kind) labels.push(item.product.name);
          }
          if (labels.length) {
            setAccessMsg(`Accès activé pour ${selectedMember.firstName} (${labels.join(', ')}). Le code clavier est prêt — le pont applique l'accès dans quelques secondes.`);
          }
        } catch (e) {
          console.error('activation accès', e);
          setAccessMsg("Vente enregistrée, mais l'activation de l'accès a échoué : " + ((e as Error)?.message || '') + ". Tu peux l'activer manuellement depuis la fiche.");
        }
      }
    } catch (e) {
      console.error(e);
      alert("L'encaissement a échoué : " + ((e as Error)?.message || ''));
    } finally {
      setProcessing(false);
    }
  };

  const handleSendInvoice = async () => {
    if (!saleResult) return;
    setInvoiceMsg('Envoi en cours…');
    try {
      await sendInvoice(saleResult.sale_id);
      setInvoiceMsg('Facture envoyée par email ✓');
    } catch (e) {
      setInvoiceMsg('Échec : ' + ((e as Error)?.message || ''));
    }
  };

  const posProducts = posSearch.trim()
    ? products.filter(p =>
        p.name.toLowerCase().includes(posSearch.toLowerCase()) ||
        (p.sku || '').toLowerCase().includes(posSearch.toLowerCase()))
    : products;

  // Douchette code-barres : tape le code puis Entrée -> ajoute au panier
  const handlePosKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const term = posSearch.trim().toLowerCase();
    if (!term) return;
    const bySku = products.find(p => (p.sku || '').toLowerCase() === term);
    const target = bySku || (posProducts.length === 1 ? posProducts[0] : null);
    if (target) { addToCart(target); setPosSearch(''); }
  };

  const handleQuickCreate = async () => {
    if (!quickFirst.trim() || !quickLast.trim() || creatingMember) return;
    setCreatingMember(true);
    try {
      const m = await createQuickMember({
        firstName: quickFirst.trim(),
        lastName: quickLast.trim(),
        email: quickEmail.trim() || undefined,
      });
      setSelectedMember(m);
      setIsSearchingMember(false);
      setQuickOpen(false);
      setQuickFirst(''); setQuickLast(''); setQuickEmail('');
      setMemberSearchTerm('');
    } catch (e) {
      alert("Création du client impossible : " + ((e as Error)?.message || ''));
    } finally {
      setCreatingMember(false);
    }
  };

  const handleResendInvoice = async (saleId: string) => {
    try {
      await sendInvoice(saleId);
      getRecentSales().then(setSales);
      alert('Facture envoyée ✓');
    } catch (e) {
      alert('Échec : ' + ((e as Error)?.message || ''));
    }
  };

  const handleOpenPdf = async (path: string) => {
    const url = await getInvoiceUrl(path);
    if (url) window.open(url, '_blank');
  };

  // Ouvre la facture ; la génère d'abord si elle n'existe pas encore.
  const handleViewInvoice = async (saleId: string, path?: string | null) => {
    try {
      const url = await viewInvoice(saleId, path);
      if (url) { window.open(url, '_blank'); getRecentSales().then(setSales); }
      else alert("Impossible d'ouvrir la facture.");
    } catch (e) {
      alert('Échec : ' + ((e as Error)?.message || ''));
    }
  };

  const handleDeleteSale = async (saleId: string) => {
    if (!window.confirm('Supprimer cette vente ? Le stock sera réajusté et le paiement lié supprimé.')) return;
    try {
      await deleteSale(saleId);
      getRecentSales().then(setSales);
      getStats().then(setStats);
      getProducts().then(setProducts);
    } catch (e) {
      alert('Suppression impossible : ' + ((e as Error)?.message || ''));
    }
  };

  const openStockEdit = (p: Product) => {
    setStockEdit(p);
    setStockValue(String(p.stock));
    setAlertValue(p.minStockAlert != null ? String(p.minStockAlert) : '');
  };
  const handleSaveStock = async () => {
    if (!stockEdit) return;
    try {
      await updateProductStock(
        stockEdit.id,
        parseInt(stockValue, 10) || 0,
        alertValue === '' ? null : (parseInt(alertValue, 10) || 0),
      );
      setStockEdit(null);
      getProducts().then(setProducts);
    } catch (e) {
      alert('Mise à jour du stock impossible : ' + ((e as Error)?.message || ''));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
            <span className="bg-indigo-100 text-indigo-600 p-2 rounded-xl">
              <ShoppingBag size={18} />
            </span>
            <span>Boutique & Logistique</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">Gérez votre stock et vos ventes directes au comptoir.</p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setIsSelling(true)}
            className="flex items-center justify-center space-x-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold text-sm shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
          >
            <ShoppingCart size={18} />
            <span>Lancer une vente</span>
          </button>
          <button 
            onClick={() => setIsAddProductModalOpen(true)}
            className="p-3 bg-white border border-gray-100 rounded-2xl text-gray-400 hover:text-indigo-600 shadow-sm transition-all hover:bg-gray-50"
          >
            <Plus size={20} />
          </button>
        </div>
      </div>

      <div className="flex bg-white p-1.5 rounded-2xl border border-gray-100 shadow-sm w-fit">
        <button onClick={() => setActiveView('produits')} className={`px-6 py-2 rounded-xl text-sm font-semibold uppercase tracking-wide transition-all flex items-center ${activeView === 'produits' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-700'}`}><Package size={14} className="mr-2" />Produits</button>
        <button onClick={() => setActiveView('ventes')} className={`px-6 py-2 rounded-xl text-sm font-semibold uppercase tracking-wide transition-all flex items-center ${activeView === 'ventes' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-700'}`}><TrendingUp size={14} className="mr-2" />Ventes</button>
        <button onClick={() => setActiveView('fournisseurs')} className={`px-6 py-2 rounded-xl text-sm font-semibold uppercase tracking-wide transition-all flex items-center ${activeView === 'fournisseurs' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-700'}`}><Truck size={14} className="mr-2" />Fournisseurs</button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
        {activeView === 'produits' && (
          <div className="p-5">
            {lowStockProducts.length > 0 && (
              <div className="mb-8 bg-red-50/70 border border-red-100 rounded-2xl p-6">
                <div className="flex items-center mb-4">
                  <div className="bg-red-100 text-red-600 p-2 rounded-xl mr-3"><AlertTriangle size={18} /></div>
                  <h3 className="text-sm font-semibold text-red-700 uppercase tracking-wide">À réapprovisionner ({lowStockProducts.length})</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {lowStockProducts.map(p => (
                    <span key={p.id} className="inline-flex items-center bg-white border border-red-100 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-700">
                      {p.name}
                      <span className={`ml-2 font-semibold ${p.stock <= 0 ? 'text-red-600' : 'text-amber-600'}`}>{p.stock}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               {products.map(product => (
                 <div key={product.id} className="group border border-gray-50 rounded-2xl overflow-hidden hover:shadow-md transition-all duration-500 bg-white relative">
                    <div className="relative overflow-hidden aspect-square bg-gray-50 flex items-center justify-center">
                      {product.image ? (
                        <img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" alt="" />
                      ) : (
                        <Package size={48} className="text-gray-300" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                    <div className="p-6 space-y-4">
                       <div>
                          <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wide mb-1">{product.category}</p>
                          <h4 className="text-sm font-semibold text-gray-900 truncate">{product.name}</h4>
                       </div>
                       <div className="flex items-center justify-between">
                          <p className="text-xl font-semibold text-gray-900">{product.price.toFixed(2).replace('.', ',')} €</p>
                          <button onClick={() => openStockEdit(product)} title="Modifier le stock" className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 hover:ring-2 hover:ring-indigo-300 transition-all ${lowStock(product) ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                            {product.stock} en stock <Pencil size={10} />
                          </button>
                       </div>
                       <button onClick={() => { setIsSelling(true); addToCart(product); }} className="w-full py-3 bg-gray-50 text-gray-600 rounded-2xl text-[10px] font-semibold uppercase tracking-wide hover:bg-indigo-600 hover:text-white transition-all shadow-sm">Vendre l'article</button>
                    </div>
                 </div>
               ))}
               <button onClick={() => setIsAddProductModalOpen(true)} className="min-h-[300px] border-4 border-dashed border-gray-50 rounded-2xl flex flex-col items-center justify-center space-y-4 text-gray-300 hover:border-indigo-100 hover:text-indigo-400 transition-all group">
                  <div className="bg-gray-50 p-6 rounded-full group-hover:bg-indigo-50 transition-colors">
                    <Plus size={40} />
                  </div>
                  <span className="text-sm font-semibold uppercase tracking-wide">Nouveau produit</span>
               </button>
            </div>
          </div>
        )}

        {activeView === 'ventes' && (
          <div className="p-5">
            {stats && (
              <div className="mb-8">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50/70 border border-gray-100 rounded-2xl p-5">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">CA aujourd'hui</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.ca_today.toFixed(2).replace('.', ',')} €</p>
                  </div>
                  <div className="bg-indigo-50/70 border border-indigo-100 rounded-2xl p-5">
                    <p className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wide mb-1">CA ce mois</p>
                    <p className="text-2xl font-semibold text-indigo-700">{stats.ca_month.toFixed(2).replace('.', ',')} €</p>
                  </div>
                  <div className="bg-green-50/70 border border-green-100 rounded-2xl p-5">
                    <p className="text-[10px] font-semibold text-green-500 uppercase tracking-wide mb-1">Marge ce mois</p>
                    <p className="text-2xl font-semibold text-green-700">{stats.margin_month.toFixed(2).replace('.', ',')} €</p>
                  </div>
                  <div className="bg-gray-50/70 border border-gray-100 rounded-2xl p-5">
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Ventes ce mois</p>
                    <p className="text-2xl font-semibold text-gray-900">{stats.sales_month}</p>
                  </div>
                </div>
                {stats.top_products.length > 0 && (
                  <div className="bg-white border border-gray-100 rounded-2xl p-5">
                    <h4 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Top produits</h4>
                    <div className="space-y-2">
                      {stats.top_products.map((t, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="font-bold text-gray-700"><span className="text-gray-300 font-semibold mr-2">{i + 1}</span>{t.name}</span>
                          <span className="font-semibold text-gray-500">{t.qty} vendus · {Number(t.revenue).toFixed(2).replace('.', ',')} €</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {sales.length === 0 ? (
              <div className="p-6 flex flex-col items-center justify-center text-center space-y-6">
                <div className="bg-indigo-50 p-5 rounded-full text-indigo-600"><TrendingUp size={48} /></div>
                <div>
                  <h3 className="text-xl font-semibold">Historique des Ventes</h3>
                  <p className="text-gray-500 max-w-sm mt-2 font-medium">Aucune vente pour le moment. Lancez une vente pour la voir apparaître ici.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                      <th className="py-3 px-3">Facture</th>
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Client</th>
                      <th className="py-3 px-3">Paiement</th>
                      <th className="py-3 px-3 text-right">Total TTC</th>
                      <th className="py-3 px-3 text-center">Facture email</th>
                      <th className="py-3 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sales.map((s: any) => (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors text-sm">
                        <td className="py-3 px-3 font-semibold text-gray-900">{s.invoice_number || '—'}</td>
                        <td className="py-3 px-3 text-gray-500 font-medium">{s.sale_date ? new Date(s.sale_date).toLocaleDateString('fr-FR') : '—'}</td>
                        <td className="py-3 px-3 font-bold text-gray-700">{s.member ? `${s.member.first_name} ${s.member.last_name}` : 'Anonyme'}</td>
                        <td className="py-3 px-3 text-gray-500 font-medium">{s.payment_method || '—'}</td>
                        <td className="py-3 px-3 text-right font-semibold text-indigo-600">{Number(s.total_ttc || 0).toFixed(2).replace('.', ',')} €</td>
                        <td className="py-3 px-3 text-center">
                          {s.invoice_email_status === 'sent'
                            ? <span className="text-[10px] font-semibold text-green-600 uppercase">Envoyée</span>
                            : <span className="text-[10px] font-semibold text-gray-300 uppercase">—</span>}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => handleViewInvoice(s.id, s.invoice_pdf_path)} title="Voir / générer la facture PDF" className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><FileText size={15} /></button>
                            {s.invoice_pdf_path && (
                              <button onClick={() => handleOpenPdf(s.invoice_pdf_path)} title="Télécharger le PDF" className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><Download size={15} /></button>
                            )}
                            {s.member?.email && (
                              <button onClick={() => handleResendInvoice(s.id)} title="Envoyer / renvoyer la facture par email" className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"><Send size={15} /></button>
                            )}
                            <button onClick={() => handleDeleteSale(s.id)} title="Supprimer la vente" className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"><Trash2 size={15} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeView === 'fournisseurs' && (
          <div className="p-5">
            {suppliers.length === 0 ? (
              <div className="p-6 flex flex-col items-center justify-center text-center space-y-6">
                <div className="bg-indigo-50 p-5 rounded-full text-indigo-600"><Truck size={48} /></div>
                <h3 className="text-xl font-semibold">Aucun fournisseur</h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {suppliers.map(s => (
                  <div key={s.id} className="border border-gray-100 rounded-2xl p-6 bg-white hover:shadow-xl transition-all">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center text-lg font-semibold uppercase shrink-0">{initials(s.name, '')}</div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-gray-900 truncate">{s.name}</h4>
                        <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wide">{s.supplier_type || 'fournisseur'}</p>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-xs font-bold text-gray-500">
                      {s.contact_name && <p className="flex items-center gap-2"><User size={12} /> {s.contact_name}</p>}
                      {s.email && <p className="flex items-center gap-2 truncate"><Tag size={12} /> {s.email}</p>}
                      {s.phone && <p className="flex items-center gap-2">{s.phone}</p>}
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Produits</span>
                      <span className="text-sm font-semibold text-gray-900">{s.productCount}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODALE AJOUT PRODUIT */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-5 bg-indigo-600 text-white flex justify-between items-center relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
               <div className="flex items-center space-x-4 relative z-10">
                 <div className="bg-white/20 p-2.5 rounded-2xl shadow-inner"><Tag size={20} /></div>
                 <div>
                   <h2 className="text-xl font-semibold">Nouveau produit</h2>
                   <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-wide">Ajout au catalogue boutique</p>
                 </div>
               </div>
               <button onClick={() => setIsAddProductModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl relative z-10 transition-colors"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-6">
               <div className="flex items-center space-x-8">
                  <div className="w-24 h-24 bg-gray-50 border-4 border-dashed border-gray-100 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:border-indigo-100 hover:bg-indigo-50 transition-all cursor-pointer group">
                     <Camera size={24} className="group-hover:scale-110 transition-transform" />
                     <span className="text-[10px] font-semibold uppercase mt-2">PHOTO</span>
                  </div>
                  <div className="flex-grow space-y-1">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Nom du produit</label>
                    <input type="text" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" placeholder="Whey, Shaker, Gants..." />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Prix de vente (€)</label>
                    <input type="text" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" placeholder="19.90" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Stock initial</label>
                    <input type="number" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" placeholder="50" />
                  </div>
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Catégorie</label>
                  <select className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none">
                    <option>Suppléments</option>
                    <option>Accessoires</option>
                    <option>Équipement</option>
                    <option>Vêtements</option>
                  </select>
               </div>
               <button onClick={() => setIsAddProductModalOpen(false)} className="w-full py-5 bg-indigo-600 text-white font-semibold rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98] uppercase tracking-wide text-xs">Ajouter à l'inventaire</button>
            </div>
          </div>
        </div>
      )}

      {/* POS INTERFACE */}
      {isSelling && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-6xl h-full max-h-[850px] rounded-2xl shadow-xl overflow-hidden animate-in zoom-in duration-300 flex flex-col md:flex-row border border-white/20">
            
            {/* Zone Produits POS */}
            <div className="flex-grow p-6 overflow-y-auto bg-gray-50/50 pwa-hide-scrollbar flex flex-col">
               <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center space-x-4">
                    <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg"><ShoppingCart size={24} className="text-white" /></div>
                    <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Terminal de Vente</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setChargeOpen(true)} className="flex items-center gap-1.5 bg-amber-500 text-white px-3.5 py-2.5 rounded-xl font-bold text-[11px] uppercase tracking-wide hover:bg-amber-600"><Zap size={15} /> Montant libre (IBP)</button>
                    <button onClick={() => setIsSelling(false)} className="p-3 hover:bg-gray-100 rounded-2xl transition-colors border border-transparent hover:border-gray-200"><X size={24} className="text-gray-400" /></button>
                  </div>
               </div>
               {chargeOpen && <IbpChargeModal memberId={selectedMember?.id} email={selectedMember?.email} onClose={() => setChargeOpen(false)} onPaid={() => setChargeOpen(false)} />}
               
               <div className="relative mb-8">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                 <input 
                  type="text" 
                  value={posSearch}
                  onChange={(e) => setPosSearch(e.target.value)}
                  onKeyDown={handlePosKeyDown}
                  autoFocus
                  placeholder="Rechercher un article ou scanner un code-barre..." 
                  className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-4 focus:ring-indigo-500/5 text-sm font-bold shadow-sm"
                 />
               </div>

               <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {posProducts.map(product => (
                    <button 
                      key={product.id} 
                      onClick={() => addToCart(product)} 
                      className="flex flex-col text-left bg-white p-5 rounded-2xl border border-transparent hover:border-indigo-600 hover:shadow-xl transition-all group relative active:scale-95"
                    >
                       {product.image ? (
                         <img src={product.image} className="w-full h-32 rounded-2xl object-cover mb-4 shadow-sm" alt="" />
                       ) : (
                         <div className="w-full h-32 rounded-2xl mb-4 shadow-sm bg-gray-50 flex items-center justify-center"><Package size={36} className="text-gray-300" /></div>
                       )}
                       <h4 className="text-xs font-semibold text-gray-900 truncate">{product.name}</h4>
                       <div className="flex items-center justify-between mt-2">
                         <p className="text-md font-semibold text-indigo-600">{product.price.toFixed(2).replace('.', ',')} €</p>
                         <p className="text-[9px] font-semibold text-gray-300 uppercase">Stock: {product.stock}</p>
                       </div>
                       <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <div className="bg-indigo-600 text-white p-1.5 rounded-xl shadow-lg"><Plus size={16} /></div>
                       </div>
                    </button>
                  ))}
               </div>
            </div>

            {/* Zone Panier POS */}
            <div className="w-full md:w-[450px] bg-white border-l border-gray-100 flex flex-col shadow-inner">
               <div className="flex-grow p-6 flex flex-col">
                  
                  {/* Sélection du client */}
                  <div className="mb-10 relative" ref={memberSearchRef}>
                    <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-3 block">Attribuer à un membre</label>
                    <div className={`flex items-center space-x-3 p-4 rounded-2xl transition-all border ${selectedMember ? 'bg-indigo-50 border-indigo-100 ring-2 ring-indigo-500/10' : 'bg-gray-50 border-gray-50'}`}>
                      {selectedMember ? (
                        <>
                          <div className="w-10 h-10 rounded-xl shadow-sm border border-white bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-semibold uppercase">{initials(selectedMember.firstName, selectedMember.lastName)}</div>
                          <div className="flex-grow">
                            <p className="text-xs font-semibold text-indigo-900">{selectedMember.firstName} {selectedMember.lastName}</p>
                            <p className="text-[10px] font-bold text-indigo-400">{selectedMember.memberNumber ? `N° ${selectedMember.memberNumber}` : (selectedMember.email || 'Client')}</p>
                          </div>
                          <button onClick={() => setSelectedMember(null)} className="text-indigo-400 hover:text-indigo-600"><X size={16} /></button>
                        </>
                      ) : (
                        <>
                          <div className="bg-white p-2 rounded-xl text-gray-400 shadow-sm"><User size={20} /></div>
                          <input 
                            type="text" 
                            value={memberSearchTerm}
                            onChange={(e) => { setMemberSearchTerm(e.target.value); setIsSearchingMember(true); }}
                            onFocus={() => setIsSearchingMember(true)}
                            placeholder="Nom du client..." 
                            className="bg-transparent border-none outline-none text-sm font-bold flex-grow placeholder:font-medium"
                          />
                        </>
                      )}
                    </div>
                    
                    {isSearchingMember && !selectedMember && memberSearchTerm && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-50 z-10 overflow-hidden max-h-48 overflow-y-auto">
                        {memberResults.map(m => (
                          <button 
                            key={m.id} 
                            onClick={() => { setSelectedMember(m); setIsSearchingMember(false); }}
                            className="w-full p-4 flex items-center space-x-3 hover:bg-indigo-50 transition-colors text-left"
                          >
                            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-semibold uppercase">{initials(m.firstName, m.lastName)}</div>
                            <span className="text-xs font-bold">{m.firstName} {m.lastName}{m.memberNumber ? ` · N° ${m.memberNumber}` : ''}</span>
                          </button>
                        ))}
                        {memberResults.length === 0 && !quickOpen && (
                          <div className="p-4 text-center">
                            <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-wide">Aucun membre trouvé</p>
                            <button
                              onClick={() => {
                                const parts = memberSearchTerm.trim().split(' ');
                                setQuickFirst(parts[0] || '');
                                setQuickLast(parts.slice(1).join(' ') || '');
                                setQuickOpen(true);
                              }}
                              className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide flex items-center justify-center w-full hover:underline"
                            >
                              <UserPlus size={12} className="mr-1" /> Créer une fiche rapide
                            </button>
                          </div>
                        )}
                        {quickOpen && (
                          <div className="p-4 space-y-2">
                            <p className="text-[10px] font-semibold text-indigo-500 uppercase tracking-wide">Nouveau client</p>
                            <div className="grid grid-cols-2 gap-2">
                              <input value={quickFirst} onChange={e => setQuickFirst(e.target.value)} placeholder="Prénom" className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-bold outline-none" />
                              <input value={quickLast} onChange={e => setQuickLast(e.target.value)} placeholder="Nom" className="bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-bold outline-none" />
                            </div>
                            <input value={quickEmail} onChange={e => setQuickEmail(e.target.value)} placeholder="Email (pour la facture)" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2 text-xs font-bold outline-none" />
                            <div className="flex gap-2">
                              <button onClick={handleQuickCreate} disabled={!quickFirst.trim() || !quickLast.trim() || creatingMember} className={`flex-grow py-2 rounded-xl text-[10px] font-semibold uppercase tracking-wide transition-colors ${(!quickFirst.trim() || !quickLast.trim() || creatingMember) ? 'bg-gray-100 text-gray-400' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}>{creatingMember ? 'Création…' : 'Créer & sélectionner'}</button>
                              <button onClick={() => setQuickOpen(false)} className="px-3 py-2 rounded-xl text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-500 hover:bg-gray-200">Annuler</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-5">Articles dans le panier ({cart.reduce((s,i) => s + i.quantity, 0)})</h3>
                  
                  <div className="flex-grow overflow-y-auto space-y-3 pwa-hide-scrollbar">
                    {cart.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full opacity-20 space-y-4">
                        <ShoppingBag size={64} strokeWidth={1} />
                        <p className="text-sm font-semibold uppercase tracking-wide">Votre panier est vide</p>
                      </div>
                    ) : (
                      cart.map(item => (
                        <div key={item.product.id} className="flex items-center space-x-4 p-4 bg-gray-50/50 border border-gray-100 rounded-2xl animate-in slide-in-from-right-4 duration-300">
                          {item.product.image ? (
                            <img src={item.product.image} className="w-12 h-12 rounded-xl object-cover shadow-sm" alt="" />
                          ) : (
                            <div className="w-12 h-12 rounded-xl shadow-sm bg-white border border-gray-100 flex items-center justify-center"><Package size={20} className="text-gray-300" /></div>
                          )}
                          <div className="flex-grow">
                            <p className="text-xs font-semibold text-gray-900 truncate w-32">{item.product.name}</p>
                            <p className="text-xs font-semibold text-indigo-600 mt-0.5">{item.product.price.toFixed(2).replace('.', ',')} €</p>
                          </div>
                          <div className="flex items-center bg-white rounded-xl border border-gray-100 shadow-sm">
                            <button onClick={() => updateQuantity(item.product.id, -1)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Minus size={12}/></button>
                            <span className="text-xs font-semibold min-w-[20px] text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.product.id, 1)} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"><Plus size={12}/></button>
                          </div>
                          <button onClick={() => setCart(prev => prev.filter(i => i.product.id !== item.product.id))} className="text-gray-300 hover:text-red-500 transition-colors p-1"><Trash2 size={16}/></button>
                        </div>
                      ))
                    )}
                  </div>
               </div>

               <div className="p-6 border-t border-gray-50 bg-gray-50/20">
                  <div className="space-y-3 mb-8">
                    <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-wide">
                       <span>Total HT</span>
                       <span>{(cartTotal - cartTva).toFixed(2).replace('.', ',')} €</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-wide">
                       <span>dont TVA</span>
                       <span>{cartTva.toFixed(2).replace('.', ',')} €</span>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                       <span className="text-sm font-semibold tracking-wide uppercase">Total à payer</span>
                       <span className="text-4xl font-semibold text-indigo-600">{cartTotal.toFixed(2).replace('.', ',')} €</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 mb-4">
                     <button onClick={() => setPaymentMethod('CB')} className={`flex flex-col items-center justify-center p-4 bg-white border rounded-2xl transition-all group shadow-sm ${paymentMethod === 'CB' ? 'border-indigo-600 text-indigo-600 ring-2 ring-indigo-500/10' : 'border-gray-100 hover:border-indigo-600 hover:text-indigo-600'}`}>
                        <CreditCard size={20} className={`mb-2 ${paymentMethod === 'CB' ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-600'}`} />
                        <span className="text-[10px] font-semibold uppercase tracking-wide">CB / Sans contact</span>
                     </button>
                     <button onClick={() => setPaymentMethod('Espèces')} className={`flex flex-col items-center justify-center p-4 bg-white border rounded-2xl transition-all group shadow-sm ${paymentMethod === 'Espèces' ? 'border-green-600 text-green-600 ring-2 ring-green-500/10' : 'border-gray-100 hover:border-green-600 hover:text-green-600'}`}>
                        <Banknote size={20} className={`mb-2 ${paymentMethod === 'Espèces' ? 'text-green-600' : 'text-gray-400 group-hover:text-green-600'}`} />
                        <span className="text-[10px] font-semibold uppercase tracking-wide">Espèces</span>
                     </button>
                     <button onClick={() => setPaymentMethod('Instant Bank Pay')} className={`flex flex-col items-center justify-center p-4 bg-white border rounded-2xl transition-all group shadow-sm ${paymentMethod === 'Instant Bank Pay' ? 'border-amber-500 text-amber-600 ring-2 ring-amber-500/10' : 'border-gray-100 hover:border-amber-500 hover:text-amber-600'}`}>
                        <Zap size={20} className={`mb-2 ${paymentMethod === 'Instant Bank Pay' ? 'text-amber-600' : 'text-gray-400 group-hover:text-amber-600'}`} />
                        <span className="text-[10px] font-semibold uppercase tracking-wide">Instant Bank Pay</span>
                     </button>
                  </div>

                  <button
                    onClick={() => { if (paymentMethod === 'Instant Bank Pay') setIbpOpen(true); else handleCheckout(); }}
                    disabled={cart.length === 0 || processing || !paymentMethod}
                    className={`w-full py-5 rounded-2xl font-semibold text-sm uppercase tracking-wide shadow-xl transition-all flex items-center justify-center space-x-3 active:scale-[0.98] ${
                      cart.length === 0 || processing || !paymentMethod ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white shadow-indigo-100 hover:bg-indigo-700'
                    }`}
                  >
                    <CheckCircle2 size={20} />
                    <span>{processing ? 'Encaissement…' : paymentMethod === 'Instant Bank Pay' ? 'Générer le paiement' : 'Valider & Encaisser'}</span>
                  </button>

                  {ibpOpen && (
                    <IbpPaymentModal
                      amount={cartTotal}
                      label={`Vente caisse${selectedMember ? ' · ' + selectedMember.firstName + ' ' + selectedMember.lastName : ''}`}
                      memberId={selectedMember?.id}
                      email={selectedMember?.email}
                      recordPayment={false}
                      onClose={() => setIbpOpen(false)}
                      onPaid={() => { setIbpOpen(false); handleCheckout(); }}
                    />
                  )}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {saleStep === 'success' && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-indigo-600/90 backdrop-blur-2xl animate-in fade-in duration-700">
           <div className="text-center text-white space-y-6 animate-in zoom-in duration-500">
              <div className="bg-white/20 w-32 h-32 rounded-2xl flex items-center justify-center mx-auto shadow-xl backdrop-blur-md relative overflow-hidden">
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                <CheckCircle2 size={64} className="relative z-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-4xl font-semibold">Vente terminée !</h2>
                <p className="text-indigo-100 font-bold opacity-80 uppercase tracking-wide text-xs">Paiement confirmé • Stock mis à jour</p>
                {saleResult && (
                  <p className="text-white font-semibold text-lg pt-2">Facture {saleResult.invoice_number} — {saleResult.total_ttc?.toFixed(2).replace('.', ',')} €</p>
                )}
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button
                  onClick={() => saleResult && handleViewInvoice(saleResult.sale_id, null)}
                  className="w-full sm:w-auto px-10 py-4 rounded-2xl font-semibold text-sm uppercase tracking-wide shadow-xl bg-white text-indigo-600 hover:bg-indigo-50 transition-colors"
                >
                  Voir la facture (PDF)
                </button>
                <button
                  onClick={handleSendInvoice}
                  disabled={!selectedMember?.email}
                  title={selectedMember?.email ? '' : "Aucun email client : rattachez un membre avec email pour envoyer la facture"}
                  className={`w-full sm:w-auto px-10 py-4 rounded-2xl font-semibold text-sm uppercase tracking-wide shadow-xl transition-colors ${selectedMember?.email ? 'bg-white text-indigo-600 hover:bg-indigo-50' : 'bg-white/30 text-white/60 cursor-not-allowed'}`}
                >
                  Envoyer la facture par email
                </button>
                <button onClick={resetSale} className="w-full sm:w-auto px-10 py-4 bg-indigo-500/50 border border-white/20 text-white rounded-2xl font-semibold text-sm uppercase tracking-wide hover:bg-white/10 transition-colors">Terminer</button>
              </div>
              {accessMsg && <p className="text-white bg-white/15 rounded-2xl px-5 py-3 font-bold text-sm max-w-xl mx-auto">{accessMsg}</p>}
              {invoiceMsg && <p className="text-white/90 font-bold text-sm">{invoiceMsg}</p>}
              {!selectedMember && <p className="text-indigo-100/70 text-xs font-medium">Vente anonyme — rattachez un client avant l'encaissement pour pouvoir envoyer une facture par email.</p>}
           </div>
        </div>
      )}
      {/* MODALE STOCK */}
      {stockEdit && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200" onClick={() => setStockEdit(null)}>
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
              <h2 className="text-lg font-semibold truncate pr-2">{stockEdit.name}</h2>
              <button onClick={() => setStockEdit(null)} className="p-1.5 hover:bg-white/10 rounded-xl"><X size={20} /></button>
            </div>
            <div className="p-5 space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Stock actuel</label>
                <input type="number" value={stockValue} onChange={e => setStockValue(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Seuil d'alerte (stock bas)</label>
                <input type="number" value={alertValue} onChange={e => setAlertValue(e.target.value)} placeholder="par défaut : 3" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" />
              </div>
              <button onClick={handleSaveStock} className="w-full py-4 bg-indigo-600 text-white font-semibold rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all uppercase tracking-wide text-xs">Enregistrer</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default BoutiquePage;
