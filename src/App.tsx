import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext'; // <-- Adicionamos o useAuth aqui
import { UndoProvider } from './UndoContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Inventory from './pages/Inventory';
import Acervo from './pages/Acervo';
import Settings from './pages/Settings';
import Profile from './pages/Profile';

// 1. O Guardião das Rotas Privadas (Dashboard, Tarefas, etc)
// Se não estiver logado, ele chuta o usuário para a tela de Login.
function RotaPrivada({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="text-lg font-medium text-gray-600">Carregando aplicação...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// 2. O Guardião da Rota Pública (Tela de Login)
// Se o usuário JÁ ESTIVER logado e tentar acessar /login, ele é jogado pro Dashboard.
function RotaPublica({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
        <div className="text-lg font-medium text-gray-600">Verificando sessão...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <UndoProvider>
        <BrowserRouter>
          <Routes>
            
            {/* ROTA PÚBLICA (Envolvida no Guardião Público) */}
            <Route 
              path="/login" 
              element={
                <RotaPublica>
                  <Login />
                </RotaPublica>
              } 
            />

            {/* ROTAS PRIVADAS (Envolvidas no Guardião Privado) */}
            <Route 
              path="/" 
              element={
                <RotaPrivada>
                  <Layout />
                </RotaPrivada>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="acervo" element={<Acervo />} />
              <Route path="settings" element={<Settings />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            {/* Rota de fallback (Qualquer URL inválida vai pro início) */}
            <Route path="*" element={<Navigate to="/" replace />} />
            
          </Routes>
        </BrowserRouter>
      </UndoProvider>
    </AuthProvider>
  );
}
