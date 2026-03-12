import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from './types';
import { supabase } from './supabase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session?.user) {
          await handleUserSession(session.user);
        } else {
          if (isMounted) setLoading(false);
        }
      } catch (error) {
        console.error("Erro ao verificar sessão inicial:", error);
        if (isMounted) setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Evita que dispare duas vezes no primeiro carregamento da página
      if (event === 'INITIAL_SESSION') return;

      if (session?.user) {
        await handleUserSession(session.user);
      } else {
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleUserSession = async (supabaseUser: any) => {
    try {
      // O maybeSingle() evita que o código quebre se o usuário não for encontrado na tabela
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle(); 

      if (userData) {
        setUser(userData);
      } else if (supabaseUser.email === "messias.bandeira65@gmail.com") {
        // Fluxo de criação do admin hardcoded
        const adminData = {
          id: supabaseUser.id,
          name: 'Administrador Nexus',
          email: supabaseUser.email,
          role: 'admin',
          avatar: ''
        };
        const { error: insertError } = await supabase.from('users').insert([adminData]);
        if (!insertError) {
          setUser(adminData);
        } else {
          console.error("Erro ao criar admin:", insertError);
        }
      } else {
        // Se o usuário não existe na tabela e não é o admin, limpa a sessão local
        setUser(null);
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error("Erro crítico ao processar sessão do usuário:", error);
      setUser(null);
    } finally {
      // A MÁGICA ESTÁ AQUI: O bloco finally garante que, independentemente
      // de dar sucesso ou erro, a tela de loading vai ser desativada!
      setLoading(false);
    }
  };

  const login = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
