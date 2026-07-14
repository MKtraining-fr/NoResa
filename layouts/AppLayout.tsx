
import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { APP_NAV_ITEMS, MOCK_MEMBERS, MOCK_PARTNERS, MOCK_PRODUCTS } from '../constants';
import { searchMembers } from '../lib/membersApi';

const initials = (a?: string, b?: string) =>
  `${(a || '').charAt(0)}${(b || '').charAt(0)}`.toUpperCase() || '?';
import { 
  ChevronDown, ChevronRight, LogOut, Search, Bell, Menu, X, 
  Dumbbell, User, Target, Briefcase, ShoppingBag, ArrowUpRight 
} from 'lucide-react';

const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  
  // State pour la recherche globale
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [memberResults, setMemberResults] = useState<any[]>([]);
  const searchRef = useRef<HTMLDivElement>(null);

  // Recherche réelle des membres (mot partiel, n° client, email, téléphone), avec anti-rebond
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) { setMemberResults([]); return; }
    const t = setTimeout(async () => {
      const found = await searchMembers(q, 6);
      setMemberResults(found);
    }, 250);
    return () => clearTimeout(t);
  }, [searchQuery]);

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

  // Recherche globale : membres réels uniquement (les autres tables ne sont pas
  // encore branchées — on évite d'afficher de faux résultats).
  const getSearchResults = () => {
    if (!searchQuery.trim() || !memberResults.length) return null;
    return { members: memberResults };
  };

  const results = getSearchResults();

  const handleResultClick = (type: string, id: string) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    if (type === 'member') navigate(`/app/crm/membres?member=${id}`);
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
            {isSidebarOpen && <span className="text-xl font-bold text-white truncate">NoResa <span className="text-[10px] font-semibold tracking-wide text-indigo-400 uppercase bg-indigo-500/10 px-1.5 py-0.5 rounded ml-1">Pro</span></span>}
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
                  {item.subItems.map((sub: any) => {
                    const label = typeof sub === 'string' ? sub : sub.label;
                    const slug = typeof sub === 'string' ? sub.toLowerCase() : sub.slug;
                    return (
                      <Link
                        key={slug}
                        to={`${item.path}/${slug}`}
                        className={`block pl-6 pr-4 py-2 text-[11px] font-bold uppercase tracking-wide transition-colors ${
                          location.pathname.includes(slug) ? 'text-indigo-400' : 'text-slate-500 hover:text-indigo-300'
                        }`}
                      >
                        {label}
                      </Link>
                    );
                  })}
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
            {isSidebarOpen && <span className="text-sm font-bold uppercase tracking-wide text-[10px]">Déconnexion</span>}
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
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300 max-h-[500px] overflow-y-auto pwa-hide-scrollbar z-[100]">
                  
                  {/* Section Membres */}
                  {results.members.length > 0 && (
                    <div className="p-4 border-b border-gray-50">
                      <h4 className="text-[10px] font-semibold text-indigo-400 uppercase tracking-wide mb-3 px-2 flex items-center"><User size={10} className="mr-2" /> Membres</h4>
                      <div className="space-y-1">
                        {results.members.map(m => (
                          <button key={m.id} onClick={() => handleResultClick('member', m.id)} className="w-full flex items-center p-2 hover:bg-indigo-50 rounded-xl transition-colors group text-left">
                            <div className="w-8 h-8 rounded-lg mr-3 shadow-sm bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-semibold uppercase shrink-0">{initials(m.firstName, m.lastName)}</div>
                            <div>
                              <p className="text-xs font-semibold text-gray-900 group-hover:text-indigo-600">{m.firstName} {m.lastName}</p>
                              <p className="text-[10px] text-gray-400 font-bold">{m.memberNumber ? `N° ${m.memberNumber}` : ''}{m.memberNumber && (m.phone || m.email) ? ' • ' : ''}{m.phone || m.email || ''}</p>
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
                <p className="text-xs font-semibold text-gray-900 tracking-tight group-hover:text-indigo-600 transition-colors uppercase">Admin NoResa</p>
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wide mt-0.5">Super Manager</p>
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
        <main className="flex-grow overflow-y-auto p-5 bg-gray-50/50 pwa-hide-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
