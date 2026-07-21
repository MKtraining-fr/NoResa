import { supabase } from './supabaseClient';
import { Product } from '../types';

// --- Produits ---------------------------------------------------------------

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('id, name, price, stock_quantity, min_stock_alert, image_url, vat_rate, sku, cost_price, category:product_categories(name), supplier:suppliers(name)')
    .eq('is_active', true)
    .order('name');
  if (error) {
    console.error('boutiqueApi.getProducts', error);
    return [];
  }
  return (data ?? []).map((r: any) => ({
    id: r.id,
    name: r.name,
    price: Number(r.price) || 0,
    stock: r.stock_quantity ?? 0,
    minStockAlert: r.min_stock_alert ?? null,
    category: r.category?.name || 'Divers',
    image: r.image_url || undefined,
    vatRate: r.vat_rate != null ? Number(r.vat_rate) : 0,
    costPrice: r.cost_price != null ? Number(r.cost_price) : undefined,
    sku: r.sku || undefined,
    supplier: r.supplier?.name || undefined,
  }));
}

export interface CategoryRow { id: string; name: string; }

/** Met à jour le stock (et éventuellement le seuil d'alerte) d'un produit. */
export async function updateProductStock(productId: string, stock: number, minAlert?: number | null): Promise<void> {
  const patch: any = { stock_quantity: stock };
  if (minAlert !== undefined) patch.min_stock_alert = minAlert;
  const { error } = await supabase.from('products').update(patch).eq('id', productId);
  if (error) { console.error('boutiqueApi.updateProductStock', error); throw error; }
}

export async function getCategories(): Promise<CategoryRow[]> {
  const { data, error } = await supabase
    .from('product_categories')
    .select('id, name')
    .eq('is_active', true)
    .order('name');
  if (error) { console.error('boutiqueApi.getCategories', error); return []; }
  return (data ?? []) as CategoryRow[];
}

// --- Ventes -----------------------------------------------------------------

export interface SaleLine { product_id?: string; quantity: number; label?: string; unit_price?: number; vat_rate?: number; }
export interface SaleResult { sale_id: string; invoice_number: string; total_ttc: number; }

/** Encaisse une vente (crée le ticket, les lignes, décrémente le stock). */
export async function recordSale(
  memberId: string | null,
  paymentMethod: string,
  lines: SaleLine[],
  /** Achat perso : articles au prix coûtant, vente exclue du chiffre d'affaires. */
  personal = false,
): Promise<SaleResult> {
  const { data, error } = await supabase.rpc('record_sale', {
    p_member: memberId,
    p_payment_method: paymentMethod,
    p_lines: lines,
    p_personal: personal,
  });
  if (error) {
    console.error('boutiqueApi.recordSale', error);
    throw error;
  }
  return data as SaleResult;
}

export async function getRecentSales(limit = 50): Promise<any[]> {
  const { data, error } = await supabase
    .from('sales')
    .select('id, invoice_number, sale_date, payment_method, subtotal_ht, total_tva, total_ttc, invoice_email_status, invoice_pdf_path, member:members(first_name, last_name, email)')
    .order('sale_date', { ascending: false })
    .limit(limit);
  if (error) { console.error('boutiqueApi.getRecentSales', error); return []; }
  return data ?? [];
}

/** Ventes (achats) d'un client précis, avec leurs lignes. */
export async function getMemberSales(memberId: string): Promise<any[]> {
  const { data, error } = await supabase
    .from('sales')
    .select('id, invoice_number, sale_date, payment_method, total_ttc, invoice_email_status, invoice_pdf_path, lines:product_sales(quantity, unit_price, label, product:products(name))')
    .eq('member_id', memberId)
    .order('sale_date', { ascending: false });
  if (error) { console.error('boutiqueApi.getMemberSales', error); return []; }
  return data ?? [];
}

/** Supprime une vente (remet le stock, supprime le paiement lié). */
export async function deleteSale(saleId: string): Promise<void> {
  const { error } = await supabase.rpc('delete_sale', { p_sale_id: saleId });
  if (error) { console.error('boutiqueApi.deleteSale', error); throw error; }
}

// --- Fournisseurs -----------------------------------------------------------

export interface SupplierRow {
  id: string;
  name: string;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  supplier_type?: string | null;
  productCount?: number;
}

export async function getSuppliers(): Promise<SupplierRow[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('id, name, contact_name, email, phone, address, supplier_type, is_active')
    .eq('is_active', true)
    .order('name');
  if (error) { console.error('boutiqueApi.getSuppliers', error); return []; }
  // nombre de produits par fournisseur
  const { data: prods } = await supabase.from('products').select('supplier_id');
  const counts: Record<string, number> = {};
  (prods ?? []).forEach((p: any) => { if (p.supplier_id) counts[p.supplier_id] = (counts[p.supplier_id] || 0) + 1; });
  return (data ?? []).map((s: any) => ({ ...s, productCount: counts[s.id] || 0 }));
}

// --- Statistiques -----------------------------------------------------------

export interface BoutiqueStats {
  ca_today: number;
  ca_month: number;
  margin_month: number;
  sales_month: number;
  top_products: { name: string; qty: number; revenue: number }[];
}

export async function getStats(): Promise<BoutiqueStats | null> {
  const { data, error } = await supabase.rpc('boutique_stats');
  if (error) { console.error('boutiqueApi.getStats', error); return null; }
  return data as BoutiqueStats;
}

/** URL signée temporaire pour télécharger une facture PDF stockée. */
export async function getInvoiceUrl(path?: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from('invoices').createSignedUrl(path, 3600);
  if (error) { console.error('boutiqueApi.getInvoiceUrl', error); return null; }
  return data?.signedUrl ?? null;
}

// --- Facture (génération PDF + email optionnel) -----------------------------

async function callInvoice(saleId: string, email: boolean): Promise<any> {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-invoice`;
  const { data: sess } = await supabase.auth.getSession();
  const token = sess?.session?.access_token || (import.meta.env.VITE_SUPABASE_ANON_KEY as string);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY as string,
    },
    body: JSON.stringify({ sale_id: saleId, email }),
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j?.error || "La facture a échoué.");
  return j;
}

/** Envoie la facture par email (et génère le PDF). */
export async function sendInvoice(saleId: string): Promise<any> {
  return callInvoice(saleId, true);
}

/** Génère (ou régénère) le PDF de la facture sans l'envoyer par email. Renvoie { pdf_path }. */
export async function generateInvoice(saleId: string): Promise<any> {
  return callInvoice(saleId, false);
}

/** Génère le PDF si besoin puis renvoie une URL signée pour le consulter. */
export async function viewInvoice(saleId: string, existingPath?: string | null): Promise<string | null> {
  let path = existingPath || null;
  if (!path) {
    const r = await generateInvoice(saleId);
    path = r?.pdf_path || null;
  }
  return getInvoiceUrl(path);
}
