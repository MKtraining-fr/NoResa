import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  console.error(
    '[Supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquant. ' +
    'Crée un fichier .env.local à la racine puis relance `npm run dev`.'
  );
}

/**
 * Sur mobile (Capacitor), le localStorage de la WebView n'est pas fiable :
 * Android peut le vider quand l'app passe en arrière-plan → déconnexion.
 * On stocke donc la session dans le stockage natif (Preferences), qui persiste.
 * Sur le web, on garde le localStorage par défaut (storage: undefined).
 */
const nativeStorage = {
  getItem: (key: string) => Preferences.get({ key }).then((r) => r.value),
  setItem: (key: string, value: string) => Preferences.set({ key, value }).then(() => undefined),
  removeItem: (key: string) => Preferences.remove({ key }).then(() => undefined),
};

const isNative = Capacitor.isNativePlatform();

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: !isNative,                 // pas de session dans l'URL en natif
    storage: isNative ? (nativeStorage as any) : undefined,
  },
});
