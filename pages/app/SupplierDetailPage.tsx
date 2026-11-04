import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, Package, Layers, ChevronRight } from 'lucide-react';
import { getSupplier, updateSupplier, getSupplierProducts, getSubSuppliers, getSuppliers, SupplierInput, SupplierRow } from '../../lib/boutiqueApi';
import { Product } from '../../types';
import { eur } from '../../lib/format';
import { Button, Card, EmptyState, Field, Input, PageHeader, Select, Skeleton, Tag, Textarea } from '../../components/ui';

/** Fiche fournisseur : coordonnées éditables + liste de ses produits (cliquables). */
const SupplierDetailPage: React.FC = () => {
  const { id = '' } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [found, setFound] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);

  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [supplierType, setSupplierType] = useState('');
  const [notes, setNotes] = useState('');
  const [parentId, setParentId] = useState('');
  const [parentName, setParentName] = useState<string | null>(null);
  const [subs, setSubs] = useState<SupplierRow[]>([]);
  const [allSuppliers, setAllSuppliers] = useState<SupplierRow[]>([]);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let stop = false;
    Promise.all([getSupplier(id), getSupplierProducts(id), getSubSuppliers(id), getSuppliers()]).then(([s, prods, sub, all]) => {
      if (stop) return;
      if (!s) { setFound(false); setLoading(false); return; }
      setName(s.name || ''); setContactName(s.contact_name || ''); setEmail(s.email || '');
      setPhone(s.phone || ''); setAddress(s.address || ''); setSupplierType(s.supplier_type || '');
      setNotes((s as any).notes || '');
      setParentId((s as any).parent_supplier_id || ''); setParentName(s.parentName || null);
      setProducts(prods); setSubs(sub); setAllSuppliers(all); setLoading(false);
    });
    return () => { stop = true; };
  }, [id]);

  const save = async () => {
    if (!name.trim()) { setMsg('Le nom est obligatoire.'); return; }
    setSaving(true); setMsg('');
    try {
      const patch: Partial<SupplierInput> = {
        name: name.trim(), contactName: contactName.trim() || null, email: email.trim() || null,
        phone: phone.trim() || null, address: address.trim() || null,
        supplierType: supplierType.trim() || null, notes: notes.trim() || null,
        parentSupplierId: parentId || null,
      };
      await updateSupplier(id, patch);
      setParentName(parentId ? (allSuppliers.find((s) => s.id === parentId)?.name ?? null) : null);
      setMsg('Enregistré ✓');
    } catch (e: any) { setMsg(e?.message || 'Enregistrement impossible.'); }
    finally { setSaving(false); }
  };

  if (loading) return <Skeleton className="h-96 w-full max-w-5xl" />;
  if (!found) return (
    <div className="bg-surface border border-line max-w-5xl">
      <EmptyState title="Fournisseur introuvable." action={<Button variant="secondary" icon={ArrowLeft} onClick={() => navigate('/app/boutique/fournisseurs')}>Retour aux fournisseurs</Button>} />
    </div>
  );

  return (
    <div className="space-y-4 max-w-5xl">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="ghost" icon={ArrowLeft} onClick={() => navigate('/app/boutique/fournisseurs')}>Fournisseurs</Button>
        {parentId && parentName && (
          <Button variant="ghost" icon={Layers} onClick={() => navigate(`/app/boutique/fournisseur/${parentId}`)}>Sous-fournisseur de {parentName}</Button>
        )}
      </div>
      <PageHeader title={name || 'Fournisseur'} subtitle={supplierType || 'Fiche fournisseur'} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Coordonnées */}
        <Card>
          <div className="space-y-4">
            <Field label="Nom"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nutrimuscle, Décathlon Pro…" /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Contact"><Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Nom du contact" /></Field>
              <Field label="Type"><Input value={supplierType} onChange={(e) => setSupplierType(e.target.value)} placeholder="Compléments, matériel…" /></Field>
            </div>
            <Field label="Fournisseur parent (distributeur)" hint="Ex. une marque distribuée par RSB Distribution.">
              <Select value={parentId} onChange={(e) => setParentId(e.target.value)}>
                <option value="">Aucun (fournisseur principal)</option>
                {allSuppliers.filter((s) => s.id !== id).map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="E-mail"><Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="contact@…" /></Field>
              <Field label="Téléphone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="06…" /></Field>
            </div>
            <Field label="Adresse"><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Adresse" /></Field>
            <Field label="Notes"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Conditions, délais de livraison, minimum de commande…" /></Field>
            <div className="flex items-center justify-between gap-3 pt-3 border-t border-line">
              {msg ? <span className={`font-semibold ${msg.includes('✓') ? 'text-success-text' : 'text-danger-text'}`}>{msg}</span> : <span />}
              <Button onClick={save} disabled={saving}>{saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer</Button>
            </div>
          </div>
        </Card>

        {/* Colonne droite : sous-fournisseurs (si parent) + produits */}
        <div className="space-y-4">
          {subs.length > 0 && (
            <Card ruled title={`Marques et sous-fournisseurs (${subs.length})`}>
              <div className="-mt-3">
                {subs.map((s) => (
                  <button key={s.id} type="button" onClick={() => navigate(`/app/boutique/fournisseur/${s.id}`)} className="group w-full flex items-center gap-3 py-2.5 border-b border-line-soft last:border-b-0 text-left hover:bg-ground-2 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ink truncate">{s.name}</p>
                      <p className="text-sm text-muted">{s.productCount ?? 0} produit{(s.productCount ?? 0) > 1 ? 's' : ''}</p>
                    </div>
                    <ChevronRight size={16} className="text-muted group-hover:text-primary shrink-0" />
                  </button>
                ))}
              </div>
            </Card>
          )}
          <Card ruled title={`Produits (${products.length})`}>
            {products.length === 0 ? (
              <EmptyState title="Aucun produit rattaché à ce fournisseur." />
            ) : (
              <div className="-mt-3">
                {products.map((p) => (
                  <button key={p.id} type="button" onClick={() => navigate(`/app/boutique/produit/${p.id}`)} className="w-full flex items-center gap-3 py-2 border-b border-line-soft last:border-b-0 text-left hover:bg-ground-2 transition-colors">
                    {p.image ? <img src={p.image} className="w-11 h-11 bg-ground object-contain shrink-0" alt="" /> : <span className="w-11 h-11 bg-ground flex items-center justify-center shrink-0"><Package size={18} className="text-muted" /></span>}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-ink truncate">{p.name}{(p as any).isActive === false && <Tag className="ml-2">Retiré</Tag>}</p>
                      <p className="text-sm text-muted">{p.category} · stock {p.stock}</p>
                    </div>
                    <span className="font-semibold text-ink tabular-nums shrink-0">{eur(p.price)}</span>
                  </button>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SupplierDetailPage;
