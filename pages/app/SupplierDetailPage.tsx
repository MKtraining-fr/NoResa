import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Truck, Loader2, Save, Package, User, Mail, Phone, MapPin } from 'lucide-react';
import { getSupplier, updateSupplier, getSupplierProducts, SupplierInput } from '../../lib/boutiqueApi';
import { Product } from '../../types';

const eur = (n: number) => `${(n || 0).toFixed(2).replace('.', ',')} €`;

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

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let stop = false;
    Promise.all([getSupplier(id), getSupplierProducts(id)]).then(([s, prods]) => {
      if (stop) return;
      if (!s) { setFound(false); setLoading(false); return; }
      setName(s.name || ''); setContactName(s.contact_name || ''); setEmail(s.email || '');
      setPhone(s.phone || ''); setAddress(s.address || ''); setSupplierType(s.supplier_type || '');
      setNotes((s as any).notes || '');
      setProducts(prods); setLoading(false);
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
      };
      await updateSupplier(id, patch);
      setMsg('Enregistré ✓');
    } catch (e: any) { setMsg(e?.message || 'Enregistrement impossible.'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[50vh] text-gray-300"><Loader2 className="animate-spin" /></div>;
  if (!found) return (
    <div className="p-8 text-center space-y-4">
      <p className="text-gray-500 font-semibold">Fournisseur introuvable.</p>
      <button onClick={() => navigate('/app/boutique/fournisseurs')} className="text-indigo-600 font-bold text-sm">← Retour aux fournisseurs</button>
    </div>
  );

  const field = 'w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm font-semibold outline-none focus:ring-4 focus:ring-indigo-500/10';
  const label = 'text-[10px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1';

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-5xl">
      <button onClick={() => navigate('/app/boutique/fournisseurs')} className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-indigo-600">
        <ArrowLeft size={16} /> Fournisseurs
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coordonnées */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center"><Truck size={22} /></div>
            <h2 className="text-lg font-semibold text-gray-900">Fiche fournisseur</h2>
          </div>
          <div className="space-y-1">
            <label className={label}>Nom</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className={field} placeholder="Nutrimuscle, Décathlon Pro…" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={label}><User size={11} /> Contact</label>
              <input value={contactName} onChange={(e) => setContactName(e.target.value)} className={field} placeholder="Nom du contact" />
            </div>
            <div className="space-y-1">
              <label className={label}>Type</label>
              <input value={supplierType} onChange={(e) => setSupplierType(e.target.value)} className={field} placeholder="Compléments, matériel…" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className={label}><Mail size={11} /> Email</label>
              <input value={email} onChange={(e) => setEmail(e.target.value)} className={field} placeholder="contact@…" />
            </div>
            <div className="space-y-1">
              <label className={label}><Phone size={11} /> Téléphone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={field} placeholder="06…" />
            </div>
          </div>
          <div className="space-y-1">
            <label className={label}><MapPin size={11} /> Adresse</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={field} placeholder="Adresse" />
          </div>
          <div className="space-y-1">
            <label className={label}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={`${field} resize-none`} placeholder="Conditions, délais de livraison, minimum de commande…" />
          </div>
          <div className="flex items-center justify-between pt-1">
            {msg ? <span className={`text-sm font-semibold ${msg.includes('✓') ? 'text-green-600' : 'text-red-600'}`}>{msg}</span> : <span />}
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold text-sm px-6 py-3 rounded-2xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-60">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Enregistrer
            </button>
          </div>
        </div>

        {/* Produits du fournisseur */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">
          <h3 className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-4">Produits ({products.length})</h3>
          {products.length === 0 ? (
            <p className="text-sm text-gray-400 font-medium py-8 text-center">Aucun produit rattaché à ce fournisseur.</p>
          ) : (
            <div className="space-y-2">
              {products.map((p) => (
                <button key={p.id} onClick={() => navigate(`/app/boutique/produit/${p.id}`)} className="w-full flex items-center gap-3 p-3 rounded-2xl border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/40 transition-colors text-left">
                  {p.image ? <img src={p.image} className="w-11 h-11 rounded-xl object-cover" alt="" /> : <div className="w-11 h-11 rounded-xl bg-gray-50 flex items-center justify-center"><Package size={18} className="text-gray-300" /></div>}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{p.name}{(p as any).isActive === false && <span className="ml-2 text-[10px] font-bold text-gray-400 uppercase">retiré</span>}</p>
                    <p className="text-[11px] text-gray-400 font-semibold">{p.category} · stock {p.stock}</p>
                  </div>
                  <span className="text-sm font-bold text-indigo-600">{eur(p.price)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplierDetailPage;
