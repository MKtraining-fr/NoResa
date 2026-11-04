import React, { useEffect, useState } from 'react';
import { ChevronDown, TriangleAlert } from 'lucide-react';
import { listDuplicateAlerts, dismissDuplicateAlert, DuplicateAlert } from '../lib/duplicateAlertsApi';
import { Button } from './ui';

/** Bandeau du tableau de bord : fiches créées avec un nom déjà connu sous un autre e-mail. */
const DuplicateAlertsBanner: React.FC = () => {
  const [alerts, setAlerts] = useState<DuplicateAlert[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => { listDuplicateAlerts().then(setAlerts); }, []);

  const dismiss = async (id: string) => {
    try {
      await dismissDuplicateAlert(id);
      setAlerts((prev) => prev.filter((a) => a.id !== id));
    } catch { alert('Action impossible.'); }
  };

  if (alerts.length === 0) return null;
  const plural = alerts.length > 1;

  return (
    <div className="bg-warning-soft text-warning-text">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="w-full flex items-center gap-3 text-left px-4 py-3">
        <TriangleAlert size={18} className="shrink-0" />
        <span className="min-w-0"><span className="font-extrabold">{alerts.length} doublon{plural ? 's' : ''} possible{plural ? 's' : ''} à vérifier.</span> Même nom et prénom, mais une autre adresse e-mail.</span>
        <ChevronDown size={18} className={`ml-auto shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-4 pb-3 space-y-2">
          {alerts.map((a) => (
            <div key={a.id} className="bg-surface border border-line text-ink px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-grow min-w-0">
                <p className="font-semibold truncate">{a.firstName} {a.lastName}</p>
                <p className="text-sm text-muted break-all">Nouvelle fiche{a.memberNumber ? ` n° ${a.memberNumber}` : ''} : {a.email || 'sans e-mail'}</p>
                <p className="text-sm text-muted break-all">Fiche existante{a.otherMemberNumber ? ` n° ${a.otherMemberNumber}` : ''} : {a.otherEmail || 'sans e-mail'}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" onClick={() => dismiss(a.id)}>Pas un doublon</Button>
                <Button variant="secondary" to={`/app/crm/membres?member=${a.otherMemberId}`}>Ouvrir la fiche</Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DuplicateAlertsBanner;
