import React, { useState, useEffect } from 'react';
import { Shield, Save, TestTube, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react';
import authService from '../../services/authService.js';

const SSOConfiguration = () => {
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [provider, setProvider] = useState('microsoft');
  const [config, setConfig] = useState({
    clientId: '',
    tenantId: '',
    domain: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    loadSSOConfig();
  }, []);

  const loadSSOConfig = async () => {
    try {
      const response = await fetch('/api/auth/sso/config', {
        headers: authService.getAuthHeaders()
      });
      const result = await response.json();
      
      if (result.success) {
        setSsoEnabled(result.data.ssoEnabled);
        setProvider(result.data.provider);
        setConfig(result.data.config);
      } else {
        console.error('Failed to load SSO config:', result.error);
      }
    } catch (error) {
      console.error('Load SSO config error:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    setTestResult(null);
    
    try {
      const response = await fetch('/api/auth/sso/config', {
        method: 'PUT',
        headers: {
          ...authService.getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ssoEnabled,
          provider,
          config
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setTestResult({
          type: 'success',
          message: 'SSO-Konfiguration erfolgreich gespeichert!'
        });
      } else {
        setTestResult({
          type: 'error',
          message: result.error || 'Fehler beim Speichern'
        });
      }
    } catch (error) {
      setTestResult({
        type: 'error',
        message: 'Verbindungsfehler beim Speichern'
      });
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
  if (!config.domain) {
    setTestResult({
      type: 'error',
      message: 'Domain ist erforderlich für den Test'
    });
    return;
  }

  // Zuerst Konfiguration speichern für Domain-Mapping
  if (ssoEnabled && (config.clientId || config.tenantId)) {
    await saveConfig();
  }

  setTesting(true);
  setTestResult(null);
  
  try {
    const testEmail = `test@${config.domain}`;
    const response = await fetch('/api/auth/sso/mock', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: testEmail,
        provider: provider
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      setTestResult({
        type: 'success',
        message: `SSO-Test erfolgreich! Mock-User würde erstellt: ${testEmail}`
      });
    } else {
      setTestResult({
        type: 'error',
        message: result.error
      });
    }
  } catch (error) {
    setTestResult({
      type: 'error',
      message: 'Verbindungstest fehlgeschlagen'
    });
  } finally {
    setTesting(false);
  }
};

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          Single Sign-On (SSO)
        </h3>

        {/* SSO Ein/Aus */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h4 className="font-medium">SSO aktivieren</h4>
            <p className="text-sm text-gray-600">
              Mitarbeiter melden sich mit ihren Firmen-Accounts an
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={ssoEnabled}
              onChange={(e) => setSsoEnabled(e.target.checked)}
              className="sr-only"
            />
            <div className={`w-11 h-6 rounded-full ${ssoEnabled ? 'bg-blue-600' : 'bg-gray-300'} relative transition-colors`}>
              <div className={`absolute w-4 h-4 bg-white rounded-full top-1 transition-transform ${ssoEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </div>
          </label>
        </div>

        {ssoEnabled && (
          <div className="space-y-6">
            {/* Provider auswählen */}
            <div>
              <label className="block text-sm font-medium mb-2">Identity Provider</label>
              <select 
                value={provider} 
                onChange={(e) => setProvider(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="microsoft">Microsoft 365 / Azure AD</option>
                <option value="google">Google Workspace</option>
              </select>
            </div>

            {/* Konfigurationsfelder */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Application (Client) ID *
                </label>
                <input
                  type="text"
                  value={config.clientId}
                  onChange={(e) => setConfig({...config, clientId: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. 12345678-1234-1234-1234-123456789012"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Directory (Tenant) ID *
                </label>
                <input
                  type="text"
                  value={config.tenantId}
                  onChange={(e) => setConfig({...config, tenantId: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="z.B. contoso.onmicrosoft.com"
                />
              </div>
            </div>

            {/* Domain-Feld */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Firma-Domain *
              </label>
              <input
                type="text"
                value={config.domain}
                onChange={(e) => setConfig({...config, domain: e.target.value.toLowerCase()})}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="z.B. beispielfirma.de"
              />
              <p className="text-xs text-gray-500 mt-1">
                Domain Ihrer E-Mail-Adressen für automatische SSO-Erkennung
              </p>
            </div>

            {/* Test-Ergebnis */}
            {testResult && (
              <div className={`p-4 rounded-lg border ${
                testResult.type === 'success' 
                  ? 'bg-green-50 border-green-200 text-green-800' 
                  : 'bg-red-50 border-red-200 text-red-800'
              }`}>
                <div className="flex items-center">
                  {testResult.type === 'success' ? (
                    <CheckCircle className="w-4 h-4 mr-2" />
                  ) : (
                    <AlertCircle className="w-4 h-4 mr-2" />
                  )}
                  <span className="text-sm">{testResult.message}</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button 
                onClick={testConnection}
                disabled={testing || saving}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
              >
                <TestTube className="w-4 h-4 mr-2" />
                {testing ? 'Teste...' : 'Verbindung testen'}
              </button>
              
              <button 
                onClick={saveConfig}
                disabled={saving || testing}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Speichere...' : 'Speichern'}
              </button>
            </div>

            {/* Setup-Anleitung }
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-3 flex items-center">
                <ExternalLink className="w-4 h-4 mr-2" />
                Azure AD Setup-Anleitung:
              </h4>
              <ol className="text-sm text-blue-800 space-y-2 list-decimal list-inside">
                <li>Gehen Sie zu <strong>portal.azure.com</strong></li>
                <li>Wählen Sie <strong>Azure Active Directory → App registrations</strong></li>
                <li>Klicken Sie <strong>+ New registration</strong></li>
                <li>Name: <code>E-Rechnung SaaS</code></li>
                <li>Account types: <strong>Multitenant</strong></li>
                <li>Redirect URI: <code>https://ihre-domain.vercel.app/api/auth/sso/callback</code></li>
                <li>Kopieren Sie <strong>Application ID</strong> und <strong>Directory ID</strong></li>
                <li>Gehen Sie zu <strong>Certificates & secrets</strong> → Neues Client Secret</li>
                <li>Tragen Sie alle Werte hier ein und klicken Sie <strong>Speichern</strong></li>
              </ol>
            </div>*/}

            {/* Sicherheitshinweis */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-yellow-800">
                  <strong>Sicherheitshinweis:</strong> Nach der Aktivierung können sich nur noch Benutzer 
                  mit verifizierten E-Mail-Adressen Ihrer Domain anmelden. Standard-Passwort-Login 
                  wird für diese Domain deaktiviert.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SSOConfiguration;