import { Member, Gym, ContactStatus } from '../types';
import { MOCK_MEMBERS } from '../constants';

export interface ExtendedGym extends Gym {
  description: string;
  phone: string;
  email: string;
  hours: { [key: string]: string };
  pricing: string;
  bannerImage: string;
  features: string[];
}

const DEFAULT_GYMS: ExtendedGym[] = [
  {
    id: 'iron-paradise',
    name: 'Iron Paradise Gym',
    address: '25 Rue du Muscle, 75011 Paris',
    plan: 'PRO',
    description: 'Le temple de la musculation à l\'ancienne combiné au matériel de pointe. Profitez de nos espaces poids libres guidés, d\'une zone cardio de dernière génération, et de l\'encadrement par nos préparateurs physiques certifiés de haut niveau.',
    phone: '01 42 33 44 55',
    email: 'contact@ironparadise.fr',
    hours: {
      'Lundi': '06:00 - 23:00',
      'Mardi': '06:00 - 23:00',
      'Mercredi': '06:00 - 23:00',
      'Jeudi': '06:00 - 23:00',
      'Vendredi': '06:00 - 23:00',
      'Samedi': '08:00 - 20:00',
      'Dimanche': '08:00 - 20:00'
    },
    pricing: 'à partir de 29.99 € / mois',
    bannerImage: 'https://images.unsplash.com/photo-1540575314341-12136757d56a?auto=format&fit=crop&q=80&w=1200',
    features: ['Musculation libre', 'Cardio-Training', 'Formule coaching indiv.', 'Vestiaires haut de gamme', 'Espace Diet & Whey Bar']
  },
  {
    id: 'fit-zen-studio',
    name: 'Fit & Zen Studio',
    address: '14 Boulevard de la Paix, 69002 Lyon',
    plan: 'FREE',
    description: 'Un magnifique espace calme et lumineux dédié au bien-être de votre corps et de votre esprit. Nos séances de Yoga, Pilates, stretching et renforcement postural sont encadrées avec soin en petits groupes pour un suivi d\'excellence.',
    phone: '04 78 55 66 77',
    email: 'hello@fitzen.fr',
    hours: {
      'Lundi': '07:30 - 21:00',
      'Mardi': '07:30 - 21:00',
      'Mercredi': '07:30 - 22:00',
      'Jeudi': '07:30 - 21:00',
      'Vendredi': '07:30 - 21:00',
      'Samedi': '09:00 - 18:00',
      'Dimanche': 'Fermé'
    },
    pricing: 'à partir de 39.99 € / mois',
    bannerImage: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=1200',
    features: ['Yoga Hatha/Vinyasa', 'Pilates & Core', 'Sophrologie & Méditation', 'Stretching postural', 'Jus détox & espace tisanes']
  },
  {
    id: 'crossbox-bastille',
    name: 'CrossBox Bastille',
    address: '8 Rue de Lappe, 75011 Paris',
    plan: 'ULTIMATE',
    description: 'La box de CrossFit par excellence au centre de Paris. Dépassez vos limites avec notre communauté passionnée de athlètes de tous niveaux. Nos cours "WOD" intègrent de l\'haltérophilie, de l\'endurance, de la gymnastique et de la haute intensité.',
    phone: '01 55 44 22 99',
    email: 'info@crossboxbastille.com',
    hours: {
      'Lundi': '07:00 - 22:00',
      'Mardi': '07:00 - 22:00',
      'Mercredi': '07:00 - 22:00',
      'Jeudi': '07:00 - 22:00',
      'Vendredi': '07:00 - 22:00',
      'Samedi': '09:00 - 17:00',
      'Dimanche': '10:00 - 14:00'
    },
    pricing: 'à partir de 49.99 € / mois',
    bannerImage: 'https://images.unsplash.com/photo-1517838277536-f5f99be501cd?auto=format&fit=crop&q=80&w=1200',
    features: ['Affilié CrossFit', 'Coachs certifiés Level 1 & 2', 'Compétition & Scaled', 'Haltérophilie olympique', 'Suivi nutritionnel']
  }
];

export const getGyms = (): ExtendedGym[] => {
  const gyms = localStorage.getItem('noresa_gyms');
  if (!gyms) {
    localStorage.setItem('noresa_gyms', JSON.stringify(DEFAULT_GYMS));
    return DEFAULT_GYMS;
  }
  return JSON.parse(gyms);
};

export const updateGym = (updatedGym: ExtendedGym) => {
  const gyms = getGyms();
  const index = gyms.findIndex(g => g.id === updatedGym.id);
  if (index !== -1) {
    gyms[index] = updatedGym;
  } else {
    gyms.push(updatedGym);
  }
  localStorage.setItem('noresa_gyms', JSON.stringify(gyms));
};

export const getMembers = (): Member[] => {
  const members = localStorage.getItem('noresa_members');
  if (!members) {
    // Transformer les mock members de base au bon format
    const formatted: Member[] = MOCK_MEMBERS.map(m => {
      const statusValue: ContactStatus = 
        m.status === 'ACTIVE' ? 'MEMBER_ACTIVE' :
        m.status === 'INACTIVE' ? 'MEMBER_INACTIVE' :
        'PROSPECT_NEW';
      return {
        id: m.id,
        firstName: m.firstName,
        lastName: m.lastName,
        email: m.email,
        phone: m.phone || '06 12 34 56 78',
        address: '12 Rue de la Paix, 75000 Paris',
        status: statusValue,
        subscription: m.subscription === '-' ? undefined : m.subscription,
        joinDate: m.joinDate,
        trialSessionDone: m.status === 'ACTIVE' || Math.random() > 0.5,
        notes: statusValue === 'PROSPECT_NEW' ? 'Souhaite faire de la musculation' : undefined
      };
    });
    localStorage.setItem('noresa_members', JSON.stringify(formatted));
    return formatted;
  }
  return JSON.parse(members);
};

export const saveMember = (member: Member) => {
  const members = getMembers();
  const index = members.findIndex(m => m.id === member.id);
  if (index !== -1) {
    members[index] = member;
  } else {
    members.push(member);
  }
  localStorage.setItem('noresa_members', JSON.stringify(members));
};

export const deleteMember = (id: string) => {
  const members = getMembers();
  const filtered = members.filter(m => m.id !== id);
  localStorage.setItem('noresa_members', JSON.stringify(filtered));
};

export const registerProspect = (registration: {
  gymId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  interest: string;
  trialDate?: string;
  trialTime?: string;
  notes?: string;
}) => {
  const members = getMembers();
  const gyms = getGyms();
  const targetGym = gyms.find(g => g.id === registration.gymId) || gyms[0];

  const newProspect: Member = {
    id: `prospect_${Date.now()}`,
    firstName: registration.firstName,
    lastName: registration.lastName,
    email: registration.email,
    phone: registration.phone,
    address: 'Origine : Inscription publique en ligne',
    status: 'PROSPECT_NEW',
    joinDate: new Date().toISOString().split('T')[0],
    trialSessionDone: false,
    notes: `Intéressé par: ${registration.interest}. ` +
           (registration.trialDate ? `Séance d'essai planifiée le ${registration.trialDate} à ${registration.trialTime || '18:00'}. ` : '') +
           (registration.notes ? `Commentaire: ${registration.notes}` : '') +
           ` | Salle ciblée: ${targetGym.name}`
  };

  members.push(newProspect);
  localStorage.setItem('noresa_members', JSON.stringify(members));
  return newProspect;
};
