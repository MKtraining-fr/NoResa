
import React from 'react';
import { LayoutDashboard, Users, Calendar, Wallet, ShoppingBag, Settings, UserCircle, Bell, QrCode, CreditCard, HelpCircle, ArrowRightLeft, Cctv, DoorOpen, MessageSquare, Home, FileText, Radio, Snowflake, Megaphone } from 'lucide-react';

export const MOCK_REVENUE_DATA = [
  { name: 'Jan', revenue: 4500 },
  { name: 'Fév', revenue: 5200 },
  { name: 'Mar', revenue: 4800 },
  { name: 'Avr', revenue: 6100 },
  { name: 'Mai', revenue: 5900 },
  { name: 'Juin', revenue: 7200 },
];

export const MOCK_MEMBERS = [
  { id: '1', firstName: 'Jean', lastName: 'Dupont', status: 'ACTIVE', subscription: 'Premium', joinDate: '2023-01-15', email: 'jean.dupont@email.com', phone: '06 12 34 56 78' },
  { id: '2', firstName: 'Marie', lastName: 'Curie', status: 'ACTIVE', subscription: 'Standard', joinDate: '2023-03-22', email: 'marie.c@labo.fr', phone: '06 99 88 77 66' },
  { id: '3', firstName: 'Thomas', lastName: 'Pesquet', status: 'PROSPECT', subscription: '-', joinDate: '2024-01-10', email: 'thomas.p@esa.int', phone: '06 52 41 87 96' },
  { id: '4', firstName: 'Léa', lastName: 'Seydoux', status: 'INACTIVE', subscription: 'Standard', joinDate: '2022-11-05', email: 'lea.s@cinema.fr', phone: '01 22 33 44 55' },
];

export const MOCK_PARTNERS = [
  { id: 'p1', firstName: 'Fit', lastName: 'Supply', company: 'FitSupply Europe', status: 'PARTNER', category: 'Équipement', email: 'pro@fitsupply.com' },
  { id: 'p2', firstName: 'Nutri', lastName: 'Bio', company: 'NutriBio FR', status: 'PARTNER', category: 'Suppléments', email: 'contact@nutribio.fr' }
];

export const MOCK_PRODUCTS = [
  { id: 'prod1', name: 'Protéine Whey 1kg', price: 34.90, stock: 15, category: 'Suppléments', image: 'https://picsum.photos/seed/whey/200/200' },
  { id: 'prod2', name: 'Shaker NoResa', price: 9.90, stock: 42, category: 'Accessoires', image: 'https://picsum.photos/seed/shaker/200/200' },
  { id: 'prod3', name: 'Gants de Musculation', price: 24.50, stock: 8, category: 'Accessoires', image: 'https://picsum.photos/seed/gloves/200/200' },
];

export const MOCK_SESSIONS = [
  { id: 's1', title: 'CrossFit WOD', coach: 'Coach David', start: '09:00', end: '10:00', capacity: 15, booked: 12, type: 'Cardio' },
  { id: 's2', title: 'Yoga Vinyasa', coach: 'Sarah Zen', start: '10:30', end: '11:30', capacity: 20, booked: 18, type: 'Mobilité' },
  { id: 's3', title: 'BodyPump', coach: 'Marc Power', start: '12:00', end: '13:00', capacity: 25, booked: 25, type: 'Renforcement' },
  { id: 's4', title: 'Boxing Intro', coach: 'Mike Tyson', start: '18:00', end: '19:30', capacity: 10, booked: 5, type: 'Combat' },
];

export const APP_NAV_ITEMS = [
  { label: 'Dashboard', path: '/app', icon: LayoutDashboard },
  { label: 'CRM', path: '/app/crm', icon: Users, subItems: ['Membres', 'Prospects', 'Partenaires'] },
  { label: 'Planning', path: '/app/planning', icon: Calendar, subItems: ['Cours'] },
  { label: 'Finance', path: '/app/finance', icon: Wallet, subItems: ['Abonnements', 'Paiements', { label: 'Impayés', slug: 'impayes' }, { label: 'Résiliations', slug: 'resiliations' }] },
  { label: 'Boutique', path: '/app/boutique', icon: ShoppingBag, subItems: ['Produits', 'Ventes', 'Fournisseurs'] },
  { label: 'Contrôle d\'Accès', path: '/app/acces', icon: DoorOpen },
  { label: 'Musique', path: '/app/musique', icon: Radio },
  { label: 'Climatisation', path: '/app/climatisation', icon: Snowflake },
  { label: 'Surveillance', path: '/app/surveillance', icon: Cctv },
  { label: 'Equipe', path: '/app/equipe', icon: ArrowRightLeft },
  { label: 'Messagerie', path: '/app/messagerie', icon: MessageSquare },
  { label: 'Annonces', path: '/app/annonces', icon: Megaphone },
  { label: 'Paramètres', path: '/app/parametres', icon: Settings },
];

// Barre du bas de l'espace membre : 2 items à gauche du bouton QR central, 2 à droite.
export const MEMBER_NAV_ITEMS = [
  { label: 'Accueil', path: '/membre', icon: Home },
  { label: 'Planning', path: '/membre/reservations', icon: Calendar },
  { label: 'Dossier', path: '/membre/dossier', icon: FileText },
  { label: 'Messages', path: '/membre/messagerie', icon: MessageSquare },
];
