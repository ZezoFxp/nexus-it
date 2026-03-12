import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { supabase } from '../supabase';
import { User as UserIcon, Camera, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const { error } = await supabase.from('users').update({ name, avatar }).eq('id', user.id);
      if (error) throw error;
      updateUser({ ...user, name, avatar });
      setMessage({ type: 'success', text: 'Perfil atualizado com sucesso!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Meu Perfil</h1>
        <p className="text-zinc-500 text-sm">Gerencie suas informações pessoais e segurança</p>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="h-32 bg-zinc-900 relative">
          <div className="absolute -bottom-12 left-8">
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl bg-white border-4 border-white shadow-xl flex items-center justify-center overflow-hidden">
                {avatar ? (
                  <img src={avatar} className="w-full h-full object-cover" />
                ) : (
                  <UserIcon size={40} className="text-zinc-300" />
                )}
              </div>
              <button className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white rounded-2xl">
                <Camera size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="pt-16 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Nome Completo</label>
                <input 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none focus:ring-2 focus:ring-zinc-200"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">Email (Não alterável)</label>
                <input 
                  disabled
                  value={user?.email}
                  className="w-full bg-zinc-100 border border-zinc-200 rounded-lg px-4 py-2.5 text-zinc-500 cursor-not-allowed"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-zinc-500 uppercase mb-1.5">URL do Avatar</label>
                <input 
                  value={avatar}
                  onChange={e => setAvatar(e.target.value)}
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg px-4 py-2.5 outline-none"
                  placeholder="https://exemplo.com/foto.jpg"
                />
              </div>
            </div>

            {message.text && (
              <div className={`p-4 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                {message.text}
              </div>
            )}

            <div className="flex items-center justify-between pt-4">
              <button 
                type="button"
                onClick={async () => {
                  await logout();
                  navigate('/login');
                }}
                className="flex items-center gap-2 text-red-500 font-bold text-sm hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"
              >
                <LogOut size={18} />
                Sair da Conta
              </button>
              
              <button 
                type="submit"
                disabled={loading}
                className="bg-zinc-900 text-white px-8 py-2.5 rounded-lg font-bold hover:bg-zinc-800 transition-all disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
