import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Task, User } from '../types';
import { Plus, MoreVertical, Clock, CheckCircle2, AlertCircle, Trash2, Edit2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../AuthContext';
import { useSearchParams } from 'react-router-dom';
import { useUndo } from '../UndoContext';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';

interface SortableTaskCardProps {
  task: Task;
  onDelete: (id: string) => void;
  onEdit: (task: Task) => void;
  key?: any;
}

function SortableTaskCard({ task, onDelete, onEdit }: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: task.id as string,
    data: {
      status: task.status
    }
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm hover:shadow-md transition-all group cursor-grab active:cursor-grabbing"
      onClick={(e) => {
        // Prevent edit trigger when clicking delete
        if ((e.target as HTMLElement).closest('.delete-btn')) return;
        onEdit(task);
      }}
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
          task.priority === 'high' ? 'text-red-600 border-red-100 bg-red-50' :
          task.priority === 'medium' ? 'text-amber-600 border-amber-100 bg-amber-50' :
          'text-emerald-600 border-emerald-100 bg-emerald-50'
        }`}>
          {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
        </span>
        <div className="flex gap-1">
          <button 
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            className="text-zinc-300 hover:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity p-1"
          >
            <Edit2 size={14} />
          </button>
          <button 
            onClick={(e) => { e.stopPropagation(); onDelete(task.id as string); }}
            className="delete-btn text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
      <h3 className="text-sm font-bold text-zinc-900 mb-1">{task.title}</h3>
      <p className="text-xs text-zinc-500 line-clamp-2 mb-4">{task.description}</p>
      
      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center text-[10px] font-bold text-zinc-500">
            {task.assignedToName?.charAt(0) || '?'}
          </div>
          <span className="text-[10px] text-zinc-400 font-medium">{task.assignedToName || 'Sem dono'}</span>
        </div>
        
        {task.dueDate && (
          <div className="flex items-center gap-1 text-[10px] text-zinc-400 font-medium">
            <Clock size={10} />
            {new Date(task.dueDate).toLocaleDateString('pt-BR')}
          </div>
        )}
      </div>
    </div>
  );
}

function DroppableColumn({ id, title, icon: Icon, color, tasks, onDelete, onEdit }: any) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div ref={setNodeRef} className="flex flex-col bg-zinc-100/50 rounded-2xl border border-zinc-200/60 p-4 min-h-[500px]">
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <Icon className={color} size={18} />
          <h2 className="font-bold text-zinc-700 text-sm uppercase tracking-wider">{title}</h2>
          <span className="bg-zinc-200 text-zinc-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </div>
        <button className="text-zinc-400 hover:text-zinc-600"><MoreVertical size={16} /></button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
        <SortableContext
          id={id}
          items={tasks.map((t: any) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          <AnimatePresence mode="popLayout">
            {tasks.map((task: any) => (
              <SortableTaskCard 
                key={task.id} 
                task={task} 
                onDelete={onDelete}
                onEdit={onEdit}
              />
            ))}
          </AnimatePresence>
        </SortableContext>
      </div>
    </div>
  );
}

export default function Tasks() {
  const { user } = useAuth();
  const { requestDelete, isPending } = useUndo();
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get('search') || '';
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const initialStatusRef = React.useRef<string | null>(null);
  const [searchTerm, setSearchTerm] = useState(urlSearch);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    setSearchTerm(urlSearch);
  }, [urlSearch]);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    status: 'a fazer' as const,
    priority: 'medium' as const,
    assignedTo: '',
    assignedToName: '',
    dueDate: ''
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const fetchTasks = async () => {
      const { data } = await supabase.from('tasks').select('*');
      if (data) setTasks(data);
    };

    const fetchUsers = async () => {
      const { data } = await supabase.from('users').select('*');
      if (data) setUsers(data);
    };

    fetchTasks();
    fetchUsers();

    const tasksSubscription = supabase
      .channel('tasks_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setTasks(prev => [...prev, payload.new as Task]);
        } else if (payload.eventType === 'UPDATE') {
          setTasks(prev => prev.map(t => t.id === payload.new.id ? payload.new as Task : t));
        } else if (payload.eventType === 'DELETE') {
          setTasks(prev => prev.filter(t => t.id === payload.old.id));
        }
      })
      .subscribe();

    const usersSubscription = supabase
      .channel('users_channel')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setUsers(prev => [...prev, payload.new as User]);
        } else if (payload.eventType === 'UPDATE') {
          setUsers(prev => prev.map(u => u.id === payload.new.id ? payload.new as User : u));
        } else if (payload.eventType === 'DELETE') {
          setUsers(prev => prev.filter(u => u.id === payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tasksSubscription);
      supabase.removeChannel(usersSubscription);
    };
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const assignedUser = users.find(u => u.id === newTask.assignedTo);
    const { error } = await supabase.from('tasks').insert([{
      ...newTask,
      assignedToName: assignedUser?.name || '',
      createdBy: user?.id,
      createdByName: user?.name
    }]);
    
    if (error) {
      handleSupabaseError(error, 'create', 'tasks');
    } else {
      setIsModalOpen(false);
      setNewTask({ title: '', description: '', status: 'a fazer', priority: 'medium', assignedTo: '', assignedToName: '', dueDate: '' });
    }
  };

  const handleUpdateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    const assignedUser = users.find(u => u.id === editingTask.assignedTo);
    const { id, ...data } = editingTask;
    const { error } = await supabase
      .from('tasks')
      .update({
        ...data,
        assignedToName: assignedUser?.name || ''
      })
      .eq('id', id);

    if (error) {
      handleSupabaseError(error, 'update', `tasks/${id}`);
    } else {
      setEditingTask(null);
    }
  };

  const deleteTask = async (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    
    requestDelete(id, 'tasks', task.title, async () => {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) {
        handleSupabaseError(error, 'delete', `tasks/${id}`);
      }
    });
  };

  const columns = [
    { id: 'a fazer', title: 'A Fazer', icon: AlertCircle, color: 'text-zinc-400' },
    { id: 'em andamento', title: 'Em Andamento', icon: Clock, color: 'text-amber-500' },
    { id: 'concluido', title: 'Concluído', icon: CheckCircle2, color: 'text-emerald-500' },
  ];

  const priorityOrder = { high: 0, medium: 1, low: 2 };

  const handleSupabaseError = (error: any, operationType: string, path: string | null) => {
    const errInfo = {
      error: error.message || String(error),
      operationType,
      path
    };
    console.error('Supabase Error: ', JSON.stringify(errInfo));
    throw new Error(JSON.stringify(errInfo));
  };

  const getSortedTasksByStatus = (status: string) => {
    return tasks
      .filter(t => t.status === status)
      .filter(t => !isPending(t.id))
      .filter(t => 
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    initialStatusRef.current = active.data.current?.status || null;
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeTask = tasks.find(t => t.id === active.id);
    const overId = over.id as string;

    // If hovering over a column
    const isOverColumn = columns.some(c => c.id === overId);
    
    if (isOverColumn) {
      if (activeTask && activeTask.status !== overId) {
        setTasks(prev => prev.map(t => t.id === active.id ? { ...t, status: overId } : t));
      }
      return;
    }

    // If hovering over another task
    const overTask = tasks.find(t => t.id === overId);
    if (activeTask && overTask && activeTask.status !== overTask.status) {
      setTasks(prev => prev.map(t => t.id === active.id ? { ...t, status: overTask.status } : t));
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) {
      initialStatusRef.current = null;
      return;
    }

    const activeTask = tasks.find(t => t.id === active.id);
    const overId = over.id as string;
    const originalStatus = initialStatusRef.current;

    // Determine target status
    let targetStatus = activeTask?.status;
    const isOverColumn = columns.some(c => c.id === overId);
    
    if (isOverColumn) {
      targetStatus = overId;
    } else {
      const overTask = tasks.find(t => t.id === overId);
      if (overTask) targetStatus = overTask.status;
    }

    if (activeTask && targetStatus && originalStatus !== targetStatus) {
      const { error } = await supabase
        .from('tasks')
        .update({ status: targetStatus })
        .eq('id', activeTask.id);
      
      if (error) {
        handleSupabaseError(error, 'update', `tasks/${activeTask.id}`);
      }
    }
    
    initialStatusRef.current = null;
  };

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  return (
    <div className="h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Tasks</h1>
          <p className="text-zinc-500 text-sm">Gerencie suas demandas no quadro Kanban</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-zinc-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200"
        >
          <Plus size={18} />
          Nova Tarefa
        </button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-hidden">
          {columns.map(column => (
            <DroppableColumn
              key={column.id}
              {...column}
              tasks={getSortedTasksByStatus(column.id)}
              onDelete={setDeleteConfirmId}
              onEdit={setEditingTask}
            />
          ))}
        </div>

        <DragOverlay>
          {activeTask ? (
            <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-xl opacity-90 scale-105">
              <div className="flex justify-between items-start mb-2">
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded border ${
                  activeTask.priority === 'high' ? 'text-red-600 border-red-100 bg-red-50' :
                  activeTask.priority === 'medium' ? 'text-amber-600 border-amber-100 bg-amber-50' :
                  'text-emerald-600 border-emerald-100 bg-emerald-50'
                }`}>
                  {activeTask.priority}
                </span>
              </div>
              <h3 className="text-sm font-bold text-zinc-900 mb-1">{activeTask.title}</h3>
              <p className="text-xs text-zinc-500 line-clamp-2">{activeTask.description}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <DeleteConfirmationModal 
        isOpen={!!deleteConfirmId}
        onClose={() => setDeleteConfirmId(null)}
        onConfirm={() => deleteConfirmId && deleteTask(deleteConfirmId)}
        title="Excluir Tarefa"
        message="Tem certeza que deseja excluir esta tarefa? Esta ação não pode ser desfeita."
      />

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-zinc-900">Nova Tarefa</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-zinc-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Título</label>
                <input 
                  required
                  value={newTask.title}
                  onChange={e => setNewTask({...newTask, title: e.target.value})}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-zinc-200"
                  placeholder="Ex: Formatar PC do RH"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Descrição</label>
                <textarea 
                  value={newTask.description}
                  onChange={e => setNewTask({...newTask, description: e.target.value})}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-zinc-200 h-24 resize-none"
                  placeholder="Detalhes da demanda..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Prioridade</label>
                  <select 
                    value={newTask.priority}
                    onChange={e => setNewTask({...newTask, priority: e.target.value as any})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Atribuir a</label>
                  <select 
                    value={newTask.assignedTo}
                    onChange={e => setNewTask({...newTask, assignedTo: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none"
                  >
                    <option value="">Selecione...</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Prazo</label>
                <input 
                  type="date"
                  value={newTask.dueDate}
                  onChange={e => setNewTask({...newTask, dueDate: e.target.value})}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-zinc-200 rounded-lg font-bold text-zinc-600 hover:bg-zinc-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-zinc-900 text-white rounded-lg font-bold hover:bg-zinc-800 transition-colors"
                >
                  Criar Tarefa
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Modal */}
      {editingTask && (
        <div className="fixed inset-0 bg-zinc-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-zinc-100 flex justify-between items-center">
              <h2 className="text-xl font-bold text-zinc-900">Editar Tarefa</h2>
              <button onClick={() => setEditingTask(null)} className="text-zinc-400 hover:text-zinc-600 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleUpdateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Título</label>
                <input 
                  required
                  value={editingTask.title}
                  onChange={e => setEditingTask({...editingTask, title: e.target.value})}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-zinc-200"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Descrição</label>
                <textarea 
                  value={editingTask.description}
                  onChange={e => setEditingTask({...editingTask, description: e.target.value})}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-zinc-200 h-24 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Prioridade</label>
                  <select 
                    value={editingTask.priority}
                    onChange={e => setEditingTask({...editingTask, priority: e.target.value as any})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none"
                  >
                    <option value="low">Baixa</option>
                    <option value="medium">Média</option>
                    <option value="high">Alta</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Atribuir a</label>
                  <select 
                    value={editingTask.assignedTo}
                    onChange={e => setEditingTask({...editingTask, assignedTo: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none"
                  >
                    <option value="">Selecione...</option>
                    {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Status</label>
                  <select 
                    value={editingTask.status}
                    onChange={e => setEditingTask({...editingTask, status: e.target.value as any})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none"
                  >
                    <option value="a fazer">A Fazer</option>
                    <option value="em andamento">Em Andamento</option>
                    <option value="concluido">Concluído</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Prazo</label>
                  <input 
                    type="date"
                    value={editingTask.dueDate}
                    onChange={e => setEditingTask({...editingTask, dueDate: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none"
                  />
                </div>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="flex-1 px-4 py-2.5 border border-zinc-200 rounded-lg font-bold text-zinc-600 hover:bg-zinc-50 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-zinc-900 text-white rounded-lg font-bold hover:bg-zinc-800 transition-colors"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
