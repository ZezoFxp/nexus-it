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

    // Função única e segura para buscar os dados do utilizador
    const loadUserProfile = async (sessionUser: any) => {
      try {
        console.log("[Auth] Buscando perfil do utilizador:", sessionUser.id);
        
        const { data: profile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', sessionUser.id)
          .maybeSingle();

        if (error) throw error;

        if (isMounted) {
          if (profile) {
            console.log("[Auth] Perfil carregado com sucesso!");
            setUser(profile);
          } else {
            console.warn("[Auth] Perfil não encontrado na base de dados. A limpar sessão...");
            setUser(null);
            await supabase.auth.signOut();
          }
        }
      } catch (err) {
        console.error("[Auth] Erro ao comunicar com a base de dados:", err);
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    // O Listener ÚNICO: Ele resolve tudo sozinho, sem atropelamentos
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`[Auth] Evento do Supabase: ${event}`);

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
          // Tem token! Vamos buscar os dados
          loadUserProfile(session.user);
        } else {
          // É uma visita nova, não tem token
          if (isMounted) {
            setUser(null);
            setLoading(false);
          }
        }
      } else if (event === 'SIGNED_OUT') {
        // Utilizador fez logout
        if (isMounted) {
          setUser(null);
          setLoading(false);
        }
      }
    });

    // Timeout de emergência caso a internet caia durante a verificação
    const safetyTimeout = setTimeout(() => {
      if (isMounted) {
        console.warn("[Auth] Timeout de emergência: A libertar o ecrã de carregamento.");
        setLoading(false);
      }
    }, 5000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(safetyTimeout);
    };
  }, []);

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
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
