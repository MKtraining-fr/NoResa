import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

/**
 * Marque de la salle de l'adhérent (white-label), portée à l'espace membre.
 * - charge my_gym() (nom affiché + couleur + logo, vrai schéma)
 * - injecte les variables CSS --brand* (lues par les classes Tailwind « brand »)
 * - expose displayName / color / logoUrl aux pages membre via useBrand()
 *
 * Le Provider est monté DANS MemberLayout : la marque ne s'applique qu'à
 * l'espace /membre, le back-office reste sur sa charte (indigo).
 */

interface BrandState {
  displayName: string;
  color: string;
  logoUrl: string | null;
  loading: boolean;
}

const DEFAULT: BrandState = { displayName: 'NoResa', color: '#4F46E5', logoUrl: null, loading: true };
const BrandContext = createContext<BrandState>(DEFAULT);

// --- Utilitaires couleur ----------------------------------------------------
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
}
const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
const toHex = (n: number) => clamp(n).toString(16).padStart(2, '0');
const rgbToHex = (r: number, g: number, b: number) => `#${toHex(r)}${toHex(g)}${toHex(b)}`;
const darken = (hex: string, r: number) => { const [a, b, c] = hexToRgb(hex); return rgbToHex(a * (1 - r), b * (1 - r), c * (1 - r)); };
const tint = (hex: string, r: number) => { const [a, b, c] = hexToRgb(hex); return rgbToHex(a + (255 - a) * r, b + (255 - b) * r, c + (255 - c) * r); };

function applyBrand(color: string) {
  const ok = /^#[0-9a-fA-F]{6}$/.test(color);
  const c = ok ? color : '#4F46E5';
  const root = document.documentElement.style;
  root.setProperty('--brand', c);
  root.setProperty('--brand-dark', darken(c, 0.22));
  root.setProperty('--brand-soft', tint(c, 0.90));
}

export const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<BrandState>(DEFAULT);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc('my_gym');
      const r = Array.isArray(data) ? data[0] : data;
      if (cancelled) return;
      if (error || !r) { applyBrand(DEFAULT.color); setState({ ...DEFAULT, loading: false }); return; }
      const color = (r.primary_color as string) || DEFAULT.color;
      applyBrand(color);
      setState({
        displayName: (r.display_name as string) || (r.name as string) || 'NoResa',
        color,
        logoUrl: (r.logo_url as string) || null,
        loading: false,
      });
    })();
    return () => { cancelled = true; };
  }, []);

  return <BrandContext.Provider value={state}>{children}</BrandContext.Provider>;
};

export const useBrand = () => useContext(BrandContext);
