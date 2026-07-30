import { useState } from 'react';

export function useAuth() {
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || 'null')));

  const loginUser = (userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  return { user, loginUser };
}
