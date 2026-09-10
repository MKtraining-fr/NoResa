import { Capacitor } from '@capacitor/core';
import { supabase } from './supabaseClient';

/**
 * Couche native (Capacitor) — n'a d'effet QUE dans l'app compilée (Android/iOS).
 * En PWA/navigateur, `Capacitor.isNativePlatform()` est faux : toutes les fonctions
 * sortent immédiatement et les plugins natifs ne sont jamais chargés (imports
 * dynamiques). La PWA n'est donc pas impactée.
 *
 * Gère : OTA (Capgo, confirme le démarrage du bundle), reprise d'app (rafraîchit
 * les données au retour, ex. après un paiement), deep-links, et notifications push
 * natives (FCM/APNs) avec enregistrement du token côté serveur.
 */

let lastPushToken: string | null = null;
let started = false;

async function saveToken(token: string): Promise<void> {
  lastPushToken = token;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return; // pas encore connecté : on ressaiera via syncPushToken()
    await supabase.rpc('save_push_token', { p_token: token, p_platform: Capacitor.getPlatform() });
  } catch (e) { console.warn('save_push_token', e); }
}

/** Rejoue l'enregistrement du token après un login (le token a pu arriver avant la connexion). */
export function syncPushToken(): void {
  if (!Capacitor.isNativePlatform() || !lastPushToken) return;
  saveToken(lastPushToken);
}

export async function initNative(): Promise<void> {
  if (started || !Capacitor.isNativePlatform()) return;
  started = true;

  // 1) OTA : confirmer que le bundle démarre bien (sinon Capgo effectue un rollback).
  try {
    const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
    await CapacitorUpdater.notifyAppReady();
  } catch (e) { console.warn('OTA notifyAppReady', e); }

  // 2) Cycle de vie + deep-links.
  try {
    const { App } = await import('@capacitor/app');
    // Retour au premier plan (ex. après paiement dans le navigateur) -> on réutilise
    // la logique existante des pages qui écoutent l'événement 'focus'.
    App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) window.dispatchEvent(new Event('focus'));
    });
    // Lien profond ouvrant l'app : on route via le HashRouter si un fragment est présent.
    App.addListener('appUrlOpen', ({ url }) => {
      const i = url.indexOf('#');
      if (i >= 0) { try { window.location.hash = url.slice(i); } catch { /* noop */ } }
    });
  } catch (e) { console.warn('app plugin', e); }

  // 3) Notifications push natives (FCM Android / APNs iOS).
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    PushNotifications.addListener('registration', (t) => { saveToken(t.value); });
    PushNotifications.addListener('registrationError', (e) => console.warn('push registration error', e));
    const perm = await PushNotifications.requestPermissions();
    if (perm.receive === 'granted') await PushNotifications.register();
  } catch (e) { console.warn('push plugin', e); }
}
