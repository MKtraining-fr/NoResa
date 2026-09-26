import React, { useState } from 'react';
import { NavLink, Link, Outlet } from 'react-router-dom';
import { Menu, X, MapPin, Phone, Mail, Clock, UserPlus, LogIn } from 'lucide-react';

const RED = '#C81E1E';

/**
 * Layout du mini-site public « La SaLLe » (borne + web) : Découverte, Activités,
 * Tarifs, FAQ + accès inscription/connexion. 100 % univers salle — aucune sortie
 * vers la vitrine NoResa (compatible mode kiosque, cf. lib/kiosk).
 */
const NAV = [
  { to: '/decouverte', label: 'Découverte' },
  { to: '/activites', label: 'Activités' },
  { to: '/tarifs', label: 'Tarifs' },
  { to: '/faq', label: 'FAQ' },
];

const SalleLayout: React.FC = () => {
  const [open, setOpen] = useState(false);
  const linkCls = ({ isActive }: { isActive: boolean }) =>
    `text-[15px] font-bold transition-colors ${isActive ? 'text-[color:var(--red)]' : 'text-gray-600 hover:text-[color:var(--red)]'}`;

  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900 font-sans overflow-x-hidden" style={{ ['--red' as any]: RED }}>
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
          <Link to="/borne" className="text-2xl font-extrabold tracking-tight shrink-0" style={{ color: RED }}>La SaLLe</Link>

          <nav className="hidden md:flex items-center gap-8">
            {NAV.map((n) => <NavLink key={n.to} to={n.to} className={linkCls}>{n.label}</NavLink>)}
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <Link to="/connexion-salle" className="text-[15px] font-bold text-gray-600 hover:text-[color:var(--red)]">Connexion</Link>
            <Link to="/inscription" className="inline-flex items-center gap-2 text-white font-bold text-sm px-5 py-2.5 rounded-full shadow-md" style={{ backgroundColor: RED }}>
              <UserPlus size={16} /> S'inscrire
            </Link>
          </div>

          <button className="md:hidden text-gray-700" onClick={() => setOpen((v) => !v)} aria-label="Menu">
            {open ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>

        {open && (
          <div className="md:hidden border-b border-gray-100 bg-white px-5 py-4 flex flex-col gap-3">
            {NAV.map((n) => (
              <NavLink key={n.to} to={n.to} onClick={() => setOpen(false)} className="text-lg font-bold text-gray-800">{n.label}</NavLink>
            ))}
            <div className="pt-3 border-t border-gray-100 flex flex-col gap-3">
              <Link to="/connexion-salle" onClick={() => setOpen(false)} className="inline-flex items-center gap-2 text-lg font-bold text-gray-700"><LogIn size={18} /> Connexion</Link>
              <Link to="/inscription" onClick={() => setOpen(false)} className="inline-flex items-center justify-center gap-2 text-white font-bold px-4 py-3 rounded-xl" style={{ backgroundColor: RED }}><UserPlus size={18} /> S'inscrire</Link>
            </div>
          </div>
        )}
      </header>

      <main className="flex-grow"><Outlet /></main>

      <footer className="bg-gray-950 text-gray-300 mt-16">
        <div className="max-w-6xl mx-auto px-5 py-12 grid grid-cols-1 sm:grid-cols-3 gap-8">
          <div>
            <p className="text-2xl font-extrabold text-white">La SaLLe</p>
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mt-1">A.R.A.P.S · Salle de sport</p>
          </div>
          <div className="space-y-2 text-sm font-semibold">
            <p className="flex items-center gap-2"><MapPin size={15} style={{ color: RED }} /> 3 route de Mazères, 11400 Villeneuve-la-Comptal</p>
            <p className="flex items-center gap-2"><Phone size={15} style={{ color: RED }} /> 06 22 91 49 56</p>
            <p className="flex items-center gap-2"><Mail size={15} style={{ color: RED }} /> lasalle.11400@gmail.com</p>
          </div>
          <div className="space-y-1.5 text-sm font-semibold">
            <p className="flex items-center gap-2 text-white"><Clock size={15} style={{ color: RED }} /> Horaires</p>
            <p>Lun – Ven : 6h00 – 23h00</p>
            <p>Sam &amp; Dim : 7h00 – 20h00</p>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="max-w-6xl mx-auto px-5 py-4 text-xs text-gray-500 flex items-center justify-between">
            <span>© {new Date().getFullYear()} La SaLLe</span>
            <Link to="/connexion-salle" className="hover:text-white">Espace membre</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default SalleLayout;
