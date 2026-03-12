import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { AcervoEntry } from '../types';
import { Plus, Search, Tag, ExternalLink, Code, FileText, Trash2, Filter, Edit2, X } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../AuthContext';
import { motion } from 'motion/react';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { useUndo } from '../UndoContext';

export default function Acervo() {
  const { user } = useAuth();
  const { requestDelete, isPending } = useUndo();

  const handleSupabaseError = (error: any, operationType: string, path: string | null) => {
    const errInfo = {
      error: error.message || String(error),
      operationType,
      path
    };
    console.error('Supabase Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  };

  const [entries, setEntries] = useState<AcervoEntry[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<AcervoEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  const [newEntry, setNewEntry] = useState({
    title: '',
    content: '',
    type: 'tool',
    tags: [] as string[]
  });

  useEffect(() => {
    const fetchEntries = async () => {
      const { data } = await supabase.from('acervo').select('*');
      if (data) setEntries(data);
    };

    fetchEntries();

    const subscription = supabase
      .channel('acervo_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'acervo' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setEntries(prev => [...prev, payload.new as AcervoEntry]);
        } else if (payload.eventType === 'UPDATE') {
          setEntries(prev => prev.map(e => e.id === payload.new.id ? payload.new as AcervoEntry : e));
        } else if (payload.eventType === 'DELETE') {
          setEntries(prev => prev.filter(e => e.id === payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('acervo').insert([{
      ...newEntry,
      tags: newEntry.tags.join(','),
      createdBy: user?.id,
      createdByName: user?.name,
      createdAt: new Date().toISOString()
    }]);
    
    if (error) {
      handleSupabaseError(error, 'create', 'acervo');
    } else {
      setIsModalOpen(false);
      setNewEntry({ title: '', content: '', type: 'tool', tags: [] });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEntry) return;
    const { id, ...data } = editingEntry;
    const { error } = await supabase.from('acervo').update(data).eq('id', id);
    
    if (error) {
      handleSupabaseError(error, 'update', `acervo/${id}`);
    } else {
      setEditingEntry(null);
    }
  };

  const handleDelete = async (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (!entry) return;

    requestDelete(id, 'acervo', entry.title, async () => {
      const { error } = await supabase.from('acervo').delete().eq('id', id);
      if (error) {
        handleSupabaseError(error, 'delete', `acervo/${id}`);
      }
    });
  };

  const filteredEntries = entries.filter(entry => {
    if (isPending(entry.id)) return false;
    const matchesSearch = entry.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         entry.tags.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType ? entry.type === selectedType : true;
    return matchesSearch && matchesType;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'code': return <Code size={20} />;
      case 'link': return <ExternalLink size={20} />;
      case 'tool': return <FileText size={20} />;
      default: return <FileText size={20} />;
    }
  };

  const addTag = (tag: string, isEditing: boolean) => {
    const cleanTag = tag.trim().toLowerCase();
    if (!cleanTag) return;
    
    if (isEditing && editingEntry) {
      const currentTags = editingEntry.tags ? editingEntry.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      if (!currentTags.includes(cleanTag)) {
        setEditingEntry({ ...editingEntry, tags: [...currentTags, cleanTag].join(',') });
      }
    } else {
      if (!newEntry.tags.includes(cleanTag)) {
        setNewEntry({ ...newEntry, tags: [...newEntry.tags, cleanTag] });
      }
    }
    setTagInput('');
  };

  const removeTag = (tagToRemove: string, isEditing: boolean) => {
    if (isEditing && editingEntry) {
      const currentTags = editingEntry.tags.split(',').map(t => t.trim()).filter(Boolean);
      setEditingEntry({ ...editingEntry, tags: currentTags.filter(t => t !== tagToRemove).join(',') });
    } else {
      setNewEntry({ ...newEntry, tags: newEntry.tags.filter(t => t !== tagToRemove) });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Acervo</h1>
          <p className="text-zinc-500 text-sm">Base de conhecimento, ferramentas e documentações</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-zinc-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-zinc-800 transition-all shadow-lg"
        >
          <Plus size={18} />
          Novo Registro
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por título ou tags..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-200"
          />
        </div>
        <div className="flex items-center gap-2 bg-white px-3 py-1 border border-zinc-200 rounded-lg">
          <Filter size={16} className="text-zinc-400" />
          <select 
            value={selectedType}
            onChange={e => setSelectedType(e.target.value)}
            className="bg-transparent text-sm font-medium outline-none text-zinc-600"
          >
            <option value="">Todos os Tipos</option>
            <option value="tool">Ferramentas</option>
            <option value="code">Snippets / Código</option>
            <option value="link">Links Úteis</option>
            <option value="note">Anotações</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredEntries.map((entry) => (
          <div key={entry.id} className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm hover:shadow-md transition-all flex flex-col group">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center text-zinc-600">
                {getIcon(entry.type)}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setEditingEntry(entry)}
                  className="text-zinc-300 hover:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => setDeleteConfirmId(entry.id as string)}
                  className="text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            
            <h3 className="text-lg font-bold text-zinc-900 mb-2">{entry.title}</h3>
            <p className="text-sm text-zinc-500 line-clamp-3 mb-4 flex-1">{entry.content}</p>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {entry.tags.split(',').filter(Boolean).map((tag, i) => (
                <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded text-[10px] font-bold uppercase">
                  <Tag size={10} />
                  {tag.trim()}
                </span>
              ))}
            </div>

            <div className="pt-4 border-t border-zinc-100 flex items-center justify-between text-[10px] text-zinc-400 font-medium">
              <span>Por {entry.createdByName}</span>
              <span>{entry.createdAt ? format(new Date(entry.createdAt), 'dd/MM/yyyy') : '-'}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-zinc-900">Novo Registro</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Título</label>
                <input 
                  required
                  value={newEntry.title}
                  onChange={e => setNewEntry({...newEntry, title: e.target.value})}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none"
                  placeholder="Ex: Guia de Configuração VPN"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Tipo</label>
                <select 
                  value={newEntry.type}
                  onChange={e => setNewEntry({...newEntry, type: e.target.value as any})}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none"
                >
                  <option value="tool">Ferramenta</option>
                  <option value="code">Código / Snippet</option>
                  <option value="link">Link Útil</option>
                  <option value="note">Anotação</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Conteúdo / Link / Código</label>
                <textarea 
                  required
                  value={newEntry.content}
                  onChange={e => setNewEntry({...newEntry, content: e.target.value})}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none h-32 resize-none font-mono text-sm"
                  placeholder="Insira o conteúdo aqui..."
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {newEntry.tags.map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-zinc-100 text-zinc-600 rounded-lg text-xs font-bold uppercase">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag, false)} className="text-zinc-400 hover:text-red-500">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(tagInput, false);
                      }
                    }}
                    className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 outline-none"
                    placeholder="Adicionar tag..."
                  />
                  <button 
                    type="button"
                    onClick={() => addTag(tagInput, false)}
                    className="px-4 py-2 bg-zinc-100 text-zinc-600 rounded-lg font-bold hover:bg-zinc-200"
                  >
                    Add
                  </button>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 border border-zinc-200 rounded-lg font-bold text-zinc-600">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-zinc-900 text-white rounded-lg font-bold">Salvar no Acervo</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Modal */}
      {editingEntry && (
        <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-zinc-900">Editar Registro</h2>
              <button onClick={() => setEditingEntry(null)} className="text-zinc-400 hover:text-zinc-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Título</label>
                <input 
                  required
                  value={editingEntry.title}
                  onChange={e => setEditingEntry({...editingEntry, title: e.target.value})}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Tipo</label>
                <select 
                  value={editingEntry.type}
                  onChange={e => setEditingEntry({...editingEntry, type: e.target.value as any})}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none"
                >
                  <option value="tool">Ferramenta</option>
                  <option value="code">Código / Snippet</option>
                  <option value="link">Link Útil</option>
                  <option value="note">Anotação</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Conteúdo / Link / Código</label>
                <textarea 
                  required
                  value={editingEntry.content}
                  onChange={e => setEditingEntry({...editingEntry, content: e.target.value})}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none h-32 resize-none font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Tags</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {editingEntry.tags.split(',').filter(Boolean).map(tag => (
                    <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-zinc-100 text-zinc-600 rounded-lg text-xs font-bold uppercase">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag, true)} className="text-zinc-400 hover:text-red-500">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    value={tagInput}
                    onChange={e => setTagInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(tagInput, true);
                      }
                    }}
                    className="flex-1 bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2 outline-none"
                    placeholder="Adicionar tag..."
                  />
                  <button 
                    type="button"
                    onClick={() => addTag(tagInput, true)}
                    className="px-4 py-2 bg-zinc-100 text-zinc-600 rounded-lg font-bold hover:bg-zinc-200"
                  >
                    Add
                  </button>
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setEditingEntry(null)} className="flex-1 px-4 py-2.5 border border-zinc-200 rounded-lg font-bold text-zinc-600">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-zinc-900 text-white rounded-lg font-bold">Salvar Alterações</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <DeleteConfirmationModal 
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => deleteConfirmId && handleDelete(deleteConfirmId)}
        title="Excluir Registro"
        message="Tem certeza que deseja excluir esta entrada do acervo? Esta ação não pode ser desfeita."
      />
    </div>
  );
}
