import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './Button';

interface ModalProps {
  title: React.ReactNode;
  onClose: () => void;
  footer?: React.ReactNode;
  /** md : formulaire. xl : terminal de vente. */
  size?: 'md' | 'xl';
  /** Remplace le corps par défaut (marges et défilement), pour le terminal de vente. */
  bodyClassName?: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ title, onClose, footer, size = 'md', bodyClassName = 'px-6 py-5 overflow-y-auto', children }) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 !mt-0 z-50 bg-ink/50 grid grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] place-items-center p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div role="dialog" aria-modal="true" className={`bg-surface shadow-modal w-full flex flex-col max-h-full ${size === 'xl' ? 'max-w-6xl' : 'max-w-modal'}`}>
        <div className="px-6 py-4 border-b-2 border-ink flex items-center gap-3 shrink-0">
          <h2 className="text-xl font-extrabold text-ink min-w-0">{title}</h2>
          <IconButton label="Fermer" onClick={onClose} className="ml-auto"><X size={18} /></IconButton>
        </div>
        <div className={bodyClassName}>{children}</div>
        {footer && <div className="px-6 py-4 border-t border-line flex justify-end gap-2 shrink-0">{footer}</div>}
      </div>
    </div>
  );
};

export default Modal;
