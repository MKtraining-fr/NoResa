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

export function setKiosk(on: boolean): void {
  try { on ? localStorage.setItem(KEY, '1') : localStorage.removeItem(KEY); } catch { /* noop */ }
}
