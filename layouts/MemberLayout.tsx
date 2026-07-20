import React, { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { MEMBER_NAV_ITEMS } from '../constants';
import { Bell, Dumbbell, KeyRound } from 'lucide-react';
import { BrandProvider, useBrand } from '../lib/BrandContext';
import { getMyMember } from '../lib/memberSelfApi';
import { getUnreadAnnouncements } from '../lib/announcementsApi';
import { ensurePushSubscribed, isPushSupported, pushPermission } from '../lib/pushApi';
import PushPrompt, { PUSH_PROMPT_KEY } from '../components/PushPrompt';

const initialsOf = (f?: string, l?: string) =>
  (`${(f || '').trim()[0] || ''}${(l || '').trim()[0] || ''}`).toUpperCase() || '·';

const MemberShell: React.FC = () => {
  const location = useLocation();
  const { displayName, logoUrl } = useBrand();
  const [initials, setInitials] = useState('');
  const [unread, setUnread] = useState(0);
  const isActive = (path: string) => location.pathname === path;

  useEffect(() => { getMyMember().then((m) => { if (m) setInitials(initialsOf(m.firstName, m.lastName)); }); }, []);
  // Réabonnement silencieux : si l'adhérent a déjà accepté les notifications,
  // l'abonnement est recréé tout seul (nouvel appareil, réinstallation…).
  useEffect(() => { ensurePushSubscribed().catch(() => {}); }, []);

  // Proposition unique, à la première connexion (les navigateurs imposent un geste
  // explicite). Ensuite le réglage vit dans le profil.
  const [showPush, setShowPush] = useState(false);
  useEffect(() => {
    let seen = false;
    try { seen = localStorage.getItem(PUSH_PROMPT_KEY) === '1'; } catch { /* noop */ }
    if (!seen && isPushSupported() && pushPermission() === 'default') {
      const t = setTimeout(() => setShowPush(true), 1200); // laisse l'app s'afficher d'abord
      return () => clearTimeout(t);
    }
  }, []);
  // Recalculé à chaque navigation : la pastille retombe après lecture des annonces.
  useEffect(() => { getUnreadAnnouncements().then(setUnread).catch(() => {}); }, [location.pathname]);

  const left = MEMBER_NAV_ITEMS.slice(0, 2);
  const right = MEMBER_NAV_ITEMS.slice(2);

  const NavItem = (item: typeof MEMBER_NAV_ITEMS[number]) => (
    <Link
      key={item.path}
      to={item.path}
      className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-2xl transition-all ${
        isActive(item.path) ? 'text-brand' : 'text-gray-400 hover:text-gray-600'
      }`}
    >
      <item.icon size={22} />
      <span className="text-[10px] font-bold">{item.label}</span>
    </Link>
  );

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-white font-sans relative shadow-2xl">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-gray-100 px-5 py-3.5 flex justify-between items-center">
        <div className="flex items-center space-x-2 min-w-0">
          {logoUrl ? (
            <img src={logoUrl} alt={displayName} className="w-9 h-9 rounded-lg object-contain shrink-0" />
          ) : (
            <div className="bg-brand p-1.5 rounded-lg shrink-0"><Dumbbell className="text-white w-5 h-5" /></div>
          )}
          <h1 className="text-lg font-extrabold text-gray-900 truncate">{displayName}</h1>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link to="/membre/notifications" className="relative p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
            <Bell size={19} className="text-gray-600" />
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-brand text-white text-[10px] font-extrabold rounded-full ring-2 ring-white flex items-center justify-center">
                {unread > 9 ? '9+' : unread}
              </span>
            )}
          </Link>
          <Link to="/membre/profil" className="w-9 h-9 rounded-full bg-brand-soft text-brand flex items-center justify-center font-extrabold text-xs shrink-0">
            {initials}
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="flex-grow px-6 pt-4 pb-28 overflow-y-auto bg-gray-50/30">
        <Outlet />
      </main>

      {/* Bottom Navigation : 2 items · bouton QR central surélevé · 2 items */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 px-3 pt-2 pb-2.5 flex justify-around items-end z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] rounded-t-3xl">
        {left.map(NavItem)}

        <Link to="/membre/qr" className="flex flex-col items-center -mt-8 shrink-0" aria-label="Mon code d'accès">
          <div className="w-14 h-14 rounded-2xl bg-brand text-white flex items-center justify-center shadow-lg shadow-gray-300 active:scale-95 transition-transform ring-4 ring-white">
            <KeyRound size={26} />
          </div>
        </Link>

        {right.map(NavItem)}
      </nav>

      {showPush && <PushPrompt onClose={() => setShowPush(false)} />}
    </div>
  );
};

const MemberLayout: React.FC = () => (
  <BrandProvider>
    <MemberShell />
  </BrandProvider>
);

export default MemberLayout;
