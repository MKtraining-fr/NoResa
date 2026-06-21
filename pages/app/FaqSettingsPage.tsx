import React, { useEffect, useState, useCallback } from 'react';
import { HelpCircle, Plus, Trash2, ChevronUp, ChevronDown, Check, Clock, MessageSquare } from 'lucide-react';
import { getMemberFaq, saveMemberFaq, FaqItem } from '../../lib/messagesApi';

const newId = () => `faq_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

const FaqSettingsPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const [items, setItems] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setItems(await getMemberFaq());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const update = (id: string, patch: Partial<FaqItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    setDirty(true); setSaved(false);
  };
  const remove = (id: string) => { setItems((prev) => prev.filter((it) => it.id !== id)); setDirty(true); setSaved(false); };
  const move = (i: number, dir: -1 | 1) => {
    setItems((prev) => {
      const arr = [...prev]; const j = i + dir;
      if (j < 0 || j >= arr.length) return prev;
      [arr[i], arr[j]] = [arr[j], arr[i]];
      return arr;
    });
    setDirty(true); setSaved(false);
  };
  const add = () => { setItems((prev) => [...prev, { id: newId(), question: '', answer: '', cta: true }]); setDirty(true); setSaved(false); };

  const save = async () => {
    setSaving(true);
    try {
      const clean = items.filter((it) => it.question.trim() || it.answer.trim());
      await saveMemberFaq(clean);
      setItems(clean); setDirty(false); setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch { alert('Enregistrement impossible.'); } finally { setSaving(false); }
  };

  return (
    <div className={embedded ? 'space-y-5' : 'space-y-5 max-w-3xl'}>
      {!embedded && (
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Aide rapide (FAQ)</h1>
          <p className="text-sm text-gray-500">Les questions/réponses affichées aux adhérents dans la messagerie.</p>
        </div>
      )}

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <p className="text-xs text-gray-500 max-w-xl">
          Ces réponses s'affichent dans l'app membre, au-dessus de la messagerie. Les <strong>horaires</strong> et le bouton
          <strong> « Parler à un humain »</strong> sont gérés automatiquement et n'ont pas besoin d'être saisis ici.
        </p>
        <div className="flex items-center gap-2 shrink-0">
          {saved && <span className="text-xs font-medium text-green-600 flex items-center gap-1"><Check size={14} /> Enregistré</span>}
          <button onClick={save} disabled={saving || !dirty} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 disabled:opacity-50">
            <Check size={15} /> Enregistrer
          </button>
        </div>
      </div>

      {/* Éléments fixes (info) */}
      <div className="grid sm:grid-cols-2 gap-2">
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
          <Clock size={14} /> Horaires d'ouverture <span className="ml-auto text-[10px]">auto</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5">
          <MessageSquare size={14} /> Parler à un humain <span className="ml-auto text-[10px]">auto</span>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400 py-8 text-center">Chargement…</p>
      ) : (
        <div className="space-y-3">
          {items.length === 0 && (
            <div className="py-10 text-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-2xl">
              Aucune question pour l'instant. Ajoutez-en une ci-dessous.
            </div>
          )}
          {items.map((it, i) => (
            <div key={it.id} className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg shrink-0"><HelpCircle size={15} /></span>
                <input
                  value={it.question}
                  onChange={(e) => update(it.id, { question: e.target.value })}
                  placeholder="Question (ex. Tarifs & formules)"
                  className="flex-grow bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm font-semibold outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
                <button onClick={() => move(i, -1)} disabled={i === 0} className="p-1.5 text-gray-300 hover:text-gray-600 disabled:opacity-30"><ChevronUp size={15} /></button>
                <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="p-1.5 text-gray-300 hover:text-gray-600 disabled:opacity-30"><ChevronDown size={15} /></button>
                <button onClick={() => remove(it.id)} className="p-1.5 text-gray-300 hover:text-red-600"><Trash2 size={15} /></button>
              </div>
              <textarea
                value={it.answer}
                onChange={(e) => update(it.id, { answer: e.target.value })}
                placeholder="Réponse affichée à l'adhérent…"
                rows={3}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 resize-y"
              />
              <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer pl-1">
                <input type="checkbox" checked={it.cta} onChange={(e) => update(it.id, { cta: e.target.checked })} />
                Afficher le bouton « Écrire à l'équipe » sous cette réponse
              </label>
            </div>
          ))}

          <button onClick={add} className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-gray-300 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 hover:text-indigo-600">
            <Plus size={16} /> Ajouter une question
          </button>
        </div>
      )}
    </div>
  );
};

export default FaqSettingsPage;
