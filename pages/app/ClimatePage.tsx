import React, { useEffect, useState } from 'react';
import { Snowflake, Flame, RefreshCw, Wind, Droplets, Power, Minus, Plus, Clock, Loader2, Check, Save, AirVent } from 'lucide-react';
import { getClimateZones, saveClimateZone, ClimateZone, ClimateMode, ClimateFan } from '../../lib/climateApi';

const MODES: { key: ClimateMode; label: string; icon: React.ElementType; color: string }[] = [
  { key: 'cool', label: 'Froid', icon: Snowflake, color: '#0EA5E9' },
  { key: 'heat', label: 'Chaud', icon: Flame, color: '#F97316' },
  { key: 'auto', label: 'Auto', icon: RefreshCw, color: '#6366F1' },
  { key: 'fan', label: 'Ventilation', icon: Wind, color: '#64748B' },
  { key: 'dry', label: 'Déshu.', icon: Droplets, color: '#06B6D4' },
];
const FANS: { key: ClimateFan; label: string }[] = [
  { key: 'auto', label: 'Auto' }, { key: 'low', label: 'Faible' }, { key: 'mid', label: 'Moyen' }, { key: 'high', label: 'Fort' },
];
const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAY_IDX = [1, 2, 3, 4, 5, 6, 0]; // mapping affichage -> JS getDay
const MIN_T = 16, MAX_T = 30;

const ClimatePage: React.FC = () => {
  const [zones, setZones] = useState<ClimateZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => { (async () => { setZones(await getClimateZones()); setLoading(false); })(); }, []);

  const update = (idx: number, patch: Partial<ClimateZone>) => {
    setZones((zs) => zs.map((z, i) => (i === idx ? { ...z, ...patch } : z)));
    setDirty(true); setSavedAt(false);
  };
  const toggleDay = (idx: number, day: number) => {
    const z = zones[idx];
    const has = z.weekdays.includes(day);
    update(idx, { weekdays: has ? z.weekdays.filter((d) => d !== day) : [...z.weekdays, day] });
  };

  const saveAll = async () => {
    setSaving(true);
    try { await Promise.all(zones.map(saveClimateZone)); setDirty(false); setSavedAt(true); setTimeout(() => setSavedAt(false), 2500); }
    catch (e: any) { alert(e?.message || 'Enregistrement impossible.'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="py-16 text-center text-gray-400 flex items-center justify-center gap-2"><Loader2 size={18} className="animate-spin" /> Chargement…</div>;

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><AirVent size={24} className="text-indigo-600" /> Climatisation</h1>
        <p className="text-sm text-gray-500">Réglages des 3 unités. Le pilotage matériel (vers les unités) sera branché ensuite — ici tu définis l'état voulu et la programmation.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {zones.map((z, idx) => {
          const modeColor = MODES.find((m) => m.key === z.mode)?.color || '#6366F1';
          return (
            <div key={z.id} className={`rounded-3xl border-2 p-5 transition-colors ${z.power ? 'bg-white' : 'bg-gray-50'}`} style={{ borderColor: z.power ? modeColor : '#E5E7EB' }}>
              {/* En-tête zone + on/off */}
              <div className="flex items-center justify-between gap-2">
                <input value={z.name} onChange={(e) => update(idx, { name: e.target.value })} className="font-extrabold text-gray-900 text-lg bg-transparent outline-none border-b border-transparent focus:border-gray-300 w-full" />
                <button onClick={() => update(idx, { power: !z.power })} title={z.power ? 'Éteindre' : 'Allumer'}
                  className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${z.power ? 'text-white' : 'bg-gray-200 text-gray-400'}`} style={{ backgroundColor: z.power ? modeColor : undefined }}>
                  <Power size={20} />
                </button>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-wide mt-1" style={{ color: z.power ? modeColor : '#9CA3AF' }}>{z.power ? 'Allumée' : 'Éteinte'}</p>

              {/* Température */}
              <div className="mt-4 flex items-center justify-between bg-gray-50 rounded-2xl p-3">
                <button onClick={() => update(idx, { temperature: Math.max(MIN_T, z.temperature - 1) })} className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100"><Minus size={18} /></button>
                <div className="text-center">
                  <span className="text-3xl font-black text-gray-900 tabular-nums">{z.temperature}</span>
                  <span className="text-lg font-bold text-gray-400">°C</span>
                </div>
                <button onClick={() => update(idx, { temperature: Math.min(MAX_T, z.temperature + 1) })} className="w-10 h-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-100"><Plus size={18} /></button>
              </div>

              {/* Mode */}
              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Mode</p>
                <div className="grid grid-cols-5 gap-1.5">
                  {MODES.map((m) => {
                    const active = z.mode === m.key;
                    return (
                      <button key={m.key} onClick={() => update(idx, { mode: m.key })} title={m.label}
                        className={`flex flex-col items-center gap-1 py-2 rounded-xl border transition ${active ? 'border-transparent text-white' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                        style={{ backgroundColor: active ? m.color : undefined }}>
                        <m.icon size={16} />
                        <span className="text-[9px] font-bold leading-none">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Ventilation */}
              <div className="mt-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Ventilation</p>
                <div className="grid grid-cols-4 gap-1.5">
                  {FANS.map((f) => {
                    const active = z.fan === f.key;
                    return (
                      <button key={f.key} onClick={() => update(idx, { fan: f.key })}
                        className={`py-2 rounded-xl border text-[11px] font-bold transition ${active ? 'bg-gray-900 text-white border-transparent' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                        {f.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Programmation */}
              <div className="mt-4 border-t border-gray-100 pt-4">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-[11px] font-bold uppercase tracking-wide text-gray-500 flex items-center gap-1.5"><Clock size={13} /> Programmation</span>
                  <input type="checkbox" checked={z.scheduleEnabled} onChange={(e) => update(idx, { scheduleEnabled: e.target.checked })} className="w-4 h-4 rounded text-indigo-600" />
                </label>

                {z.scheduleEnabled && (
                  <div className="mt-3 space-y-3">
                    <label className="flex items-center gap-2 text-[12px] font-semibold text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={z.followOpeningHours} onChange={(e) => update(idx, { followOpeningHours: e.target.checked })} className="w-4 h-4 rounded text-indigo-600" />
                      Caler sur les horaires d'ouverture de la salle
                    </label>

                    {!z.followOpeningHours && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="text-[10px] text-gray-400">Allumage</span>
                          <input type="time" value={z.onTime || ''} onChange={(e) => update(idx, { onTime: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 text-sm font-semibold outline-none" />
                        </div>
                        <div>
                          <span className="text-[10px] text-gray-400">Extinction</span>
                          <input type="time" value={z.offTime || ''} onChange={(e) => update(idx, { offTime: e.target.value })} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-2 text-sm font-semibold outline-none" />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-1">
                      {DAYS.map((d, i) => {
                        const day = DAY_IDX[i];
                        const on = z.weekdays.includes(day);
                        return (
                          <button key={d} onClick={() => toggleDay(idx, day)} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition ${on ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-400'}`}>{d}</button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Barre d'enregistrement */}
      <div className="fixed bottom-0 left-0 right-0 sm:left-64 bg-white/90 backdrop-blur border-t border-gray-100 px-5 py-3 flex items-center justify-end gap-3 z-30">
        {savedAt && <span className="text-sm font-bold text-green-600 flex items-center gap-1.5"><Check size={16} /> Réglages enregistrés</span>}
        <button onClick={saveAll} disabled={saving || !dirty} className="flex items-center gap-2 bg-indigo-600 text-white px-6 py-3 rounded-2xl font-bold text-sm hover:bg-indigo-700 disabled:opacity-50">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} {saving ? 'Enregistrement…' : 'Enregistrer les réglages'}
        </button>
      </div>

      <p className="text-[11px] text-gray-400">ℹ️ Ces réglages sont enregistrés mais ne pilotent pas encore physiquement les unités : l'envoi vers la clim (pont → IR) sera ajouté à l'étape matériel.</p>
    </div>
  );
};

export default ClimatePage;
