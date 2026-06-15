
import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { APP_NAV_ITEMS, MOCK_MEMBERS, MOCK_PARTNERS, MOCK_PRODUCTS } from '../constants';
import { 
  ChevronDown, ChevronRight, LogOut, Search, Bell, Menu, X, 
  Dumbbell, User, Target, Briefcase, ShoppingBag, ArrowUpRight 
} from 'lucide-react';

const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedItems, setExpandedItems] = useState<string[]>(['CRM', 'Planning', 'Finance', 'Boutique']);
  
  // State pour la recherche globale
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const toggleExpand = (label: string) => {
    setExpandedItems(prev => 
      prev.includes(label) ? prev.filter(i => i !== label) : [...prev, label]
    );
  };

  const isActive = (path: string) => location.pathname === path;

  // Fermer la recherche au clic extérieur
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Logique de filtrage globale
  const getSearchResults = () => {
    if (!searchQuery.trim()) return null;
    const query = searchQuery.toLowerCase();

    const members = MOCK_MEMBERS.filter(m => 
      m.status !== 'PROSPECT' && 
      (`${m.firstName} ${m.lastName}`.toLowerCase().includes(query) || m.email.toLowerCase().includes(query))
    );

    const prospects = MOCK_MEMBERS.filter(m => 
      m.status === 'PROSPECT' && 
      (`${m.firstName} ${m.lastName}`.toLowerCase().includes(query) || m.email.toLowerCase().includes(query))
    );

    const partners = MOCK_PARTNERS.filter(p => 
      p.company.toLowerCase().includes(query) || p.email.toLowerCase().includes(query)
    );

    const products = MOCK_PRODUCTS.filter(p => 
      p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query)
    );

    if (!members.length && !prospects.length && !partners.length && !products.length) return null;

    return { members, prospects, partners, products };
  };

  const results = getSearchResults();

  const handleResultClick = (type: string, id: string) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    if (type === 'member') navigate('/app/crm/membres');
    if (type === 'prospect') navigate('/app/crm/prospects');
    if (type === 'partner') navigate('/app/crm/partenaires');
    if (type === 'product') navigate('/app/boutique/produits');
  };

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside 
        className={`${
          isSidebarOpen ? 'w-64' : 'w-20'
        } bg-slate-900 transition-all duration-300 flex flex-col z-50`}
      >
        <div className="h-16 flex items-center px-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="bg-indigo-500 p-1.5 rounded-lg shrink-0 shadow-lg border border-indigo-400/20">
              <Dumbbell className="text-white w-6 h-6" />
            </div>
            {isSidebarOpen && <span className="text-xl font-bold text-white truncate">NoResa <span className="text-[10px] font-black tracking-widest text-indigo-400 uppercase bg-indigo-500/10 px-1.5 py-0.5 rounded ml-1">Pro</span></span>}
          </div>
        </div>

        <nav className="flex-grow overflow-y-auto py-4 space-y-1 pwa-hide-scrollbar">
          {APP_NAV_ITEMS.map((item) => (
            <div key={item.label}>
              <button
                onClick={() => item.subItems ? toggleExpand(item.label) : navigate(item.path)}
                className={`w-full flex items-center px-4 py-3 transition-all group relative ${
                  isActive(item.path) 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                }`}
              >
                {isActive(item.path) && <div className="absolute left-0 top-0 bottom-0 w-1 bg-white"></div>}
                <item.icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${isActive(item.path) ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                {isSidebarOpen && (
                  <>
                    <span className="ml-3 text-sm font-bold flex-grow text-left tracking-tight">{item.label}</span>
                    {item.subItems && (
                      <div className="transition-transform duration-200">
                        {expandedItems.includes(item.label) ? <ChevronDown size={14} className="opacity-50" /> : <ChevronRight size={14} className="opacity-50" />}
                      </div>
                    )}
                  </>
                )}
              </button>
              
              {isSidebarOpen && item.subItems && expandedItems.includes(item.label) && (
                <div className="bg-slate-900/40 py-1 border-l-2 border-slate-800 ml-6 my-1">
                  {item.subItems.map(sub => (
                    <Link
                      key={sub}
                      to={`${item.path}/${sub.toLowerCase()}`}
                      className={`block pl-6 pr-4 py-2 text-[11px] font-bold uppercase tracking-widest transition-colors ${
                        location.pathname.includes(sub.toLowerCase()) ? 'text-indigo-400' : 'text-slate-500 hover:text-indigo-300'
                      }`}
                    >
                      {sub}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 shrink-0">
          <button 
            onClick={() => navigate('/')}
            className={`flex items-center space-x-3 w-full p-3 rounded-2xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all ${!isSidebarOpen && 'justify-center'}`}
          >
            <LogOut size={20} />
            {isSidebarOpen && <span className="text-sm font-bold uppercase tracking-widest text-[10px]">Déconnexion</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-grow flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0 z-40">
          <div className="flex items-center flex-grow">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-xl hover:bg-gray-50 text-gray-400 transition-all border border-transparent hover:border-gray-100"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* BARRE DE RECHERCHE DYNAMIQUE */}
            <div className="relative ml-6 max-w-md w-full" ref={searchRef}>
              <div className="flex items-center bg-gray-50/80 border border-gray-100 rounded-2xl px-4 py-2.5 focus-within:ring-4 focus-within:ring-indigo-500/5 focus-within:bg-white focus-within:border-indigo-100 transition-all group">
                <Search size={18} className="text-gray-400 group-focus-within:text-indigo-500" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setIsSearchOpen(true); }}
                  onFocus={() => setIsSearchOpen(true)}
                  placeholder="Rechercher membre, prospect ou produit..." 
                  className="bg-transparent border-none outline-none text-sm ml-3 w-full font-bold placeholder:text-gray-400 placeholder:font-medium"
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-gray-200 rounded-full"><X size={14} className="text-gray-400" /></button>
                )}
              </div>

              {/* RÉSULTATS DE RECHERCHE */}
              {isSearchOpen && results && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 max-h-[500px] overflow-y-auto pwa-hide-scrollbar z-[100]">
                  
                  {/* Section Membres */}
                  {results.members.length > 0 && (
                    <div className="p-4 border-b border-gray-50">
                      <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-3 px-2 flex items-center"><User size={10} className="mr-2" /> Membres</h4>
                      <div className="space-y-1">
                        {results.members.map(m => (
                          <button key={m.id} onClick={() => handleResultClick('member', m.id)} className="w-full flex items-center p-2 hover:bg-indigo-50 rounded-xl transition-colors group text-left">
                            <img src={`https://picsum.photos/seed/${m.id}/40/40`} className="w-8 h-8 rounded-lg mr-3 shadow-sm" alt="" />
                            <div>
                              <p className="text-xs font-black text-gray-900 group-hover:text-indigo-600">{m.firstName} {m.lastName}</p>
                              <p className="text-[10px] text-gray-400 font-bold">{m.email}</p>
                            </div>
                            <ArrowUpRight size={14} className="ml-auto text-gray-300 opacity-0 group-hover:opacity-100 group-hover:text-indigo-400 transition-all" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section Prospects */}
                  {results.prospects.length > 0 && (
                    <div className="p-4 border-b border-gray-50">
                      <h4 className="text-[10px] font-black text-amber-500 uppercase tracking-[0.2em] mb-3 px-2 flex items-center"><Target size={10} className="mr-2" /> Prospects</h4>
                      <div className="space-y-1">
                        {results.prospects.map(p => (
                          <button key={p.id} onClick={() => handleResultClick('prospect', p.id)} className="w-full flex items-center p-2 hover:bg-amber-50 rounded-xl transition-colors group text-left">
                            <img src={`https://picsum.photos/seed/${p.id}/40/40`} className="w-8 h-8 rounded-lg mr-3 shadow-sm" alt="" />
                            <div>
                              <p className="text-xs font-black text-gray-900 group-hover:text-amber-600">{p.firstName} {p.lastName}</p>
                              <p className="text-[10px] text-gray-400 font-bold">Relance automatique active</p>
                            </div>
                            <ArrowUpRight size={14} className="ml-auto text-gray-300 opacity-0 group-hover:opacity-100 group-hover:text-amber-400 transition-all" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section Partenaires */}
                  {results.partners.length > 0 && (
                    <div className="p-4 border-b border-gray-50">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 px-2 flex items-center"><Briefcase size={10} className="mr-2" /> Partenaires</h4>
                      <div className="space-y-1">
                        {results.partners.map(p => (
                          <button key={p.id} onClick={() => handleResultClick('partner', p.id)} className="w-full flex items-center p-2 hover:bg-slate-50 rounded-xl transition-colors group text-left">
                            <div className="w-8 h-8 bg-slate-100 rounded-lg mr-3 flex items-center justify-center text-slate-400 font-black text-[10px]">{p.company.substring(0, 2)}</div>
                            <div>
                              <p className="text-xs font-black text-gray-900 group-hover:text-slate-600">{p.company}</p>
                              <p className="text-[10px] text-gray-400 font-bold">{p.category}</p>
                            </div>
                            <ArrowUpRight size={14} className="ml-auto text-gray-300 opacity-0 group-hover:opacity-100 group-hover:text-slate-400 transition-all" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Section Produits */}
                  {results.products.length > 0 && (
                    <div className="p-4">
                      <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-3 px-2 flex items-center"><ShoppingBag size={10} className="mr-2" /> Boutique</h4>
                      <div className="space-y-1">
                        {results.products.map(p => (
                          <button key={p.id} onClick={() => handleResultClick('product', p.id)} className="w-full flex items-center p-2 hover:bg-indigo-50 rounded-xl transition-colors group text-left">
                            <img src={p.image} className="w-8 h-8 rounded-lg mr-3 object-cover shadow-sm" alt="" />
                            <div>
                              <p className="text-xs font-black text-gray-900 group-hover:text-indigo-600">{p.name}</p>
                              <p className="text-[10px] text-indigo-500 font-black">{p.price.toFixed(2)} €</p>
                            </div>
                            <ArrowUpRight size={14} className="ml-auto text-gray-300 opacity-0 group-hover:opacity-100 group-hover:text-indigo-400 transition-all" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-6 pr-6">
            <button className="relative p-2.5 rounded-2xl hover:bg-gray-50 text-gray-400 transition-all border border-transparent hover:border-gray-100 group">
              <Bell size={20} className="group-hover:rotate-12 transition-transform" />
              <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white"></span>
            </button>
            <div className="flex items-center space-x-4 border-l border-gray-100 pl-6 ml-2 group cursor-pointer" onClick={() => navigate('/app/parametres/mon-compte')}>
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-gray-900 tracking-tight group-hover:text-indigo-600 transition-colors uppercase">Admin NoResa</p>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mt-0.5">Super Manager</p>
              </div>
              <div className="relative">
                <img 
                  src="https://picsum.photos/seed/admin/40/40" 
                  alt="Avatar" 
                  className="w-10 h-10 rounded-xl shadow-xl border-2 border-white group-hover:border-indigo-100 transition-all"
                />
                <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white shadow-sm"></div>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <main className="flex-grow overflow-y-auto p-8 bg-gray-50/50 pwa-hide-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
