import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { User, Bell, Search } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function Header() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/tasks?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <header className="h-16 border-b border-zinc-200 bg-white flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1">
        <form onSubmit={handleSearch} className="relative w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar tarefas..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-zinc-100 border-transparent focus:bg-white focus:border-zinc-300 rounded-lg text-sm transition-all outline-none"
          />
        </form>
      </div>

      <div className="flex items-center gap-4">
        <button className="p-2 text-zinc-500 hover:bg-zinc-100 rounded-full relative">
          <Bell size={20} />
          <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        
        <div className="h-8 w-px bg-zinc-200 mx-2"></div>

        <Link to="/profile" className="flex items-center gap-3 hover:bg-zinc-50 p-1 pr-3 rounded-lg transition-colors">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-zinc-900 leading-none">{user?.name}</p>
            <p className="text-xs text-zinc-500 mt-1 capitalize">{user?.role === 'admin' ? 'Administrador' : 'Operador'}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center overflow-hidden">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <User size={20} className="text-zinc-400" />
            )}
          </div>
        </Link>
      </div>
    </header>
  );
}
