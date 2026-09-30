/**
 * Mode « borne » (kiosque). Armé une fois sur l'appareil-borne en ouvrant
 * `/#/borne?kiosk=1`. Tant qu'il est armé, l'app empêche tout retour vers la
 * vitrine NoResa (landing SaaS) : la racine et les pages marketing redirigent
 * vers /borne, et le layout public masque la navigation marketing.
 * Pour désarmer (usage staff) : ouvrir `/#/borne?kiosk=0`.
 */
const KEY = 'noresa_kiosk';

export function isKiosk(): boolean {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

export const KIOSK_EVENT = 'noresa-kiosk-changed';

export function setKiosk(on: boolean): void {
  try { on ? localStorage.setItem(KEY, '1') : localStorage.removeItem(KEY); } catch { /* noop */ }
  // Prévient les composants (écoute borne, voyant) d'un changement de mode kiosque,
  // même quand il est armé après le montage de l'app.
  try { window.dispatchEvent(new CustomEvent(KIOSK_EVENT)); } catch { /* noop */ }
}
