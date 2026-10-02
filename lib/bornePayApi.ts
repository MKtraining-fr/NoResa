import { supabase } from './supabaseClient';

export type BorneProduct = 'seance' | 'carnet' | 'mois';

export interface BorneProductInfo {
  key: BorneProduct;
  label: string;
  price: string;
  sub: string;
}

// Produits proposés en self-service sur la borne (tarifs = ceux de Stripe).
export const BORNE_PRODUCTS: BorneProductInfo[] = [
  { key: 'seance', label: '1 séance', price: '5 €', sub: 'Entrée à l’unité' },
  { key: 'carnet', label: 'Carnet de 10 séances', price: '45 €', sub: '10 entrées (4,50 € / séance)' },
  { key: 'mois', label: '1 mois d’accès', price: '40 €', sub: '30 jours illimités' },
];

export interface BornePurchaseInput {
  product: BorneProduct;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

/**
 * Lance un achat self-service depuis la borne : retrouve/crée la fiche par e-mail
 * puis ouvre le paiement Stripe. Renvoie l'URL de paiement à ouvrir.
 */
export async function startBornePurchase(input: BornePurchaseInput): Promise<string> {
  const { data, error } = await supabase.functions.invoke('borne-purchase', {
    body: {
      product: input.product,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone || undefined,
      redirectBase: window.location.origin,
    },
  });
  if (error) {
    // Les erreurs métier (fonction) reviennent dans data?.error ou le message.
    const msg = (data && (data as any).error) || error.message || 'Paiement indisponible.';
    throw new Error(msg);
  }
  const url = (data as any)?.url;
  if (!url) throw new Error((data as any)?.error || 'Paiement indisponible.');
  return url as string;
}
