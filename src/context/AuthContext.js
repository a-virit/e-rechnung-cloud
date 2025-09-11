// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService.js';
import { useApp } from '../context/AppContext';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const { actions } = useApp();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);

  // Token und User aus localStorage laden beim Start
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const savedToken = authService.getToken();
        const savedUser = authService.getCurrentUser();

        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(savedUser);

          // Token validieren
          const isValid = await validateStoredToken(savedToken);
          if (!isValid) {
            // Token ungültig - ausloggen
            handleLogout();
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        handleLogout(); // Bei Fehlern sicher ausloggen
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Session-Timeout einrichten
  useEffect(() => {
    if (user && token) {
      const cleanup = setupSessionTimeout();
      return cleanup;
    }
  }, [user, token]);

  // Token-Validierung
  const validateStoredToken = async (tokenToValidate) => {
    try {
      const response = await fetch('/api/auth/validate', {
        headers: {
          'Authorization': `Bearer ${tokenToValidate}`
        }
      });

      if (!response.ok) {
        return false;
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  };

  // Login-Funktion
  const login = async (credentials) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      const result = await response.json();

      if (result.success) {
        const { token: newToken, user: userData } = result.data;

        // Token und User speichern (inkl. companyId)
        const storedUser = { ...userData };
        authService.setAuthData(newToken, storedUser);

        setToken(newToken);
        setUser(storedUser);

        return { success: true };
      } else {
        return {
          success: false,
          error: result.error || 'Anmeldung fehlgeschlagen'
        };
      }
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Verbindungsfehler. Überprüfen Sie Ihre Internetverbindung.'
      };
    }
  };

  // Registrierungs-Funktion
  const register = async (userData) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      });

      const result = await response.json();

      if (result.success) {
        // Nach erfolgreicher Registrierung automatisch einloggen
        return await login({
          email: userData.email,
          password: userData.password
        });
      } else {
        return {
          success: false,
          error: result.error || 'Registrierung fehlgeschlagen'
        };
      }
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'Verbindungsfehler. Überprüfen Sie Ihre Internetverbindung.'
      };
    }
  };

  // Logout-Funktion
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);

    // Optional: Server über Logout informieren
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).catch(error => {
        console.warn('Logout notification failed:', error);
      });
    }
  };

  // Session-Timeout Management
  const setupSessionTimeout = () => {
    const TIMEOUT_MINUTES = 30;
    const WARNING_MINUTES = 5; // Warnung 5 Min vor Ablauf

    let timeoutId;
    let warningId;
    let lastActivity = Date.now();

    const resetTimers = () => {
      lastActivity = Date.now();
      clearTimeout(timeoutId);
      clearTimeout(warningId);

      // Warnung vor Ablauf
      warningId = setTimeout(() => {
        const remaining = Math.ceil((lastActivity + (TIMEOUT_MINUTES * 60 * 1000) - Date.now()) / 60000);
        if (remaining > 0) {
          const extendSession = window.confirm(
            `Ihre Sitzung läuft in ${remaining} Minute(n) ab.\n\nMöchten Sie die Sitzung verlängern?`
          );

          if (extendSession) {
            resetTimers(); // Session verlängern
          }
        }
      }, (TIMEOUT_MINUTES - WARNING_MINUTES) * 60 * 1000);

      // Automatischer Logout
      timeoutId = setTimeout(() => {
        alert('Ihre Sitzung ist abgelaufen. Sie werden automatisch abgemeldet.');
        handleLogout();
      }, TIMEOUT_MINUTES * 60 * 1000);
    };

    // Activity-Listener
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    const handleActivity = () => {
      const now = Date.now();
      // Nur alle 30 Sekunden Timer zurücksetzen (Performance)
      if (now - lastActivity > 30000) {
        resetTimers();
      }
    };

    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    resetTimers(); // Initial starten

    // Cleanup-Funktion
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(warningId);
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  };

  // Berechtigungen prüfen
  const hasPermission = (resource, action) => {
    if (!user || !user.permissions) {
      return false;
    }

    // Support hat immer alle Rechte
    if (user.role === 'support') {
      return true;
    }

    // Standard-Berechtigungsprüfung
    const resourcePermissions = user.permissions[resource];
    if (!resourcePermissions) {
      return false;
    }

    return resourcePermissions[action] === true;
  };

  // Rollen-Hierarchie prüfen
  const hasRole = (requiredRole) => {
    if (!user || !user.role) {
      return false;
    }

    const roleHierarchy = {
      user: 1,
      admin: 2,
      support: 3
    };

    const userLevel = roleHierarchy[user.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 999;

    return userLevel >= requiredLevel;
  };

  // User-Daten aktualisieren (nach Profil-Änderungen)
  const updateUserData = (userData) => {
    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  // Authenticated API-Request Helper
  const authenticatedFetch = async (url, options = {}) => {
    if (!token) {
      throw new Error('Nicht angemeldet');
    }

    const config = {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const response = await fetch(url, config);

    // Token abgelaufen
    if (response.status === 401) {
      handleLogout();
      throw new Error('Sitzung abgelaufen - bitte melden Sie sich erneut an');
    }

    return response;
  };

  // Context Value
  const value = {
    // State
    user,
    token,
    loading,
    isAuthenticated: !!user && !!token,

    // Auth Functions
    login,
    register,
    logout: handleLogout,

    // Permission Functions
    hasPermission,
    hasRole,

    // Utility Functions
    updateUserData,
    authenticatedFetch,

    // User Info Getters
    isAdmin: user?.role === 'admin',
    isSupport: user?.role === 'support',
    userName: user?.name || 'Unbekannt',
    userEmail: user?.email || '',
    userRole: user?.role || 'user',
    companyId: user?.companyId
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ============================================
// UTILITY HOOKS für spezifische Use Cases
// ============================================

// Hook für authenticated API calls
export const useAuthenticatedApi = () => {
  const { authenticatedFetch, isAuthenticated } = useAuth();

  return {
    get: (url) => authenticatedFetch(url),
    post: (url, data) => authenticatedFetch(url, {
      method: 'POST',
      body: JSON.stringify(data)
    }),
    put: (url, data) => authenticatedFetch(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),
    delete: (url) => authenticatedFetch(url, {
      method: 'DELETE'
    }),
    isAuthenticated
  };
};

// Hook für Permission-Checks
export const usePermissions = () => {
  const { hasPermission, hasRole, user } = useAuth();

  return {
    canCreateInvoices: hasPermission('invoices', 'create'),
    canEditInvoices: hasPermission('invoices', 'edit'),
    canDeleteInvoices: hasPermission('invoices', 'delete'),
    canSendInvoices: hasPermission('invoices', 'send'),

    canCreateCustomers: hasPermission('customers', 'create'),
    canEditCustomers: hasPermission('customers', 'edit'),
    canDeleteCustomers: hasPermission('customers', 'delete'),

    canManageUsers: hasPermission('users', 'create'),
    canEditConfig: hasPermission('config', 'edit'),
    canViewReports: hasPermission('reports', 'view'),

    isAdmin: hasRole('admin'),
    isSupport: hasRole('support'),

    user
  };
};