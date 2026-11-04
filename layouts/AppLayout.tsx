
import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { APP_NAV_ITEMS, MOCK_MEMBERS, MOCK_PARTNERS, MOCK_PRODUCTS } from '../constants';
import { searchMembers } from '../lib/membersApi';
import { phone as formatPhone } from '../lib/format';

const initials = (a?: string, b?: string) =>
  `${(a || '').charAt(0)}${(b || '').charAt(0)}`.toUpperCase() || '?';
import { ChevronDown, ChevronRight, LogOut, Search, Bell, Menu, PanelLeftClose, X, ArrowUpRight } from 'lucide-react';
import { IconButton } from '../components/ui';

const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
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

  const handleSignOut = async () => {
    try { await signOut(); } catch (e) { console.error('signOut', e); }
    navigate('/connexion', { replace: true });
  };

  const toggleExpand = (label: string) => {
    setExpandedItems(prev => 
      prev.includes(label) ? prev.filter(i => i !== label) : [...prev, label]
    );
  };

  const isActive = (path: string) =>
    path === '/app' ? location.pathname === path : location.pathname === path || location.pathname.startsWith(`${path}/`);

  // Ouvre le sous-menu de la page courante, pour que l'entrée active reste visible.
  useEffect(() => {
    const parent = APP_NAV_ITEMS.find((item) => item.subItems && isActive(item.path));
    if (parent) setExpandedItems((prev) => (prev.includes(parent.label) ? prev : [...prev, parent.label]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

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

  let lastGroup: string | undefined;

  return (
    <div className="theme-noresa flex h-screen bg-ground overflow-hidden">
      {/* Menu latéral */}
      <aside className={`${isSidebarOpen ? 'w-sidebar' : 'w-16'} bg-ink text-ground flex flex-col shrink-0 z-40`}>
        <div className={`h-14 flex items-center gap-2.5 border-b border-ink-2 shrink-0 ${isSidebarOpen ? 'px-4' : 'justify-center'}`}>
          <span className="w-6 h-6 bg-primary shrink-0" />
          {isSidebarOpen && <span className="text-lg font-extrabold text-white truncate">NoResa</span>}
        </div>

        <nav className="flex-grow overflow-y-auto py-2 pwa-hide-scrollbar">
          {APP_NAV_ITEMS.map((item: any) => {
            const showGroup = isSidebarOpen && item.group && item.group !== lastGroup;
            lastGroup = item.group;
            const active = isActive(item.path);
            const expanded = expandedItems.includes(item.label);
            return (
              <div key={item.label}>
                {showGroup && <div className="px-4 pt-4 pb-1.5 text-xs font-semibold text-subtle">{item.group}</div>}
                <button
                  onClick={() => item.subItems ? toggleExpand(item.label) : navigate(item.path)}
                  title={isSidebarOpen ? undefined : item.label}
                  className={`w-full flex items-center gap-3 py-2.5 text-base text-left transition-colors ${isSidebarOpen ? 'px-4' : 'justify-center'} ${
                    active && !item.subItems
                      ? 'bg-primary text-white font-semibold'
                      : active || expanded
                        ? 'text-white font-semibold hover:bg-ink-2'
                        : 'text-line hover:bg-ink-2 hover:text-white'
                  }`}
                >
                  <item.icon size={18} className="shrink-0" />
                  {isSidebarOpen && (
                    <>
                      <span className="flex-grow truncate">{item.label}</span>
                      {item.subItems && (expanded ? <ChevronDown size={14} className="shrink-0" /> : <ChevronRight size={14} className="shrink-0" />)}
                    </>
                  )}
                </button>

                {isSidebarOpen && item.subItems && expanded && (
                  <div className="py-0.5">
                    {item.subItems.map((sub: any) => {
                      const label = typeof sub === 'string' ? sub : sub.label;
                      const slug = typeof sub === 'string' ? sub.toLowerCase() : sub.slug;
                      return (
                        <Link
                          key={slug}
                          to={`${item.path}/${slug}`}
                          className={`block ml-12 px-2.5 py-1.5 text-base transition-colors ${
                            location.pathname.includes(slug) ? 'bg-primary text-white font-semibold' : 'text-subtle hover:text-white'
                          }`}
                        >
                          {label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <button
          onClick={handleSignOut}
          title={isSidebarOpen ? undefined : 'Déconnexion'}
          className={`flex items-center gap-3 py-3 border-t border-ink-2 text-line hover:text-white transition-colors shrink-0 ${isSidebarOpen ? 'px-4' : 'justify-center'}`}
        >
          <LogOut size={18} className="shrink-0" />
          {isSidebarOpen && <span>Déconnexion</span>}
        </button>
      </aside>

      {/* Contenu */}
      <div className="flex-grow flex flex-col overflow-hidden min-w-0">
        <header className="h-14 bg-surface border-b border-line px-7 flex items-center gap-4 shrink-0 z-30">
          <IconButton label={isSidebarOpen ? 'Replier le menu' : 'Déplier le menu'} onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="-ml-2">
            {isSidebarOpen ? <PanelLeftClose size={18} /> : <Menu size={18} />}
          </IconButton>

          {/* Recherche globale */}
          <div className="relative w-search min-w-0" ref={searchRef}>
            <div className="h-9 flex items-center gap-2 border border-line px-3 focus-within:border-primary focus-within:outline focus-within:outline-1 focus-within:-outline-offset-2 focus-within:outline-primary transition-colors">
              <Search size={16} className="text-muted shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setIsSearchOpen(true); }}
                onFocus={() => setIsSearchOpen(true)}
                placeholder="Rechercher un membre, un prospect ou un produit"
                className="bg-transparent border-none outline-none text-base text-ink w-full min-w-0 placeholder:text-muted"
              />
              {searchQuery && (
                <button aria-label="Effacer la recherche" onClick={() => setSearchQuery('')} className="text-muted hover:text-ink shrink-0"><X size={14} /></button>
              )}
            </div>

            {isSearchOpen && results && results.members.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-line shadow-float max-h-96 overflow-y-auto pwa-hide-scrollbar z-50">
                <div className="px-3 pt-2.5 pb-1 text-xs font-semibold text-muted">Membres</div>
                {results.members.map(m => (
                  <button key={m.id} onClick={() => handleResultClick('member', m.id)} className="group w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-ground-2 transition-colors">
                    <span className="w-8 h-8 rounded-full bg-line-soft text-ink-2 flex items-center justify-center text-xs font-semibold shrink-0">{initials(m.firstName, m.lastName)}</span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-ink truncate">{m.firstName} {m.lastName}</span>
                      <span className="block text-sm text-muted truncate">{m.memberNumber ? `N° ${m.memberNumber}` : ''}{m.memberNumber && (m.phone || m.email) ? ' · ' : ''}{m.phone ? formatPhone(m.phone) : (m.email || '').toLowerCase()}</span>
                    </span>
                    <ArrowUpRight size={14} className="ml-auto text-muted opacity-0 group-hover:opacity-100 shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="ml-auto flex items-center gap-4 shrink-0">
            <IconButton label="Notifications" className="relative">
              <Bell size={18} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
            </IconButton>
            <button className="flex items-center gap-3 text-left" onClick={() => navigate('/app/parametres/mon-compte')}>
              <span className="hidden sm:block">
                <span className="block font-semibold text-ink">Admin NoResa</span>
                <span className="block text-xs text-muted">Super manager</span>
              </span>
              <span className="w-8 h-8 rounded-full bg-muted text-white text-xs font-semibold flex items-center justify-center shrink-0">AN</span>
            </button>
          </div>
        </header>

        <main className="flex-grow overflow-y-auto p-7 bg-ground pwa-hide-scrollbar">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
