import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';

const url = import.meta.env.VITE_SUPABASE_URL as string;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!url || !anonKey) {
  console.error(
    '[Supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY manquant. ' +
    'Crée un fichier .env.local à la racine puis relance `npm run dev`.'
  );
}

const isNative = Capacitor.isNativePlatform();

/**
 * Verrou « no-op » sur mobile : le verrou par défaut de Supabase s'appuie sur
 * le Web Locks API (navigator.locks), qui peut se bloquer dans la WebView au
 * retour d'arrière-plan → getSession() ne répond jamais (chargement infini).
 *
 * Stockage : on garde le localStorage par défaut (synchrone). Il persiste dans
 * la WebView Android entre deux lancements — contrairement à un stockage
 * asynchrone (Preferences) qui ralentit/fige chaque requête dans la webview.
 */
const noopLock = async <R,>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => fn();

export const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: !isNative,                 // pas de session dans l'URL en natif
    ...(isNative ? { lock: noopLock as any } : {}),
  },
});
