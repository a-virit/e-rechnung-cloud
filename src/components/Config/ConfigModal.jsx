// ConfigModal.jsx - E-Mail Section mit Test-Funktion
import React, { useState, useEffect } from 'react';
import { X, Building, Mail, CreditCard, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const ConfigModal = () => {
  const { state, actions } = useApp();
  const { modals, config } = state;
  const isOpen = modals.config;

  const [configData, setConfigData] = useState({
    company: {},
    email: {},
    templates: { invoice: {} },
    invoice: {}
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState('company');

  // Test-E-Mail Status
  const [testEmailStatus, setTestEmailStatus] = useState(null); // 'sending', 'success', 'error'
  const [testEmailMessage, setTestEmailMessage] = useState('');

  // Config Data laden
  useEffect(() => { //
    setConfigData({
      company: config.company || {},
      email: config.email || {},
      templates: config.templates || { invoice: {} },
      invoice: config.invoice || {}
    });
  }, [config, isOpen]);

  // Modal schließen
  const handleClose = () => {
    actions.closeModal('config'); //
    setActiveSection('company');
    setTestEmailStatus(null);
    setTestEmailMessage('');
  };

  // Test-E-Mail senden
  const handleTestEmail = async () => {
    if (!configData.email.senderEmail) {
      setTestEmailStatus('error');
      setTestEmailMessage('Bitte geben Sie zuerst eine Absender-E-Mail ein');
      return;
    }

    setTestEmailStatus({status: 'sending'});
    setTestEmailMessage('Test-E-Mail wird versendet...');

    try {
      const response = await fetch('/api/test-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emailConfig: configData.email,
          companyConfig: configData.company
        })
      });

      const result = await response.json();

      if (result.success) {
        setTestEmailStatus('success');
        setTestEmailMessage(`✅ Test-E-Mail erfolgreich versendet! Überprüfen Sie Ihr Postfach: ${configData.email.senderEmail}`);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Test email error:', error);
      setTestEmailStatus('error');
      setTestEmailMessage(`❌ Fehler beim Test-Versand: ${error.message}`);
    }
  };

  // Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await actions.updateConfig(configData);
      handleClose();
      actions.showError('Konfiguration erfolgreich gespeichert!');
    } catch (error) {
      actions.showError('Fehler beim Speichern: ' + error.message);
      console.error('Config save error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold">Systemkonfiguration</h2>
            <button 
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
            <TabButton
              id="company"
              label="Unternehmen"
              icon={Building}
              activeSection={activeSection}
              setActiveSection={setActiveSection}
            />
            <TabButton
              id="email"
              label="E-Mail"
              icon={Mail}
              activeSection={activeSection}
              setActiveSection={setActiveSection}
            />
            <TabButton
              id="invoice"
              label="Rechnungen"
              icon={CreditCard}
              activeSection={activeSection}
              setActiveSection={setActiveSection}
            />
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Unternehmensdaten */}
            {activeSection === 'company' && (
              <CompanySection 
                data={configData.company}
                onChange={(companyData) => setConfigData({
                  ...configData,
                  company: { ...configData.company, ...companyData }
                })}
              />
            )}

            {/* E-Mail-Konfiguration mit Test-Funktion */}
            {activeSection === 'email' && (
              <EmailSection 
                data={configData.email}
                templates={configData.templates}
                onChange={(emailData) => {
                  setConfigData({
                    ...configData,
                    email: { ...configData.email, ...emailData }
                  });
                  // Test-Status zurücksetzen bei Änderungen
                  if (testEmailStatus) {
                    setTestEmailStatus(null);
                    setTestEmailMessage('');
                  }
                }}
                onTemplateChange={(templates) => setConfigData({
                  ...configData,
                  templates
                })}
                onTestEmail={handleTestEmail}
                testEmailStatus={testEmailStatus}
                testEmailMessage={testEmailMessage}
              />
            )}

            {/* Rechnungseinstellungen */}
            {activeSection === 'invoice' && (
              <InvoiceSection 
                data={configData.invoice}
                onChange={(invoiceData) => setConfigData({
                  ...configData,
                  invoice: { ...configData.invoice, ...invoiceData }
                })}
              />
            )}
            
            {/* Buttons */}
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {isSubmitting && <Spinner />}
                {isSubmitting ? 'Speichere...' : 'Konfiguration speichern'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// E-Mail Sektion mit Test-Funktion
// VOLLSTÄNDIGE EmailSection mit Test-E-Mail-Button:

const EmailSection = ({ data, templates, onChange, onTemplateChange, onTestEmail, testEmailStatus, testEmailMessage }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold flex items-center">
      <Mail className="w-5 h-5 mr-2" />
      E-Mail-Versand
    </h3>
    
    {/* Info-Banner */}
    <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
      <p className="text-sm text-blue-700">
        📧 <strong>Einfache E-Mail-Konfiguration:</strong> Geben Sie nur Ihre gewünschte Absender-E-Mail ein. 
        Unser System übernimmt den technischen E-Mail-Versand über professionelle Mailserver.
      </p>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* KORRIGIERT: Neue Provider-Auswahl */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail-Service</label>
        <select
          value={data.provider || 'sendgrid'}
          onChange={(e) => onChange({ provider: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="sendgrid">SendGrid (Empfohlen)</option>
          <option value="mailgun">Mailgun</option>
          <option value="postmark">Postmark</option>
        </select>
        <p className="text-xs text-gray-500 mt-1">Professioneller E-Mail-Service</p>
      </div>
      
      {/* KORRIGIERT: Neue Felder für externe Provider */}
      <ConfigField
        label="Ihre Absender-E-Mail"
        type="email"
        value={data.senderEmail || ''}
        onChange={(value) => onChange({ senderEmail: value })}
        placeholder="rechnung@ihrefirma.de"
      />
      
      <ConfigField
        label="Absender-Name"
        value={data.senderName || ''}
        onChange={(value) => onChange({ senderName: value })}
        placeholder="Ihre Firma GmbH"
      />
      
      <ConfigField
        label="Antwort-E-Mail (optional)"
        type="email"
        value={data.replyToEmail || ''}
        onChange={(value) => onChange({ replyToEmail: value })}
        placeholder="support@ihrefirma.de"
      />
    </div>

    {/* Provider-Info */}
    <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
      <h5 className="text-sm font-medium text-gray-700 mb-2">
        {data.provider === 'sendgrid' && '📧 SendGrid - Zuverlässig & Schnell'}
        {data.provider === 'mailgun' && '🚀 Mailgun - Entwicklerfreundlich'}  
        {data.provider === 'postmark' && '✉️ Postmark - Premium-Zustellung'}
      </h5>
      <p className="text-xs text-gray-600">
        {data.provider === 'sendgrid' && 'Über 100 Milliarden E-Mails pro Monat. Hohe Zustellrate und Spam-Schutz.'}
        {data.provider === 'mailgun' && 'API-first Ansatz mit detaillierten Analytics und Tracking.'}
        {data.provider === 'postmark' && 'Spezialisiert auf Transactional Emails mit 99%+ Zustellrate.'}
      </p>
    </div>

    {/* TEST-E-MAIL BEREICH - HINZUGEFÜGT */}
    <div className="border-t pt-4 mt-6">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium">E-Mail-Test</h4>
        <button
          type="button"
          onClick={onTestEmail}
          disabled={!data.senderEmail || testEmailStatus?.status === 'sending'}
          className={`px-4 py-2 rounded text-sm font-medium transition-colors flex items-center ${
            !data.senderEmail || testEmailStatus?.status === 'sending'
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {testEmailStatus?.status === 'sending' ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Sendet...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" />
              Test-E-Mail senden
            </>
          )}
        </button>
      </div>
      
      {/* Test-Status-Anzeige */}
      {testEmailStatus?.status && testEmailStatus.status !== 'idle' && (
        <div className={`p-3 rounded-md flex items-start ${
          testEmailStatus.status === 'success' 
            ? 'bg-green-50 border border-green-200' 
            : testEmailStatus.status === 'error'
            ? 'bg-red-50 border border-red-200'
            : 'bg-blue-50 border border-blue-200'
        }`}>
          {testEmailStatus.status === 'success' && <CheckCircle className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0" />}
          {testEmailStatus.status === 'error' && <AlertCircle className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" />}
          {testEmailStatus.status === 'sending' && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2 mt-0.5"></div>
          )}
          
          <p className={`text-sm ${
            testEmailStatus.status === 'success' 
              ? 'text-green-700' 
              : testEmailStatus.status === 'error'
              ? 'text-red-700'
              : 'text-blue-700'
          }`}>
            {testEmailStatus.message || testEmailMessage}
          </p>
        </div>
      )}
      
      <p className="text-xs text-gray-500 mt-2">
        Sendet eine Test-E-Mail an Ihre Absender-Adresse zur Konfigurationsprüfung
      </p>
    </div>

    {/* E-Mail Template */}
    <div className="border-t pt-4 mt-6">
      <h4 className="font-medium mb-3">E-Mail-Template</h4>
      
      <ConfigField
        label="E-Mail-Betreff"
        value={templates.invoice?.subject || ''}
        onChange={(value) => onTemplateChange({
          ...templates,
          invoice: { ...templates.invoice, subject: value }
        })}
        placeholder="Neue Rechnung: {{invoiceNumber}}"
        fullWidth
      />
      
      <ConfigField
        label="E-Mail-Text"
        type="textarea"
        value={templates.invoice?.body || ''}
        onChange={(value) => onTemplateChange({
          ...templates,
          invoice: { ...templates.invoice, body: value }
        })}
        placeholder="Verfügbare Variablen: {{invoiceNumber}}, {{amount}}, {{currency}}, {{customerName}}, {{companyName}}, {{dueDate}}"
        rows={8}
        fullWidth
      />
      
      {/* Template-Variablen */}
      <div className="bg-gray-50 rounded p-3 mt-2">
        <p className="text-xs text-gray-600 font-medium mb-1">Verfügbare Variablen:</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs text-gray-500">
          <code>{'{{invoiceNumber}}'}</code>
          <code>{'{{amount}}'}</code>
          <code>{'{{currency}}'}</code>
          <code>{'{{customerName}}'}</code>
          <code>{'{{companyName}}'}</code>
          <code>{'{{dueDate}}'}</code>
        </div>
      </div>
    </div>
  </div>
);

// WICHTIG: Diese Imports müssen am Anfang der ConfigModal.jsx stehen:
// import { Send, CheckCircle, AlertCircle } from 'lucide-react';

// Tab Button Komponente
const TabButton = ({ id, label, icon: Icon, activeSection, setActiveSection }) => (
  <button
    type="button"
    onClick={() => setActiveSection(id)}
    className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors ${
      activeSection === id
        ? 'bg-white text-blue-600 shadow-sm'
        : 'text-gray-600 hover:text-gray-800'
    }`}
  >
    <Icon className="w-4 h-4 mr-2" />
    {label}
  </button>
);

// Unternehmensdaten Sektion
const CompanySection = ({ data, onChange }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold flex items-center">
      <Building className="w-5 h-5 mr-2" />
      Unternehmensdaten
    </h3>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ConfigField
        label="Firmenname"
        value={data.name || ''}
        onChange={(value) => onChange({ name: value })}
        placeholder="Ihr Unternehmen GmbH"
      />
      
      <ConfigField
        label="E-Mail"
        type="email"
        value={data.email || ''}
        onChange={(value) => onChange({ email: value })}
        placeholder="info@unternehmen.de"
      />
      
      <ConfigField
        label="Telefon"
        type="tel"
        value={data.phone || ''}
        onChange={(value) => onChange({ phone: value })}
        placeholder="+49 123 456789"
      />
      
      <ConfigField
        label="Website"
        type="url"
        value={data.website || ''}
        onChange={(value) => onChange({ website: value })}
        placeholder="https://www.unternehmen.de"
      />
    </div>
    
    <ConfigField
      label="Adresse"
      type="textarea"
      value={data.address || ''}
      onChange={(value) => onChange({ address: value })}
      placeholder="Musterstraße 1&#10;12345 Musterstadt"
      rows={3}
      fullWidth
    />
    
    <ConfigField
      label="Steuernummer / USt-IdNr."
      value={data.taxId || ''}
      onChange={(value) => onChange({ taxId: value })}
      placeholder="DE123456789"
    />
  </div>
);

// Rechnungseinstellungen Sektion
const InvoiceSection = ({ data, onChange }) => (
  <div className="space-y-4">
    <h3 className="text-lg font-semibold flex items-center">
      <CreditCard className="w-5 h-5 mr-2" />
      Rechnungseinstellungen
    </h3>
    
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <ConfigField
        label="Rechnungsnummer-Präfix"
        value={data.numberPrefix || ''}
        onChange={(value) => onChange({ numberPrefix: value })}
        placeholder="INV-"
      />
      
      <ConfigField
        label="MwSt.-Satz (%)"
        type="number"
        step="0.01"
        value={data.taxRate || 19}
        onChange={(value) => onChange({ taxRate: parseFloat(value) })}
      />
      
      <ConfigField
        label="Zahlungsziel (Tage)"
        type="number"
        value={data.paymentTerms || 30}
        onChange={(value) => onChange({ paymentTerms: parseInt(value) })}
      />
    </div>
    
    <ConfigField
      label="Standard-Währung"
      value={data.currency || 'EUR'}
      onChange={(value) => onChange({ currency: value })}
      placeholder="EUR"
    />
  </div>
);

// Wiederverwendbare Config Field Komponente
const ConfigField = ({ 
  label, 
  type = 'text', 
  value, 
  onChange, 
  placeholder = '', 
  rows = 3, 
  fullWidth = false,
  step,
  required = false,
  ...props 
}) => {
  const baseClasses = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className={fullWidth ? 'md:col-span-2' : ''}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className={baseClasses}
          required={required}
          {...props}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={baseClasses}
          step={step}
          required={required}
          {...props}
        />
      )}
    </div>
  );
};

// Spinner Komponente
const Spinner = () => (
  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

export default ConfigModal