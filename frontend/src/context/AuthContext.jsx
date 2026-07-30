import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';

const AuthContext = createContext(null);

function parseJwt(token) {
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    if (typeof window === 'undefined') return null;
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const navigate = useNavigate();
  const location = useLocation();

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });

    const normalizedUser = {
      username: data.username,
      fullName: data.fullName,
      role: data.role || 'Staff',
      permissions: data.permissions,
      customerId: data.customerId ?? null,
    };

    localStorage.setItem('user', JSON.stringify(normalizedUser));
    localStorage.setItem('token', data.token);
    localStorage.setItem('customerId', normalizedUser.customerId ?? '');

    setUser(normalizedUser);
    setToken(data.token);

    navigate(normalizedUser.role === 'Customer' ? '/portal' : '/dashboard', { replace: true });

    return normalizedUser;
  };

  const logout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('customerId');
    setUser(null);
    setToken(null);
    if (location.pathname !== '/login') {
      navigate('/login', { replace: true });
    }
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = JSON.parse(localStorage.getItem('user') || 'null');

    if (!storedToken || !storedUser) {
      setUser(null);
      setToken(null);
      return;
    }

    const payload = parseJwt(storedToken);
    const expired = payload?.exp && payload.exp * 1000 < Date.now();

    if (expired) {
      logout();
      return;
    }

    setToken(storedToken);
    setUser(storedUser);
  }, []);

  useEffect(() => {
    if (!token && location.pathname !== '/login') {
      navigate('/login', { replace: true });
    }
  }, [token, location.pathname, navigate]);

  const value = useMemo(() => ({
    user,
    token,
    role: user?.role || 'Staff',
    customerId: user?.customerId ?? null,
    isAuthenticated: Boolean(token && user),
    login,
    logout,
  }), [user, token]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  return useContext(AuthContext);
}
