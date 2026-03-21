import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../config/Api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth state from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const register = async (email, password, name) => {
    setError(null);
    try {
      const response = await api.auth.register(email, password, name);
      if (response.error) {
        setError(response.error);
        return false;
      }
      
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      setToken(response.token);
      setUser(response.user);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const login = async (email, password) => {
    setError(null);
    try {
      const response = await api.auth.login(email, password);
      if (response.error) {
        setError(response.error);
        return false;
      }
      
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      setToken(response.token);
      setUser(response.user);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const forgotPassword = async (email, newPassword) => {
    setError(null);
    try {
      const response = await api.auth.forgotPassword(email, newPassword);
      if (response.error) {
        setError(response.error);
        return { success: false, message: response.error };
      }
      return { success: true, message: response.message || 'Password reset successful' };
    } catch (err) {
      const message = err.message || 'Password reset failed';
      setError(message);
      return { success: false, message };
    }
  };

  const updateProfilePicture = async (profilePicture) => {
    setError(null);
    try {
      const response = await api.auth.updateProfilePicture(profilePicture);
      if (response.error) {
        setError(response.error);
        return { success: false, message: response.error };
      }

      if (response.user) {
        localStorage.setItem('user', JSON.stringify(response.user));
        setUser(response.user);
      }

      return { success: true, message: response.message || 'Profile picture updated' };
    } catch (err) {
      const message = err.message || 'Failed to update profile picture';
      setError(message);
      return { success: false, message };
    }
  };

  const logout = () => {
    api.auth.logout();
    setUser(null);
    setToken(null);
    setError(null);
  };

  const value = {
    user,
    token,
    loading,
    error,
    register,
    login,
    forgotPassword,
    updateProfilePicture,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'HOD',
    isProfessor: user?.role === 'PROFESSOR',
    isStudent: user?.role === 'STUDENT',
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
