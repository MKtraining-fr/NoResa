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
 * (jamais de réponse) → page bloquée sur les skeletons, et le verrou d'auth reste
 * pris (plus aucune requête ne passe → « ça ne charge jamais »).
 *
 * On abandonne après ~12 s. Important : on n'utilise PAS seulement AbortController
 * (WKWebView l'ignore parfois pour fetch, donc la promesse ne se règle jamais) —
 * on ajoute une COURSE contre un timer qui REJETTE. La promesse se règle donc
 * toujours, même si l'abandon est ignoré, ce qui libère le verrou et débloque l'UI.
 */
const NET_TIMEOUT = 10000;
const fetchWithTimeout: typeof fetch = (input: any, init: RequestInit = {}) => {
  const ctrl = new AbortController();
  const abortT = setTimeout(() => ctrl.abort(), NET_TIMEOUT);
  const ext = init.signal;
  if (ext) {
    if (ext.aborted) ctrl.abort();
    else ext.addEventListener('abort', () => ctrl.abort(), { once: true });
  }
  let rejectT: ReturnType<typeof setTimeout>;
  const timeout = new Promise<Response>((_, reject) => {
    rejectT = setTimeout(() => reject(new Error('Délai réseau dépassé')), NET_TIMEOUT + 1500);
  });
  return Promise.race([fetch(input, { ...init, signal: ctrl.signal }), timeout])
    .finally(() => { clearTimeout(abortT); clearTimeout(rejectT); }) as Promise<Response>;
};

export const supabase = createClient(url, anonKey, {
  global: { fetch: fetchWithTimeout },
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,                     // on gère nous-mêmes le lien e-mail (voir index.tsx)
    // processLock : sérialise les rafraîchissements de token (évite les refresh
    // concurrents qui invalident le refresh-token), SANS navigator.locks (qui
    // deadlocke dans la WebView). Storage = localStorage par défaut (persiste).
    ...(isNative ? { lock: processLock } : {}),
  },
});
