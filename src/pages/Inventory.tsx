import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { InventoryItem, User } from '../types';
import { Plus, Search, Monitor, MousePointer2, Cpu, HardDrive, Trash2, Edit2, Filter } from 'lucide-react';
import { motion } from 'motion/react';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import { useUndo } from '../UndoContext';

export default function Inventory() {
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

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    type: '',
    status: '',
    responsible: ''
  });

  const [newItem, setNewItem] = useState({
    name: '',
    type: 'Computador',
    serialNumber: '',
    status: 'available',
    responsible: '',
    notes: ''
  });

  useEffect(() => {
    const fetchItems = async () => {
      const { data } = await supabase.from('inventory').select('*');
      if (data) setItems(data);
    };

    fetchItems();

    const subscription = supabase
      .channel('inventory_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inventory' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setItems(prev => [...prev, payload.new as InventoryItem]);
        } else if (payload.eventType === 'UPDATE') {
          setItems(prev => prev.map(i => i.id === payload.new.id ? payload.new as InventoryItem : i));
        } else if (payload.eventType === 'DELETE') {
          setItems(prev => prev.filter(i => i.id === payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('inventory').insert([{
      ...newItem,
      createdAt: new Date().toISOString()
    }]);
    
    if (error) {
      handleSupabaseError(error, 'create', 'inventory');
    } else {
      setIsModalOpen(false);
      setNewItem({ name: '', type: 'Computador', serialNumber: '', status: 'available', responsible: '', notes: '' });
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;
    const { id, ...data } = editingItem;
    const { error } = await supabase.from('inventory').update(data).eq('id', id);
    
    if (error) {
      handleSupabaseError(error, 'update', `inventory/${id}`);
    } else {
      setEditingItem(null);
    }
  };

  const handleDelete = async (id: string) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    requestDelete(id, 'inventory', item.name, async () => {
      const { error } = await supabase.from('inventory').delete().eq('id', id);
      if (error) {
        handleSupabaseError(error, 'delete', `inventory/${id}`);
      }
    });
  };

  const filteredItems = items.filter(item => {
    if (isPending(item.id)) return false;
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.serialNumber && item.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = !filter.type || item.type === filter.type;
    const matchesStatus = !filter.status || item.status === filter.status;
    const matchesResponsible = !filter.responsible || item.responsible?.toLowerCase().includes(filter.responsible.toLowerCase());
    
    return matchesSearch && matchesType && matchesStatus && matchesResponsible;
  });

  const getTypeIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'computador': case 'notebook': return <Monitor size={18} />;
      case 'periférico': case 'mouse': case 'teclado': return <MousePointer2 size={18} />;
      case 'servidor': return <HardDrive size={18} />;
      default: return <Cpu size={18} />;
    }
  };

  const types = Array.from(new Set(items.map(i => i.type)));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Inventário</h1>
          <p className="text-zinc-500 text-sm">Controle de máquinas, periféricos e ativos de TI</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-zinc-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-zinc-800 transition-all shadow-lg"
        >
          <Plus size={18} />
          Adicionar Ativo
        </button>
      </div>

      <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex flex-col md:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou serial..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-50 border border-zinc-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-zinc-200"
          />
        </div>
        
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter size={18} className="text-zinc-400" />
          <select 
            value={filter.type}
            onChange={e => setFilter({...filter, type: e.target.value})}
            className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
          >
            <option value="">Todos Tipos</option>
            {types.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select 
            value={filter.status}
            onChange={e => setFilter({...filter, status: e.target.value})}
            className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
          >
            <option value="">Todos Status</option>
            <option value="available">Disponível</option>
            <option value="in_use">Em Uso</option>
            <option value="maintenance">Manutenção</option>
            <option value="broken">Defeito</option>
          </select>

          <input 
            type="text"
            placeholder="Responsável..."
            value={filter.responsible}
            onChange={e => setFilter({...filter, responsible: e.target.value})}
            className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-zinc-50 border-b border-zinc-200">
              <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Item</th>
              <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tipo</th>
              <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Serial</th>
              <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Responsável</th>
              <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {filteredItems.map((item) => (
              <tr key={item.id} className="hover:bg-zinc-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500">
                      {getTypeIcon(item.type)}
                    </div>
                    <span className="text-sm font-medium text-zinc-900">{item.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-600">{item.type}</td>
                <td className="px-6 py-4 text-sm font-mono text-zinc-500">{item.serialNumber || '-'}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                    item.status === 'available' ? 'text-emerald-600 bg-emerald-50 border-emerald-100' :
                    item.status === 'in_use' ? 'text-blue-600 bg-blue-50 border-blue-100' :
                    item.status === 'maintenance' ? 'text-amber-600 bg-amber-50 border-amber-100' :
                    'text-red-600 bg-red-50 border-red-100'
                  }`}>
                    {item.status === 'available' ? 'Disponível' : 
                     item.status === 'in_use' ? 'Em Uso' : 
                     item.status === 'maintenance' ? 'Manutenção' : 'Defeito'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-600">{item.responsible || '-'}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button 
                      onClick={() => setEditingItem(item)}
                      className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-md transition-colors"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => setDeleteConfirmId(item.id as string)}
                      className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
              <h2 className="text-xl font-bold text-zinc-900">Novo Ativo</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Nome do Item</label>
                  <input 
                    required
                    value={newItem.name}
                    onChange={e => setNewItem({...newItem, name: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none"
                    placeholder="Ex: Dell Latitude 5420"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Tipo</label>
                  <select 
                    value={newItem.type}
                    onChange={e => setNewItem({...newItem, type: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none"
                  >
                    <option>Computador</option>
                    <option>Notebook</option>
                    <option>Monitor</option>
                    <option>Periférico</option>
                    <option>Servidor</option>
                    <option>Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Serial / Service Tag</label>
                  <input 
                    value={newItem.serialNumber}
                    onChange={e => setNewItem({...newItem, serialNumber: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Status</label>
                  <select 
                    value={newItem.status}
                    onChange={e => setNewItem({...newItem, status: e.target.value as any})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none"
                  >
                    <option value="available">Disponível</option>
                    <option value="in_use">Em Uso</option>
                    <option value="maintenance">Manutenção</option>
                    <option value="broken">Defeito</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Responsável</label>
                  <input 
                    value={newItem.responsible}
                    onChange={e => setNewItem({...newItem, responsible: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none"
                    placeholder="Nome do responsável"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Notas</label>
                <textarea 
                  value={newItem.notes}
                  onChange={e => setNewItem({...newItem, notes: e.target.value})}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none h-20 resize-none"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2.5 border border-zinc-200 rounded-lg font-bold text-zinc-600">Cancelar</button>
                <button type="submit" className="flex-1 px-4 py-2.5 bg-zinc-900 text-white rounded-lg font-bold">Salvar Ativo</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-zinc-900">Editar Ativo</h2>
              <button onClick={() => setEditingItem(null)} className="text-zinc-400 hover:text-zinc-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleUpdate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Nome do Item</label>
                  <input 
                    required
                    value={editingItem.name}
                    onChange={e => setEditingItem({...editingItem, name: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Tipo</label>
                  <select 
                    value={editingItem.type}
                    onChange={e => setEditingItem({...editingItem, type: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none"
                  >
                    <option>Computador</option>
                    <option>Notebook</option>
                    <option>Monitor</option>
                    <option>Periférico</option>
                    <option>Servidor</option>
                    <option>Outros</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Serial / Service Tag</label>
                  <input 
                    value={editingItem.serialNumber}
                    onChange={e => setEditingItem({...editingItem, serialNumber: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Status</label>
                  <select 
                    value={editingItem.status}
                    onChange={e => setEditingItem({...editingItem, status: e.target.value as any})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none"
                  >
                    <option value="available">Disponível</option>
                    <option value="in_use">Em Uso</option>
                    <option value="maintenance">Manutenção</option>
                    <option value="broken">Defeito</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Responsável</label>
                  <input 
                    value={editingItem.responsible}
                    onChange={e => setEditingItem({...editingItem, responsible: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Notas</label>
                <textarea 
                  value={editingItem.notes}
                  onChange={e => setEditingItem({...editingItem, notes: e.target.value})}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none h-20 resize-none"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setEditingItem(null)} className="flex-1 px-4 py-2.5 border border-zinc-200 rounded-lg font-bold text-zinc-600">Cancelar</button>
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
        title="Excluir Ativo"
        message="Tem certeza que deseja excluir este item do inventário? Esta ação não pode ser desfeita."
      />
    </div>
  );
}
