
import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus, Package, Search, ShoppingCart, X, Minus, Trash2, CheckCircle2,
  CreditCard, Banknote, User, UserPlus, Download, Send, FileText, Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Product, Member } from '../../types';
import { getProducts, recordSale, getRecentSales, sendInvoice, getStats, getInvoiceUrl, BoutiqueStats, getSuppliers, SupplierRow, deleteSale, updateProductStock, generateInvoice, viewInvoice, createProduct, getCategories, CategoryRow, createSupplier, saleItemsLabel } from '../../lib/boutiqueApi';
import { searchMembers, createQuickMember } from '../../lib/membersApi';
import { activatePurchasedAccess } from '../../lib/accessApi';
import { eur, num, phone as formatPhone } from '../../lib/format';
import {
  Alert, Avatar, Button, Card, ChevronCell, EmptyState, Field, FieldLabel, IconButton, Input, Modal, PageHeader,
  Segmented, Select, Skeleton, StatRow, Table, Tag, Td, Th, Tr,
} from '../../components/ui';

/** Lignes montrées dans le panneau « À réapprovisionner » avant de tout déplier. */
const RESTOCK_PREVIEW = 8;

interface BoutiquePageProps {
  view?: string;
}

const BoutiquePage: React.FC<BoutiquePageProps> = ({ view = 'produits' }) => {
  const navigate = useNavigate();
  const activeView = view;
  const [isSelling, setIsSelling] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [category, setCategory] = useState('all');
  const [showAllLow, setShowAllLow] = useState(false);
  
  const [memberSearchTerm, setMemberSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isSearchingMember, setIsSearchingMember] = useState(false);
  
  const memberSearchRef = useRef<HTMLDivElement>(null);
  const [cart, setCart] = useState<{ product: Product, quantity: number }[]>([]);
  const [personalPurchase, setPersonalPurchase] = useState(false);
  const [saleStep, setSaleStep] = useState<'cart' | 'payment' | 'success'>('cart');

  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoaded, setProductsLoaded] = useState(false);
  const [memberResults, setMemberResults] = useState<Member[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  // Article libre (montant + libellé) ajouté au panier comme n'importe quel article
  const [freeOpen, setFreeOpen] = useState(false);
  const [freeAmount, setFreeAmount] = useState('');
  const [freeLabel, setFreeLabel] = useState('');
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

  // Catégories + création d'un nouveau produit (formulaire réel)
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [npName, setNpName] = useState('');
  const [npPrice, setNpPrice] = useState('');
  const [npStock, setNpStock] = useState('');
  const [npCategory, setNpCategory] = useState('');
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [npError, setNpError] = useState('');
  // Nouveau fournisseur
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [nsName, setNsName] = useState('');
  const [nsContact, setNsContact] = useState('');
  const [nsParent, setNsParent] = useState('');
  const [creatingSupplier, setCreatingSupplier] = useState(false);

  const lowStock = (p: Product) => p.stock <= (p.minStockAlert ?? 3);
  const lowStockProducts = products.filter(lowStock);
  const restockList = useMemo(() => [...lowStockProducts].sort((a, b) => a.stock - b.stock), [products]); // eslint-disable-line react-hooks/exhaustive-deps
  const productCategories = useMemo(() => Array.from(new Set<string>(products.map((p) => p.category))).sort((a, b) => a.localeCompare(b, 'fr')), [products]);
  const visibleProducts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return products.filter((p) => (category === 'all' || p.category === category)
      && (!q || p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q)));
  }, [products, category, searchTerm]);

  useEffect(() => {
    const load = () => getProducts().then((list) => { setProducts(list); setProductsLoaded(true); });
    load();
    getCategories().then(setCategories);
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

  const addFreeLine = () => {
    const amount = Number(freeAmount);
    if (!(amount > 0)) return;
    const label = freeLabel.trim() || 'Article libre';
    const free: any = { id: `free-${Date.now()}`, name: label, price: amount, vatRate: 0, image: null, stock: 0, __free: true };
    setCart(prev => [...prev, { product: free, quantity: 1 }]);
    setFreeOpen(false); setFreeAmount(''); setFreeLabel('');
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

  // Achat perso : les articles sont valorisés au prix d'achat (pas de marge)
  // et la vente n'entre pas dans le chiffre d'affaires.
  const unitPriceOf = (p: any) =>
    personalPurchase && !p.__free ? (Number(p.costPrice) || p.price) : p.price;

  const cartTotal = cart.reduce((sum, item) => sum + (unitPriceOf(item.product) * item.quantity), 0);
  const cartTva = cart.reduce((sum, item) => {
    const lineTtc = unitPriceOf(item.product) * item.quantity;
    const rate = item.product.vatRate || 0;
    return sum + (lineTtc - lineTtc / (1 + rate));
  }, 0);
  const cartSavings = cart.reduce((sum, item) => sum + ((item.product.price - unitPriceOf(item.product)) * item.quantity), 0);

  const resetSale = () => {
    setCart([]);
    setPersonalPurchase(false);
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
        cart.map(i => (i.product as any).__free
          ? { label: i.product.name, unit_price: i.product.price, quantity: i.quantity }
          : { product_id: i.product.id, quantity: i.quantity }),
        personalPurchase,
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

  // Création réelle d'un produit : minimal ici (nom + prix), puis on file sur sa fiche
  // pour la photo, la description et le reste.
  const handleCreateProduct = async () => {
    setNpError('');
    if (!npName.trim()) { setNpError('Le nom est obligatoire.'); return; }
    const price = Number(npPrice.replace(',', '.'));
    if (!(price >= 0)) { setNpError('Prix de vente invalide.'); return; }
    setCreatingProduct(true);
    try {
      const id = await createProduct({
        name: npName.trim(), price,
        stock: npStock === '' ? 0 : (parseInt(npStock, 10) || 0),
        categoryId: npCategory || null,
      });
      setIsAddProductModalOpen(false);
      setNpName(''); setNpPrice(''); setNpStock(''); setNpCategory('');
      navigate(`/app/boutique/produit/${id}`);
    } catch (e: any) {
      setNpError(e?.message || 'Création impossible.');
    } finally { setCreatingProduct(false); }
  };

  const handleCreateSupplier = async () => {
    if (!nsName.trim() || creatingSupplier) return;
    setCreatingSupplier(true);
    try {
      const id = await createSupplier({ name: nsName.trim(), contactName: nsContact.trim() || null, parentSupplierId: nsParent || null });
      setSupplierModalOpen(false); setNsName(''); setNsContact(''); setNsParent('');
      navigate(`/app/boutique/fournisseur/${id}`);
    } catch (e: any) {
      alert('Création impossible : ' + (e?.message || ''));
    } finally { setCreatingSupplier(false); }
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

  const titles: Record<string, { title: string; subtitle: string }> = {
    produits: { title: 'Produits', subtitle: `${products.length} article${products.length > 1 ? 's' : ''} · stock et vente au comptoir` },
    ventes: { title: 'Ventes', subtitle: 'Chiffre d\'affaires, top produits et factures' },
    fournisseurs: { title: 'Fournisseurs', subtitle: `${suppliers.length} fournisseur${suppliers.length > 1 ? 's' : ''} et marques` },
  };
  const heading = titles[activeView] ?? titles.produits;

  return (
    <div className="space-y-4">
      <PageHeader
        title={heading.title}
        subtitle={heading.subtitle}
        ruled={false}
        className="flex-wrap"
        actions={(
          <>
            {activeView === 'fournisseurs'
              ? <Button variant="secondary" icon={Plus} onClick={() => setSupplierModalOpen(true)}>Nouveau fournisseur</Button>
              : <Button variant="secondary" icon={Plus} onClick={() => setIsAddProductModalOpen(true)}>Ajouter un produit</Button>}
            <Button icon={ShoppingCart} onClick={() => setIsSelling(true)}>Lancer une vente</Button>
          </>
        )}
      />

      {activeView === 'produits' && (
        <div className={`grid gap-5 items-start ${lowStockProducts.length > 0 ? 'lg:grid-cols-[minmax(0,1fr)_300px]' : ''}`}>
          <div className="space-y-3 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-[300px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Nom ou code-barre…" aria-label="Rechercher un produit" className="pl-9" />
              </div>
              <Segmented tone="neutral" value={category} onChange={setCategory} options={[{ value: 'all', label: 'Tout' }, ...productCategories.map((c) => ({ value: c, label: c }))]} />
            </div>
            {!productsLoaded ? (
              <Skeleton className="h-96 w-full" />
            ) : visibleProducts.length === 0 ? (
              <div className="bg-surface border border-line">
                <EmptyState title="Aucun produit ne correspond.">Change la recherche ou la catégorie.</EmptyState>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 border-t border-l border-line">
                {visibleProducts.map((product) => (
                  <div key={product.id} className="group relative p-3.5 bg-surface border-r border-b border-line min-w-0">
                    <button type="button" onClick={() => navigate(`/app/boutique/produit/${product.id}`)} title="Voir la fiche produit" className="block w-full text-left">
                      <ProductVisual product={product} />
                      <span className="block text-xs text-muted mt-2.5 truncate">{product.category}</span>
                      <span className="block font-semibold text-ink truncate group-hover:text-primary transition-colors">{product.name}</span>
                    </button>
                    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 mt-1.5">
                      <span className="text-lg font-extrabold text-ink tabular-nums">{eur(product.price)}</span>
                      <button type="button" onClick={() => openStockEdit(product)} title="Modifier le stock" className="shrink-0 hover:underline">
                        <StockLabel product={product} />
                      </button>
                    </div>
                    <Button
                      variant="secondary"
                      onClick={() => { setIsSelling(true); addToCart(product); }}
                      className="hidden sm:inline-flex absolute top-5 right-5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100"
                    >
                      Vendre
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {lowStockProducts.length > 0 && (
            <Card
              ruled
              title="À réapprovisionner"
              action={<Tag tone="danger" className="tabular-nums">{lowStockProducts.length}</Tag>}
              className="min-w-0"
            >
              <div className="-mt-3">
                {(showAllLow ? restockList : restockList.slice(0, RESTOCK_PREVIEW)).map((p) => (
                  <button key={p.id} type="button" onClick={() => navigate(`/app/boutique/produit/${p.id}`)} className="w-full flex items-center justify-between gap-3 py-2 border-b border-line-soft text-left hover:text-primary transition-colors">
                    <span className="truncate">{p.name}</span>
                    <span className={`font-extrabold tabular-nums shrink-0 ${p.stock < 0 ? 'text-danger-text' : p.stock === 0 ? 'text-ink' : 'text-warning-text'}`}>{num(p.stock)}</span>
                  </button>
                ))}
              </div>
              {restockList.length > RESTOCK_PREVIEW && (
                <Button variant="ghost" className="mt-2" onClick={() => setShowAllLow((v) => !v)}>
                  {showAllLow ? 'Réduire la liste' : `Voir les ${restockList.length}`}
                </Button>
              )}
            </Card>
          )}
        </div>
      )}

      {activeView === 'ventes' && (
        <div className="space-y-4">
          <StatRow
            loading={!stats}
            stats={[
              { label: "CA aujourd'hui", value: eur(stats?.ca_today ?? 0) },
              { label: 'CA ce mois', value: eur(stats?.ca_month ?? 0) },
              { label: 'Marge ce mois', value: eur(stats?.margin_month ?? 0) },
              { label: 'Ventes ce mois', value: num(stats?.sales_month ?? 0) },
            ]}
          />
          {stats && stats.top_products.length > 0 && (
            <Card ruled title="Top produits">
              <div className="-mt-3">
                {stats.top_products.map((t, i) => (
                  <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-line-soft last:border-b-0">
                    <span className="font-semibold text-ink min-w-0 truncate"><span className="text-muted font-normal tabular-nums mr-2">{i + 1}</span>{t.name}</span>
                    <span className="text-muted tabular-nums shrink-0">{t.qty} vendus · {eur(Number(t.revenue))}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {sales.length === 0 ? (
            <div className="bg-surface border border-line">
              <EmptyState title="Aucune vente pour le moment.">Lance une vente pour la voir apparaître ici.</EmptyState>
            </div>
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Facture</Th>
                  <Th>Date</Th>
                  <Th>Client</Th>
                  <Th>Articles</Th>
                  <Th>Paiement</Th>
                  <Th className="text-right">Total TTC</Th>
                  <Th>Facture e-mail</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {sales.map((s: any) => (
                  <Tr key={s.id}>
                    <Td className="font-semibold tabular-nums whitespace-nowrap">{s.invoice_number}</Td>
                    <Td className="text-muted tabular-nums whitespace-nowrap">{s.sale_date ? new Date(s.sale_date).toLocaleDateString('fr-FR') : null}</Td>
                    <Td className="whitespace-nowrap">{s.member ? `${s.member.first_name} ${s.member.last_name}` : 'Anonyme'}</Td>
                    <Td className="max-w-[240px] truncate" title={saleItemsLabel(s)}>{saleItemsLabel(s)}</Td>
                    <Td className="text-muted">{s.payment_method}</Td>
                    <Td className="text-right font-semibold tabular-nums whitespace-nowrap">{eur(Number(s.total_ttc || 0))}</Td>
                    <Td>{s.invoice_email_status === 'sent' ? <Tag tone="success">Envoyée</Tag> : null}</Td>
                    <Td>
                      <div className="flex items-center justify-end gap-1">
                        <IconButton label="Voir ou générer la facture PDF" onClick={() => handleViewInvoice(s.id, s.invoice_pdf_path)}><FileText size={16} /></IconButton>
                        {s.invoice_pdf_path && <IconButton label="Télécharger le PDF" onClick={() => handleOpenPdf(s.invoice_pdf_path)}><Download size={16} /></IconButton>}
                        {s.member?.email && <IconButton label="Envoyer ou renvoyer la facture par e-mail" onClick={() => handleResendInvoice(s.id)}><Send size={16} /></IconButton>}
                        <IconButton label="Supprimer la vente" onClick={() => handleDeleteSale(s.id)}><Trash2 size={16} /></IconButton>
                      </div>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      )}

      {activeView === 'fournisseurs' && (
        suppliers.length === 0 ? (
          <div className="bg-surface border border-line">
            <EmptyState title="Aucun fournisseur.">Ajoute tes fournisseurs pour les rattacher à tes produits.</EmptyState>
          </div>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Fournisseur</Th>
                <Th>Type</Th>
                <Th>Contact</Th>
                <Th>E-mail</Th>
                <Th>Téléphone</Th>
                <Th className="text-right">Produits</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <Tr key={s.id} onClick={() => navigate(`/app/boutique/fournisseur/${s.id}`)}>
                  <Td>
                    <div className="font-semibold">{s.name}</div>
                    {s.parentName && <div className="text-sm text-muted">Via {s.parentName}</div>}
                    {(s.subCount ?? 0) > 0 && <div className="text-sm text-muted">{s.subCount} marque{(s.subCount ?? 0) > 1 ? 's' : ''}</div>}
                  </Td>
                  <Td className="text-muted">{s.supplier_type}</Td>
                  <Td>{s.contact_name}</Td>
                  <Td className="text-muted">{s.email ? s.email.toLowerCase() : null}</Td>
                  <Td className="tabular-nums whitespace-nowrap">{s.phone ? formatPhone(s.phone) : null}</Td>
                  <Td className="text-right font-semibold tabular-nums">{s.productCount}</Td>
                  <ChevronCell />
                </Tr>
              ))}
            </tbody>
          </Table>
        )
      )}

      {/* MODALE AJOUT PRODUIT */}
      {isAddProductModalOpen && (
        <Modal
          title="Nouveau produit"
          onClose={() => setIsAddProductModalOpen(false)}
          footer={(
            <>
              <Button variant="secondary" onClick={() => setIsAddProductModalOpen(false)}>Annuler</Button>
              <Button onClick={handleCreateProduct} disabled={creatingProduct}>
                {creatingProduct ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Créer et ouvrir la fiche
              </Button>
            </>
          )}
        >
          <div className="space-y-3">
            {npError && <Alert tone="danger">{npError}</Alert>}
            <Field label="Nom du produit" required>
              <Input type="text" value={npName} onChange={(e) => setNpName(e.target.value)} autoFocus placeholder="Whey, Shaker, Gants…" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Prix de vente (€)"><Input type="text" inputMode="decimal" value={npPrice} onChange={(e) => setNpPrice(e.target.value)} placeholder="19,90" /></Field>
              <Field label="Stock initial"><Input type="number" value={npStock} onChange={(e) => setNpStock(e.target.value)} placeholder="0" /></Field>
            </div>
            <Field label="Catégorie" hint="Photo, description et fournisseur s'ajoutent juste après, sur la fiche du produit.">
              <Select value={npCategory} onChange={(e) => setNpCategory(e.target.value)}>
                <option value="">Aucune</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          </div>
        </Modal>
      )}

      {/* TERMINAL DE VENTE */}
      {isSelling && (
        <Modal
          title="Terminal de vente"
          size="xl"
          onClose={() => setIsSelling(false)}
          bodyClassName="flex flex-col md:flex-row h-[85vh] min-h-0 overflow-y-auto md:overflow-hidden"
        >
          {/* Zone produits */}
          <div className="flex-grow min-w-0 p-5 md:overflow-y-auto">
            <div className="relative mb-4">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <Input
                fieldSize="lg"
                value={posSearch}
                onChange={(e) => setPosSearch(e.target.value)}
                onKeyDown={handlePosKeyDown}
                autoFocus
                placeholder="Rechercher un article ou scanner un code-barre…"
                aria-label="Rechercher un article"
                className="pl-9"
              />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 border-t border-l border-line">
              {/* Article libre : montant + libellé (le libellé = nom de l'article vendu) */}
              {!freeOpen ? (
                <button type="button" onClick={() => setFreeOpen(true)} className="flex flex-col items-center justify-center gap-1 p-3.5 bg-surface border-r border-b border-line text-ink hover:bg-ground-2 transition-colors min-h-[180px]">
                  <Plus size={32} className="text-muted" />
                  <span className="font-semibold">Article libre</span>
                  <span className="text-xs text-muted">Montant + libellé</span>
                </button>
              ) : (
                <div className="flex flex-col justify-center gap-2 p-3.5 bg-surface border-r border-b border-line min-h-[180px]">
                  <p className="font-semibold text-ink">Article libre</p>
                  <Input value={freeLabel} onChange={(e) => setFreeLabel(e.target.value)} placeholder="Libellé" aria-label="Libellé de l'article" />
                  <Input type="number" min="0" step="0.01" value={freeAmount} onChange={(e) => setFreeAmount(e.target.value)} placeholder="Montant €" aria-label="Montant de l'article" />
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" disabled={!(Number(freeAmount) > 0)} onClick={addFreeLine}>Ajouter</Button>
                    <Button variant="ghost" onClick={() => { setFreeOpen(false); setFreeAmount(''); setFreeLabel(''); }}>Annuler</Button>
                  </div>
                </div>
              )}
              {posProducts.map((product) => (
                <button key={product.id} type="button" onClick={() => addToCart(product)} className="block text-left p-3.5 bg-surface border-r border-b border-line hover:bg-ground-2 transition-colors min-w-0">
                  <ProductVisual product={product} />
                  <span className="block font-semibold text-ink truncate mt-2.5">{product.name}</span>
                  <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5 mt-1">
                    <span className="text-lg font-extrabold text-ink tabular-nums">{eur(product.price)}</span>
                    <StockLabel product={product} />
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Zone panier */}
          <div className="w-full md:w-[360px] shrink-0 border-t md:border-t-0 md:border-l border-line flex flex-col md:min-h-0">
            <div className="flex-grow p-4 flex flex-col md:min-h-0">
              {/* Sélection du client */}
              <div className="mb-4 relative" ref={memberSearchRef}>
                <FieldLabel>Attribuer à un membre</FieldLabel>
                {selectedMember ? (
                  <div className="flex items-center gap-3 p-2 bg-ground-2 border border-line">
                    <Avatar name={`${selectedMember.firstName} ${selectedMember.lastName}`} />
                    <div className="flex-grow min-w-0">
                      <p className="font-semibold text-ink truncate">{selectedMember.firstName} {selectedMember.lastName}</p>
                      <p className="text-xs text-muted truncate">{selectedMember.memberNumber ? `N° ${selectedMember.memberNumber}` : (selectedMember.email || 'Client')}</p>
                    </div>
                    <IconButton label="Retirer le membre" onClick={() => setSelectedMember(null)}><X size={16} /></IconButton>
                  </div>
                ) : (
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                    <Input
                      type="text"
                      value={memberSearchTerm}
                      onChange={(e) => { setMemberSearchTerm(e.target.value); setIsSearchingMember(true); }}
                      onFocus={() => setIsSearchingMember(true)}
                      placeholder="Nom du client…"
                      aria-label="Nom du client"
                      className="pl-9"
                    />
                  </div>
                )}

                {isSearchingMember && !selectedMember && memberSearchTerm && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-surface shadow-float border border-line z-10 max-h-60 overflow-y-auto">
                    {memberResults.map((m) => (
                      <button key={m.id} type="button" onClick={() => { setSelectedMember(m); setIsSearchingMember(false); }} className="w-full p-2.5 flex items-center gap-3 hover:bg-ground-2 transition-colors text-left">
                        <Avatar name={`${m.firstName} ${m.lastName}`} />
                        <span className="font-semibold text-ink min-w-0 truncate">{m.firstName} {m.lastName}{m.memberNumber ? ` · N° ${m.memberNumber}` : ''}</span>
                      </button>
                    ))}
                    {memberResults.length === 0 && !quickOpen && (
                      <div className="p-3 text-center">
                        <p className="text-sm text-muted mb-1">Aucun membre trouvé.</p>
                        <Button
                          variant="ghost"
                          icon={UserPlus}
                          onClick={() => {
                            const parts = memberSearchTerm.trim().split(' ');
                            setQuickFirst(parts[0] || '');
                            setQuickLast(parts.slice(1).join(' ') || '');
                            setQuickOpen(true);
                          }}
                        >
                          Créer une fiche rapide
                        </Button>
                      </div>
                    )}
                    {quickOpen && (
                      <div className="p-3 space-y-2">
                        <p className="font-semibold text-ink">Nouveau client</p>
                        <div className="grid grid-cols-2 gap-2">
                          <Input value={quickFirst} onChange={(e) => setQuickFirst(e.target.value)} placeholder="Prénom" aria-label="Prénom" />
                          <Input value={quickLast} onChange={(e) => setQuickLast(e.target.value)} placeholder="Nom" aria-label="Nom" />
                        </div>
                        <Input value={quickEmail} onChange={(e) => setQuickEmail(e.target.value)} placeholder="E-mail (pour la facture)" aria-label="E-mail" />
                        <div className="flex items-center gap-2">
                          <Button variant="secondary" onClick={handleQuickCreate} disabled={!quickFirst.trim() || !quickLast.trim() || creatingMember}>{creatingMember ? 'Création…' : 'Créer et sélectionner'}</Button>
                          <Button variant="ghost" onClick={() => setQuickOpen(false)}>Annuler</Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <h3 className="text-sm font-extrabold text-ink border-b-2 border-ink pb-1.5">Panier ({cart.reduce((s, i) => s + i.quantity, 0)})</h3>

              <div className="flex-grow md:overflow-y-auto md:min-h-0">
                {cart.length === 0 ? (
                  <p className="text-muted text-center py-8">Le panier est vide.</p>
                ) : (
                  cart.map((item) => (
                    <div key={item.product.id} className="flex items-center gap-2 py-2 border-b border-line-soft">
                      <div className="flex-grow min-w-0">
                        <p className="font-semibold text-ink truncate">{item.product.name}</p>
                        <p className="text-sm text-muted tabular-nums">{eur(item.product.price)}</p>
                      </div>
                      <div className="flex items-center border border-subtle shrink-0">
                        <IconButton label={`Retirer un ${item.product.name}`} onClick={() => updateQuantity(item.product.id, -1)} className="!h-8 !w-8"><Minus size={14} /></IconButton>
                        <span className="min-w-[24px] text-center font-semibold tabular-nums">{item.quantity}</span>
                        <IconButton label={`Ajouter un ${item.product.name}`} onClick={() => updateQuantity(item.product.id, 1)} className="!h-8 !w-8"><Plus size={14} /></IconButton>
                      </div>
                      <IconButton label={`Enlever ${item.product.name} du panier`} onClick={() => setCart((prev) => prev.filter((i) => i.product.id !== item.product.id))}><Trash2 size={16} /></IconButton>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-4 border-t border-line space-y-3">
              {/* Achat perso : prix coûtant, hors chiffre d'affaires */}
              <label className={`flex items-start gap-3 p-2.5 border cursor-pointer transition-colors ${personalPurchase ? 'bg-warning-soft border-warning' : 'border-line hover:bg-ground-2'}`}>
                <input type="checkbox" checked={personalPurchase} onChange={(e) => setPersonalPurchase(e.target.checked)} className="h-4 w-4 mt-0.5 shrink-0" />
                <span className="min-w-0">
                  <span className="block font-semibold text-ink">Achat perso (prix coûtant)</span>
                  <span className="block text-sm text-muted">
                    {personalPurchase
                      ? `Articles au prix d'achat · ${eur(cartSavings)} de marge non facturée · vente hors CA`
                      : "Sans marge, et la vente ne compte pas dans le chiffre d'affaires."}
                  </span>
                </span>
              </label>

              <div className="space-y-1">
                <div className="flex justify-between text-sm text-muted tabular-nums"><span>Total HT</span><span>{eur(cartTotal - cartTva)}</span></div>
                <div className="flex justify-between text-sm text-muted tabular-nums"><span>Dont TVA</span><span>{eur(cartTva)}</span></div>
                <div className="flex justify-between items-baseline gap-3 pt-2 border-t border-line">
                  <span className="font-extrabold text-ink">{personalPurchase ? 'Total coûtant' : 'Total à payer'}</span>
                  <span className={`text-2xl font-extrabold tabular-nums ${personalPurchase ? 'text-warning-text' : 'text-ink'}`}>{eur(cartTotal)}</span>
                </div>
              </div>

              <div role="radiogroup" aria-label="Mode de paiement" className="grid grid-cols-2 border border-subtle">
                {([['CB', 'CB / sans contact', CreditCard], ['Espèces', 'Espèces', Banknote]] as const).map(([value, text, Icon], i) => (
                  <button key={value} type="button" role="radio" aria-checked={paymentMethod === value} onClick={() => setPaymentMethod(value)} className={`h-11 flex items-center justify-center gap-2 transition-colors ${i > 0 ? 'border-l border-subtle' : ''} ${paymentMethod === value ? 'bg-primary text-white font-semibold' : 'bg-surface text-ink hover:bg-ground'}`}>
                    <Icon size={16} /> {text}
                  </button>
                ))}
              </div>

              <Button size="lg" block icon={CheckCircle2} onClick={handleCheckout} disabled={cart.length === 0 || processing || !paymentMethod} className="justify-center">
                {processing ? 'Encaissement…' : 'Valider et encaisser'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* VENTE TERMINÉE */}
      {saleStep === 'success' && (
        <Modal
          title="Vente terminée"
          onClose={resetSale}
          footer={<Button onClick={resetSale}>Terminer</Button>}
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 size={24} className="text-success shrink-0" />
              <div className="min-w-0">
                <p className="text-ink">Paiement confirmé, stock mis à jour.</p>
                {saleResult && <p className="font-extrabold text-ink tabular-nums mt-0.5">Facture {saleResult.invoice_number} · {eur(saleResult.total_ttc)}</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={FileText} onClick={() => saleResult && handleViewInvoice(saleResult.sale_id, null)}>Voir la facture (PDF)</Button>
              <Button
                variant="secondary"
                icon={Send}
                onClick={handleSendInvoice}
                disabled={!selectedMember?.email}
                title={selectedMember?.email ? '' : 'Aucun e-mail client : rattachez un membre avec e-mail pour envoyer la facture'}
              >
                Envoyer la facture par e-mail
              </Button>
            </div>
            {accessMsg && <Alert tone="info">{accessMsg}</Alert>}
            {invoiceMsg && <p className="font-semibold text-ink">{invoiceMsg}</p>}
            {!selectedMember && <p className="text-sm text-muted">Vente anonyme : rattachez un client avant l'encaissement pour pouvoir envoyer une facture par e-mail.</p>}
          </div>
        </Modal>
      )}

      {/* MODALE NOUVEAU FOURNISSEUR */}
      {supplierModalOpen && (
        <Modal
          title="Nouveau fournisseur"
          onClose={() => setSupplierModalOpen(false)}
          footer={(
            <>
              <Button variant="secondary" onClick={() => setSupplierModalOpen(false)}>Annuler</Button>
              <Button onClick={handleCreateSupplier} disabled={!nsName.trim() || creatingSupplier}>
                {creatingSupplier ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Créer et ouvrir la fiche
              </Button>
            </>
          )}
        >
          <div className="space-y-3">
            <Field label="Nom du fournisseur" required><Input value={nsName} onChange={(e) => setNsName(e.target.value)} autoFocus placeholder="Nutrimuscle, Décathlon Pro…" /></Field>
            <Field label="Contact" optional><Input value={nsContact} onChange={(e) => setNsContact(e.target.value)} placeholder="Nom du contact" /></Field>
            <Field label="Fournisseur parent" optional hint="Pour créer une marque sous un distributeur (ex. RSB Distribution). Le reste se complète sur la fiche.">
              <Select value={nsParent} onChange={(e) => setNsParent(e.target.value)}>
                <option value="">Aucun (fournisseur principal)</option>
                {suppliers.filter((s) => !s.parent_supplier_id).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
          </div>
        </Modal>
      )}

      {/* MODALE STOCK */}
      {stockEdit && (
        <Modal
          title={stockEdit.name}
          onClose={() => setStockEdit(null)}
          footer={(
            <>
              <Button variant="secondary" onClick={() => setStockEdit(null)}>Annuler</Button>
              <Button onClick={handleSaveStock}>Enregistrer</Button>
            </>
          )}
        >
          <div className="space-y-3">
            <Field label="Stock actuel"><Input type="number" value={stockValue} onChange={(e) => setStockValue(e.target.value)} /></Field>
            <Field label="Seuil d'alerte (stock bas)"><Input type="number" value={alertValue} onChange={(e) => setAlertValue(e.target.value)} placeholder="par défaut : 3" /></Field>
          </div>
        </Modal>
      )}
    </div>
  );
};

/** Photo du produit, ou pictogramme discret s'il n'en a pas. */
const ProductVisual: React.FC<{ product: Product }> = ({ product }) => (
  product.image
    ? <img src={product.image} alt="" className="w-full h-[110px] object-contain" />
    : <span className="w-full h-[110px] bg-ground flex items-center justify-center"><Package size={32} className="text-muted" /></span>
);

const StockLabel: React.FC<{ product: Product }> = ({ product }) => {
  if (product.stock <= 0) return <Tag tone="danger">Rupture</Tag>;
  if (product.stock <= (product.minStockAlert ?? 3)) return <Tag tone="warning" className="tabular-nums">{product.stock} en stock</Tag>;
  return <span className="text-xs text-muted tabular-nums whitespace-nowrap">{product.stock} en stock</span>;
};

export default BoutiquePage;
