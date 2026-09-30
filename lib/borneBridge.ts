import { supabase } from './supabaseClient';
import type { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Pont temps réel PC (back-office) ↔ borne tactile, via un canal Supabase Realtime
 * (broadcast). Sert à faire signer le contrat d'inscription directement sur la borne :
 *  - le PC envoie une demande de signature (nom du client + identifiant de session) ;
 *  - la borne affiche le pavé de signature, le client signe ;
 *  - la borne renvoie la signature (data URL) au PC, qui finalise le contrat.
 *
 * Salle unique → un canal fixe. Aucun stockage en base : tout transite en WSS chiffré.
 */
const CHANNEL = 'borne-signature';

export interface SignRequest { sessionId: string; signerName: string }
export interface SignResult {
  sessionId: string;
  signature: string;               // data URL PNG
  acquisition?: string | null;     // « Comment nous avez-vous connu ? »
  referralCode?: string | null;    // code rattaché à une personne (parrain, masqué côté client)
  consentImage?: boolean;          // droit à l'image (photo de profil)
}

// ---------------------------------------------------------------------------
// Côté PC (staff) — demande une signature à la borne.
// ---------------------------------------------------------------------------
export interface BorneRequestHandlers {
  onReady?: () => void;                 // la borne a reçu la demande et affiche le pavé
  onResult: (r: SignResult) => void;    // le client a signé
  onError: (message: string) => void;   // borne injoignable / délai dépassé
}

export function requestBorneSignature(
  signerName: string,
  handlers: BorneRequestHandlers,
  timeoutMs = 180000,
): { cancel: () => void } {
  const sessionId = (crypto as any).randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  const ch = supabase.channel(CHANNEL);
  let done = false;
  let ready = false;
  let resendTimer: ReturnType<typeof setInterval> | null = null;

  const stopResend = () => { if (resendTimer) { clearInterval(resendTimer); resendTimer = null; } };
  const timer = setTimeout(() => {
    if (done) return; done = true;
    stopResend();
    handlers.onError("La borne n'a pas répondu. Vérifiez qu'elle est allumée sur l'écran d'accueil (et à jour), puis réessayez — ou faites signer ici.");
    supabase.removeChannel(ch);
  }, timeoutMs);
  const finish = () => { done = true; clearTimeout(timer); stopResend(); supabase.removeChannel(ch); };

  const sendRequest = () => { ch.send({ type: 'broadcast', event: 'sign-request', payload: { sessionId, signerName } }); };

  ch.on('broadcast', { event: 'sign-ready' }, ({ payload }: any) => {
    if (done || payload?.sessionId !== sessionId) return;
    ready = true;
    stopResend(); // la borne a reçu la demande : inutile de continuer à ré-émettre
    handlers.onReady?.();
  });
  ch.on('broadcast', { event: 'sign-result' }, ({ payload }: any) => {
    if (done || payload?.sessionId !== sessionId) return;
    finish();
    handlers.onResult(payload as SignResult);
  });
  ch.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      // Première émission immédiate, puis ré-émission jusqu'à l'accusé de réception
      // de la borne (« sign-ready ») : évite qu'un message unique se perde si la borne
      // n'était pas prête à l'instant précis de l'envoi.
      sendRequest();
      stopResend();
      resendTimer = setInterval(() => { if (!done && !ready) sendRequest(); }, 2000);
    } else if ((status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') && !done) {
      finish();
      handlers.onError('Connexion temps réel impossible (Realtime). Vérifiez la connexion Internet du PC.');
    }
  });

  return { cancel: () => { if (!done) finish(); } };
}

// ---------------------------------------------------------------------------
// Côté borne — écoute les demandes et renvoie la signature.
// Un seul canal persistant (créé par le listener global), partagé avec l'écran de signature.
// ---------------------------------------------------------------------------
let borneChannel: RealtimeChannel | null = null;
let pending: SignRequest | null = null;
const subs = new Set<() => void>();
const notify = () => subs.forEach((cb) => { try { cb(); } catch { /* noop */ } });

export function getPendingSign(): SignRequest | null { return pending; }
export function subscribePending(cb: () => void): () => void { subs.add(cb); return () => subs.delete(cb); }
export function clearPendingSign(): void { pending = null; notify(); }

/** Démarre l'écoute côté borne. `onRequest` est appelé quand une demande arrive (pour naviguer vers l'écran de signature). */
export function startBorneSignBridge(onRequest: (req: SignRequest) => void): void {
  if (borneChannel) return;
  const ch = supabase.channel(CHANNEL);
  borneChannel = ch;
  ch.on('broadcast', { event: 'sign-request' }, ({ payload }: any) => {
    if (!payload?.sessionId) return;
    pending = { sessionId: payload.sessionId, signerName: payload.signerName || '' };
    // Accuse réception → le PC affiche « la borne est prête ».
    ch.send({ type: 'broadcast', event: 'sign-ready', payload: { sessionId: pending.sessionId } });
    notify();
    onRequest(pending);
  });
  ch.subscribe();
}

export function stopBorneSignBridge(): void {
  if (borneChannel) { supabase.removeChannel(borneChannel); borneChannel = null; }
  pending = null;
}

/** Renvoie la signature (et les infos annexes) au PC. */
export function sendSignResult(result: Omit<SignResult, 'sessionId'> & { sessionId?: string }): void {
  const sessionId = result.sessionId || pending?.sessionId;
  if (!borneChannel || !sessionId) return;
  borneChannel.send({ type: 'broadcast', event: 'sign-result', payload: { ...result, sessionId } });
  pending = null;
  notify();
}
