// src/components/Auth/LoginForm.jsx
import React, { useState } from 'react';
import { Eye, EyeOff, LogIn, Building, Shield } from 'lucide-react';

const LoginForm = ({ onLogin, loading = false, error = null }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [ssoConfig, setSsoConfig] = useState(null);
  const [checkingSso, setCheckingSso] = useState(false);

  // SSO-Check-Funktion
  const checkSSO = async (emailValue) => {
    if (!emailValue || !emailValue.includes('@')) {
      setSsoConfig(null);
      return;
    }

    setCheckingSso(true);
    try {
      const response = await fetch('/api/auth/check-sso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailValue })
      });
      const result = await response.json();
      
      if (result.ssoAvailable) {
        setSsoConfig(result);
      } else {
        setSsoConfig(null);
      }
    } catch (error) {
      console.error('SSO Check error:', error);
      setSsoConfig(null);
    } finally {
      setCheckingSso(false);
    }
  };

  // E-Mail Input Handler mit SSO-Check
  const handleEmailChange = (e) => {
    const emailValue = e.target.value;
    setFormData({ ...formData, email: emailValue });
    
    // Debounced SSO-Check
    clearTimeout(window.ssoCheckTimeout);
    window.ssoCheckTimeout = setTimeout(() => {
      checkSSO(emailValue);
    }, 500);
  };

  // Mock SSO Login Handler
  const handleMockSSO = async () => {
    try {
      const response = await fetch('/api/auth/sso/mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: formData.email,
          provider: ssoConfig.provider 
        })
      });
      
      const result = await response.json();
      if (result.success) {
        // Token und User setzen
        localStorage.setItem('token', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data.user));
        // Seite neu laden um Auth-Context zu aktualisieren
        window.location.reload();
      } else {
        console.error('SSO Login failed:', result.error);
      }
    } catch (error) {
      console.error('SSO Login error:', error);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(formData);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-white text-center">
          <Building className="w-12 h-12 mx-auto mb-3" />
          <h1 className="text-2xl font-bold">E-Rechnung Pro</h1>
          <p className="text-blue-100 mt-1">Anmelden</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          
          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* E-Mail Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              E-Mail-Adresse
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={handleEmailChange}
              placeholder="ihre-email@firma.de"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {checkingSso && (
              <p className="text-xs text-gray-500 mt-1">
                Prüfe SSO-Verfügbarkeit...
              </p>
            )}
          </div>

          {/* SSO Option */}
          {ssoConfig && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center mb-2">
                <Shield className="w-5 h-5 text-blue-600 mr-2" />
                <h3 className="font-medium text-blue-900">
                  SSO verfügbar für {ssoConfig.companyName}
                </h3>
              </div>
              <p className="text-sm text-blue-700 mb-3">
                Melden Sie sich mit Ihrem Firmen-Account an (empfohlen)
              </p>
              <button
                type="button"
                onClick={handleMockSSO}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center"
              >
                <Shield className="w-4 h-4 mr-2" />
                Mit {ssoConfig.provider === 'microsoft' ? 'Microsoft' : 'Google'} anmelden
              </button>
              <div className="mt-2 text-center">
                <span className="text-xs text-gray-500">oder verwenden Sie unten das Passwort</span>
              </div>
            </div>
          )}
          
          {/* Password Input */}
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center font-medium transition-colors"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Anmelden...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5 mr-2" />
                Anmelden
              </>
            )}
          </button>

          {/* Demo Access 
          <div className="bg-gray-50 rounded-md p-4 mt-6">
            <p className="text-xs text-gray-600 text-center mb-2">
              <strong>Demo-Zugang:</strong>
            </p>
            <p className="text-xs text-gray-600 text-center">
              E-Mail: super@user.com<br />
              Passwort: (Ihr Support-Passwort)
            </p>
          </div>*/}

          {/* Support Info 
          <div className="bg-gray-50 rounded-md p-4">
            <p className="text-xs text-gray-600 text-center">
              Für einen Unternehmens-Zugang kontaktieren Sie:{' '}
              <a 
                href="mailto:support@ihr-unternehmen.de" 
                className="text-blue-600 hover:text-blue-700"
              >
                support@ihr-unternehmen.de
              </a>
            </p>
          </div>*/}
        </form>
      </div>
    </div>
  );
};

export default LoginForm;