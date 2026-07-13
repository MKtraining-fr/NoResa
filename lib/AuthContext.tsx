import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
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
  profileLoaded: boolean;      // le profil du user connecté a été lu (succès ou échec)
  role: DbRole | null;
  isStaff: boolean;            // peut accéder au back-office
  isSuper: boolean;            // propriétaire de la plateforme
  signIn: (email: string, password: string) => Promise<{ error?: string; role?: DbRole }>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const PROFILE_COLS = 'id, email, first_name, last_name, role';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const userIdRef = useRef<string | null>(null);

  const loadProfile = async (uid: string) => {
    try {
      const { data } = await supabase.from('users').select(PROFILE_COLS).eq('id', uid).maybeSingle();
      setProfile((data as UserProfile) ?? null);
    } catch (e) {
      console.error('loadProfile', e);
    } finally {
      setProfileLoaded(true);
    }
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
          userIdRef.current = session.user.id;
          setUserId(session.user.id);
          await loadProfile(session.user.id);
        } else {
          setProfileLoaded(true); // pas de session → rien à charger
        }
      })
      .catch((e) => { console.error('getSession', e); setProfileLoaded(true); })
      .finally(finish);

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      // IMPORTANT : ne JAMAIS `await` un autre appel supabase ici. Le callback est
      // exécuté en tenant le verrou d'authentification ; appeler loadProfile (qui a
      // besoin du même verrou) dans la foulée provoque un interblocage — la connexion
      // « tourne en rond » au 1er clic. On diffère donc la lecture du profil (setTimeout 0).
      const uid = session?.user?.id ?? null;
      if (uid) {
        const changed = userIdRef.current !== uid;
        userIdRef.current = uid;
        setUserId(uid);
        // On ne recharge (et on ne remet "en chargement") que si c'est un NOUVEAU
        // user : évite de flasher « Chargement » à chaque rafraîchissement de token.
        if (changed) {
          setProfileLoaded(false);
          setTimeout(() => { loadProfile(uid); }, 0);
        }
      } else {
        userIdRef.current = null;
        setUserId(null);
        setProfile(null);
        setProfileLoaded(true);
      }
      finish();
    });
    return () => { clearTimeout(timer); sub.subscription.unsubscribe(); };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };

      // On lit le profil complet tout de suite et on le pousse dans le contexte : ainsi
      // la redirection post-login trouve déjà le rôle (ProtectedRoute ne rebondit pas
      // vers /connexion en attendant le chargement différé). L'interblocage étant levé,
      // cette lecture résout normalement.
      let role: DbRole | undefined;
      if (data.user) {
        try {
          const { data: row } = await supabase.from('users').select(PROFILE_COLS).eq('id', data.user.id).maybeSingle();
          if (row) {
            userIdRef.current = data.user.id;
            setUserId(data.user.id);
            setProfile(row as UserProfile);
            setProfileLoaded(true);
            role = (row as UserProfile).role;
          }
        } catch (e) { console.error('signIn profile', e); }
      }
      return { role };
    } catch (e) {
      console.error('signIn', e);
      return { error: (e as Error)?.message || 'Connexion impossible.' };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      // Le lien de récupération doit ouvrir la version WEB (le flux mot de passe se
      // déroule dans le navigateur, cf. index.tsx). En natif window.location.origin
      // vaut capacitor://… → on retombe sur l'URL de prod.
      const origin = /^https?:/.test(window.location.origin) ? window.location.origin : 'https://noresa.pages.dev';
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo: `${origin}/` });
      if (error) return { error: error.message };
      return {};
    } catch (e) {
      console.error('resetPassword', e);
      return { error: (e as Error)?.message || 'Envoi impossible.' };
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
        profileLoaded,
        role,
        isStaff: !!role && STAFF_ROLES.includes(role),
        isSuper: role === 'super_admin',
        signIn,
        resetPassword,
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
