// src/components/Auth/LoginForm.jsx
import React, { useState } from 'react';
import { Eye, EyeOff, LogIn, Building, UserPlus } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const LoginForm = ({ onLogin, onRegister, loading = false, error = null }) => {
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  
  const [registerData, setRegisterData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    companyName: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (isRegistering) {
      // Registrierung validieren
      if (registerData.password !== registerData.confirmPassword) {
        console.log('Passwörter stimmen nicht überein');
        return;
      }
      
      if (registerData.password.length < 8) {
        console.log('Passwort muss mindestens 8 Zeichen haben');
        return;
      }
      
      onRegister(registerData);
    } else {
      // Login
      onLogin(formData);
    }
  };

  const resetForms = () => {
    setFormData({ email: '', password: '' });
    setRegisterData({
      email: '',
      password: '',
      confirmPassword: '',
      name: '',
      companyName: ''
    });
  };

  const toggleMode = () => {
    setIsRegistering(!isRegistering);
    resetForms();
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-white text-center">
          <Building className="w-12 h-12 mx-auto mb-3" />
          <h1 className="text-2xl font-bold">E-Rechnung Pro</h1>
          <p className="text-blue-100 mt-1">
            {isRegistering ? 'Unternehmen registrieren' : 'Anmelden'}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {isRegistering ? (
            // Registrierungs-Formular
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Firmenname *
                </label>
                <input
                  type="text"
                  value={registerData.companyName}
                  onChange={(e) => setRegisterData({ 
                    ...registerData, 
                    companyName: e.target.value 
                  })}
                  placeholder="Ihre Firma GmbH"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ihr Name *
                </label>
                <input
                  type="text"
                  value={registerData.name}
                  onChange={(e) => setRegisterData({ 
                    ...registerData, 
                    name: e.target.value 
                  })}
                  placeholder="Max Mustermann"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-Mail-Adresse *
                </label>
                <input
                  type="email"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ 
                    ...registerData, 
                    email: e.target.value 
                  })}
                  placeholder="admin@ihrefirma.de"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passwort *
                </label>
                <input
                  type="password"
                  value={registerData.password}
                  onChange={(e) => setRegisterData({ 
                    ...registerData, 
                    password: e.target.value 
                  })}
                  placeholder="Mindestens 8 Zeichen"
                  required
                  minLength={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passwort bestätigen *
                </label>
                <input
                  type="password"
                  value={registerData.confirmPassword}
                  onChange={(e) => setRegisterData({ 
                    ...registerData, 
                    confirmPassword: e.target.value 
                  })}
                  placeholder="Passwort wiederholen"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </>
          ) : (
            // Login-Formular
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-Mail-Adresse
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    email: e.target.value 
                  })}
                  placeholder="ihre-email@firma.de"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passwort
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    password: e.target.value 
                  })}
                  placeholder="Ihr Passwort"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium transition-colors"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                {isRegistering ? 'Registriere...' : 'Anmelden...'}
              </>
            ) : (
              <>
                {isRegistering ? (
                  <>
                    <UserPlus className="w-5 h-5 mr-2" />
                    Unternehmen registrieren
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5 mr-2" />
                    Anmelden
                  </>
                )}
              </>
            )}
          </button>

          {/* Toggle Register/Login */}
          <div className="text-center pt-4 border-t">
            {isRegistering ? (
              <p className="text-sm text-gray-600">
                Bereits registriert?{' '}
                <button
                  type="button"
                  onClick={toggleMode}
                  disabled={loading}
                  className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                >
                  Jetzt anmelden
                </button>
              </p>
            ) : (
              <p className="text-sm text-gray-600">
                Noch kein Unternehmen registriert?{' '}
                <button
                  type="button"
                  onClick={toggleMode}
                  disabled={loading}
                  className="text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                >
                  Jetzt registrieren
                </button>
              </p>
            )}
          </div>

          {/* Support Info */}
          <div className="bg-gray-50 rounded-md p-4 mt-6">
            <p className="text-xs text-gray-600 text-center">
              Bei Problemen wenden Sie sich an:{' '}
              <a 
                href="mailto:support@ihr-unternehmen.de" 
                className="text-blue-600 hover:text-blue-700"
              >
                support@ihr-unternehmen.de
              </a>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;