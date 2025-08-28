import React, { useState, useEffect } from 'react';
import { X, Building, Mail, Check, AlertCircle, Copy, ExternalLink, Settings, BarChart3, Send, Eye, EyeOff } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const ConfigModal = () => {
  const { state, actions } = useApp();
  const { modals } = state;
  const isOpen = modals.config;

  // Tab-Management
  const [activeTab, setActiveTab] = useState('company');
  
  // Unternehmensdaten
  const [companyData, setCompanyData] = useState({
    name: '',
    address: '',
    taxId: '',
    email: '',
    phone: '',
    website: ''
  });

  // E-Mail-Konfiguration
  const [emailConfig, setEmailConfig] = useState({
    senderEmail: '',
    senderName: '',
    replyTo: '',
    emailTemplate: {
      subject: 'Neue Rechnung {{invoiceNumber}} - {{companyName}}',
      htmlBody: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #333; border-bottom: 2px solid #007acc; padding-bottom: 10px;">
    Neue Rechnung {{invoiceNumber}}
  </h2>
  <p>Sehr geehrte Damen und Herren,</p>
  <p>anbei erhalten Sie unsere Rechnung {{invoiceNumber}} vom {{date}} über <strong>{{amount}} {{currency}}</strong>.</p>
  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007acc;">
    <h3 style="margin: 0 0 15px 0; color: #333;">Rechnungsdetails:</h3>
    <table style="width: 100%; border-collapse: collapse;">
      <tr><td style="padding: 5px 0;"><strong>Rechnungsnummer:</strong></td><td>{{invoiceNumber}}</td></tr>
      <tr><td style="padding: 5px 0;"><strong>Rechnungsbetrag:</strong></td><td>{{amount}} {{currency}}</td></tr>
      <tr><td style="padding: 5px 0;"><strong>Fälligkeitsdatum:</strong></td><td>{{dueDate}}</td></tr>
    </table>
  </div>
  <p>Die Rechnung ist als strukturierte E-Rechnung (XRechnung) beigefügt und kann direkt in Ihr System importiert werden.</p>
  <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
  <p style="margin-top: 30px;">Mit freundlichen Grüßen<br><strong>{{companyName}}</strong></p>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
  <p style="font-size: 12px; color: #666; text-align: center;">
    Diese E-Mail wurde automatisch erstellt und ist ohne Unterschrift gültig.<br>
    Powered by YourSaaS E-Invoice System
  </p>
</div>`
    }
  });

  // Domain-Status
  const [domainStatus, setDomainStatus] = useState({
    verified: false,
    checking: false,
    domain: null,
    verificationToken: null,
    dnsRecordValue: null
  });

  // Usage-Daten
  const [usage, setUsage] = useState({
    monthly: { sent: 23, limit: 100, cost: 0 },
    daily: { sent: 3, limit: 10 },
    total: { sent: 156, cost: 12.45 },
    plan: 'basic'
  });

  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Domain aus E-Mail extrahieren
  useEffect(() => {
    if (emailConfig.senderEmail) {
      const domain = emailConfig.senderEmail.split('@')[1];
      const token = `verify-demo-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
      setDomainStatus(prev => ({
        ...prev,
        domain,
        verificationToken: token,
        dnsRecordValue: `v=spf1 include:mail.ihre-software.com token=${token} ~all`
      }));
    }
  }, [emailConfig.senderEmail]);

  // Modal schließen
  const handleClose = () => {
    actions.closeModal('config');
    setActiveTab('company');
  };

  // Validierung
  const validateForm = () => {
    const newErrors = {};
    
    // Unternehmensdaten
    if (activeTab === 'company') {
      if (!companyData.name?.trim()) newErrors.companyName = 'Firmenname ist erforderlich';
      if (!companyData.email?.trim()) newErrors.companyEmail = 'E-Mail ist erforderlich';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyData.email)) newErrors.companyEmail = 'Ungültige E-Mail-Adresse';
    }
    
    // E-Mail-Konfiguration
    if (activeTab === 'email') {
      if (!emailConfig.senderEmail) newErrors.senderEmail = 'Absender-E-Mail ist erforderlich';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailConfig.senderEmail)) newErrors.senderEmail = 'Ungültige E-Mail-Adresse';
      if (!emailConfig.senderName?.trim()) newErrors.senderName = 'Absender-Name ist erforderlich';
      if (!emailConfig.emailTemplate?.subject?.trim()) newErrors.templateSubject = 'E-Mail-Betreff ist erforderlich';
      if (!emailConfig.emailTemplate?.htmlBody?.trim()) newErrors.templateBody = 'E-Mail-Template ist erforderlich';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // DNS-Record kopieren
  const copyDNSRecord = () => {
    const record = `_mail-auth.${domainStatus.domain} TXT "${domainStatus.dnsRecordValue}"`;
    navigator.clipboard.writeText(record);
    alert('DNS-Record in Zwischenablage kopiert!');
  };

  // Domain-Verifikation
  const handleVerifyDomain = async () => {
    if (!domainStatus.domain) return;
    setDomainStatus(prev => ({ ...prev, checking: true }));
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const success = Math.random() > 0.3;
      if (success) {
        setDomainStatus(prev => ({ ...prev, verified: true, checking: false }));
        alert(`Domain ${domainStatus.domain} erfolgreich verifiziert!`);
      } else {
        alert('Domain-Verifikation fehlgeschlagen. Bitte prüfen Sie den DNS-Record.');
        setDomainStatus(prev => ({ ...prev, checking: false }));
      }
    } catch (error) {
      setDomainStatus(prev => ({ ...prev, checking: false }));
    }
  };

  // Template-Preview
  const getSampleData = () => ({
    invoiceNumber: 'RE-2025-001',
    companyName: emailConfig.senderName || companyData.name || 'Ihr Unternehmen',
    amount: '1.190,00',
    currency: 'EUR',
    date: '26.08.2025',
    dueDate: '25.09.2025',
    customerName: 'Mustermann GmbH'
  });

  const renderPreview = (text) => {
    const sampleData = getSampleData();
    return text.replace(/{{(\w+)}}/g, (match, key) => sampleData[key] || match);
  };

  // Test-E-Mail senden
  const sendTestEmail = async () => {
    if (!domainStatus.verified || Object.keys(errors).length > 0) {
      alert('Bitte vervollständigen Sie die Konfiguration und verifizieren Sie die Domain');
      return;
    }
    try {
      alert(`Test-E-Mail wird an ${emailConfig.senderEmail} gesendet...`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      alert('✅ Test-E-Mail erfolgreich versendet!');
    } catch (error) {
      alert('❌ Test-E-Mail fehlgeschlagen');
    }
  };

  // Konfiguration speichern
  const saveConfiguration = async () => {
    if (!validateForm()) return;
    setSaving(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('✅ Konfiguration erfolgreich gespeichert!');
      handleClose();
    } catch (error) {
      alert('❌ Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center">
            <Settings className="w-6 h-6 mr-2" />
            Konfiguration
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('company')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'company'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Building className="w-4 h-4 mr-2 inline" />
              Unternehmen
            </button>
            <button
              onClick={() => setActiveTab('email')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'email'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Mail className="w-4 h-4 mr-2 inline" />
              E-Mail-Versand
            </button>
            <button
              onClick={() => setActiveTab('usage')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'usage'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <BarChart3 className="w-4 h-4 mr-2 inline" />
              Nutzung & Billing
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-6 py-3 text-sm font-medium border-b-2 ${
                activeTab === 'preview'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Eye className="w-4 h-4 mr-2 inline" />
              E-Mail-Vorschau
            </button>
          </nav>
        </div>

        {/* Content - HIER IST DER FIX */}
        <div className="p-6 max-h-[calc(90vh-200px)] overflow-y-auto">
          {/* Unternehmen Tab */}
          {activeTab === 'company' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Unternehmensdaten</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Firmenname *
                    </label>
                    <input
                      type="text"
                      value={companyData.name}
                      onChange={(e) => {
                        setCompanyData(prev => ({ ...prev, name: e.target.value }));
                        validateForm();
                      }}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.companyName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Ihre Firma GmbH"
                    />
                    {errors.companyName && <p className="text-red-500 text-sm mt-1">{errors.companyName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      E-Mail-Adresse *
                    </label>
                    <input
                      type="email"
                      value={companyData.email}
                      onChange={(e) => {
                        setCompanyData(prev => ({ ...prev, email: e.target.value }));
                        validateForm();
                      }}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.companyEmail ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="info@ihre-firma.de"
                    />
                    {errors.companyEmail && <p className="text-red-500 text-sm mt-1">{errors.companyEmail}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Telefon
                    </label>
                    <input
                      type="tel"
                      value={companyData.phone}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+49 123 456789"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      USt-IdNr.
                    </label>
                    <input
                      type="text"
                      value={companyData.taxId}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, taxId: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="DE123456789"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adresse
                    </label>
                    <textarea
                      value={companyData.address}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, address: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Musterstraße 123&#10;12345 Musterstadt&#10;Deutschland"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      value={companyData.website}
                      onChange={(e) => setCompanyData(prev => ({ ...prev, website: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://www.ihre-firma.de"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* E-Mail Tab */}
          {activeTab === 'email' && (
            <div className="space-y-6">
              {/* Status-Übersicht */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <Mail className="w-6 h-6 text-blue-600 mr-3" />
                    <div>
                      <p className="text-sm text-blue-600 font-medium">E-Mail-Service</p>
                      <p className="text-lg font-bold text-blue-800">Aktiv</p>
                    </div>
                  </div>
                </div>
                
                <div className={`border rounded-lg p-4 ${domainStatus.verified ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                  <div className="flex items-center">
                    {domainStatus.verified ? <Check className="w-6 h-6 text-green-600 mr-3" /> : <AlertCircle className="w-6 h-6 text-yellow-600 mr-3" />}
                    <div>
                      <p className={`text-sm font-medium ${domainStatus.verified ? 'text-green-600' : 'text-yellow-600'}`}>Domain-Status</p>
                      <p className={`text-lg font-bold ${domainStatus.verified ? 'text-green-800' : 'text-yellow-800'}`}>
                        {domainStatus.verified ? 'Verifiziert' : 'Nicht verifiziert'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <BarChart3 className="w-6 h-6 text-gray-600 mr-3" />
                    <div>
                      <p className="text-sm text-gray-600 font-medium">Monatliche Nutzung</p>
                      <p className="text-lg font-bold text-gray-800">{usage.monthly.sent}/{usage.monthly.limit}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Absender-Konfiguration */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Absender-Einstellungen</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Absender E-Mail-Adresse *
                    </label>
                    <input
                      type="email"
                      value={emailConfig.senderEmail}
                      onChange={(e) => {
                        setEmailConfig(prev => ({ ...prev, senderEmail: e.target.value }));
                        validateForm();
                      }}
                      placeholder="rechnungen@ihre-domain.de"
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.senderEmail ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.senderEmail && <p className="text-red-500 text-sm mt-1">{errors.senderEmail}</p>}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Absender-Name *</label>
                    <input
                      type="text"
                      value={emailConfig.senderName}
                      onChange={(e) => {
                        setEmailConfig(prev => ({ ...prev, senderName: e.target.value }));
                        validateForm();
                      }}
                      placeholder={companyData.name || "Ihre Firma GmbH"}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.senderName ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.senderName && <p className="text-red-500 text-sm mt-1">{errors.senderName}</p>}
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Antwort-Adresse (Optional)</label>
                    <input
                      type="email"
                      value={emailConfig.replyTo}
                      onChange={(e) => setEmailConfig(prev => ({ ...prev, replyTo: e.target.value }))}
                      placeholder="buchhaltung@ihre-domain.de"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Domain-Verifikation */}
              {domainStatus.domain && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold mb-4">Domain-Verifikation</h3>
                  
                  {!domainStatus.verified ? (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
                        <div className="flex-1">
                          <h4 className="font-medium text-yellow-800 mb-2">
                            Domain {domainStatus.domain} noch nicht verifiziert
                          </h4>
                          <p className="text-sm text-yellow-700 mb-4">
                            Setzen Sie folgenden DNS-Record bei Ihrem Domain-Provider:
                          </p>
                          
                          <div className="bg-white border border-yellow-300 rounded-lg p-4 mb-4">
                            <div className="grid grid-cols-1 gap-2 text-sm">
                              <div>
                                <span className="font-medium text-gray-700">Typ: </span>
                                <code className="bg-gray-100 px-2 py-1 rounded">TXT</code>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Name: </span>
                                <code className="bg-gray-100 px-2 py-1 rounded break-all">_mail-auth.{domainStatus.domain}</code>
                              </div>
                              <div>
                                <span className="font-medium text-gray-700">Wert: </span>
                                <div className="flex items-center">
                                  <code className="bg-gray-100 px-2 py-1 rounded text-xs break-all flex-1">{domainStatus.dnsRecordValue}</code>
                                  <button
                                    onClick={copyDNSRecord}
                                    className="ml-2 p-1 text-blue-600 hover:text-blue-800"
                                    title="DNS-Record kopieren"
                                  >
                                    <Copy className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <button
                              onClick={handleVerifyDomain}
                              disabled={domainStatus.checking}
                              className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50 text-sm"
                            >
                              {domainStatus.checking ? 'Überprüfe...' : 'Domain verifizieren'}
                            </button>
                            
                            <a
                              href="https://docs.ihre-software.com/email-setup"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                            >
                              Setup-Anleitung <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center">
                        <Check className="w-5 h-5 text-green-600 mr-3" />
                        <div>
                          <h4 className="font-medium text-green-800">
                            Domain {domainStatus.domain} erfolgreich verifiziert
                          </h4>
                          <p className="text-sm text-green-700">
                            E-Mails können jetzt sicher von Ihrer Domain versendet werden.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Usage Tab */}
          {activeTab === 'usage' && (
            <div className="space-y-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Ihr aktueller Plan</h3>
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium capitalize">{usage.plan}</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Aktuelle Nutzung</h4>
                    <div className="text-2xl font-bold text-blue-600 mb-1">
                      {usage.monthly.sent}<span className="text-sm text-gray-500">/{usage.monthly.limit}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, (usage.monthly.sent / usage.monthly.limit) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600">{usage.monthly.limit - usage.monthly.sent} E-Mails verbleibend</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Heute versendet</h4>
                    <div className="text-2xl font-bold text-gray-700 mb-1">
                      {usage.daily.sent}<span className="text-sm text-gray-500">/{usage.daily.limit}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${Math.min(100, (usage.daily.sent / usage.daily.limit) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-600">Tägliches Limit</p>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-900 mb-2">Kosten (Monat)</h4>
                    <div className="text-2xl font-bold text-green-600 mb-1">€{usage.monthly.cost.toFixed(2)}</div>
                    <p className="text-xs text-gray-600">
                      {usage.plan === 'basic' ? 'Inklusive' : `${usage.plan} Plan`}
                    </p>
                    <p className="text-xs text-gray-500">Gesamt: {usage.total.sent} E-Mails</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Basic Plan */}
                <div className={`border rounded-lg p-4 ${usage.plan === 'basic' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                  <div className="text-center">
                    <h4 className="font-semibold text-lg">Basic</h4>
                    <div className="text-xl font-bold my-2">Kostenlos</div>
                    <ul className="text-xs text-gray-600 space-y-1 mb-4 text-left">
                      <li>✓ 100 E-Mails/Monat</li>
                      <li>✓ Domain-Verifikation</li>
                      <li>✓ Standard-Templates</li>
                    </ul>
                    {usage.plan === 'basic' ? (
                      <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Aktueller Plan</div>
                    ) : (
                      <button className="bg-gray-600 text-white px-3 py-1 rounded text-xs hover:bg-gray-700">Wechseln</button>
                    )}
                  </div>
                </div>

                {/* Pro Plan */}
                <div className={`border rounded-lg p-4 ${usage.plan === 'pro' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                  <div className="text-center">
                    <h4 className="font-semibold text-lg">Professional</h4>
                    <div className="text-xl font-bold my-2">€10/Monat</div>
                    <ul className="text-xs text-gray-600 space-y-1 mb-4 text-left">
                      <li>✓ 1.000 E-Mails/Monat</li>
                      <li>✓ Premium-Templates</li>
                      <li>✓ Analytics Dashboard</li>
                    </ul>
                    {usage.plan === 'pro' ? (
                      <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Aktueller Plan</div>
                    ) : (
                      <button className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700">Upgraden</button>
                    )}
                  </div>
                </div>

                {/* Enterprise Plan */}
                <div className={`border rounded-lg p-4 ${usage.plan === 'enterprise' ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                  <div className="text-center">
                    <h4 className="font-semibold text-lg">Enterprise</h4>
                    <div className="text-xl font-bold my-2">€50/Monat</div>
                    <ul className="text-xs text-gray-600 space-y-1 mb-4 text-left">
                      <li>✓ 10.000 E-Mails/Monat</li>
                      <li>✓ API-Zugang</li>
                      <li>✓ SLA Garantie</li>
                    </ul>
                    {usage.plan === 'enterprise' ? (
                      <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Aktueller Plan</div>
                    ) : (
                      <button className="bg-blue-600 text-white px-3 py-1 rounded text-xs hover:bg-blue-700">Upgraden</button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Preview Tab */}
          {activeTab === 'preview' && (
            <div className="space-y-6">
              {/* E-Mail-Vorschau */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Eye className="w-5 h-5 mr-2" />
                  Live-Vorschau Ihrer E-Mail
                </h3>
                
                <div className="border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                  {/* E-Mail-Header */}
                  <div className="bg-gray-100 border-b border-gray-300 p-4 text-sm">
                    <div className="grid grid-cols-[100px_1fr] gap-2">
                      <span className="font-medium text-gray-700">Von:</span>
                      <span className="break-all">{emailConfig.senderName || 'Ihr Unternehmen'} &lt;{emailConfig.senderEmail || 'absender@domain.de'}&gt;</span>
                      
                      <span className="font-medium text-gray-700">An:</span>
                      <span>max.mustermann@kunde.de</span>
                      
                      <span className="font-medium text-gray-700">Antwort an:</span>
                      <span className="break-all">{emailConfig.replyTo || emailConfig.senderEmail || 'absender@domain.de'}</span>
                      
                      <span className="font-medium text-gray-700">Betreff:</span>
                      <span className="font-medium">{renderPreview(emailConfig.emailTemplate.subject)}</span>
                      
                      <span className="font-medium text-gray-700">Anhänge:</span>
                      <span className="flex items-center">
                        📎 XRechnung-RE-2025-001.xml 
                        <span className="text-gray-500 ml-2">(4.2 KB)</span>
                      </span>
                    </div>
                  </div>
                  
                  {/* E-Mail-Body */}
                  <div className="p-6 bg-white max-h-80 overflow-y-auto">
                    <div 
                      className="prose prose-sm max-w-none"
                      dangerouslySetInnerHTML={{
                        __html: renderPreview(emailConfig.emailTemplate.htmlBody)
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Template-Variablen Referenz */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Verfügbare Template-Variablen</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Rechnungsdaten:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center p-2 bg-gray-100 rounded">
                        <code className="bg-white px-2 py-1 rounded font-mono text-xs">{{invoiceNumber}}</code>
                        <span className="text-gray-600">RE-2025-001</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-gray-100 rounded">
                        <code className="bg-white px-2 py-1 rounded font-mono text-xs">{{amount}}</code>
                        <span className="text-gray-600">1.190,00</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-gray-100 rounded">
                        <code className="bg-white px-2 py-1 rounded font-mono text-xs">{{currency}}</code>
                        <span className="text-gray-600">EUR</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-gray-100 rounded">
                        <code className="bg-white px-2 py-1 rounded font-mono text-xs">{{date}}</code>
                        <span className="text-gray-600">26.08.2025</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-gray-100 rounded">
                        <code className="bg-white px-2 py-1 rounded font-mono text-xs">{{dueDate}}</code>
                        <span className="text-gray-600">25.09.2025</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Firmen-/Kundendaten:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center p-2 bg-gray-100 rounded">
                        <code className="bg-white px-2 py-1 rounded font-mono text-xs">{{companyName}}</code>
                        <span className="text-gray-600">{emailConfig.senderName || companyData.name || 'Ihr Unternehmen'}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-gray-100 rounded">
                        <code className="bg-white px-2 py-1 rounded font-mono text-xs">{{customerName}}</code>
                        <span className="text-gray-600">Mustermann GmbH</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer mit Action Buttons */}
        <div className="border-t border-gray-200 bg-gray-50 px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Status-Indikatoren */}
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  domainStatus.verified ? 'bg-green-500' : 'bg-yellow-500'
                }`} />
                <span>Domain: {domainStatus.verified ? 'Verifiziert' : 'Nicht verifiziert'}</span>
              </div>
              
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  Object.keys(errors).length === 0 ? 'bg-green-500' : 'bg-red-500'
                }`} />
                <span>Konfiguration: {Object.keys(errors).length === 0 ? 'Vollständig' : 'Unvollständig'}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              {activeTab === 'email' && (
                <button
                  onClick={sendTestEmail}
                  disabled={!domainStatus.verified || Object.keys(errors).length > 0}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center text-sm"
                >
                  <Send className="w-4 h-4 mr-2" />
                  Test-E-Mail senden
                </button>
              )}
              
              <button
                onClick={handleClose}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 text-sm"
              >
                Abbrechen
              </button>
              
              <button
                onClick={saveConfiguration}
                disabled={saving || Object.keys(errors).length > 0}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center text-sm"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Speichert...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Speichern
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfigModal;