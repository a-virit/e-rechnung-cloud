import React, { useState, useEffect, useCallback } from 'react';
import {
  User, Settings, Shield, Save, Eye, EyeOff, Mail, Building,
  Key, Lock, AlertTriangle, Check, X, FileText, Bell,
  Smartphone, Globe, Database, Activity, Users, CreditCard,
  Download, Upload, Trash2, Copy, RefreshCw, Calendar
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import MainContacts from './MainContacts';
//import SSOConfiguration from './SSOConfiguration';
import SSOConfig from './SSOConfig';


const ProfileSystemSettings = () => {
  // State Management
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState({
    id: '1',
    name: 'Max Mustermann',
    email: 'max@beispiel-firma.de',
    role: 'admin',
    phone: '+49 123 456789',
    department: 'IT',
    lastLogin: '2025-08-29T10:30:00Z',
    isActive: true,
    twoFactorEnabled: false
  });

  const [company, setCompany] = useState({
    name: 'Beispiel Firma GmbH',
    taxId: 'DE123456789',
    address: 'Musterstraße 123, 12345 Berlin',
    phone: '+49 30 12345678',
    email: 'info@beispiel-firma.de',
    website: 'https://beispiel-firma.de',
    vatRate: 19
  });

  const [security, setSecurity] = useState({
    passwordPolicy: {
      minLength: 8,
      requireUppercase: true,
      requireNumbers: true,
      requireSymbols: false,
      maxAge: 90
    },
    sessionTimeout: 30,
    twoFactorRequired: false,
    allowPasswordReset: true,
    maxFailedAttempts: 5,
    ipWhitelist: ''
  });

  const [emailSettings, setEmailSettings] = useState({
    provider: 'smtp',
    host: 'mail.beispiel-firma.de',
    port: 587,
    encryption: 'tls',
    senderName: 'Beispiel Firma',
    senderEmail: 'rechnung@beispiel-firma.de',
    replyTo: 'noreply@beispiel-firma.de',
    dailyLimit: 1000,
    enableTracking: true
  });

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    invoiceCreated: true,
    paymentReceived: true,
    systemAlerts: true,
    weeklyReports: true,
    securityAlerts: true
  });

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });

  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Security Event Logging
  const logSecurityEvent = useCallback((action, details) => {
    console.log('Security Event:', {
      timestamp: new Date().toISOString(),
      user: user.email,
      action,
      details,
      ip: '127.0.0.1'
    });
  }, [user.email]);

  const { actions } = useApp();

  // Tabs Configuration
  const tabs = [
    { id: 'profile', label: 'Profil', icon: User, adminOnly: false },
    { id: 'company', label: 'Unternehmen', icon: Building, adminOnly: true },
    { id: 'security', label: 'Sicherheit', icon: Shield, adminOnly: true },
    { id: 'email', label: 'E-Mail', icon: Mail, adminOnly: true },
    { id: 'notifications', label: 'Benachrichtigungen', icon: Bell, adminOnly: false },
    { id: 'contacts', label: 'Hauptkontakte', icon: Users, adminOnly: true },
    { id: 'sso', label: 'Single Sign-On', icon: Shield, adminOnly: true },
    { id: 'system', label: 'System', icon: Settings, adminOnly: true }
  ].filter(tab => !tab.adminOnly || user.role === 'admin');

  // Password Change Handler
  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      actions.showError('Neue Passwörter stimmen nicht überein');
      return;
    }

    if (passwordData.newPassword.length < security.passwordPolicy.minLength) {
      actions.showError(`Passwort muss mindestens ${security.passwordPolicy.minLength} Zeichen haben`);
      return;
    }

    setSaving(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      logSecurityEvent('PASSWORD_CHANGED', {
        userId: user.id,
        success: true
      });

      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordForm(false);
      actions.showSuccess('Passwort erfolgreich geändert');
    } catch (error) {
      logSecurityEvent('PASSWORD_CHANGE_FAILED', {
        userId: user.id,
        error: error.message
      });
      actions.showError('Fehler beim Ändern des Passworts');
    } finally {
      setSaving(false);
    }
  };

  // Two-Factor Authentication Toggle
  const toggleTwoFactor = async () => {
    setSaving(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1500));

      const newStatus = !user.twoFactorEnabled;
      setUser(prev => ({ ...prev, twoFactorEnabled: newStatus }));

      logSecurityEvent('TWO_FACTOR_TOGGLED', {
        userId: user.id,
        enabled: newStatus,
        success: true
      });

      actions.showInfo(newStatus ? '2FA aktiviert' : '2FA deaktiviert');
    } catch (error) {
      actions.showError('Fehler beim Ändern der 2FA-Einstellungen');
    } finally {
      setSaving(false);
    }
  };

  // Save Configuration
  const saveConfig = async (section) => {
    setSaving(true);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      logSecurityEvent('CONFIG_UPDATED', {
        section,
        userId: user.id,
        success: true
      });

      setUnsavedChanges(false);
      actions.showInfo(`${section}-Einstellungen gespeichert`);
    } catch (error) {
      actions.showError('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  // Export Configuration
  const exportConfig = () => {
    const exportData = {
      company,
      emailSettings: { ...emailSettings, password: '[REDACTED]' },
      security: { ...security, ipWhitelist: security.ipWhitelist ? '[CONFIGURED]' : '' },
      notifications,
      exportedAt: new Date().toISOString(),
      exportedBy: user.email
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `system-config-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    logSecurityEvent('CONFIG_EXPORTED', {
      userId: user.id,
      success: true
    });
  };

  // Profile Tab Content
  const ProfileTab = () => (
    <div className="space-y-6">
      {/* User Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <User className="w-5 h-5 mr-2" />
          Persönliche Informationen
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
            <input
              type="text"
              value={user.name}
              onChange={(e) => {
                setUser(prev => ({ ...prev, name: e.target.value }));
                setUnsavedChanges(true);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">E-Mail *</label>
            <input
              type="email"
              value={user.email}
              onChange={(e) => {
                setUser(prev => ({ ...prev, email: e.target.value }));
                setUnsavedChanges(true);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
            <input
              type="tel"
              value={user.phone}
              onChange={(e) => {
                setUser(prev => ({ ...prev, phone: e.target.value }));
                setUnsavedChanges(true);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Abteilung</label>
            <input
              type="text"
              value={user.department}
              onChange={(e) => {
                setUser(prev => ({ ...prev, department: e.target.value }));
                setUnsavedChanges(true);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => saveConfig('Profil')}
            disabled={!unsavedChanges || saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Speichere...' : 'Speichern'}
          </button>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Shield className="w-5 h-5 mr-2" />
          Sicherheitseinstellungen
        </h3>

        {/* Password Change */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Passwort ändern</span>
            <button
              onClick={() => setShowPasswordForm(!showPasswordForm)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              {showPasswordForm ? 'Abbrechen' : 'Passwort ändern'}
            </button>
          </div>

          {showPasswordForm && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Aktuelles Passwort *
                </label>
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                  className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Neues Passwort *
                </label>
                <input
                  type={showPasswords.new ? 'text' : 'password'}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                  className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Passwort bestätigen *
                </label>
                <input
                  type={showPasswords.confirm ? 'text' : 'password'}
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                  className="absolute right-3 top-8 text-gray-400 hover:text-gray-600"
                >
                  {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                onClick={handlePasswordChange}
                disabled={!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword || saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                <Key className="w-4 h-4 mr-2" />
                {saving ? 'Ändere...' : 'Passwort ändern'}
              </button>
            </div>
          )}
        </div>

        {/* Two-Factor Authentication */}
        <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div>
            <h4 className="font-medium text-yellow-800">Zwei-Faktor-Authentifizierung</h4>
            <p className="text-sm text-yellow-700">
              {user.twoFactorEnabled ? 'Aktiviert - Ihr Konto ist zusätzlich geschützt' : 'Deaktiviert - Aktivieren Sie 2FA für mehr Sicherheit'}
            </p>
          </div>
          <button
            onClick={toggleTwoFactor}
            disabled={saving}
            className={`px-4 py-2 rounded-md font-medium ${user.twoFactorEnabled
              ? 'bg-red-600 text-white hover:bg-red-700'
              : 'bg-green-600 text-white hover:bg-green-700'
              } disabled:opacity-50 flex items-center`}
          >
            <Smartphone className="w-4 h-4 mr-2" />
            {saving ? 'Ändere...' : (user.twoFactorEnabled ? 'Deaktivieren' : 'Aktivieren')}
          </button>
        </div>
      </div>
    </div>
  );

  // Company Tab Content
  const CompanyTab = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Building className="w-5 h-5 mr-2" />
          Unternehmensdaten
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Firmenname *</label>
            <input
              type="text"
              value={company.name}
              onChange={(e) => {
                setCompany(prev => ({ ...prev, name: e.target.value }));
                setUnsavedChanges(true);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Steuernummer</label>
            <input
              type="text"
              value={company.taxId}
              onChange={(e) => {
                setCompany(prev => ({ ...prev, taxId: e.target.value }));
                setUnsavedChanges(true);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">USt-Satz (%)</label>
            <input
              type="number"
              value={company.vatRate}
              onChange={(e) => {
                setCompany(prev => ({ ...prev, vatRate: parseFloat(e.target.value) }));
                setUnsavedChanges(true);
              }}
              min="0"
              max="25"
              step="0.5"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">Adresse</label>
            <textarea
              value={company.address}
              onChange={(e) => {
                setCompany(prev => ({ ...prev, address: e.target.value }));
                setUnsavedChanges(true);
              }}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Telefon</label>
            <input
              type="tel"
              value={company.phone}
              onChange={(e) => {
                setCompany(prev => ({ ...prev, phone: e.target.value }));
                setUnsavedChanges(true);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">E-Mail</label>
            <input
              type="email"
              value={company.email}
              onChange={(e) => {
                setCompany(prev => ({ ...prev, email: e.target.value }));
                setUnsavedChanges(true);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Website</label>
            <input
              type="url"
              value={company.website}
              onChange={(e) => {
                setCompany(prev => ({ ...prev, website: e.target.value }));
                setUnsavedChanges(true);
              }}
              placeholder="https://ihre-firma.de"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => saveConfig('Unternehmen')}
            disabled={!unsavedChanges || saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Speichere...' : 'Speichern'}
          </button>
        </div>
      </div>

      {/* Company Logo Upload */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Firmenlogo</h3>

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600 mb-2">Logo hochladen (PNG, JPG, SVG)</p>
          <p className="text-xs text-gray-500">Max. 2MB, empfohlene Größe: 200x80px</p>

          <button className="mt-4 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center mx-auto">
            <Upload className="w-4 h-4 mr-2" />
            Datei auswählen
          </button>
        </div>
      </div>
    </div>
  );

  // Security Tab Content
  const SecurityTab = () => (
    <div className="space-y-6">
      {/* Password Policy */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Lock className="w-5 h-5 mr-2" />
          Passwort-Richtlinien
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Mindestlänge (Zeichen)
            </label>
            <input
              type="number"
              value={security.passwordPolicy.minLength}
              onChange={(e) => {
                setSecurity(prev => ({
                  ...prev,
                  passwordPolicy: { ...prev.passwordPolicy, minLength: parseInt(e.target.value) }
                }));
                setUnsavedChanges(true);
              }}
              min="6"
              max="32"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Passwort-Alter (Tage)
            </label>
            <input
              type="number"
              value={security.passwordPolicy.maxAge}
              onChange={(e) => {
                setSecurity(prev => ({
                  ...prev,
                  passwordPolicy: { ...prev.passwordPolicy, maxAge: parseInt(e.target.value) }
                }));
                setUnsavedChanges(true);
              }}
              min="30"
              max="365"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {[
            { key: 'requireUppercase', label: 'Großbuchstaben erforderlich' },
            { key: 'requireNumbers', label: 'Zahlen erforderlich' },
            { key: 'requireSymbols', label: 'Sonderzeichen erforderlich' }
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center">
              <input
                type="checkbox"
                checked={security.passwordPolicy[key]}
                onChange={(e) => {
                  setSecurity(prev => ({
                    ...prev,
                    passwordPolicy: { ...prev.passwordPolicy, [key]: e.target.checked }
                  }));
                  setUnsavedChanges(true);
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Session & Access Control */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2" />
          Zugriffskontrolle
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session-Timeout (Minuten)
            </label>
            <input
              type="number"
              value={security.sessionTimeout}
              onChange={(e) => {
                setSecurity(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }));
                setUnsavedChanges(true);
              }}
              min="5"
              max="480"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Max. Fehlversuche
            </label>
            <input
              type="number"
              value={security.maxFailedAttempts}
              onChange={(e) => {
                setSecurity(prev => ({ ...prev, maxFailedAttempts: parseInt(e.target.value) }));
                setUnsavedChanges(true);
              }}
              min="3"
              max="10"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            IP-Whitelist (optional)
          </label>
          <textarea
            value={security.ipWhitelist}
            onChange={(e) => {
              setSecurity(prev => ({ ...prev, ipWhitelist: e.target.value }));
              setUnsavedChanges(true);
            }}
            placeholder="192.168.1.0/24"
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Eine IP-Adresse oder CIDR-Block pro Zeile. Leer lassen für unbeschränkten Zugriff.
          </p>
        </div>

        <div className="mt-6 space-y-3">
          {[
            { key: 'twoFactorRequired', label: '2FA für alle Benutzer erforderlich' },
            { key: 'allowPasswordReset', label: 'Passwort-Reset erlauben' }
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center">
              <input
                type="checkbox"
                checked={security[key]}
                onChange={(e) => {
                  setSecurity(prev => ({ ...prev, [key]: e.target.checked }));
                  setUnsavedChanges(true);
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => saveConfig('Sicherheit')}
            disabled={!unsavedChanges || saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            <Shield className="w-4 h-4 mr-2" />
            {saving ? 'Speichere...' : 'Speichern'}
          </button>
        </div>
      </div>

      {/* Security Audit */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Eye className="w-5 h-5 mr-2" />
          Sicherheits-Audit
        </h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <Check className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-sm font-medium">Passwort-Richtlinien aktiv</span>
            </div>
            <span className="text-xs text-green-600">OK</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
              <span className="text-sm font-medium">2FA nicht für alle Benutzer aktiv</span>
            </div>
            <span className="text-xs text-yellow-600">WARNUNG</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <Check className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-sm font-medium">SSL/TLS Verschlüsselung aktiv</span>
            </div>
            <span className="text-xs text-green-600">OK</span>
          </div>

          <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center">
              <Check className="w-4 h-4 text-green-600 mr-2" />
              <span className="text-sm font-medium">Regelmäßige Backups aktiv</span>
            </div>
            <span className="text-xs text-green-600">OK</span>
          </div>
        </div>

        <div className="mt-4 text-center">
          <button
            onClick={() => actions.showInfo('Vollständiger Sicherheitsscan wird durchgeführt...')}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Vollständigen Sicherheitsscan durchführen
          </button>
        </div>
      </div>
    </div>
  );

  // Email Tab Content  
  const EmailTab = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Mail className="w-5 h-5 mr-2" />
          E-Mail-Konfiguration
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Provider</label>
            <select
              value={emailSettings.provider}
              onChange={(e) => {
                setEmailSettings(prev => ({ ...prev, provider: e.target.value }));
                setUnsavedChanges(true);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="smtp">Custom SMTP</option>
              <option value="gmail">Gmail</option>
              <option value="outlook">Outlook</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Server</label>
            <input
              type="text"
              value={emailSettings.host}
              onChange={(e) => {
                setEmailSettings(prev => ({ ...prev, host: e.target.value }));
                setUnsavedChanges(true);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Port</label>
            <input
              type="number"
              value={emailSettings.port}
              onChange={(e) => {
                setEmailSettings(prev => ({ ...prev, port: parseInt(e.target.value) }));
                setUnsavedChanges(true);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Verschlüsselung</label>
            <select
              value={emailSettings.encryption}
              onChange={(e) => {
                setEmailSettings(prev => ({ ...prev, encryption: e.target.value }));
                setUnsavedChanges(true);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="tls">TLS (empfohlen)</option>
              <option value="ssl">SSL</option>
              <option value="none">Keine (unsicher)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Absender-Name</label>
            <input
              type="text"
              value={emailSettings.senderName}
              onChange={(e) => {
                setEmailSettings(prev => ({ ...prev, senderName: e.target.value }));
                setUnsavedChanges(true);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Absender E-Mail</label>
            <input
              type="email"
              value={emailSettings.senderEmail}
              onChange={(e) => {
                setEmailSettings(prev => ({ ...prev, senderEmail: e.target.value }));
                setUnsavedChanges(true);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Reply-To E-Mail</label>
            <input
              type="email"
              value={emailSettings.replyTo}
              onChange={(e) => {
                setEmailSettings(prev => ({ ...prev, replyTo: e.target.value }));
                setUnsavedChanges(true);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tägl. Versand-Limit</label>
            <input
              type="number"
              value={emailSettings.dailyLimit}
              onChange={(e) => {
                setEmailSettings(prev => ({ ...prev, dailyLimit: parseInt(e.target.value) }));
                setUnsavedChanges(true);
              }}
              min="100"
              max="10000"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={emailSettings.enableTracking}
              onChange={(e) => {
                setEmailSettings(prev => ({ ...prev, enableTracking: e.target.checked }));
                setUnsavedChanges(true);
              }}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">E-Mail-Tracking aktivieren (Öffnungs- und Klick-Statistiken)</span>
          </label>
        </div>

        <div className="mt-6 flex justify-between">
          <button
            onClick={() => alert('Test-E-Mail wird an ' + user.email + ' gesendet...')}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
          >
            <Mail className="w-4 h-4 mr-2" />
            Test-E-Mail senden
          </button>

          <button
            onClick={() => saveConfig('E-Mail')}
            disabled={!unsavedChanges || saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Speichere...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );

  // Notifications Tab Content
  const NotificationsTab = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Bell className="w-5 h-5 mr-2" />
          Benachrichtigungseinstellungen
        </h3>

        <div className="space-y-4">
          {[
            {
              key: 'emailNotifications',
              label: 'E-Mail-Benachrichtigungen',
              desc: 'Allgemeine E-Mail-Benachrichtigungen erhalten',
              critical: false
            },
            {
              key: 'invoiceCreated',
              label: 'Neue Rechnungen',
              desc: 'Benachrichtigung bei neuen Rechnungen',
              critical: false
            },
            {
              key: 'paymentReceived',
              label: 'Zahlungseingänge',
              desc: 'Benachrichtigung bei Zahlungseingängen',
              critical: false
            },
            {
              key: 'systemAlerts',
              label: 'System-Warnungen',
              desc: 'Wichtige System- und Sicherheitswarnungen',
              critical: true
            },
            {
              key: 'weeklyReports',
              label: 'Wochenberichte',
              desc: 'Wöchentliche Zusammenfassung per E-Mail',
              critical: false
            },
            {
              key: 'securityAlerts',
              label: 'Sicherheitswarnungen',
              desc: 'Benachrichtigungen bei Sicherheitsereignissen',
              critical: true
            }
          ].map(({ key, label, desc, critical }) => (
            <div key={key} className={`flex items-center justify-between p-4 rounded-lg ${critical ? 'bg-red-50 border border-red-200' : 'bg-gray-50'
              }`}>
              <div>
                <h4 className={`font-medium ${critical ? 'text-red-800' : 'text-gray-900'}`}>
                  {label}
                  {critical && <span className="ml-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded">KRITISCH</span>}
                </h4>
                <p className={`text-sm ${critical ? 'text-red-700' : 'text-gray-600'}`}>{desc}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifications[key]}
                  onChange={(e) => {
                    if (critical && !e.target.checked) {
                      if (!window.confirm('Sicherheitswarnungen deaktivieren? Dies wird nicht empfohlen!')) {
                        return;
                      }
                    }
                    setNotifications(prev => ({ ...prev, [key]: e.target.checked }));
                    setUnsavedChanges(true);
                  }}
                  className="sr-only"
                />
                <div className={`w-11 h-6 rounded-full ${notifications[key] ? 'bg-blue-600' : 'bg-gray-300'} relative transition-colors`}>
                  <div className={`absolute w-4 h-4 bg-white rounded-full top-1 transition-transform ${notifications[key] ? 'translate-x-6' : 'translate-x-1'}`} />
                </div>
              </label>
            </div>
          ))}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={() => saveConfig('Benachrichtigungen')}
            disabled={!unsavedChanges || saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Speichere...' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );

  // System Tab Content
  const SystemTab = () => (
    <div className="space-y-6">
      {/* System Info */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Database className="w-5 h-5 mr-2" />
          System-Informationen
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Version:</span>
              <span className="text-sm font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">v2.1.4</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Letzte Aktualisierung:</span>
              <span className="text-sm font-medium">29.08.2025</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Datenbank:</span>
              <span className="text-sm font-medium text-green-600 flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Online
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">E-Mail-Service:</span>
              <span className="text-sm font-medium text-green-600 flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                Aktiv
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Aktive Benutzer:</span>
              <span className="text-sm font-medium">12 / 25</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Rechnungen (Monat):</span>
              <span className="text-sm font-medium">847</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Speicherplatz:</span>
              <span className="text-sm font-medium">
                2.4 GB / 10 GB
                <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                  <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: '24%' }}></div>
                </div>
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Letztes Backup:</span>
              <span className="text-sm font-medium text-green-600">Heute 03:00</span>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => alert('System-Status wird aktualisiert...')}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center justify-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Status aktualisieren
          </button>

          <button
            onClick={() => alert('System-Diagnose wird gestartet...')}
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center justify-center"
          >
            <Activity className="w-4 h-4 mr-2" />
            System-Diagnose
          </button>

          <button
            onClick={() => alert('Performance-Report wird erstellt...')}
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center justify-center"
          >
            <FileText className="w-4 h-4 mr-2" />
            Performance-Report
          </button>
        </div>
      </div>

      {/* Backup & Export */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Download className="w-5 h-5 mr-2" />
          Datensicherung & Export
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={exportConfig}
            className="bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 flex items-center justify-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Konfiguration exportieren
          </button>

          <button
            onClick={() => alert('Vollständiges Backup wird erstellt...')}
            className="bg-green-600 text-white px-4 py-3 rounded-md hover:bg-green-700 flex items-center justify-center"
          >
            <Database className="w-4 h-4 mr-2" />
            Vollständiges Backup
          </button>

          <button
            onClick={() => alert('Datenexport wird vorbereitet...')}
            className="bg-purple-600 text-white px-4 py-3 rounded-md hover:bg-purple-700 flex items-center justify-center"
          >
            <FileText className="w-4 h-4 mr-2" />
            Alle Daten exportieren
          </button>

          <button
            onClick={() => {
              if (window.confirm('Möchten Sie wirklich alle Daten löschen? Diese Aktion kann nicht rückgängig gemacht werden!')) {
                logSecurityEvent('DATA_DELETION_REQUESTED', { userId: user.id });
                actions.showInfo('Datenlöschung wird vom Administrator geprüft');
              }
            }}
            className="bg-red-600 text-white px-4 py-3 rounded-md hover:bg-red-700 flex items-center justify-center"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Alle Daten löschen
          </button>
        </div>

        <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
          <div className="flex items-center">
            <AlertTriangle className="w-4 h-4 text-yellow-600 mr-2" />
            <span className="text-sm text-yellow-800">
              Automatische Backups erfolgen täglich um 03:00 Uhr. Manuelle Backups werden zusätzlich empfohlen.
            </span>
          </div>
        </div>
      </div>

      {/* Security Logs */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Activity className="w-5 h-5 mr-2" />
          Sicherheitsprotokolle (letzte 10 Einträge)
        </h3>

        <div className="space-y-3">
          {[
            { time: '29.08.2025 14:23', event: 'Benutzer angemeldet', user: 'max@beispiel-firma.de', status: 'success', ip: '192.168.1.100' },
            { time: '29.08.2025 12:15', event: 'Passwort geändert', user: 'admin@beispiel-firma.de', status: 'success', ip: '192.168.1.101' },
            { time: '28.08.2025 16:45', event: 'Fehlgeschlagene Anmeldung', user: 'unknown@test.com', status: 'warning', ip: '203.0.113.45' },
            { time: '28.08.2025 09:30', event: 'Konfiguration geändert', user: 'admin@beispiel-firma.de', status: 'info', ip: '192.168.1.101' },
            { time: '27.08.2025 18:22', event: '2FA aktiviert', user: 'user@beispiel-firma.de', status: 'success', ip: '192.168.1.102' },
            { time: '27.08.2025 11:15', event: 'Backup erstellt', user: 'system', status: 'info', ip: 'localhost' }
          ].map((log, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-3 ${log.status === 'success' ? 'bg-green-500' :
                  log.status === 'warning' ? 'bg-yellow-500' :
                    log.status === 'error' ? 'bg-red-500' : 'bg-blue-500'
                  }`} />
                <div>
                  <p className="text-sm font-medium">{log.event}</p>
                  <p className="text-xs text-gray-600">{log.user} • {log.ip}</p>
                </div>
              </div>
              <span className="text-xs text-gray-500">{log.time}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex justify-between">
          <button
            onClick={() => alert('Vollständige Protokolle werden geöffnet...')}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            Alle Protokolle anzeigen
          </button>

          <button
            onClick={() => alert('Protokolle werden exportiert...')}
            className="text-gray-600 hover:text-gray-800 text-sm font-medium flex items-center"
          >
            <Download className="w-3 h-3 mr-1" />
            Exportieren
          </button>
        </div>
      </div>

      {/* User Management */}
      {user.role === 'admin' && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Benutzerverwaltung
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={() => alert('Benutzer-Liste wird geöffnet...')}
              className="bg-blue-600 text-white px-4 py-3 rounded-md hover:bg-blue-700 flex items-center justify-center"
            >
              <Users className="w-4 h-4 mr-2" />
              Benutzer verwalten
            </button>

            <button
              onClick={() => alert('Neuer Benutzer wird erstellt...')}
              className="bg-green-600 text-white px-4 py-3 rounded-md hover:bg-green-700 flex items-center justify-center"
            >
              <User className="w-4 h-4 mr-2" />
              Benutzer hinzufügen
            </button>

            <button
              onClick={() => alert('Berechtigungen werden angezeigt...')}
              className="bg-purple-600 text-white px-4 py-3 rounded-md hover:bg-purple-700 flex items-center justify-center"
            >
              <Shield className="w-4 h-4 mr-2" />
              Berechtigungen
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Einstellungen</h1>
              <p className="text-gray-600 mt-1">Profile und Systemkonfiguration verwalten</p>
            </div>

            <div className="flex items-center space-x-4">
              {unsavedChanges && (
                <div className="flex items-center text-yellow-600">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  <span className="text-sm font-medium">Ungespeicherte Änderungen</span>
                </div>
              )}

              <div className="text-right text-sm text-gray-500">
                <div>Angemeldet als: <span className="font-medium">{user.name}</span></div>
                <div>Rolle: <span className="font-medium capitalize">{user.role}</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="bg-white border border-gray-200 rounded-lg mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6 overflow-x-auto">
              {tabs.map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${activeTab === id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="transition-all duration-200">
          {activeTab === 'profile' && <ProfileTab />}
          {activeTab === 'company' && <CompanyTab />}
          {activeTab === 'security' && <SecurityTab />}
          {activeTab === 'email' && <EmailTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'contacts' && (
            <div className="space-y-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Hauptkontakte
                </h3>
                <MainContacts />
              </div>
            </div>
          )}
          {activeTab === 'sso' && <SSOConfig />}
          {activeTab === 'system' && <SystemTab />}
        </div>

        {/* Security Notice */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Shield className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-blue-900">Sicherheitshinweis</h4>
              <p className="text-sm text-blue-800 mt-1">
                Alle Konfigurationsänderungen werden protokolliert und überwacht.
                Sensible Daten werden verschlüsselt gespeichert und unterliegen strengen Zugriffskontrollen.
                Bei kritischen Änderungen erhalten Administratoren automatisch eine Benachrichtigung.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Actions Footer */}
        <div className="mt-6 bg-white border border-gray-200 rounded-lg p-4">
          <div className="flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => setActiveTab('profile')}
              className="text-sm text-gray-600 hover:text-blue-600 flex items-center"
            >
              <User className="w-3 h-3 mr-1" />
              Schnell zum Profil
            </button>

            {user.role === 'admin' && (
              <>
                <span className="text-gray-300">|</span>
                <button
                  onClick={exportConfig}
                  className="text-sm text-gray-600 hover:text-green-600 flex items-center"
                >
                  <Download className="w-3 h-3 mr-1" />
                  Schnell-Export
                </button>

                <span className="text-gray-300">|</span>
                <button
                  onClick={() => setActiveTab('security')}
                  className="text-sm text-gray-600 hover:text-red-600 flex items-center"
                >
                  <Shield className="w-3 h-3 mr-1" />
                  Sicherheit prüfen
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSystemSettings;