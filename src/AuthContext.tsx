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
    let active = true;

    const initAuth = async () => {
      try {
        console.log("[Auth] 1. A verificar sessão no Supabase...");
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;

        if (!session?.user) {
          console.log("[Auth] 2. Nenhuma sessão ativa encontrada.");
          if (active) setLoading(false);
          return;
        }

        console.log("[Auth] 3. Sessão encontrada. A buscar perfil do utilizador...");
        
        // O maybeSingle() garante que não há erro caso a tabela esteja vazia
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (profileError) {
          console.error("[Auth] Erro ao buscar perfil:", profileError);
        }

        if (active) {
          if (profile) {
            console.log("[Auth] 4. Perfil carregado com sucesso!");
            setUser(profile);
          } else {
            console.warn("[Auth] 4. Perfil não existe na tabela pública. A forçar fim de sessão...");
            setUser(null);
            await supabase.auth.signOut();
          }
        }
      } catch (err) {
        console.error("[Auth] Falha crítica na inicialização:", err);
        if (active) setUser(null);
      } finally {
        // GARANTIA ABSOLUTA DE QUE O CARREGAMENTO TERMINA
        console.log("[Auth] 5. A desativar o ecrã de carregamento.");
        if (active) setLoading(false);
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`[Auth] Evento detetado: ${event}`);
        
        if (event === 'SIGNED_OUT' || !session) {
          setUser(null);
          setLoading(false);
        } else if (event === 'SIGNED_IN') {
          setLoading(true);
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle();
          
          if (profile) setUser(profile);
          setLoading(false);
        }
      }
    );

    // Tempo Limite de Segurança: Se o Supabase encravar na rede, paramos o loading à força após 5 segundos
    const safetyTimeout = setTimeout(() => {
      if (active) {
        console.warn("[Auth] Aviso: Tempo limite excedido. A forçar paragem do carregamento.");
        setLoading(false);
      }
    }, 5000);

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

  const login = async (email: string, pass: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) throw error;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
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
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
