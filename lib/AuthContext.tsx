import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

// Rôles tels qu'ils existent dans la table public.users (en minuscules).
export type DbRole =
  | 'super_admin' | 'admin' | 'manager' | 'coach' | 'staff' | 'member';

export interface UserProfile {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  role: DbRole;
}

// Rôles qui ouvrent le back-office (gestion de salle).
export const STAFF_ROLES: DbRole[] = ['super_admin', 'admin', 'manager', 'coach', 'staff'];

// Où envoyer un utilisateur après connexion, selon son rôle.
export const homePathForRole = (role: DbRole | null | undefined): string => {
  if (!role) return '/connexion';
  if (role === 'member') return '/membre';
  // (Plus tard : un super_admin pourra être redirigé vers un espace de supervision dédié.)
  return '/app';
};

interface AuthState {
  loading: boolean;
  userId: string | null;
  profile: UserProfile | null;
  role: DbRole | null;
  isStaff: boolean;            // peut accéder au back-office
  isSuper: boolean;            // propriétaire de la plateforme
  signIn: (email: string, password: string) => Promise<{ error?: string; role?: DbRole }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  const loadProfile = async (uid: string) => {
    const { data } = await supabase
      .from('users')
      .select('id, email, first_name, last_name, role')
      .eq('id', uid)
      .maybeSingle();
    setProfile((data as UserProfile) ?? null);
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        await loadProfile(session.user.id);
      }
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        await loadProfile(session.user.id);
      } else {
        setUserId(null);
        setProfile(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    // On récupère le rôle tout de suite pour pouvoir rediriger correctement.
    let role: DbRole | undefined;
    if (data.user) {
      const { data: row } = await supabase
        .from('users').select('role').eq('id', data.user.id).maybeSingle();
      role = (row?.role as DbRole) ?? undefined;
    }
    return { role };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const role = profile?.role ?? null;

  return (
    <AuthContext.Provider
      value={{
        loading,
        userId,
        profile,
        role,
        isStaff: !!role && STAFF_ROLES.includes(role),
        isSuper: role === 'super_admin',
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
  return ctx;
};
