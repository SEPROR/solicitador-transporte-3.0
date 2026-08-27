import { createContext, useContext, useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:2999';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({
    loading: true,
    autenticado: false,
    usuario: null,
    isGilog: false,
  });

  useEffect(() => {
    async function fetchAuthStatus() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/auth/status`, {
          credentials: 'include',
        });
        const data = await res.json();

        setAuth({
          loading: false,
          autenticado: !!data.autenticado,
          usuario: data.usuario || null,
          isGilog: !!data.isGilog,
        });
      } catch (err) {
        console.error('Erro ao verificar autenticação:', err);
        setAuth({
          loading: false,
          autenticado: false,
          usuario: null,
          isGilog: false,
        });
      }
    }

    fetchAuthStatus();
  }, []);

  return (
    <AuthContext.Provider value={{ ...auth, setAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth precisa ser usado dentro de um <AuthProvider>');
  }
  return context;
}