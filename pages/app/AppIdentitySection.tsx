import React, { useEffect, useRef, useState } from 'react';
import { Smartphone, Check, Save, Loader2, QrCode, Calendar, Home, Upload, Trash2, Dumbbell } from 'lucide-react';
import { getGymBranding, saveGymBranding, uploadGymLogo } from '../../lib/gymApi';

/**
 * Onglet « App adhérent » (white-label) du back-office.
 * La salle choisit son nom affiché, sa couleur de marque et son logo.
 * Ses adhérents voient l'app à ces couleurs/logo dès leur prochaine connexion.
 * Branché Supabase via gymApi (table gyms : display_name / primary_color / logo_url).
 */

const PRESETS = ['#E11D2A', '#2563EB', '#15803D', '#7C3AED', '#EA580C', '#0D9488', '#DB2777', '#111827'];

function darken(hex: string, r = 0.22): string {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = [0, 2, 4].map((i) => Math.max(0, Math.round(parseInt(v.slice(i, i + 2), 16) * (1 - r))));
  return `#${n.map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

const AppIdentitySection: React.FC = () => {
  const [color, setColor] = useState('#4F46E5');
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getGymBranding().then((b) => {
      if (b) { setColor(b.color); setName(b.displayName); setLogoUrl(b.logoUrl); }
      setLoading(false);
    });
  }, []);

  const valid = /^#[0-9a-fA-F]{6}$/.test(color);

  const onPickLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadGymLogo(file);
      setLogoUrl(url);
    } catch (err) {
      alert("Échec du téléversement du logo. " + ((err as any)?.message ?? ''));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const onSave = async () => {
    setSaving(true);
    try {
      await saveGymBranding({ displayName: name.trim(), color, logoUrl });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      alert("Échec de l'enregistrement. " + ((e as any)?.message ?? ''));
    } finally {
      setSaving(false);
    }
  };

  const preview = valid ? color : '#4F46E5';

  return (
    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm space-y-6">
      <div className="flex items-center space-x-3 border-b border-gray-50 pb-5">
        <div className="bg-indigo-50 p-2.5 rounded-xl text-indigo-600"><Smartphone size={20} /></div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 tracking-tight">Identité de l'app adhérent</h3>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Nom, couleur & logo vus par vos adhérents dans l'application</p>
        </div>
      </div>

      {loading ? (
        <div className="h-40 flex items-center justify-center text-gray-300"><Loader2 className="animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Réglages */}
          <div className="space-y-6">
            {/* Logo */}
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Logo</label>
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl border border-gray-100 bg-gray-50 flex items-center justify-center overflow-hidden shrink-0">
                  {logoUrl
                    ? <img src={logoUrl} alt="logo" className="w-full h-full object-contain" />
                    : <Dumbbell size={22} className="text-gray-300" />}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl font-semibold text-xs transition-colors disabled:opacity-50"
                  >
                    {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                    <span>{logoUrl ? 'Changer' : 'Téléverser'}</span>
                  </button>
                  {logoUrl && (
                    <button
                      type="button"
                      onClick={() => setLogoUrl(null)}
                      className="inline-flex items-center gap-1.5 text-red-500 hover:bg-red-50 px-2.5 py-2 rounded-xl font-semibold text-xs transition-colors"
                    >
                      <Trash2 size={14} /> Retirer
                    </button>
                  )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" onChange={onPickLogo} className="hidden" />
              </div>
              <p className="text-[10px] text-gray-400 font-semibold">PNG/SVG conseillé, fond transparent.</p>
            </div>

            {/* Nom affiché */}
            <div className="space-y-2">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Nom affiché dans l'app</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: La Salle"
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 text-xs font-semibold outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
              />
            </div>

            {/* Couleur */}
            <div className="space-y-3">
              <label className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Couleur de marque</label>
              <div className="grid grid-cols-8 gap-2.5">
                {PRESETS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`relative h-9 rounded-xl transition-all ${color.toLowerCase() === c.toLowerCase() ? 'ring-4 ring-offset-2 ring-gray-900/15 scale-105' : 'hover:scale-105'}`}
                    style={{ background: c }}
                    aria-label={c}
                  >
                    {color.toLowerCase() === c.toLowerCase() && (
                      <Check size={14} strokeWidth={4} className="text-white absolute inset-0 m-auto" />
                    )}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 pt-1">
                <input
                  type="color"
                  value={preview}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-11 h-11 rounded-xl border border-slate-200 bg-white cursor-pointer p-1"
                />
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#4F46E5"
                  className={`w-32 bg-slate-50 border rounded-xl px-3 py-2.5 text-xs font-semibold uppercase outline-none ${valid ? 'border-slate-100' : 'border-red-300 text-red-600'}`}
                />
                <span className="text-[10px] font-semibold text-gray-400">Code hex</span>
              </div>
            </div>

            <button
              onClick={onSave}
              disabled={saving || !valid || !name.trim()}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-semibold text-xs hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
              <span>{saved ? 'Enregistré ✓' : "Enregistrer l'identité"}</span>
            </button>
            <p className="text-[10px] text-gray-400 font-semibold">Vos adhérents verront ces changements à leur prochaine connexion.</p>
          </div>

          {/* Aperçu live */}
          <div>
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-3">Aperçu</p>
            <div className="mx-auto w-[220px] rounded-[2rem] border-[6px] border-gray-900 overflow-hidden shadow-2xl bg-gray-50">
              <div className="bg-white px-4 py-3 flex items-center justify-between border-b border-gray-100">
                <div className="flex items-center gap-1.5">
                  {logoUrl
                    ? <img src={logoUrl} alt="" className="w-5 h-5 rounded-md object-contain" />
                    : <span className="w-5 h-5 rounded-md flex items-center justify-center" style={{ background: preview }}><Dumbbell size={12} className="text-white" /></span>}
                  <span className="text-[11px] font-bold text-gray-900">{name || 'Nom de la salle'}</span>
                </div>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: preview }} />
              </div>
              <div className="p-3 space-y-3">
                <div className="rounded-2xl p-3 text-white" style={{ background: `linear-gradient(140deg, ${preview}, ${darken(preview)})` }}>
                  <div className="flex items-center gap-2">
                    <div className="bg-white rounded-lg p-1"><QrCode size={26} style={{ color: preview }} /></div>
                    <div>
                      <p className="text-[8px] font-bold uppercase opacity-80">Mon accès</p>
                      <p className="text-[11px] font-bold leading-tight">Membre</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-gray-100 rounded-xl p-2 text-[9px] font-semibold text-gray-500">Affluence en direct</div>
                <div className="h-8 rounded-xl text-white text-[10px] font-bold flex items-center justify-center" style={{ background: preview }}>Réserver</div>
              </div>
              <div className="bg-white border-t border-gray-100 px-4 py-2 flex justify-around">
                <Home size={16} style={{ color: preview }} />
                <Calendar size={16} className="text-gray-300" />
                <QrCode size={16} className="text-gray-300" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppIdentitySection;
