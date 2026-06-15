
import React, { useState, useEffect, useRef } from 'react';
import { 
  ShoppingBag, Plus, Package, TrendingUp, Search, Truck, 
  ShoppingCart, ArrowUpRight, X, Minus, Trash2, CheckCircle2, 
  CreditCard, Banknote, User, UserPlus, Check, ChevronDown,
  Edit2, Save, Calendar, Camera, Tag
} from 'lucide-react';
import { Product, Member } from '../../types';
import { MOCK_MEMBERS, MOCK_PRODUCTS } from '../../constants.tsx';

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
    if (product.stock <= 0) return;
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

  const resetSale = () => {
    setCart([]);
    setSelectedMember(null);
    setMemberSearchTerm('');
    setSaleStep('cart');
    setIsSelling(false);
  };

  const filteredMembers = MOCK_MEMBERS.filter(m => 
    `${m.firstName} ${m.lastName}`.toLowerCase().includes(memberSearchTerm.toLowerCase())
  );

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
        <button onClick={() => setActiveView('produits')} className={`px-6 py-2 rounded-xl text-sm font-black uppercase tracking-widest transition-all flex items-center ${activeView === 'produits' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-700'}`}><Package size={14} className="mr-2" />Produits</button>
        <button onClick={() => setActiveView('ventes')} className={`px-6 py-2 rounded-xl text-sm font-black uppercase tracking-widest transition-all flex items-center ${activeView === 'ventes' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-700'}`}><TrendingUp size={14} className="mr-2" />Ventes</button>
        <button onClick={() => setActiveView('fournisseurs')} className={`px-6 py-2 rounded-xl text-sm font-black uppercase tracking-widest transition-all flex items-center ${activeView === 'fournisseurs' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-700'}`}><Truck size={14} className="mr-2" />Fournisseurs</button>
      </div>

      <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden min-h-[400px]">
        {activeView === 'produits' && (
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
               {MOCK_PRODUCTS.map(product => (
                 <div key={product.id} className="group border border-gray-50 rounded-[2rem] overflow-hidden hover:shadow-2xl transition-all duration-500 bg-white relative">
                    <div className="relative overflow-hidden aspect-square">
                      <img src={product.image} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" alt="" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    </div>
                    <div className="p-6 space-y-4">
                       <div>
                          <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">{product.category}</p>
                          <h4 className="text-sm font-black text-gray-900 truncate">{product.name}</h4>
                       </div>
                       <div className="flex items-center justify-between">
                          <p className="text-xl font-black text-gray-900">{product.price.toFixed(2)} €</p>
                          <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${product.stock < 10 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                            {product.stock} en stock
                          </div>
                       </div>
                       <button onClick={() => { setIsSelling(true); addToCart(product); }} className="w-full py-3 bg-gray-50 text-gray-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-sm">Vendre l'article</button>
                    </div>
                 </div>
               ))}
               <button onClick={() => setIsAddProductModalOpen(true)} className="min-h-[300px] border-4 border-dashed border-gray-50 rounded-[2.5rem] flex flex-col items-center justify-center space-y-4 text-gray-300 hover:border-indigo-100 hover:text-indigo-400 transition-all group">
                  <div className="bg-gray-50 p-6 rounded-full group-hover:bg-indigo-50 transition-colors">
                    <Plus size={40} />
                  </div>
                  <span className="text-sm font-black uppercase tracking-widest">Nouveau produit</span>
               </button>
            </div>
          </div>
        )}

        {activeView === 'ventes' && (
          <div className="p-10 flex flex-col items-center justify-center text-center space-y-6">
            <div className="bg-indigo-50 p-8 rounded-full text-indigo-600">
              <TrendingUp size={48} />
            </div>
            <div>
              <h3 className="text-xl font-black">Historique des Ventes</h3>
              <p className="text-gray-500 max-w-sm mt-2 font-medium">Visualisez l'ensemble de vos transactions boutique et analysez vos meilleures ventes.</p>
            </div>
          </div>
        )}
      </div>

      {/* MODALE AJOUT PRODUIT */}
      {isAddProductModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300">
            <div className="p-8 bg-indigo-600 text-white flex justify-between items-center relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
               <div className="flex items-center space-x-4 relative z-10">
                 <div className="bg-white/20 p-2.5 rounded-2xl shadow-inner"><Tag size={20} /></div>
                 <div>
                   <h2 className="text-xl font-black">Nouveau produit</h2>
                   <p className="text-indigo-100 text-[10px] font-bold uppercase tracking-widest">Ajout au catalogue boutique</p>
                 </div>
               </div>
               <button onClick={() => setIsAddProductModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl relative z-10 transition-colors"><X size={24} /></button>
            </div>
            <div className="p-10 space-y-8">
               <div className="flex items-center space-x-8">
                  <div className="w-24 h-24 bg-gray-50 border-4 border-dashed border-gray-100 rounded-[2rem] flex flex-col items-center justify-center text-gray-400 hover:border-indigo-100 hover:bg-indigo-50 transition-all cursor-pointer group">
                     <Camera size={24} className="group-hover:scale-110 transition-transform" />
                     <span className="text-[10px] font-black uppercase mt-2">PHOTO</span>
                  </div>
                  <div className="flex-grow space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nom du produit</label>
                    <input type="text" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" placeholder="Whey, Shaker, Gants..." />
                  </div>
               </div>
               <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Prix de vente (€)</label>
                    <input type="text" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" placeholder="19.90" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock initial</label>
                    <input type="number" className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none focus:ring-4 focus:ring-indigo-500/10" placeholder="50" />
                  </div>
               </div>
               <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Catégorie</label>
                  <select className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold outline-none">
                    <option>Suppléments</option>
                    <option>Accessoires</option>
                    <option>Équipement</option>
                    <option>Vêtements</option>
                  </select>
               </div>
               <button onClick={() => setIsAddProductModalOpen(false)} className="w-full py-5 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98] uppercase tracking-widest text-xs">Ajouter à l'inventaire</button>
            </div>
          </div>
        </div>
      )}

      {/* POS INTERFACE */}
      {isSelling && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-6xl h-full max-h-[850px] rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col md:flex-row border border-white/20">
            
            {/* Zone Produits POS */}
            <div className="flex-grow p-10 overflow-y-auto bg-gray-50/50 pwa-hide-scrollbar flex flex-col">
               <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center space-x-4">
                    <div className="bg-indigo-600 p-2.5 rounded-2xl shadow-lg"><ShoppingCart size={24} className="text-white" /></div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Terminal de Vente</h2>
                  </div>
                  <button onClick={() => setIsSelling(false)} className="p-3 hover:bg-gray-100 rounded-2xl transition-colors border border-transparent hover:border-gray-200"><X size={24} className="text-gray-400" /></button>
               </div>
               
               <div className="relative mb-8">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                 <input 
                  type="text" 
                  placeholder="Rechercher un article ou scanner un code-barre..." 
                  className="w-full bg-white border border-gray-100 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-4 focus:ring-indigo-500/5 text-sm font-bold shadow-sm"
                 />
               </div>

               <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {MOCK_PRODUCTS.map(product => (
                    <button 
                      key={product.id} 
                      onClick={() => addToCart(product)} 
                      className="flex flex-col text-left bg-white p-5 rounded-3xl border border-transparent hover:border-indigo-600 hover:shadow-xl transition-all group relative active:scale-95"
                    >
                       <img src={product.image} className="w-full h-32 rounded-2xl object-cover mb-4 shadow-sm" alt="" />
                       <h4 className="text-xs font-black text-gray-900 truncate">{product.name}</h4>
                       <div className="flex items-center justify-between mt-2">
                         <p className="text-md font-black text-indigo-600">{product.price.toFixed(2)} €</p>
                         <p className="text-[9px] font-black text-gray-300 uppercase">Stock: {product.stock}</p>
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
               <div className="flex-grow p-10 flex flex-col">
                  
                  {/* Sélection du client */}
                  <div className="mb-10 relative" ref={memberSearchRef}>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 block">Attribuer à un membre</label>
                    <div className={`flex items-center space-x-3 p-4 rounded-2xl transition-all border ${selectedMember ? 'bg-indigo-50 border-indigo-100 ring-2 ring-indigo-500/10' : 'bg-gray-50 border-gray-50'}`}>
                      {selectedMember ? (
                        <>
                          <img src={`https://picsum.photos/seed/${selectedMember.id}/40/40`} className="w-10 h-10 rounded-xl shadow-sm border border-white" alt="" />
                          <div className="flex-grow">
                            <p className="text-xs font-black text-indigo-900">{selectedMember.firstName} {selectedMember.lastName}</p>
                            <p className="text-[10px] font-bold text-indigo-400">Score de fidélité : Or</p>
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
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-50 z-10 overflow-hidden max-h-48 overflow-y-auto">
                        {filteredMembers.map(m => (
                          <button 
                            key={m.id} 
                            onClick={() => { setSelectedMember(m); setIsSearchingMember(false); }}
                            className="w-full p-4 flex items-center space-x-3 hover:bg-indigo-50 transition-colors text-left"
                          >
                            <img src={`https://picsum.photos/seed/${m.id}/40/40`} className="w-8 h-8 rounded-lg" alt="" />
                            <span className="text-xs font-bold">{m.firstName} {m.lastName}</span>
                          </button>
                        ))}
                        {filteredMembers.length === 0 && (
                          <div className="p-4 text-center">
                            <p className="text-[10px] font-bold text-gray-400 mb-2 uppercase tracking-widest">Aucun membre trouvé</p>
                            <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center justify-center w-full hover:underline">
                              <UserPlus size={12} className="mr-1" /> Créer une fiche rapide
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-5">Articles dans le panier ({cart.reduce((s,i) => s + i.quantity, 0)})</h3>
                  
                  <div className="flex-grow overflow-y-auto space-y-3 pwa-hide-scrollbar">
                    {cart.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full opacity-20 space-y-4">
                        <ShoppingBag size={64} strokeWidth={1} />
                        <p className="text-sm font-black uppercase tracking-[0.2em]">Votre panier est vide</p>
                      </div>
                    ) : (
                      cart.map(item => (
                        <div key={item.product.id} className="flex items-center space-x-4 p-4 bg-gray-50/50 border border-gray-100 rounded-3xl animate-in slide-in-from-right-4 duration-300">
                          <img src={item.product.image} className="w-12 h-12 rounded-xl object-cover shadow-sm" alt="" />
                          <div className="flex-grow">
                            <p className="text-xs font-black text-gray-900 truncate w-32">{item.product.name}</p>
                            <p className="text-xs font-black text-indigo-600 mt-0.5">{item.product.price.toFixed(2)} €</p>
                          </div>
                          <div className="flex items-center bg-white rounded-xl border border-gray-100 shadow-sm">
                            <button onClick={() => updateQuantity(item.product.id, -1)} className="p-2 text-gray-400 hover:text-red-500 transition-colors"><Minus size={12}/></button>
                            <span className="text-xs font-black min-w-[20px] text-center">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.product.id, 1)} className="p-2 text-gray-400 hover:text-indigo-600 transition-colors"><Plus size={12}/></button>
                          </div>
                          <button onClick={() => setCart(prev => prev.filter(i => i.product.id !== item.product.id))} className="text-gray-300 hover:text-red-500 transition-colors p-1"><Trash2 size={16}/></button>
                        </div>
                      ))
                    )}
                  </div>
               </div>

               <div className="p-10 border-t border-gray-50 bg-gray-50/20">
                  <div className="space-y-3 mb-8">
                    <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                       <span>Sous-total</span>
                       <span>{cartTotal.toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                       <span>TVA (20%)</span>
                       <span>{(cartTotal * 0.2).toFixed(2)} €</span>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                       <span className="text-sm font-black tracking-widest uppercase">Total à payer</span>
                       <span className="text-4xl font-black text-indigo-600">{cartTotal.toFixed(2)} €</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4">
                     <button className="flex flex-col items-center justify-center p-4 bg-white border border-gray-100 rounded-2xl hover:border-indigo-600 hover:text-indigo-600 transition-all group shadow-sm">
                        <CreditCard size={20} className="mb-2 text-gray-400 group-hover:text-indigo-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest">CB / Sans contact</span>
                     </button>
                     <button className="flex flex-col items-center justify-center p-4 bg-white border border-gray-100 rounded-2xl hover:border-green-600 hover:text-green-600 transition-all group shadow-sm">
                        <Banknote size={20} className="mb-2 text-gray-400 group-hover:text-green-600" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Espèces</span>
                     </button>
                  </div>

                  <button 
                    onClick={() => setSaleStep('success')} 
                    disabled={cart.length === 0} 
                    className={`w-full py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] shadow-2xl transition-all flex items-center justify-center space-x-3 active:scale-[0.98] ${
                      cart.length === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-indigo-600 text-white shadow-indigo-100 hover:bg-indigo-700'
                    }`}
                  >
                    <CheckCircle2 size={20} />
                    <span>Valider & Encaisser</span>
                  </button>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* SUCCESS MODAL */}
      {saleStep === 'success' && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-indigo-600/90 backdrop-blur-2xl animate-in fade-in duration-700">
           <div className="text-center text-white space-y-8 animate-in zoom-in duration-500">
              <div className="bg-white/20 w-32 h-32 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl backdrop-blur-md relative overflow-hidden">
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                <CheckCircle2 size={64} className="relative z-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-4xl font-black">Vente terminée !</h2>
                <p className="text-indigo-100 font-bold opacity-80 uppercase tracking-widest text-xs">Paiement confirmé • Stock mis à jour</p>
              </div>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <button className="w-full sm:w-auto px-10 py-4 bg-white text-indigo-600 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl">Imprimer le ticket</button>
                <button onClick={resetSale} className="w-full sm:w-auto px-10 py-4 bg-indigo-500/50 border border-white/20 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-colors">Terminer</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default BoutiquePage;
