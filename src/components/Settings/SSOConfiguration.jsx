import React, { useState } from 'react';
import { Shield, Plus, Trash2, Save, TestTube } from 'lucide-react';

const SSOConfiguration = () => {
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [provider, setProvider] = useState('microsoft');
  const [config, setConfig] = useState({
    clientId: '',
    tenantId: '',
    domain: ''
  });

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
            <div className={`w-11 h-6 rounded-full ${ssoEnabled ? 'bg-blue-600' : 'bg-gray-300'} relative`}>
              <div className={`absolute w-4 h-4 bg-white rounded-full top-1 transition-transform ${ssoEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
            </div>
          </label>
        </div>

        {ssoEnabled && (
          <div className="space-y-4">
            {/* Provider auswählen */}
            <div>
              <label className="block text-sm font-medium mb-2">Identity Provider</label>
              <select 
                value={provider} 
                onChange={(e) => setProvider(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="microsoft">Microsoft 365 / Azure AD</option>
                <option value="google">Google Workspace</option>
              </select>
            </div>

            {/* Konfiguration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Client ID</label>
                <input
                  type="text"
                  value={config.clientId}
                  onChange={(e) => setConfig({...config, clientId: e.target.value})}
                  className="w-full p-2 border rounded-md"
                  placeholder="z.B. 12345678-1234-1234-1234-123456789012"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Tenant ID</label>
                <input
                  type="text"
                  value={config.tenantId}
                  onChange={(e) => setConfig({...config, tenantId: e.target.value})}
                  className="w-full p-2 border rounded-md"
                  placeholder="z.B. contoso.onmicrosoft.com"
                />
              </div>
            </div>

            {/* Test Button */}
            <div className="flex gap-3">
              <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center">
                <TestTube className="w-4 h-4 mr-2" />
                Verbindung testen
              </button>
              
              <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center">
                <Save className="w-4 h-4 mr-2" />
                Speichern
              </button>
            </div>

            {/* Setup-Anleitung */}
            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">Setup-Anleitung:</h4>
              <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
                <li>Gehen Sie zu portal.azure.com</li>
                <li>Erstellen Sie eine neue App Registration</li>
                <li>Tragen Sie diese URL ein: <code>https://ihre-app.vercel.app/api/auth/sso/callback</code></li>
                <li>Kopieren Sie Client ID und Tenant ID hierher</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SSOConfiguration;