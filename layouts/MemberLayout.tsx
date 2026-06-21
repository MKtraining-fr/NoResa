import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { MEMBER_NAV_ITEMS } from '../constants';
import { Bell, Dumbbell } from 'lucide-react';
import { BrandProvider, useBrand } from '../lib/BrandContext';

/**
 * Layout de l'espace membre — white-label.
 * Le header (logo + nom) et la couleur active de la nav suivent la marque de la
 * salle de l'adhérent (BrandProvider → variables CSS « brand »).
 */
const MemberShell: React.FC = () => {
  const location = useLocation();
  const { displayName, logoUrl } = useBrand();
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="max-w-md mx-auto min-h-screen flex flex-col bg-white font-sans relative shadow-2xl">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-lg border-b border-gray-100 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          {logoUrl ? (
            <img src={logoUrl} alt={displayName} className="w-8 h-8 rounded-lg object-contain" />
          ) : (
            <div className="bg-brand p-1.5 rounded-lg">
              <Dumbbell className="text-white w-5 h-5" />
            </div>
          )}
          <h1 className="text-xl font-extrabold text-gray-900">{displayName}</h1>
        </div>
        <Link to="/membre/notifications" className="relative p-2 bg-gray-50 rounded-full hover:bg-gray-100 transition-colors">
          <Bell size={20} className="text-gray-600" />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-brand rounded-full ring-2 ring-white animate-pulse"></span>
        </Link>
      </header>

      {/* Content */}
      <main className="flex-grow px-6 pt-4 pb-24 overflow-y-auto bg-gray-50/30">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white border-t border-gray-100 px-4 py-2 flex justify-around items-center z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] rounded-t-3xl">
        {MEMBER_NAV_ITEMS.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center p-2 rounded-2xl transition-all duration-300 ${
              isActive(item.path) ? 'text-brand bg-brand-soft scale-105' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <item.icon size={22} className={isActive(item.path) ? 'mb-0.5' : ''} />
            <span className={`text-[10px] font-bold ${isActive(item.path) ? 'block' : 'hidden md:block'}`}>
              {item.label}
            </span>
          </Link>
        ))}
      </nav>
    </div>
  );
};

const MemberLayout: React.FC = () => (
  <BrandProvider>
    <MemberShell />
  </BrandProvider>
);

export default MemberLayout;
