import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Task, User } from '../types';
import { 
  Calendar as CalendarIcon, 
  List as ListIcon, 
  Filter, 
  Clock, 
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CalendarDays
} from 'lucide-react';
import { 
  format, 
  isSameDay, 
  parseISO, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth,
  addMonths,
  subMonths,
  isBefore,
  startOfDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion } from 'motion/react';

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [view, setView] = useState<'list' | 'calendar'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filter, setFilter] = useState({
    priority: '',
    assignedTo: '',
    startDate: '',
    endDate: ''
  });

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
      .channel('tasks_dashboard')
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
      .channel('users_dashboard')
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

  const filteredTasks = tasks.filter(task => {
    if (filter.priority && task.priority !== filter.priority) return false;
    if (filter.assignedTo && task.assignedTo !== filter.assignedTo) return false;
    
    if (task.dueDate) {
      const taskDate = parseISO(task.dueDate);
      if (filter.startDate && isBefore(taskDate, parseISO(filter.startDate))) return false;
      if (filter.endDate && isBefore(parseISO(filter.endDate), taskDate)) return false;
    } else if (filter.startDate || filter.endDate) {
      return false;
    }

    return true;
  });

  const stats = {
    pending: filteredTasks.filter(t => t.status !== 'concluido').length,
    overdue: filteredTasks.filter(t => t.status !== 'concluido' && t.dueDate && isBefore(parseISO(t.dueDate), startOfDay(new Date()))).length,
    completed: filteredTasks.filter(t => t.status === 'concluido').length
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-100';
      case 'medium': return 'text-amber-600 bg-amber-50 border-amber-100';
      case 'low': return 'text-emerald-600 bg-emerald-50 border-emerald-100';
      default: return 'text-zinc-600 bg-zinc-50 border-zinc-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'concluido': return <CheckCircle2 className="text-emerald-500" size={18} />;
      case 'em andamento': return <Clock className="text-amber-500" size={18} />;
      default: return <AlertCircle className="text-zinc-400" size={18} />;
    }
  };

  // Calendar Logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Dashboard</h1>
          <p className="text-zinc-500 text-sm">Visão geral das demandas do departamento</p>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-zinc-200 shadow-sm">
          <button 
            onClick={() => setView('list')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'list' ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-500 hover:bg-zinc-50'}`}
          >
            <ListIcon size={16} />
            Lista
          </button>
          <button 
            onClick={() => setView('calendar')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${view === 'calendar' ? 'bg-zinc-900 text-white shadow-md' : 'text-zinc-500 hover:bg-zinc-50'}`}
          >
            <CalendarIcon size={16} />
            Calendário
          </button>
        </div>
      </div>

      {/* Stats Blocks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500">Casos Pendentes</p>
            <p className="text-2xl font-bold text-zinc-900">{stats.pending}</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500">Casos Atrasados</p>
            <p className="text-2xl font-bold text-zinc-900">{stats.overdue}</p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-2xl border border-zinc-200 shadow-sm flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-500">Casos Concluídos</p>
            <p className="text-2xl font-bold text-zinc-900">{stats.completed}</p>
          </div>
        </motion.div>
      </div>

      <div className="bg-white p-4 rounded-xl border border-zinc-200 shadow-sm flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2 text-zinc-500 mr-2">
          <Filter size={18} />
          <span className="text-sm font-medium">Filtros:</span>
        </div>
        
        <select 
          value={filter.priority}
          onChange={(e) => setFilter({...filter, priority: e.target.value})}
          className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
        >
          <option value="">Todas Prioridades</option>
          <option value="high">Alta</option>
          <option value="medium">Média</option>
          <option value="low">Baixa</option>
        </select>

        <select 
          value={filter.assignedTo}
          onChange={(e) => setFilter({...filter, assignedTo: e.target.value})}
          className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
        >
          <option value="">Todos Operadores</option>
          {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>

        <div className="flex items-center gap-2">
          <input 
            type="date"
            value={filter.startDate}
            onChange={(e) => setFilter({...filter, startDate: e.target.value})}
            className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
          />
          <span className="text-zinc-400">até</span>
          <input 
            type="date"
            value={filter.endDate}
            onChange={(e) => setFilter({...filter, endDate: e.target.value})}
            className="bg-zinc-50 border border-zinc-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
          />
        </div>
      </div>

      {view === 'list' ? (
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 border-b border-zinc-200">
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Tarefa</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Atribuído a</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Prioridade</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Prazo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-zinc-400 italic">Nenhuma tarefa encontrada</td>
                </tr>
              ) : (
                filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-zinc-50 transition-colors group">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-zinc-900">{task.title}</p>
                      <p className="text-xs text-zinc-500 truncate max-w-xs">{task.description}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-zinc-200 flex items-center justify-center text-[10px] font-bold text-zinc-600">
                          {task.assignedToName?.charAt(0)}
                        </div>
                        <span className="text-sm text-zinc-600">{task.assignedToName || 'Não atribuído'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase border ${getPriorityColor(task.priority)}`}>
                        {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-zinc-600">
                        {getStatusIcon(task.status)}
                        <span className="capitalize">{task.status.replace('_', ' ')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-zinc-500">
                      {task.dueDate ? format(parseISO(task.dueDate), 'dd/MM/yyyy') : '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-zinc-100 flex items-center justify-between bg-zinc-50/50">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-bold text-zinc-900 capitalize">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </h2>
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                  className="p-1.5 hover:bg-zinc-200 rounded-md text-zinc-600 transition-colors"
                >
                  <ChevronLeft size={18} />
                </button>
                <button 
                  onClick={() => setCurrentMonth(new Date())}
                  className="px-2 py-1 text-xs font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
                >
                  Hoje
                </button>
                <button 
                  onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                  className="p-1.5 hover:bg-zinc-200 rounded-md text-zinc-600 transition-colors"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-400 font-medium">
              <CalendarDays size={14} />
              Visualização Mensal
            </div>
          </div>

          <div className="grid grid-cols-7 border-b border-zinc-100">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="py-2 text-center text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {calendarDays.map((day, i) => {
              const dayTasks = tasks.filter(t => t.dueDate && isSameDay(parseISO(t.dueDate), day));
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isToday = isSameDay(day, new Date());

              return (
                <div 
                  key={i} 
                  className={`min-h-[120px] border-r border-b border-zinc-100 p-2 transition-colors ${!isCurrentMonth ? 'bg-zinc-50/50' : 'bg-white'}`}
                >
                  <div className="flex justify-end mb-1">
                    <span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                      isToday ? 'bg-zinc-900 text-white' : 
                      isCurrentMonth ? 'text-zinc-900' : 'text-zinc-300'
                    }`}>
                      {format(day, 'd')}
                    </span>
                  </div>
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map(task => (
                      <div 
                        key={task.id} 
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold truncate border ${getPriorityColor(task.priority)}`}
                        title={task.title}
                      >
                        {task.title}
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <p className="text-[9px] text-zinc-400 font-bold pl-1">
                        + {dayTasks.length - 3} mais
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
