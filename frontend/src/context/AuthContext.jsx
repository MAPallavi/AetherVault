import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../utils/api';
import { toast } from 'react-hot-toast';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Auto-login on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      if (token) {
        // Set the token in localStorage so that api calls work
        localStorage.setItem('token', token);
        try {
          const profile = await api.getMe();
          setUser(profile);
          setIsAuthenticated(true);
        } catch (err) {
          // Token is expired or invalid
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
          setUser(null);
          setIsAuthenticated(false);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (username, password, rememberMe) => {
    setLoading(true);
    try {
      const data = await api.login(username, password);
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('token', data.token);
      localStorage.setItem('token', data.token); // Keep in localStorage for API utility consistency
      
      setUser(data.user || { username: data.username, role: data.role || 'User' });
      setIsAuthenticated(true);
      toast.success('Successfully unlocked your vault!');
      return data;
    } catch (err) {
      toast.error(err.message || 'Login failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (username, password) => {
    setLoading(true);
    try {
      const data = await api.register(username, password);
      // Auto login after registration (session-based by default)
      sessionStorage.setItem('token', data.token);
      localStorage.setItem('token', data.token);
      
      setUser(data.user || { username: data.username, role: 'User' });
      setIsAuthenticated(true);
      toast.success('Account created successfully!');
      return data;
    } catch (err) {
      toast.error(err.message || 'Registration failed');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    api.logout();
    sessionStorage.removeItem('token');
    localStorage.removeItem('token');
    setUser(null);
    setIsAuthenticated(false);
    toast.success('Vault locked successfully');
  };

  const updateProfile = async (profileData) => {
    try {
      const data = await api.updateProfile(profileData);
      setUser(data.user);
      toast.success('Profile settings updated');
      return data;
    } catch (err) {
      toast.error(err.message || 'Update failed');
      throw err;
    }
  };

  const changePassword = async (currentPassword, newPassword) => {
    try {
      const data = await api.changePassword(currentPassword, newPassword);
      toast.success('Password changed successfully');
      return data;
    } catch (err) {
      toast.error(err.message || 'Password change failed');
      throw err;
    }
  };

  const deleteAccount = async () => {
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete account');
      logout();
      toast.success('Account deleted successfully');
    } catch (err) {
      toast.error(err.message || 'Deletion failed');
      throw err;
    }
  };

  const downloadData = async () => {
    try {
      const response = await fetch('/api/auth/download-data', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      if (!response.ok) throw new Error('Data download packaging failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${user.username}_vault_export.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success('Your data export is downloading');
    } catch (err) {
      toast.error(err.message || 'Download failed');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      loading,
      login,
      register,
      logout,
      updateProfile,
      changePassword,
      deleteAccount,
      downloadData
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
