// @ts-nocheck — le projet n'embarque pas @types/react : les membres de classe
// (this.state/this.props) ne sont pas typés. Compilé par Vite/esbuild, valide à l'exécution.
import React, { Component, type ReactNode } from 'react';

/**
 * Filet de sécurité global : sans lui, la moindre erreur de rendu — ou un chunk lazy
 * périmé après un redéploiement (PWA restée ouverte) — blanchit toute la page.
 * Sur une erreur de chargement de module, on recharge une fois pour récupérer la
 * dernière version ; sinon on affiche un écran « Recharger » plutôt qu'une page blanche.
 */
const isChunkError = (e: unknown): boolean => {
  const m = `${(e as any)?.message ?? ''} ${(e as any)?.name ?? ''}`;
  return /Loading chunk|dynamically imported module|Importing a module script failed|ChunkLoadError|Failed to fetch dynamically imported/i.test(m);
};

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export default class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State { return { error }; }

  componentDidCatch(error: Error) {
    if (isChunkError(error)) {
      const KEY = 'noresa_chunk_reloaded';
      try {
        if (!sessionStorage.getItem(KEY)) {
          sessionStorage.setItem(KEY, '1');
          window.location.reload();
          return;
        }
      } catch { /* sessionStorage indisponible : on laisse le bouton Recharger */ }
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    const chunk = isChunkError(this.state.error);
    return (
      <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, textAlign: 'center' }}>
        <p style={{ fontWeight: 800, fontSize: 18, color: '#111827' }}>
          {chunk ? 'Nouvelle version disponible' : 'Une erreur est survenue'}
        </p>
        <p style={{ color: '#6b7280', maxWidth: 360, lineHeight: 1.5, fontSize: 14 }}>
          {chunk
            ? "L'application a été mise à jour. Recharge pour continuer."
            : "Recharge la page. Si le problème persiste, contacte la salle."}
        </p>
        <button onClick={() => window.location.reload()}
          style={{ background: '#4F46E5', color: '#fff', fontWeight: 700, padding: '10px 22px', borderRadius: 12, border: 0, cursor: 'pointer' }}>
          Recharger
        </button>
      </div>
    );
  }
}
