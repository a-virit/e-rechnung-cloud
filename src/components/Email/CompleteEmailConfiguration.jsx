import React, { useState, useEffect } from 'react';
import { Mail, Check, AlertCircle, Copy, ExternalLink, Settings, BarChart3, Send, Eye, EyeOff } from 'lucide-react';

const CompleteEmailConfiguration = () => {
  const [activeTab, setActiveTab] = useState('config');
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

  const [domainStatus, setDomainStatus] = useState({
    verified: false,
    checking: false,
    domain: null,
    verificationToken: null,
    dnsRecordValue: null
  });

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

  // Form-Validation
  const validateForm = () => {
    const newErrors = {};
    if (!emailConfig.senderEmail) newErrors.senderEmail = 'Absender-E-Mail ist erforderlich';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailConfig.senderEmail)) newErrors.senderEmail = 'Ungültige E-Mail-Adresse';
    if (!emailConfig.senderName?.trim()) newErrors.senderName = 'Absender-Name ist erforderlich';
    if (!emailConfig.emailTemplate?.subject?.trim()) newErrors.templateSubject = 'E-Mail-Betreff ist erforderlich';
    if (!emailConfig.emailTemplate?.htmlBody?.trim()) newErrors.templateBody = 'E-Mail-Template ist erforderlich';
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
    companyName: emailConfig.senderName || 'Ihr Unternehmen',
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
      alert('✅ E-Mail-Konfiguration erfolgreich gespeichert!');
    } catch (error) {
      alert('❌ Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center mb-2">
          <Mail className="w-8 h-8 mr-3 text-blue-600" />
          E-Mail-Konfiguration
        </h1>
        <p className="text-gray-600">
          Konfigurieren Sie den E-Mail-Versand für Ihre Rechnungen. Einfach und sicher über unseren SaaS-Service.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border border-gray-200 rounded-lg mb-6">
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('config')}
            className={`px-6 py-4 text-sm font-medium border-b-2 ${
              activeTab === 'config' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Settings className="w-4 h-4 mr-2 inline" />
            Konfiguration
          </button>
          <button
            onClick={() => setActiveTab('usage')}
            className={`px-6 py-4 text-sm font-medium border-b-2 ${
              activeTab === 'usage' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart3 className="w-4 h-4 mr-2 inline" />
            Nutzung & Billing
          </button>
          <button
            onClick={() => setActiveTab('preview')}
            className={`px-6 py-4 text-sm font-medium border-b-2 ${
              activeTab === 'preview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Eye className="w-4 h-4 mr-2 inline" />
            Vorschau
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Konfiguration Tab */}
          {activeTab === 'config' && (
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
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Settings className="w-5 h-5 mr-2" />
                  Absender-Einstellungen
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                      className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.senderEmail ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.senderEmail && <p className="text-red-500 text-sm mt-1">{errors.senderEmail}</p>}
                    <p className="text-xs text-gray-500 mt-1">Diese Adresse erscheint als Absender Ihrer Rechnungs-E-Mails</p>
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
                      placeholder="Ihre Firma GmbH"
                      className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
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
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Adresse für Kundenantworten (falls abweichend vom Absender)</p>
                  </div>
                </div>
              </div>

              {/* Domain-Verifikation */}
              {domainStatus.domain && (
                <div className="bg-white border border-gray-200 rounded-lg p-6">
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
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <label className="block font-medium text-gray-700 mb-1">Typ:</label>
                                <code className="bg-gray-100 px-2 py-1 rounded">TXT</code>
                              </div>
                              <div>
                                <label className="block font-medium text-gray-700 mb-1">Name:</label>
                                <code className="bg-gray-100 px-2 py-1 rounded break-all">_mail-auth.{domainStatus.domain}</code>
                              </div>
                              <div>
                                <label className="block font-medium text-gray-700 mb-1">Wert:</label>
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
                              className="bg-yellow-600 text-white px-6 py-2 rounded-md hover:bg-yellow-700 disabled:opacity-50 text-sm font-medium"
                            >
                              {domainStatus.checking ? 'Überprüfe DNS...' : 'Domain jetzt verifizieren'}
                            </button>
                            
                            <a
                              href="https://docs.ihre-software.com/email-setup"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 text-sm flex items-center font-medium"
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

              {/* Template-Editor */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">E-Mail-Template bearbeiten</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">E-Mail-Betreff *</label>
                    <input
                      type="text"
                      value={emailConfig.emailTemplate.subject}
                      onChange={(e) => setEmailConfig(prev => ({
                        ...prev,
                        emailTemplate: { ...prev.emailTemplate, subject: e.target.value }
                      }))}
                      className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.templateSubject ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.templateSubject && <p className="text-red-500 text-sm mt-1">{errors.templateSubject}</p>}
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">E-Mail-Inhalt (HTML) *</label>
                      <button
                        onClick={() => setShowPreview(!showPreview)}
                        className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                      >
                        {showPreview ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                        {showPreview ? 'Editor anzeigen' : 'Vorschau anzeigen'}
                      </button>
                    </div>
                    
                    {!showPreview ? (
                      <textarea
                        value={emailConfig.emailTemplate.htmlBody}
                        onChange={(e) => setEmailConfig(prev => ({
                          ...prev,
                          emailTemplate: { ...prev.emailTemplate, htmlBody: e.target.value }
                        }))}
                        rows={12}
                        className={`w-full px-4 py-3 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm ${
                          errors.templateBody ? 'border-red-500' : 'border-gray-300'
                        }`}
                      />
                    ) : (
                      <div className="border border-gray-300 rounded-lg p-4 bg-white min-h-[300px]">
                        <div 
                          className="prose prose-sm max-w-none"
                          dangerouslySetInnerHTML={{ __html: renderPreview(emailConfig.emailTemplate.htmlBody) }}
                        />
                      </div>
                    )}
                    
                    {errors.templateBody && <p className="text-red-500 text-sm mt-1">{errors.templateBody}</p>}
                    
                    <div className="flex flex-wrap gap-2 mt-3">
                      {['invoiceNumber', 'companyName', 'amount', 'currency', 'customerName', 'date', 'dueDate'].map(variable => (
                        <span 
                          key={variable}
                          className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full cursor-pointer hover:bg-blue-200"
                          onClick={() => setEmailConfig(prev => ({
                            ...prev,
                            emailTemplate: { ...prev.emailTemplate, htmlBody: prev.emailTemplate.htmlBody + `{{${variable}}}` }
                          }))}
                        >
                          {`{{${variable}}}`}
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">💡 Klicken Sie auf eine Variable, um sie zum Template hinzuzufügen</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Nutzung & Billing Tab */}
          {activeTab === 'usage' && (
            <div className="space-y-6">
              {/* Plan-Übersicht */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Ihr aktueller Plan</h3>
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium capitalize">{usage.plan}</span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Monatliche Nutzung */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Aktuelle Nutzung (August 2025)</h4>
                    <div className="text-3xl font-bold text-blue-600 mb-1">
                      {usage.monthly.sent}<span className="text-lg text-gray-500">/{usage.monthly.limit}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                      <div 
                        className={`h-3 rounded-full transition-all duration-300 ${
                          usage.monthly.sent / usage.monthly.limit > 0.8 ? 'bg-red-500' : 
                          usage.monthly.sent / usage.monthly.limit > 0.6 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(100, (usage.monthly.sent / usage.monthly.limit) * 100)}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600">{usage.monthly.limit - usage.monthly.sent} E-Mails verbleibend</p>
                  </div>

                  {/* Tägliche Nutzung */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Heute versendet</h4>
                    <div className="text-3xl font-bold text-gray-700 mb-1">
                      {usage.daily.sent}<span className="text-lg text-gray-500">/{usage.daily.limit}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                      <div 
                        className="bg-blue-500 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (usage.daily.sent / usage.daily.limit) * 100)}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600">Tägliches Limit: {usage.daily.limit}</p>
                  </div>

                  {/* Kosten */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Kosten (aktueller Monat)</h4>
                    <div className="text-3xl font-bold text-green-600 mb-1">€{usage.monthly.cost.toFixed(2)}</div>
                    <p className="text-sm text-gray-600 mb-2">
                      {usage.plan === 'basic' ? 'Inklusive in Basic Plan' : `${usage.plan} Plan: €10/Monat`}
                    </p>
                    <p className="text-xs text-gray-500">Gesamt gesendet: {usage.total.sent} E-Mails</p>
                  </div>
                </div>
              </div>

              {/* Plan-Upgrade */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Verfügbare Pläne</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Basic Plan */}
                  <div className={`border rounded-lg p-4 transition-all ${usage.plan === 'basic' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="text-center">
                      <h4 className="font-semibold text-lg">Basic</h4>
                      <div className="text-2xl font-bold my-2">Kostenlos</div>
                      <ul className="text-sm text-gray-600 space-y-1 mb-4 text-left">
                        <li>✓ 100 E-Mails/Monat</li>
                        <li>✓ Domain-Verifikation</li>
                        <li>✓ Standard-Templates</li>
                        <li>✓ XRechnung-Format</li>
                      </ul>
                      {usage.plan === 'basic' ? (
                        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm font-medium">
                          Aktueller Plan
                        </div>
                      ) : (
                        <button className="bg-gray-600 text-white px-4 py-2 rounded text-sm hover:bg-gray-700">
                          Zu Basic wechseln
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Pro Plan */}
                  <div className={`border rounded-lg p-4 transition-all ${usage.plan === 'pro' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="text-center">
                      <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium mb-2 inline-block">
                        Beliebt
                      </div>
                      <h4 className="font-semibold text-lg">Professional</h4>
                      <div className="text-2xl font-bold my-2">€10/Monat</div>
                      <ul className="text-sm text-gray-600 space-y-1 mb-4 text-left">
                        <li>✓ 1.000 E-Mails/Monat</li>
                        <li>✓ Premium-Templates</li>
                        <li>✓ Analytics Dashboard</li>
                        <li>✓ Priority Support</li>
                        <li>✓ Custom Branding</li>
                      </ul>
                      {usage.plan === 'pro' ? (
                        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm font-medium">
                          Aktueller Plan
                        </div>
                      ) : (
                        <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 font-medium">
                          Auf Pro upgraden
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Enterprise Plan */}
                  <div className={`border rounded-lg p-4 transition-all ${usage.plan === 'enterprise' ? 'border-blue-500 bg-blue-50 shadow-md' : 'border-gray-200 hover:border-gray-300'}`}>
                    <div className="text-center">
                      <h4 className="font-semibold text-lg">Enterprise</h4>
                      <div className="text-2xl font-bold my-2">€50/Monat</div>
                      <ul className="text-sm text-gray-600 space-y-1 mb-4 text-left">
                        <li>✓ 10.000 E-Mails/Monat</li>
                        <li>✓ Custom Templates</li>
                        <li>✓ API-Zugang</li>
                        <li>✓ SLA Garantie 99,9%</li>
                        <li>✓ Dedicated Support</li>
                        <li>✓ White-Label Option</li>
                      </ul>
                      {usage.plan === 'enterprise' ? (
                        <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm font-medium">
                          Aktueller Plan
                        </div>
                      ) : (
                        <button className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 font-medium">
                          Auf Enterprise upgraden
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Nutzungshistorie */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Nutzungshistorie</h3>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 font-medium text-gray-700">Monat</th>
                        <th className="text-right py-2 font-medium text-gray-700">E-Mails gesendet</th>
                        <th className="text-right py-2 font-medium text-gray-700">Limit</th>
                        <th className="text-right py-2 font-medium text-gray-700">Kosten</th>
                        <th className="text-right py-2 font-medium text-gray-700">Plan</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-gray-100">
                        <td className="py-3">August 2025</td>
                        <td className="text-right py-3 font-medium">23</td>
                        <td className="text-right py-3">100</td>
                        <td className="text-right py-3 text-green-600 font-medium">€0,00</td>
                        <td className="text-right py-3"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Basic</span></td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3">Juli 2025</td>
                        <td className="text-right py-3">87</td>
                        <td className="text-right py-3">100</td>
                        <td className="text-right py-3 text-green-600 font-medium">€0,00</td>
                        <td className="text-right py-3"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Basic</span></td>
                      </tr>
                      <tr className="border-b border-gray-100">
                        <td className="py-3">Juni 2025</td>
                        <td className="text-right py-3">124</td>
                        <td className="text-right py-3">1.000</td>
                        <td className="text-right py-3 text-green-600 font-medium">€10,00</td>
                        <td className="text-right py-3"><span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">Pro</span></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Billing-Zusammenfassung */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Aktuelle Rechnung */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Aktuelle Rechnung (August)</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Basic Plan</span>
                      <span className="font-medium">€0,00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">23 E-Mails versendet</span>
                      <span className="font-medium">€0,00</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Zusätzliche E-Mails (über Limit)</span>
                      <span className="text-gray-500">€0,00</span>
                    </div>
                    <hr />
                    <div className="flex justify-between font-bold">
                      <span>Gesamt</span>
                      <span>€0,00</span>
                    </div>
                  </div>
                </div>

                {/* Nächste Rechnung (Prognose) */}
                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">Prognose September</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Plan-Kosten</span>
                      <span className="font-medium">€0,00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Geschätzte E-Mails</span>
                      <span className="font-medium text-gray-500">~30</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Zusätzliche Kosten</span>
                      <span className="text-gray-500">€0,00</span>
                    </div>
                    <hr />
                    <div className="flex justify-between font-bold">
                      <span>Geschätzt</span>
                      <span>€0,00</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-800">
                    💡 Bei Ihrem aktuellen Verbrauch reicht der Basic Plan völlig aus!
                  </div>
                </div>
              </div>

              {/* Upgrade-Empfehlung */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-2">Wachstum geplant?</h4>
                    <p className="text-sm text-gray-600 mb-3">
                      Bei mehr als 80 E-Mails/Monat empfehlen wir ein Upgrade auf Pro für bessere Performance und zusätzliche Features.
                    </p>
                    <ul className="text-sm text-gray-600 space-y-1">
                      <li>• 10x mehr E-Mail-Volumen</li>
                      <li>• Priority Support-Queue</li>
                      <li>• Erweiterte Analytics</li>
                    </ul>
                  </div>
                  <div className="text-center">
                    <button className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 font-medium">
                      Jetzt upgraden
                    </button>
                    <p className="text-xs text-gray-500 mt-1">30 Tage Geld-zurück-Garantie</p>
                  </div>
                </div>
              </div>
            </div>
          )}
          {/* Vorschau Tab */}
          {activeTab === 'preview' && (
            <div className="space-y-6">
              {/* E-Mail-Vorschau */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Eye className="w-5 h-5 mr-2" />
                  Live-Vorschau Ihrer E-Mail
                </h3>
                
                <div className="border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                  {/* E-Mail-Header */}
                  <div className="bg-gray-100 border-b border-gray-300 p-4 text-sm">
                    <div className="grid grid-cols-[120px_1fr] gap-2">
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
                  <div className="p-6 bg-white max-h-96 overflow-y-auto">
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
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Verfügbare Template-Variablen</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Rechnungsdaten:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <code className="bg-gray-200 px-2 py-1 rounded font-mono">{`{{invoiceNumber}}`}</code>
                        <span className="text-gray-600">RE-2025-001</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <code className="bg-gray-200 px-2 py-1 rounded font-mono">{`{{amount}}`}</code>
                        <span className="text-gray-600">1.190,00</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <code className="bg-gray-200 px-2 py-1 rounded font-mono">{`{{currency}}`}</code>
                        <span className="text-gray-600">EUR</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <code className="bg-gray-200 px-2 py-1 rounded font-mono">{`{{date}}`}</code>
                        <span className="text-gray-600">26.08.2025</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <code className="bg-gray-200 px-2 py-1 rounded font-mono">{`{{dueDate}}`}</code>
                        <span className="text-gray-600">25.09.2025</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Firmen-/Kundendaten:</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <code className="bg-gray-200 px-2 py-1 rounded font-mono">{`{{companyName}}`}</code>
                        <span className="text-gray-600">{emailConfig.senderName || 'Ihr Unternehmen'}</span>
                      </div>
                      <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <code className="bg-gray-200 px-2 py-1 rounded font-mono">{`{{customerName}}`}</code>
                        <span className="text-gray-600">Mustermann GmbH</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mt-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Status-Indikatoren */}
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${
                domainStatus.verified ? 'bg-green-500' : 'bg-yellow-500'
              }`} />
              <span className="font-medium">Domain:</span>
              <span className={domainStatus.verified ? 'text-green-700 ml-1' : 'text-yellow-700 ml-1'}>
                {domainStatus.verified ? 'Verifiziert' : 'Nicht verifiziert'}
              </span>
            </div>
            
            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${
                Object.keys(errors).length === 0 ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="font-medium">Konfiguration:</span>
              <span className={Object.keys(errors).length === 0 ? 'text-green-700 ml-1' : 'text-red-700 ml-1'}>
                {Object.keys(errors).length === 0 ? 'Vollständig' : 'Unvollständig'}
              </span>
            </div>

            <div className="flex items-center">
              <div className={`w-3 h-3 rounded-full mr-2 ${
                usage.monthly.sent < usage.monthly.limit ? 'bg-green-500' : 'bg-red-500'
              }`} />
              <span className="font-medium">Quota:</span>
              <span className={usage.monthly.sent < usage.monthly.limit ? 'text-green-700 ml-1' : 'text-red-700 ml-1'}>
                {usage.monthly.limit - usage.monthly.sent} verbleibend
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            <button
              onClick={sendTestEmail}
              disabled={!domainStatus.verified || Object.keys(errors).length > 0}
              className="bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center font-medium"
            >
              <Send className="w-4 h-4 mr-2" />
              Test-E-Mail senden
            </button>
            
            <button
              onClick={saveConfiguration}
              disabled={saving || Object.keys(errors).length > 0}
              className="bg-blue-600 text-white px-6 py-3 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center font-medium"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Speichert...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Konfiguration speichern
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Info-Boxen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        {/* SaaS-Service Vorteile */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-start">
            <Mail className="w-6 h-6 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-blue-900 mb-3">SaaS E-Mail-Service Vorteile</h4>
              <ul className="text-sm text-blue-800 space-y-2">
                <li className="flex items-center">
                  <Check className="w-4 h-4 mr-2 text-blue-600" />
                  Keine komplizierten Server-Konfigurationen
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 mr-2 text-blue-600" />
                  99,9% Verfügbarkeit mit Fallback-Providern
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 mr-2 text-blue-600" />
                  Optimierte Spam-Filter-Behandlung
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 mr-2 text-blue-600" />
                  DSGVO-konforme E-Mail-Verarbeitung
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 mr-2 text-blue-600" />
                  Automatisches Monitoring & Alerts
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 mr-2 text-blue-600" />
                  Professionelle E-Mail-Templates
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Sicherheit & Compliance */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-start">
            <Check className="w-6 h-6 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-green-900 mb-3">Sicherheit & Compliance</h4>
              <ul className="text-sm text-green-800 space-y-2">
                <li className="flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 text-green-600" />
                  Domain-Verifikation via DNS-Record
                </li>
                <li className="flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 text-green-600" />
                  Keine E-Mail-Passwörter gespeichert
                </li>
                <li className="flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 text-green-600" />
                  Token-basierte Authentifizierung
                </li>
                <li className="flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 text-green-600" />
                  Audit-Logs für alle E-Mail-Aktivitäten
                </li>
                <li className="flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 text-green-600" />
                  SOC 2 Type II zertifizierte Infrastruktur
                </li>
                <li className="flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2 text-green-600" />
                  Automatische Backup & Disaster Recovery
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Setup-Guide für neue Nutzer */}
      {!emailConfig.senderEmail && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold mb-6 text-center">Quick Setup in 3 einfachen Schritten</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
                1
              </div>
              <h4 className="font-medium mb-3 text-blue-900">E-Mail konfigurieren</h4>
              <p className="text-sm text-blue-700">
                Tragen Sie Ihre Absender-E-Mail und Firmennamen ein. Keine Passwörter erforderlich!
              </p>
            </div>
            
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
                2
              </div>
              <h4 className="font-medium mb-3 text-yellow-900">Domain verifizieren</h4>
              <p className="text-sm text-yellow-700">
                Einen einfachen DNS-Record bei Ihrem Domain-Provider setzen. Einmalig erforderlich.
              </p>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-xl">
                3
              </div>
              <h4 className="font-medium mb-3 text-green-900">E-Mails versenden</h4>
              <p className="text-sm text-green-700">
                Rechnungen direkt von Ihrer eigenen Domain versenden. Professionell und zuverlässig.
              </p>
            </div>
          </div>
          
          <div className="text-center mt-6">
            <button className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 font-medium">
              Jetzt konfigurieren
            </button>
          </div>
        </div>
      )}

      {/* Feature-Vergleich */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6 mt-6">
        <h3 className="text-lg font-semibold mb-4 text-center">Warum unser SaaS E-Mail-Service?</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Traditionelle Lösung */}
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <h4 className="font-medium text-red-800 mb-3">❌ Traditionelle E-Mail-Integration</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Komplizierte SMTP-Konfiguration pro Kunde</li>
              <li>• Passwörter und Credentials verwalten</li>
              <li>• Unterschiedliche Provider = Support-Chaos</li>
              <li>• Spam-Probleme bei kleinen Domains</li>
              <li>• Keine zentrale Überwachung</li>
              <li>• Sicherheitsrisiken durch Credential-Storage</li>
            </ul>
          </div>

          {/* Unsere SaaS-Lösung */}
          <div className="bg-white rounded-lg p-4 border border-green-300 shadow-sm">
            <h4 className="font-medium text-green-800 mb-3">✅ Unser SaaS E-Mail-Service</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Nur Domain + Name eingeben</li>
              <li>• DNS-Record setzen = fertig!</li>
              <li>• Ein Service für alle Kunden</li>
              <li>• Optimierte Deliverability</li>
              <li>• Zentrale Analytics & Monitoring</li>
              <li>• Enterprise-Security ohne Aufwand</li>
            </ul>
          </div>
        </div>
        
        <div className="text-center mt-4">
          <p className="text-sm text-purple-700 font-medium">
            🚀 Reduziert Setup-Zeit von Stunden auf Minuten
          </p>
        </div>
      </div>

      {/* Support & Dokumentation */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mt-6">
        <h3 className="text-lg font-semibold mb-4">Hilfe & Support</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <a href="https://docs.ihre-software.com/email-setup" 
             target="_blank" 
             rel="noopener noreferrer"
             className="block p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors">
            <div className="flex items-center">
              <ExternalLink className="w-5 h-5 text-blue-600 mr-3" />
              <div>
                <h4 className="font-medium text-blue-900">Setup-Dokumentation</h4>
                <p className="text-sm text-blue-700">Schritt-für-Schritt Anleitung</p>
              </div>
            </div>
          </a>
          
          <a href="mailto:support@ihre-software.com" 
             className="block p-4 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors">
            <div className="flex items-center">
              <Mail className="w-5 h-5 text-green-600 mr-3" />
              <div>
                <h4 className="font-medium text-green-900">E-Mail Support</h4>
                <p className="text-sm text-green-700">support@ihre-software.com</p>
              </div>
            </div>
          </a>
          
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center">
              <BarChart3 className="w-5 h-5 text-gray-600 mr-3" />
              <div>
                <h4 className="font-medium text-gray-900">Service-Status</h4>
                <p className="text-sm text-green-600 font-medium">✅ Alle Systeme normal</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing-Reminder */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mt-6">
        <div className="text-center">
          <div className="inline-flex items-center text-sm text-gray-600 bg-gray-100 px-4 py-2 rounded-full">
            <span>💰 Basic: 100 E-Mails/Monat inklusive</span>
            <span className="mx-3 text-gray-400">•</span>
            <span>Pro: 1.000 E-Mails/Monat +€10</span>
            <span className="mx-3 text-gray-400">•</span>
            <span>Enterprise: 10.000 E-Mails/Monat +€50</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteEmailConfiguration;