import { createContext, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  
  // 🚨 FIXED: Bulletproof synchronous load
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem('userInfo');
      // Ensure it exists and isn't a corrupted string like "undefined"
      if (storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
        return JSON.parse(storedUser);
      }
    } catch (error) {
      console.error("Failed to parse user data from local storage.");
    }
    return null; // Default to logged out if anything goes wrong
  });

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('userInfo', JSON.stringify(userData));
    if (userData.token) {
      localStorage.setItem('token', userData.token);
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('userInfo');
    localStorage.removeItem('token');
    
    window.location.href = '/'; 
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};