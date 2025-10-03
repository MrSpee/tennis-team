import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // Check if user is already authenticated
    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      setCurrentUser(JSON.parse(storedUser));
      setIsAuthenticated(true);
    }
  }, []);

  const login = (code) => {
    // Access codes for different roles
    const accessCodes = {
      '1234': { role: 'captain', name: 'Team Captain' },
      '5678': { role: 'player', name: 'Player' },
    };

    const user = accessCodes[code];
    if (user) {
      setCurrentUser(user);
      setIsAuthenticated(true);
      localStorage.setItem('currentUser', JSON.stringify(user));
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    localStorage.removeItem('currentUser');
  };

  const value = {
    isAuthenticated,
    currentUser,
    login,
    logout,
    isCaptain: currentUser?.role === 'captain',
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
