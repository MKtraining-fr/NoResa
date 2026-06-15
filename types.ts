
export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  MEMBER = 'MEMBER',
  GUEST = 'GUEST'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  gymId?: string;
}

export interface Gym {
  id: string;
  name: string;
  logo?: string;
  address: string;
  plan: 'FREE' | 'PRO' | 'ULTIMATE';
}

export interface ClassSession {
  id: string;
  title: string;
  coach: string;
  start: string;
  end: string;
  capacity: number;
  booked: number;
  type: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
  image?: string;
}

export type ContactStatus = 
  | 'MEMBER_ACTIVE' 
  | 'MEMBER_INACTIVE' 
  | 'PROSPECT_NEW' 
  | 'PROSPECT_FOLLOWUP' 
  | 'PROSPECT_TRIAL'
  | 'PARTNER';

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dob?: string;
  address?: string;
  job?: string;
  status: ContactStatus;
  subscription?: string;
  joinDate: string;
  trialSessionDone: boolean;
  emergencyContact?: {
    name: string;
    phone: string;
  };
  notes?: string;
}
