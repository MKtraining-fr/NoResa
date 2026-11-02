import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, ChevronDown } from 'lucide-react';
import { listDuplicateAlerts, dismissDuplicateAlert, DuplicateAlert } from '../lib/duplicateAlertsApi';

/** Bandeau du tableau de bord : fiches créées avec un nom déjà connu sous un autre e-mail. */
const DuplicateAlertsBanner: React.FC = () => {
  const [alerts, setAlerts] = useState<DuplicateAlert[]>([]);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

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
    <div className="bg-amber-50 border border-amber-200 rounded-2xl">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-3 text-left px-5 py-3.5">
        <span className="bg-amber-100 text-amber-600 p-2 rounded-xl"><Users size={18} /></span>
        <div className="flex-grow">
          <p className="text-sm font-bold text-amber-800">{alerts.length} doublon{plural ? 's' : ''} possible{plural ? 's' : ''} à vérifier</p>
          <p className="text-[12px] text-amber-700/80">Même nom et prénom, mais une autre adresse e-mail.</p>
        </div>
        <ChevronDown size={18} className={`text-amber-700 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-5 pb-4 space-y-2">
          {alerts.map((a) => (
            <div key={a.id} className="bg-white border border-amber-100 rounded-xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-grow min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{a.firstName} {a.lastName}</p>
                <p className="text-[12px] text-gray-500 break-all">Nouvelle fiche{a.memberNumber ? ` n° ${a.memberNumber}` : ''} : {a.email || 'sans e-mail'}</p>
                <p className="text-[12px] text-gray-500 break-all">Fiche existante{a.otherMemberNumber ? ` n° ${a.otherMemberNumber}` : ''} : {a.otherEmail || 'sans e-mail'}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => dismiss(a.id)} className="text-[12px] font-semibold text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-50">Pas un doublon</button>
                <button onClick={() => navigate(`/app/crm/membres?member=${a.otherMemberId}`)} className="text-[12px] font-bold text-amber-800 bg-amber-100 px-3 py-1.5 rounded-lg hover:bg-amber-200">Ouvrir la fiche</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DuplicateAlertsBanner;
