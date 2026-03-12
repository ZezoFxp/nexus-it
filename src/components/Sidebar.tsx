import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { 
  LayoutDashboard, 
  CheckSquare, 
  Package, 
  BookOpen, 
  Settings, 
  LogOut,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';

export default function Sidebar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: CheckSquare, label: 'Tasks', path: '/tasks' },
    { icon: Package, label: 'Inventário', path: '/inventory' },
    { icon: BookOpen, label: 'Acervo', path: '/acervo' },
  ];

  if (user?.role === 'admin') {
    menuItems.push({ icon: Settings, label: 'Configurações', path: '/settings' });
  }

  return (
    <aside className={cn(
      "bg-zinc-950 text-zinc-400 flex flex-col transition-all duration-300 border-r border-zinc-800",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="p-4 flex items-center justify-between border-b border-zinc-800">
        {!isCollapsed && <span className="font-bold text-white tracking-tighter text-xl">NEXUS IT</span>}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 hover:bg-zinc-800 rounded-md text-zinc-500"
        >
          {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="flex-1 p-2 space-y-1 mt-4">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-3 p-3 rounded-lg transition-colors",
              location.pathname === item.path 
                ? "bg-zinc-800 text-white" 
                : "hover:bg-zinc-900 hover:text-zinc-200"
            )}
          >
            <item.icon size={20} />
            {!isCollapsed && <span>{item.label}</span>}
          </Link>
        ))}
      </nav>

      <div className="p-2 border-t border-zinc-800">
        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="flex items-center gap-3 p-3 w-full rounded-lg hover:bg-red-950/30 hover:text-red-400 transition-colors"
        >
          <LogOut size={20} />
          {!isCollapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  );
}
