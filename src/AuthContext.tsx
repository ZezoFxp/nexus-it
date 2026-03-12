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
        console.log("[Auth] 1. Iniciando verificação de sessão...");
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("[Auth] Erro ao buscar sessão:", error);
          throw error;
        }

        console.log("[Auth] 2. Sessão encontrada no Cache:", session ? "Sim (Achei o Token!)" : "Não (Vazio)");

        if (session?.user) {
          await handleUserSession(session.user);
        } else {
          if (isMounted) setLoading(false);
        }
      } catch (error) {
        console.error("[Auth] Erro Crítico na verificação:", error);
        if (isMounted) setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("[Auth] Evento de mudança de estado:", event);
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
      console.log("[Auth] 3. Buscando dados do usuário na tabela pública. ID:", supabaseUser.id);
      
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', supabaseUser.id)
        .maybeSingle(); 

      console.log("[Auth] 4. Resposta do banco de dados:", userData || "Nenhum usuário encontrado");

      if (userData) {
        setUser(userData);
      } else if (supabaseUser.email === "messias.bandeira65@gmail.com") {
        console.log("[Auth] Criando conta de Administrador...");
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
          console.error("[Auth] Erro ao inserir admin:", insertError);
        }
      } else {
        console.log("[Auth] Usuário não encontrado na tabela pública. Deslogando...");
        setUser(null);
        await supabase.auth.signOut();
      }
    } catch (error) {
      console.error("[Auth] Erro ao processar sessão:", error);
      setUser(null);
    } finally {
      console.log("[Auth] 5. Finalizando o estado de Loading!");
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
