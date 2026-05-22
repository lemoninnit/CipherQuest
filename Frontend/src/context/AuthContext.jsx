import { createContext, useContext, useState, useEffect } from 'react';
import { userApi, saveToken, clearToken, isLoggedIn } from '../api/cipherQuestApi';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true); // true while checking token on mount

  // On app load, if a token exists, fetch the profile
  useEffect(() => {
    if (isLoggedIn()) {
      userApi.getMyProfile()
        .then(setUser)
        .catch(() => { clearToken(); setUser(null); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = (token, userData) => {
    saveToken(token);
    setUser(userData);
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  const refreshProfile = async () => {
    try {
      const data = await userApi.getMyProfile();
      setUser(data);
      return data;
    } catch (err) {
      console.error("Failed to refresh user profile:", err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);