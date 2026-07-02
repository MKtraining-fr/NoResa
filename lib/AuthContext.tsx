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
    let done = false;
    const finish = () => { if (!done) { done = true; setLoading(false); } };
    // Filet de sécurité : ne JAMAIS rester bloqué sur "Chargement…" (ex. webview
    // mobile au retour d'arrière-plan). Au pire on bascule en "non connecté".
    const timer = setTimeout(finish, 6000);

    supabase.auth.getSession()
      .then(async ({ data: { session } }) => {
        if (session?.user) {
          setUserId(session.user.id);
          try { await loadProfile(session.user.id); } catch (e) { console.error('loadProfile', e); }
        }
      })
      .catch((e) => console.error('getSession', e))
      .finally(finish);

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      // IMPORTANT : ne JAMAIS `await` un autre appel supabase ici. Le callback est
      // exécuté en tenant le verrou d'authentification ; appeler loadProfile (qui a
      // besoin du même verrou) dans la foulée provoque un interblocage — la connexion
      // « tourne en rond » au 1er clic. On diffère donc la lecture du profil (setTimeout 0).
      if (session?.user) {
        const uid = session.user.id;
        setUserId(uid);
        setTimeout(() => { loadProfile(uid).catch((e) => console.error('loadProfile', e)); }, 0);
      } else {
        setUserId(null);
        setProfile(null);
      }
      finish();
    });
    return () => { clearTimeout(timer); sub.subscription.unsubscribe(); };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };

      // On récupère le rôle tout de suite pour pouvoir rediriger correctement.
      // (L'interblocage du verrou d'auth étant levé, cette lecture résout normalement.)
      let role: DbRole | undefined;
      if (data.user) {
        try {
          const { data: row } = await supabase
            .from('users').select('role').eq('id', data.user.id).maybeSingle();
          role = (row?.role as DbRole) ?? undefined;
        } catch (e) { console.error('signIn role', e); }
      }
      return { role };
    } catch (e) {
      console.error('signIn', e);
      return { error: (e as Error)?.message || 'Connexion impossible.' };
    }
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
