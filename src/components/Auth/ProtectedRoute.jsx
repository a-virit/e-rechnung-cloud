// src/components/Auth/ProtectedRoute.jsx
import React, { useState } from 'react';
import { Shield, Lock, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import LoginForm from './LoginForm';

const ProtectedRoute = ({ 
  children, 
  requireRole = null, 
  requirePermission = null 
}) => {
  const { 
    isAuthenticated, 
    user, 
    loading, 
    login, 
    register, 
    hasRole, 
    hasPermission 
  } = useAuth();
  
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState(null);

  // App lädt noch
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">E-Rechnung Pro wird geladen...</p>
        </div>
      </div>
    );
  }

  // Nicht angemeldet - Login/Register anzeigen
  if (!isAuthenticated) {
    const handleLogin = async (credentials) => {
      setAuthLoading(true);
      setAuthError(null);
      
      try {
        const result = await login(credentials);
        
        if (!result.success) {
          setAuthError(result.error || 'Anmeldung fehlgeschlagen');
        }
      } catch (error) {
        setAuthError('Verbindungsfehler. Versuchen Sie es erneut.');
      } finally {
        setAuthLoading(false);
      }
    };

    const handleRegister = async (userData) => {
      setAuthLoading(true);
      setAuthError(null);
      
      try {
        const result = await register(userData);
        
        if (!result.success) {
          setAuthError(result.error || 'Registrierung fehlgeschlagen');
        }
      } catch (error) {
        setAuthError('Verbindungsfehler. Versuchen Sie es erneut.');
      } finally {
        setAuthLoading(false);
      }
    };

    return (
      <LoginForm
        onLogin={handleLogin}
        onRegister={handleRegister}
        loading={authLoading}
        error={authError}
      />
    );
  }

  // Rollen-Berechtigung prüfen
  if (requireRole && !hasRole(requireRole)) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Zugriff verweigert
          </h2>
          
          <p className="text-gray-600 mb-4">
            Sie haben nicht die erforderlichen Berechtigungen für diesen Bereich.
          </p>
          
          <div className="bg-gray-50 rounded-md p-4 mb-4">
            <p className="text-sm text-gray-700">
              <strong>Ihre Rolle:</strong> {getRoleLabel(user?.role)}
            </p>
            <p className="text-sm text-gray-700">
              <strong>Erforderlich:</strong> {getRoleLabel(requireRole)}
            </p>
          </div>
          
          <button
            onClick={() => window.history.back()}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
          >
            Zurück
          </button>
        </div>
      </div>
    );
  }

  // Funktions-Berechtigung prüfen
  if (requirePermission && !hasPermission(requirePermission.resource, requirePermission.action)) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md text-center">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8 text-yellow-600" />
          </div>
          
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            Berechtigung erforderlich
          </h2>
          
          <p className="text-gray-600 mb-4">
            Sie haben nicht die erforderlichen Berechtigungen für diese Funktion.
          </p>
          
          <div className="bg-gray-50 rounded-md p-4 mb-4">
            <p className="text-sm text-gray-700">
              <strong>Benötigt:</strong> {requirePermission.resource}.{requirePermission.action}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Wenden Sie sich an Ihren Administrator für erweiterte Berechtigungen.
            </p>
          </div>
          
          <button
            onClick={() => window.history.back()}
            className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
          >
            Zurück
          </button>
        </div>
      </div>
    );
  }

  // Berechtigt - Komponente anzeigen
  return <>{children}</>;
};

// Hilfsfunktion für Rollen-Labels
const getRoleLabel = (role) => {
  const labels = {
    admin: 'Administrator',
    user: 'Benutzer',
    support: 'Support'
  };
  return labels[role] || role || 'Unbekannt';
};

export default ProtectedRoute;