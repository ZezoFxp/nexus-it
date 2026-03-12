import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import { UndoProvider } from './UndoContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Tasks from './pages/Tasks';
import Inventory from './pages/Inventory';
import Acervo from './pages/Acervo';
import Settings from './pages/Settings';
import Profile from './pages/Profile';

export default function App() {
  return (
    <AuthProvider>
      <UndoProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="tasks" element={<Tasks />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="acervo" element={<Acervo />} />
              <Route path="settings" element={<Settings />} />
              <Route path="profile" element={<Profile />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </UndoProvider>
    </AuthProvider>
  );
}
