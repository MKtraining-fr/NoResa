import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Package, Camera, Loader2, Save, Trash2, Plus, Minus,
  AlertTriangle, Tag, Truck, Check, RotateCcw,
} from 'lucide-react';
import {
  getProduct, updateProduct, uploadProductImage, setProductActive,
  getCategories, createCategory, getSuppliers, CategoryRow, SupplierRow, ProductDetail, ProductInput,
} from '../../lib/boutiqueApi';

const eur = (n: number) => `${(n || 0).toFixed(2).replace('.', ',')} €`;
const VAT_OPTIONS = [0, 0.055, 0.1, 0.2];

/** Fiche produit : édition complète (photo, description, tarifs, catégorie, fournisseur) + gestion du stock. */
const ProductDetailPage: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [p, setP] = useState<ProductDetail | null>(null);
  const [cats, setCats] = useState<CategoryRow[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierRow[]>([]);

  // Champs éditables
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [sku, setSku] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [vatRate, setVatRate] = useState(0);
  const [stock, setStock] = useState(0);
  const [minStockAlert, setMinStockAlert] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [newCat, setNewCat] = useState('');

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState('');

  const hydrate = (d: ProductDetail) => {
    setP(d);
    setName(d.name || ''); setDescription(d.description || ''); setSku(d.sku || '');
    setPrice(String(d.price ?? '')); setCostPrice(d.costPrice != null ? String(d.costPrice) : '');
    setVatRate(d.vatRate ?? 0); setStock(d.stock ?? 0);
    setMinStockAlert(d.minStockAlert != null ? String(d.minStockAlert) : '');
    setCategoryId(d.categoryId || ''); setSupplierId(d.supplierId || '');
  };

  useEffect(() => {
    let stop = false;
    Promise.all([getProduct(id), getCategories(), getSuppliers()]).then(([prod, c, s]) => {
      if (stop) return;
      setCats(c); setSuppliers(s);
      if (prod) hydrate(prod);
      setLoading(false);
    });
    return () => { stop = true; };
  }, [id]);

  const lowStock = p ? stock <= (minStockAlert === '' ? 3 : Number(minStockAlert)) : false;
  const margin = (Number(price) || 0) - (Number(costPrice) || 0);

  const pickPhoto = () => fileRef.current?.click();
  const onPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !p) return;
    setUploading(true); setMsg('');
    try {
      const url = await uploadProductImage(p.id, file);
      setP({ ...p, imageUrl: url });
    } catch (err: any) { setMsg(err?.message || 'Envoi de la photo impossible.'); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ''; }
  };

  const save = async () => {
    if (!p) return;
    if (!name.trim()) { setMsg('Le nom est obligatoire.'); return; }
    if (!(Number(price) >= 0)) { setMsg('Prix de vente invalide.'); return; }
    setSaving(true); setMsg('');
    try {
      let catId = categoryId;
      if (!catId && newCat.trim()) { const c = await createCategory(newCat.trim()); catId = c.id; setCats((l) => [...l, c]); setCategoryId(c.id); setNewCat(''); }
      const patch: Partial<ProductInput> = {
        name: name.trim(), description: description.trim() || null, sku: sku.trim() || null,
        price: Number(price) || 0, costPrice: costPrice === '' ? null : Number(costPrice),
        vatRate, stock, minStockAlert: minStockAlert === '' ? null : Number(minStockAlert),
        categoryId: catId || null, supplierId: supplierId || null,
      };
      await updateProduct(p.id, patch);
      setMsg('Enregistré ✓');
      const fresh = await getProduct(p.id); if (fresh) hydrate(fresh);
    } catch (err: any) { setMsg(err?.message || 'Enregistrement impossible.'); }
    finally { setSaving(false); }
  };

  const toggleActive = async () => {
    if (!p) return;
    try { await setProductActive(p.id, !p.isActive); setP({ ...p, isActive: !p.isActive }); }
    catch (err: any) { setMsg(err?.message || 'Action impossible.'); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[50vh] text-gray-300"><Loader2 className="animate-spin" /></div>;
  if (!p) return (
    <div className="p-8 text-center space-y-4">
      <p className="text-gray-500 font-semibold">Produit introuvable.</p>
      <button onClick={() => navigate('/app/boutique')} className="text-indigo-600 font-bold text-sm">← Retour à la boutique</button>
    </div>
  );

  const field = 'w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-500/10';
  const label = 'text-[10px] font-semibold text-gray-400 uppercase tracking-wide';

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-5xl">
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => navigate('/app/boutique')} className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-indigo-600">
          <ArrowLeft size={16} /> Boutique
        </button>
        <div className="flex items-center gap-2">
          {!p.isActive && <span className="text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-500 px-3 py-1.5 rounded-lg">Retiré du catalogue</span>}
          <button onClick={toggleActive} className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-2 rounded-xl ${p.isActive ? 'text-gray-500 hover:text-red-600 hover:bg-red-50' : 'text-green-700 bg-green-50 hover:bg-green-100'}`}>
            {p.isActive ? <><Trash2 size={13} /> Retirer du catalogue</> : <><RotateCcw size={13} /> Remettre en vente</>}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche : photo + stock */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm">
            <div className="relative aspect-square rounded-2xl bg-gray-50 overflow-hidden flex items-center justify-center">
              {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" alt={p.name} /> : <Package size={56} className="text-gray-300" />}
              {uploading && <div className="absolute inset-0 bg-white/70 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-600" /></div>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
            <button onClick={pickPhoto} disabled={uploading} className="mt-3 w-full inline-flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-50 text-gray-600 font-bold text-xs uppercase tracking-wide hover:bg-indigo-600 hover:text-white transition-colors disabled:opacity-50">
              <Camera size={15} /> {p.imageUrl ? 'Changer la photo' : 'Ajouter une photo'}
            </button>
          </div>

          <div className="bg-white border border-gray-100 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className={label}>Stock</h3>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={() => setStock((s) => Math.max(0, s - 1))} className="w-10 h-10 rounded-xl border border-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-50"><Minus size={16} /></button>
                <input type="number" value={stock} onChange={(e) => setStock(Math.max(0, parseInt(e.target.value, 10) || 0))} className="w-20 text-center text-2xl font-extrabold text-gray-900 bg-transparent outline-none" />
                <button onClick={() => setStock((s) => s + 1)} className="w-10 h-10 rounded-xl border border-gray-200 text-gray-500 flex items-center justify-center hover:bg-gray-50"><Plus size={16} /></button>
              </div>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg ${lowStock ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>{lowStock ? 'Stock bas' : 'OK'}</span>
            </div>
            <div className="space-y-1">
              <label className={label}>Seuil d'alerte</label>
              <input type="number" value={minStockAlert} onChange={(e) => setMinStockAlert(e.target.value)} placeholder="par défaut : 3" className={field} />
            </div>
            {lowStock && <p className="flex items-center gap-1.5 text-[11px] font-bold text-red-500"><AlertTriangle size={12} /> À réapprovisionner</p>}
          </div>
        </div>

        {/* Colonne droite : infos */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="space-y-1">
            <label className={label}>Nom du produit</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={field} placeholder="Whey, Shaker, Gants…" />
          </div>
          <div className="space-y-1">
            <label className={label}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className={`${field} resize-none`} placeholder="Composition, parfum, taille, conseils d'utilisation…" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={label}>Prix de vente (€)</label>
              <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" className={field} placeholder="19,90" />
            </div>
            <div className="space-y-1">
              <label className={label}>Prix d'achat / coûtant (€)</label>
              <input value={costPrice} onChange={(e) => setCostPrice(e.target.value)} inputMode="decimal" className={field} placeholder="12,00" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={label}>TVA</label>
              <select value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))} className={field}>
                {VAT_OPTIONS.map((v) => <option key={v} value={v}>{(v * 100).toFixed(v === 0.055 ? 1 : 0).replace('.', ',')} %</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className={label}>Marge unitaire</label>
              <div className={`${field} flex items-center ${margin < 0 ? 'text-red-600' : 'text-green-700'}`}>{eur(margin)}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={`${label} flex items-center gap-1`}><Tag size={11} /> Catégorie</label>
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={field}>
                <option value="">— Aucune —</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {!categoryId && <input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="+ nouvelle catégorie" className={`${field} mt-2`} />}
            </div>
            <div className="space-y-1">
              <label className={`${label} flex items-center gap-1`}><Truck size={11} /> Fournisseur</label>
              <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={field}>
                <option value="">— Aucun —</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className={label}>Référence / code-barre (SKU)</label>
            <input value={sku} onChange={(e) => setSku(e.target.value)} className={field} placeholder="ex. 3616701 (scannable au comptoir)" />
          </div>

          <div className="flex items-center justify-between pt-2">
            {msg ? <span className={`text-sm font-semibold ${msg.includes('✓') ? 'text-green-600' : 'text-red-600'}`}>{msg}</span> : <span />}
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold text-sm px-6 py-3 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-60">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
