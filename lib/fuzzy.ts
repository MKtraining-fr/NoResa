/**
 * Recherche souple partagée par le CRM et le contrôle d'accès :
 * accents ignorés, casse ignorée, fautes de frappe rattrapées.
 */

/** Minuscules + accents supprimés, pour comparer sans se soucier de la saisie. */
export const norm = (v: string) =>
  (v || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/** Distance de Levenshtein : sert à rattraper une faute de frappe. */
export function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

/** Tolérance proportionnelle : 1 faute dès 4 caractères, 2 dès 8. */
export function closeEnough(token: string, word: string): boolean {
  if (word.length < 4) return token.startsWith(word);
  if (token.startsWith(word.slice(0, Math.max(3, word.length - 2)))) return true;
  const allowed = word.length >= 8 ? 2 : 1;
  return editDistance(token, word) <= allowed;
}

/**
 * Vrai si tous les mots de la recherche se retrouvent (même approximativement)
 * dans l'un des champs fournis. Les champs vides sont ignorés.
 */
export function fuzzyMatch(query: string, fields: (string | null | undefined)[]): boolean {
  const words = norm(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = norm(fields.filter(Boolean).join(' '));
  const tokens = hay.split(/\s+/).filter((t) => t.length > 2);
  return words.every((w) => hay.includes(w) || tokens.some((t) => closeEnough(t, w)));
}
