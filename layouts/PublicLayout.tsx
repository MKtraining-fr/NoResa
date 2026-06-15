
import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { Menu, X, Dumbbell } from 'lucide-react';

const PublicLayout: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const location = useLocation();

  const navLinks = [
    { label: 'Accueil', path: '/' },
    { label: 'Trouver une salle', path: '/salles' },
    { label: 'Fonctionnalités', path: '/fonctionnalites' },
    { label: 'Tarifs', path: '/tarifs' },
    { label: 'Contact', path: '/contact' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen flex flex-col font-sans overflow-x-hidden">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" className="flex items-center space-x-2">
              <div className="bg-indigo-600 p-1.5 rounded-lg">
                <Dumbbell className="text-white w-6 h-6" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-gray-900">NoResa</span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-8">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`text-sm font-medium transition-colors ${
                    isActive(link.path) ? 'text-indigo-600' : 'text-gray-600 hover:text-indigo-600'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to="/connexion"
                className="text-sm font-medium text-gray-600 hover:text-indigo-600"
              >
                Connexion
              </Link>
              <Link
                to="/inscription-salle"
                className="bg-indigo-600 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg"
              >
                Inscrire ma salle
              </Link>
            </div>

            {/* Mobile Nav Toggle */}
            <div className="md:hidden">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="text-gray-600 hover:text-indigo-600 transition-colors"
              >
                {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden bg-white border-b border-gray-100 py-4 px-4 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setIsMenuOpen(false)}
                className={`block text-lg font-medium ${
                  isActive(link.path) ? 'text-indigo-600' : 'text-gray-700'
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="pt-4 border-t border-gray-100 flex flex-col space-y-3">
              <Link
                to="/connexion"
                onClick={() => setIsMenuOpen(false)}
                className="text-lg font-medium text-gray-700"
              >
                Connexion
              </Link>
              <Link
                to="/inscription-salle"
                onClick={() => setIsMenuOpen(false)}
                className="bg-indigo-600 text-white text-center px-4 py-3 rounded-xl font-bold shadow-lg"
              >
                Inscrire ma salle
              </Link>
            </div>
          </div>
        )}
      </nav>

      <main className="flex-grow">
        <Outlet />
      </main>

      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center sm:text-left grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4 justify-center sm:justify-start">
              <Dumbbell className="text-indigo-500 w-8 h-8" />
              <span className="text-2xl font-bold text-white tracking-tight">NoResa</span>
            </div>
            <p className="max-w-sm mx-auto sm:mx-0">
              La solution tout-en-un pour simplifier la gestion de votre salle de sport et booster l'engagement de vos membres.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4 text-lg">Produit</h4>
            <ul className="space-y-2">
              <li><Link to="/fonctionnalites" className="hover:text-white transition-colors">Fonctionnalités</Link></li>
              <li><Link to="/tarifs" className="hover:text-white transition-colors">Tarifs</Link></li>
              <li><Link to="/connexion" className="hover:text-white transition-colors">Espace Pro</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4 text-lg">Support</h4>
            <ul className="space-y-2">
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
              <li><a href="#" className="hover:text-white transition-colors">Aide & FAQ</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Conditions Générales</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 pt-12 border-t border-gray-800 mt-12 text-center text-sm">
          &copy; {new Date().getFullYear()} NoResa. Tous droits réservés.
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
