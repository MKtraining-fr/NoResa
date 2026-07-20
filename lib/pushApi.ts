import { supabase } from './supabaseClient';

/**
 * Notifications push (Web Push / PWA).
 * Fonctionne sur Android/Chrome et sur ordinateur. Sur iPhone, Safari exige
 * iOS 16.4+ ET que l'app ait été ajoutée à l'écran d'accueil.
 */

const SW_URL = '/sw.js';

export function isPushSupported(): boolean {
  return typeof window !== 'undefined'
    && 'serviceWorker' in navigator
    && 'PushManager' in window
    && 'Notification' in window;
}

/** iOS n'autorise le push que depuis une PWA installée sur l'écran d'accueil. */
export function needsInstallFirst(): boolean {
  if (typeof window === 'undefined') return false;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches
    || (window.navigator as any).standalone === true;
  return isIOS && !standalone;
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

async function getPublicKey(): Promise<string | null> {
  const { data } = await supabase.rpc('push_public_key');
  if (data) return data as string;
  // Première utilisation : la fonction serveur crée la paire VAPID.
  const { data: init } = await supabase.functions.invoke('push-send', { body: { init: true } });
  return (init as any)?.public_key ?? null;
}

/** Permission actuelle du navigateur : 'granted' | 'denied' | 'default'. */
export function pushPermission(): NotificationPermission | 'unsupported' {
  if (!isPushSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Abonnement SILENCIEUX : ne demande jamais rien à l'utilisateur.
 * Si la permission a déjà été accordée, on (ré)enregistre l'abonnement sans UI —
 * c'est ce qui rend les notifications « actives par défaut » une fois acceptées,
 * y compris après une réinstallation ou un changement d'appareil.
 */
export async function ensurePushSubscribed(): Promise<boolean> {
  if (!isPushSupported() || Notification.permission !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker.register(SW_URL);
    await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const key = await getPublicKey();
      if (!key) return false;
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
    }
    const j: any = sub.toJSON();
    await supabase.rpc('save_push_subscription', {
      p_endpoint: sub.endpoint,
      p_p256dh: j.keys?.p256dh,
      p_auth: j.keys?.auth,
      p_user_agent: navigator.userAgent.slice(0, 200),
    });
    return true;
  } catch (e) { console.error('ensurePushSubscribed', e); return false; }
}

/** Cet appareil est-il déjà abonné ? */
export async function isPushEnabled(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    return !!sub;
  } catch { return false; }
}

/** Demande l'autorisation et enregistre l'abonnement. Renvoie un message d'erreur si échec. */
export async function enablePush(): Promise<{ ok: boolean; error?: string }> {
  if (!isPushSupported()) return { ok: false, error: "Ton navigateur ne gère pas les notifications." };
  if (needsInstallFirst()) {
    return { ok: false, error: "Sur iPhone, ajoute d'abord l'app à ton écran d'accueil (Partager → Sur l'écran d'accueil), puis réessaie." };
  }
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { ok: false, error: "Notifications refusées. Tu peux les réactiver dans les réglages de ton navigateur." };
    }
    const reg = await navigator.serviceWorker.register(SW_URL);
    await navigator.serviceWorker.ready;

    const key = await getPublicKey();
    if (!key) return { ok: false, error: "Configuration des notifications indisponible." };

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
    }
    const j: any = sub.toJSON();
    const { error } = await supabase.rpc('save_push_subscription', {
      p_endpoint: sub.endpoint,
      p_p256dh: j.keys?.p256dh,
      p_auth: j.keys?.auth,
      p_user_agent: navigator.userAgent.slice(0, 200),
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Activation impossible." };
  }
}

export async function disablePush(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await supabase.rpc('delete_push_subscription', { p_endpoint: sub.endpoint });
      await sub.unsubscribe();
    }
  } catch (e) { console.error('disablePush', e); }
}

/** Diffuse une notification à tous les adhérents abonnés (staff uniquement). */
export async function sendPush(title: string, body: string, url?: string): Promise<{ ok: boolean; sent?: number; total?: number; error?: string }> {
  const { data, error } = await supabase.functions.invoke('push-send', { body: { title, body, url } });
  if (error) {
    let msg = error.message || 'Envoi impossible';
    try { const ctx = await (error as any).context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* noop */ }
    return { ok: false, error: msg };
  }
  if ((data as any)?.error) return { ok: false, error: (data as any).error };
  return { ok: true, sent: (data as any)?.sent, total: (data as any)?.total };
}
