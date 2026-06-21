import { createClient, processLock } from '@supabase/supabase-js';
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
 * Filet de sécurité réseau : dans la WebView mobile, une requête peut se figer
 * (jamais de réponse) → page bloquée sur les skeletons. On abandonne après 15 s
 * pour que l'UI sorte toujours du chargement (état vide au pire).
 */
const fetchWithTimeout: typeof fetch = (input: any, init: RequestInit = {}) => {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  const ext = init.signal;
  if (ext) ext.addEventListener('abort', () => ctrl.abort(), { once: true });
  return fetch(input, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(t));
};

export const supabase = createClient(url, anonKey, {
  global: { fetch: fetchWithTimeout },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: !isNative,                 // pas de session dans l'URL en natif
    // processLock : sérialise les rafraîchissements de token (évite les refresh
    // concurrents qui invalident le refresh-token), SANS navigator.locks (qui
    // deadlocke dans la WebView). Storage = localStorage par défaut (persiste).
    ...(isNative ? { lock: processLock } : {}),
  },
});
