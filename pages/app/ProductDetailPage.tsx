import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Package, Camera, Loader2, Save, Trash2, Plus, Minus,
  RotateCcw,
} from 'lucide-react';
import {
  getProduct, updateProduct, uploadProductImage, setProductActive,
  getCategories, createCategory, getSuppliers, CategoryRow, SupplierRow, ProductDetail, ProductInput,
} from '../../lib/boutiqueApi';
import { eur } from '../../lib/format';
import { Button, Card, EmptyState, Field, FieldLabel, IconButton, Input, PageHeader, Select, Skeleton, Tag, Textarea } from '../../components/ui';

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

  if (loading) return <Skeleton className="h-96 w-full max-w-5xl" />;
  if (!p) return (
    <div className="bg-surface border border-line max-w-5xl">
      <EmptyState title="Produit introuvable." action={<Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/app/boutique')}>Retour à la boutique</Button>} />
    </div>
  );

  return (
    <div className="space-y-4 max-w-5xl">
      <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/app/boutique')}>Boutique</Button>
      <PageHeader
        title={p.name}
        subtitle={p.categoryName || 'Sans catégorie'}
        className="flex-wrap"
        actions={(
          <div className="flex items-center gap-2">
            {!p.isActive && <Tag>Retiré du catalogue</Tag>}
            {p.isActive
              ? <Button variant="danger" icon={Trash2} onClick={toggleActive}>Retirer du catalogue</Button>
              : <Button variant="secondary" icon={RotateCcw} onClick={toggleActive}>Remettre en vente</Button>}
          </div>
        )}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        {/* Colonne gauche : photo + stock */}
        <div className="space-y-4">
          <Card>
            <div className="relative aspect-square bg-ground overflow-hidden flex items-center justify-center">
              {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-contain" alt={p.name} /> : <Package size={32} className="text-muted" />}
              {uploading && <div className="absolute inset-0 bg-surface/70 flex items-center justify-center"><Loader2 className="animate-spin text-primary" /></div>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPhoto} />
            <Button variant="secondary" icon={Camera} onClick={pickPhoto} disabled={uploading} className="mt-3">
              {p.imageUrl ? 'Changer la photo' : 'Ajouter une photo'}
            </Button>
          </Card>

          <Card title="Stock" action={lowStock ? <Tag tone="warning">À réapprovisionner</Tag> : <Tag tone="success">OK</Tag>}>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <IconButton label="Retirer une unité" onClick={() => setStock((s) => Math.max(0, s - 1))} className="border border-subtle"><Minus size={16} /></IconButton>
                <input type="number" aria-label="Stock" value={stock} onChange={(e) => setStock(Math.max(0, parseInt(e.target.value, 10) || 0))} className="w-20 text-center text-2xl font-extrabold text-ink bg-transparent tabular-nums" />
                <IconButton label="Ajouter une unité" onClick={() => setStock((s) => s + 1)} className="border border-subtle"><Plus size={16} /></IconButton>
              </div>
              <Field label="Seuil d'alerte"><Input type="number" value={minStockAlert} onChange={(e) => setMinStockAlert(e.target.value)} placeholder="par défaut : 3" /></Field>
            </div>
          </Card>
        </div>

        {/* Colonne droite : infos */}
        <Card className="lg:col-span-2">
          <div className="space-y-4">
            <Field label="Nom du produit"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Whey, Shaker, Gants…" /></Field>
            <Field label="Description"><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Composition, parfum, taille, conseils d'utilisation…" /></Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Prix de vente (€)"><Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="19,90" /></Field>
              <Field label="Prix d'achat (€)"><Input value={costPrice} onChange={(e) => setCostPrice(e.target.value)} inputMode="decimal" placeholder="12,00" /></Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="TVA">
                <Select value={vatRate} onChange={(e) => setVatRate(Number(e.target.value))}>
                  {VAT_OPTIONS.map((v) => <option key={v} value={v}>{(v * 100).toFixed(v === 0.055 ? 1 : 0).replace('.', ',')} %</option>)}
                </Select>
              </Field>
              <div>
                <FieldLabel>Marge unitaire</FieldLabel>
                <div className={`h-9 px-3 flex items-center bg-ground font-semibold tabular-nums ${margin < 0 ? 'text-danger-text' : 'text-success-text'}`}>{eur(margin)}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Field label="Catégorie">
                  <Select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                    <option value="">Aucune</option>
                    {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </Field>
                {!categoryId && <Input value={newCat} onChange={(e) => setNewCat(e.target.value)} placeholder="Nouvelle catégorie" aria-label="Nouvelle catégorie" className="mt-2" />}
              </div>
              <Field label="Fournisseur">
                <Select value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                  <option value="">Aucun</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}{s.parentName ? ` (${s.parentName})` : ''}</option>)}
                </Select>
              </Field>
            </div>

            <Field label="Référence ou code-barre (SKU)"><Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="ex. 3616701 (scannable au comptoir)" /></Field>

            <div className="flex items-center justify-between gap-3 pt-3 border-t border-line">
              {msg ? <span className={`font-semibold ${msg.includes('✓') ? 'text-success-text' : 'text-danger-text'}`}>{msg}</span> : <span />}
              <Button onClick={save} disabled={saving}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer</Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ProductDetailPage;
