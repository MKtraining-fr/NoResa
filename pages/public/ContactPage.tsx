
import React from 'react';
import { Mail, Phone, MapPin, Send } from 'lucide-react';

const ContactPage: React.FC = () => {
  return (
    <div className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-16">
        <div className="space-y-12">
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-black text-gray-900">Parlons de votre <span className="text-indigo-600">projet.</span></h1>
            <p className="text-xl text-gray-500 leading-relaxed">
              Vous avez des questions sur NoResa ? Notre équipe d'experts est là pour vous accompagner dans la digitalisation de votre salle.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center space-x-6">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
                <Mail size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Email</p>
                <p className="text-lg font-bold text-gray-900">hello@noresa.io</p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
                <Phone size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Téléphone</p>
                <p className="text-lg font-bold text-gray-900">+33 (0)1 23 45 67 89</p>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
                <MapPin size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Bureaux</p>
                <p className="text-lg font-bold text-gray-900">Station F, Paris</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 p-10 rounded-[3rem] border border-gray-100">
          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Prénom</label>
                <input type="text" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium" placeholder="Jean" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Nom</label>
                <input type="text" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium" placeholder="Dupont" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Email professionnel</label>
              <input type="email" className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium" placeholder="jean@salle-fitness.fr" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Message</label>
              <textarea rows={4} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium" placeholder="Dites-nous en plus sur votre salle..."></textarea>
            </div>
            <button className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center space-x-2">
              <span>Envoyer ma demande</span>
              <Send size={18} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
