import React, { useEffect, useState, useCallback } from 'react';
import { Layers, Plus, Trash2, Check, X, Edit2, CornerDownRight } from 'lucide-react';
import { getGroupTree, createGroup, renameGroup, deleteGroup, GroupNode } from '../../lib/groupsApi';

const GroupsSettingsPage: React.FC<{ embedded?: boolean }> = ({ embedded = false }) => {
  const [tree, setTree] = useState<GroupNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGroup, setNewGroup] = useState('');
  const [subDraft, setSubDraft] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<{ id: string; parentId: string | null; old: string } | null>(null);
  const [editVal, setEditVal] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setTree(await getGroupTree());
    setLoading(false);
  }, []);
  useEffect(() => { load(); }, [load]);

  const addGroup = async () => {
    if (!newGroup.trim() || busy) return;
    setBusy(true);
    try { await createGroup(newGroup); setNewGroup(''); await load(); }
    catch (e: any) { alert(e?.message?.includes('duplicate') ? 'Ce groupe existe déjà.' : 'Impossible de créer le groupe.'); }
    finally { setBusy(false); }
  };
  const addSub = async (parentId: string) => {
    const v = (subDraft[parentId] || '').trim();
    if (!v || busy) return;
    setBusy(true);
    try { await createGroup(v, parentId); setSubDraft((d) => ({ ...d, [parentId]: '' })); await load(); }
    catch (e: any) { alert(e?.message?.includes('duplicate') ? 'Ce sous-groupe existe déjà.' : 'Impossible de créer le sous-groupe.'); }
    finally { setBusy(false); }
  };
  const saveRename = async () => {
    if (!editing) return;
    setBusy(true);
    try { await renameGroup(editing.id, editVal, editing.parentId, editing.old); setEditing(null); await load(); }
    catch { alert('Impossible de renommer.'); }
    finally { setBusy(false); }
  };
  const remove = async (id: string, label: string, isGroup: boolean) => {
    if (!window.confirm(`Supprimer ${isGroup ? 'le groupe' : 'le sous-groupe'} « ${label} » ?${isGroup ? '\nSes sous-groupes seront aussi supprimés.' : ''}\n\nLes fiches concernées ne seront pas supprimées, mais perdront cette étiquette à la prochaine modification.`)) return;
    setBusy(true);
    try { await deleteGroup(id); await load(); } catch { alert('Suppression impossible.'); } finally { setBusy(false); }
  };

  const startEdit = (id: string, parentId: string | null, name: string) => { setEditing({ id, parentId, old: name }); setEditVal(name); };

  return (
    <div className={embedded ? 'space-y-5' : 'space-y-5 max-w-3xl'}>
      {!embedded && (
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Groupes & sous-groupes</h1>
          <p className="text-sm text-gray-500">Organisez vos pratiquants (familles, cours, équipes…). Ces étiquettes servent à filtrer et, bientôt, à gérer les accès en masse.</p>
        </div>
      )}

      {/* Ajouter un groupe */}
      <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-2">
        <span className="bg-indigo-50 text-indigo-600 p-1.5 rounded-lg"><Layers size={15} /></span>
        <input
          value={newGroup}
          onChange={(e) => setNewGroup(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addGroup()}
          placeholder="Nom d'un nouveau groupe (ex. Famille Martin, Cours du mardi…)"
          className="flex-grow bg-transparent outline-none text-sm font-medium px-1"
        />
        <button onClick={addGroup} disabled={busy || !newGroup.trim()} className="flex items-center gap-1.5 bg-indigo-600 text-white px-3.5 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50">
          <Plus size={15} /> Ajouter
        </button>
      </div>

      {/* Liste */}
      {loading ? (
        <p className="text-sm text-gray-400 py-8 text-center">Chargement…</p>
      ) : tree.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-400 border border-dashed border-gray-200 rounded-2xl">
          Aucun groupe pour l'instant. Créez-en un ci-dessus.
        </div>
      ) : (
        <div className="space-y-3">
          {tree.map((g) => (
            <div key={g.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Groupe */}
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
                <Layers size={15} className="text-indigo-500 shrink-0" />
                {editing?.id === g.id ? (
                  <>
                    <input autoFocus value={editVal} onChange={(e) => setEditVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveRename()} className="flex-grow bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-sm font-semibold outline-none" />
                    <button onClick={saveRename} disabled={busy} className="p-1.5 bg-indigo-600 text-white rounded-lg"><Check size={14} /></button>
                    <button onClick={() => setEditing(null)} className="p-1.5 bg-gray-100 text-gray-500 rounded-lg"><X size={14} /></button>
                  </>
                ) : (
                  <>
                    <span className="flex-grow text-sm font-semibold text-gray-900">{g.name}</span>
                    <span className="text-[11px] text-gray-400">{g.subgroups.length} sous-groupe{g.subgroups.length > 1 ? 's' : ''}</span>
                    <button onClick={() => startEdit(g.id, null, g.name)} className="p-1.5 text-gray-300 hover:text-indigo-600"><Edit2 size={14} /></button>
                    <button onClick={() => remove(g.id, g.name, true)} className="p-1.5 text-gray-300 hover:text-red-600"><Trash2 size={14} /></button>
                  </>
                )}
              </div>

              {/* Sous-groupes */}
              <div className="px-4 py-2 space-y-1.5">
                {g.subgroups.map((s) => (
                  <div key={s.id} className="flex items-center gap-2 pl-1">
                    <CornerDownRight size={13} className="text-gray-300 shrink-0" />
                    {editing?.id === s.id ? (
                      <>
                        <input autoFocus value={editVal} onChange={(e) => setEditVal(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveRename()} className="flex-grow bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-sm font-medium outline-none" />
                        <button onClick={saveRename} disabled={busy} className="p-1.5 bg-indigo-600 text-white rounded-lg"><Check size={14} /></button>
                        <button onClick={() => setEditing(null)} className="p-1.5 bg-gray-100 text-gray-500 rounded-lg"><X size={14} /></button>
                      </>
                    ) : (
                      <>
                        <span className="flex-grow text-sm text-gray-700">{s.name}</span>
                        <button onClick={() => startEdit(s.id, g.id, s.name)} className="p-1.5 text-gray-300 hover:text-indigo-600"><Edit2 size={13} /></button>
                        <button onClick={() => remove(s.id, s.name, false)} className="p-1.5 text-gray-300 hover:text-red-600"><Trash2 size={13} /></button>
                      </>
                    )}
                  </div>
                ))}
                {/* Ajout sous-groupe */}
                <div className="flex items-center gap-2 pl-1 pt-1">
                  <CornerDownRight size={13} className="text-gray-200 shrink-0" />
                  <input
                    value={subDraft[g.id] || ''}
                    onChange={(e) => setSubDraft((d) => ({ ...d, [g.id]: e.target.value }))}
                    onKeyDown={(e) => e.key === 'Enter' && addSub(g.id)}
                    placeholder="Ajouter un sous-groupe…"
                    className="flex-grow bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-1.5 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                  <button onClick={() => addSub(g.id)} disabled={busy || !(subDraft[g.id] || '').trim()} className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-50"><Plus size={15} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GroupsSettingsPage;
