import React, { useState, useEffect } from 'react';
import { 
  FileText, Send, CheckCircle, AlertCircle, Clock, Download, Upload, Eye, 
  Settings, BarChart3, RefreshCw, Trash2, Users, Mail, Plus, Edit, 
  Save, X, Loader, FileX, Globe, Phone, MapPin, Building, CreditCard
} from 'lucide-react';

const EInvoiceEnhancedApp = () => {
  // State Management
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [config, setConfig] = useState({});
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Modal States
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  
  const [stats, setStats] = useState({
    incoming: 0,
    processed: 0,
    sent: 0,
    failed: 0
  });

  // Stats aktualisieren
  const updateStats = (invoiceList) => {
    const newStats = {
      incoming: invoiceList.length,
      processed: invoiceList.filter(inv => inv.status !== 'received' && inv.status !== 'draft').length,
      sent: invoiceList.filter(inv => inv.status === 'sent').length,
      failed: invoiceList.filter(inv => inv.status === 'failed').length
    };
    setStats(newStats);
  };

  // API Calls
  const fetchInvoices = async () => {
    try {
      const response = await fetch('/api/invoices-db');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setInvoices(result.data);
          updateStats(result.data);
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Rechnungen:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setCustomers(result.data);
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Kunden:', error);
      setCustomers([]);
    }
  };

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/config');
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setConfig(result.data);
        }
      }
    } catch (error) {
      console.error('Fehler beim Laden der Konfiguration:', error);
      setConfig({});
    }
  };

  // Komponente initialisieren
  useEffect(() => {
    const initApp = async () => {
      setLoading(true);
      await Promise.all([fetchInvoices(), fetchCustomers(), fetchConfig()]);
      setLoading(false);
    };
    
    initApp();
    const interval = setInterval(fetchInvoices, 30000);
    return () => clearInterval(interval);
  }, []);

  // Status-Info Helper
  const getStatusInfo = (status) => {
    switch (status) {
      case 'sent':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', text: 'Versendet' };
      case 'processing':
        return { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100', text: 'Verarbeitung' };
      case 'failed':
        return { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100', text: 'Fehler' };
      case 'draft':
        return { icon: FileX, color: 'text-gray-600', bg: 'bg-gray-100', text: 'Entwurf' };
      default:
        return { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100', text: 'Empfangen' };
    }
  };

  // E-Mail senden
  const sendInvoiceEmail = async (invoiceId) => {
    if (!window.confirm('E-Rechnung jetzt versenden?')) return;
    
    try {
      setSubmitting(true);
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId, attachXML: true })
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          alert('E-Rechnung erfolgreich versendet!');
          await fetchInvoices();
        } else {
          throw new Error(result.error);
        }
      }
    } catch (error) {
      alert('Fehler beim Versenden: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // PDF herunterladen
  const downloadPDF = async (invoiceId, invoiceNumber) => {
    try {
      const response = await fetch(`/api/generate-pdf?invoiceId=${invoiceId}`);
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Rechnung_${invoiceNumber}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      alert('Fehler beim PDF-Download: ' + error.message);
    }
  };

  // Rechnung löschen
  const deleteInvoice = async (invoiceId) => {
    if (!window.confirm('Rechnung wirklich löschen?')) return;
    
    try {
      const response = await fetch(`/api/invoices-db?id=${invoiceId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        await fetchInvoices();
      }
    } catch (error) {
      alert('Fehler beim Löschen: ' + error.message);
    }
  };

  // KUNDEN-MODAL KOMPONENTE
  const CustomerModal = () => {
    const [formData, setFormData] = useState({
      name: '',
      email: '',
      address: '',
      taxId: '',
      contactPerson: '',
      phone: ''
    });

    useEffect(() => {
      if (editingCustomer) {
        setFormData(editingCustomer);
      } else {
        setFormData({
          name: '',
          email: '',
          address: '',
          taxId: '',
          contactPerson: '',
          phone: ''
        });
      }
    }, [editingCustomer]);

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const url = editingCustomer ? `/api/customers?id=${editingCustomer.id}` : '/api/customers';
        const method = editingCustomer ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        
        if (response.ok) {
          await fetchCustomers();
          setShowCustomerModal(false);
          setEditingCustomer(null);
          alert(editingCustomer ? 'Kunde aktualisiert!' : 'Kunde erstellt!');
        }
      } catch (error) {
        alert('Fehler beim Speichern: ' + error.message);
      }
    };

    if (!showCustomerModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">
                {editingCustomer ? 'Kunde bearbeiten' : 'Neuer Kunde'}
              </h2>
              <button 
                onClick={() => {
                  setShowCustomerModal(false);
                  setEditingCustomer(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Firmenname *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-Mail *
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ansprechpartner
                  </label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({...formData, contactPerson: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Telefon
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse
                </label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Steuernummer / USt-IdNr.
                </label>
                <input
                  type="text"
                  value={formData.taxId}
                  onChange={(e) => setFormData({...formData, taxId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCustomerModal(false);
                    setEditingCustomer(null);
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {editingCustomer ? 'Aktualisieren' : 'Erstellen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // KONFIGURATIONS-MODAL
  const ConfigModal = () => {
    const [configData, setConfigData] = useState({
      company: {},
      email: {},
      templates: { invoice: {} },
      invoice: {}
    });

    useEffect(() => {
      setConfigData({
        company: config.company || {},
        email: config.email || {},
        templates: config.templates || { invoice: {} },
        invoice: config.invoice || {}
      });
    }, [config]);

    const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        const response = await fetch('/api/config', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(configData)
        });
        
        if (response.ok) {
          await fetchConfig();
          setShowConfigModal(false);
          alert('Konfiguration gespeichert!');
        }
      } catch (error) {
        alert('Fehler beim Speichern: ' + error.message);
      }
    };

    if (!showConfigModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Systemkonfiguration</h2>
              <button 
                onClick={() => setShowConfigModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Unternehmensdaten */}
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Building className="w-5 h-5 mr-2" />
                  Unternehmensdaten
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Firmenname</label>
                    <input
                      type="text"
                      value={configData.company.name || ''}
                      onChange={(e) => setConfigData({
                        ...configData,
                        company: { ...configData.company, name: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail</label>
                    <input
                      type="email"
                      value={configData.company.email || ''}
                      onChange={(e) => setConfigData({
                        ...configData,
                        company: { ...configData.company, email: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                    <textarea
                      value={configData.company.address || ''}
                      onChange={(e) => setConfigData({
                        ...configData,
                        company: { ...configData.company, address: e.target.value }
                      })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Steuernummer</label>
                    <input
                      type="text"
                      value={configData.company.taxId || ''}
                      onChange={(e) => setConfigData({
                        ...configData,
                        company: { ...configData.company, taxId: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* E-Mail-Konfiguration */}
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Mail className="w-5 h-5 mr-2" />
                  E-Mail-Versand
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail-Anbieter</label>
                    <select
                      value={configData.email.provider || 'gmail'}
                      onChange={(e) => setConfigData({
                        ...configData,
                        email: { ...configData.email, provider: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="gmail">Gmail</option>
                      <option value="outlook">Outlook</option>
                      <option value="smtp">SMTP</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail-Adresse</label>
                    <input
                      type="email"
                      value={configData.email.user || ''}
                      onChange={(e) => setConfigData({
                        ...configData,
                        email: { ...configData.email, user: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">App-Passwort</label>
                    <input
                      type="password"
                      value={configData.email.password || ''}
                      onChange={(e) => setConfigData({
                        ...configData,
                        email: { ...configData.email, password: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="App-spezifisches Passwort"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Absender-Name</label>
                    <input
                      type="text"
                      value={configData.email.from || ''}
                      onChange={(e) => setConfigData({
                        ...configData,
                        email: { ...configData.email, from: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  {/* SMTP-spezifische Felder */}
                  {configData.email?.provider === 'smtp' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">SMTP-Server</label>
                        <input
                          type="text"
                          value={configData.email?.host || ''}
                          onChange={(e) => setConfigData({
                            ...configData,
                            email: { ...configData.email, host: e.target.value }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Port</label>
                        <input
                          type="number"
                          value={configData.email?.port || 587}
                          onChange={(e) => setConfigData({
                            ...configData,
                            email: { ...configData.email, port: parseInt(e.target.value) }
                          })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </>
                  )}
                </div>

                {/* E-Mail-Template */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail-Betreff</label>
                  <input
                    type="text"
                    value={configData.templates?.invoice?.subject || ''}
                    onChange={(e) => setConfigData({
                      ...configData,
                      templates: {
                        ...configData.templates,
                        invoice: {
                          ...configData.templates?.invoice,
                          subject: e.target.value
                        }
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Neue Rechnung: {{invoiceNumber}}"
                  />
                </div>
                
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">E-Mail-Text</label>
                  <textarea
                    value={configData.templates?.invoice?.body || ''}
                    onChange={(e) => setConfigData({
                      ...configData,
                      templates: {
                        ...configData.templates,
                        invoice: {
                          ...configData.templates?.invoice,
                          body: e.target.value
                        }
                      }
                    })}
                    rows={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Verfügbare Variablen: {{invoiceNumber}}, {{amount}}, {{currency}}, {{customerName}}, {{companyName}}, {{dueDate}}"
                  />
                </div>
              </div>

              {/* Rechnungseinstellungen */}
              <div className="border rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <CreditCard className="w-5 h-5 mr-2" />
                  Rechnungseinstellungen
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Rechnungsnummer-Präfix</label>
                    <input
                      type="text"
                      value={configData.invoice?.numberPrefix || ''}
                      onChange={(e) => setConfigData({
                        ...configData,
                        invoice: { ...configData.invoice, numberPrefix: e.target.value }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="INV-"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">MwSt.-Satz (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={configData.invoice?.taxRate || 19}
                      onChange={(e) => setConfigData({
                        ...configData,
                        invoice: { ...configData.invoice, taxRate: parseFloat(e.target.value) }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Zahlungsziel (Tage)</label>
                    <input
                      type="number"
                      value={configData.invoice?.paymentTerms || 30}
                      onChange={(e) => setConfigData({
                        ...configData,
                        invoice: { ...configData.invoice, paymentTerms: parseInt(e.target.value) }
                      })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // RECHNUNG ERSTELLEN MODAL
  const InvoiceModal = () => {
    const [formData, setFormData] = useState({
      customerId: '',
      items: [{ description: '', quantity: 1, price: 0 }],
      format: 'XRechnung',
      notes: ''
    });

    const addItem = () => {
      setFormData({
        ...formData,
        items: [...formData.items, { description: '', quantity: 1, price: 0 }]
      });
    };

    const removeItem = (index) => {
      const newItems = formData.items.filter((_, i) => i !== index);
      setFormData({ ...formData, items: newItems });
    };

    const updateItem = (index, field, value) => {
      const newItems = [...formData.items];
      newItems[index] = { ...newItems[index], [field]: value };
      setFormData({ ...formData, items: newItems });
    };

    const calculateTotal = () => {
      const subtotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      const taxRate = config.invoice?.taxRate || 19;
      const tax = subtotal * (taxRate / 100);
      return { subtotal, tax, total: subtotal + tax };
    };

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!formData.customerId) {
        alert('Bitte einen Kunden auswählen!');
        return;
      }
      
      try {
        const response = await fetch('/api/invoices-enhanced', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        
        if (response.ok) {
          await fetchInvoices();
          setShowInvoiceModal(false);
          setFormData({
            customerId: '',
            items: [{ description: '', quantity: 1, price: 0 }],
            format: 'XRechnung',
            notes: ''
          });
          alert('Rechnung erstellt!');
        }
      } catch (error) {
        alert('Fehler beim Erstellen: ' + error.message);
      }
    };

    if (!showInvoiceModal) return null;

    const totals = calculateTotal();

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Neue Rechnung erstellen</h2>
              <button 
                onClick={() => setShowInvoiceModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kunde auswählen *
                  </label>
                  <select
                    value={formData.customerId}
                    onChange={(e) => setFormData({...formData, customerId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Kunde wählen...</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} ({customer.email})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    E-Rechnungs-Format
                  </label>
                  <select
                    value={formData.format}
                    onChange={(e) => setFormData({...formData, format: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="XRechnung">XRechnung 3.0</option>
                    <option value="ZUGFeRD">ZUGFeRD</option>
                    <option value="UBL">UBL</option>
                    <option value="CII">CII</option>
                  </select>
                </div>
              </div>

              {/* Rechnungspositionen */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Rechnungspositionen</h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="flex items-center px-3 py-2 text-blue-600 border border-blue-300 rounded hover:bg-blue-50"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Position hinzufügen
                  </button>
                </div>
                
                <div className="space-y-3">
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex gap-3 items-start p-3 border rounded">
                      <div className="flex-1">
                        <input
                          type="text"
                          placeholder="Beschreibung"
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div className="w-20">
                        <input
                          type="number"
                          placeholder="Menge"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div className="w-32">
                        <input
                          type="number"
                          placeholder="Preis"
                          step="0.01"
                          min="0"
                          value={item.price}
                          onChange={(e) => updateItem(index, 'price', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                      <div className="w-32 px-3 py-2 text-right">
                        {(item.quantity * item.price).toFixed(2)} EUR
                      </div>
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Gesamtsumme */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <div className="space-y-2 text-right">
                    <div className="flex justify-between">
                      <span>Zwischensumme:</span>
                      <span>{totals.subtotal.toFixed(2)} EUR</span>
                    </div>
                    <div className="flex justify-between">
                      <span>MwSt. ({config.invoice?.taxRate || 19}%):</span>
                      <span>{totals.tax.toFixed(2)} EUR</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold border-t pt-2">
                      <span>Gesamtsumme:</span>
                      <span>{totals.total.toFixed(2)} EUR</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Anmerkungen
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Rechnung erstellen
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  };

  // DASHBOARD KOMPONENTE
  const Dashboard = () => (
    <div className="space-y-6">
      {/* Statistik-Karten */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Gesamt</p>
              <p className="text-2xl font-bold text-blue-900">{stats.incoming}</p>
            </div>
            <FileText className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-600 text-sm font-medium">In Bearbeitung</p>
              <p className="text-2xl font-bold text-yellow-900">{stats.processed}</p>
            </div>
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        
        <div className="bg-green-50 p-6 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-600 text-sm font-medium">Versendet</p>
              <p className="text-2xl font-bold text-green-900">{stats.sent}</p>
            </div>
            <Send className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-red-50 p-6 rounded-lg border border-red-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-600 text-sm font-medium">Fehlgeschlagen</p>
              <p className="text-2xl font-bold text-red-900">{stats.failed}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          onClick={() => setShowInvoiceModal(true)}
          className="p-6 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
        >
          <div className="flex items-center">
            <Plus className="h-8 w-8 text-blue-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold">Neue Rechnung</h3>
              <p className="text-gray-600 text-sm">E-Rechnung erstellen und versenden</p>
            </div>
          </div>
        </button>
        
        <button
          onClick={() => setShowCustomerModal(true)}
          className="p-6 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
        >
          <div className="flex items-center">
            <Users className="h-8 w-8 text-green-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold">Neuer Kunde</h3>
              <p className="text-gray-600 text-sm">Kundendaten hinzufügen ({customers.length} vorhanden)</p>
            </div>
          </div>
        </button>
        
        <button
          onClick={() => setShowConfigModal(true)}
          className="p-6 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
        >
          <div className="flex items-center">
            <Settings className="h-8 w-8 text-purple-600 mr-3" />
            <div>
              <h3 className="text-lg font-semibold">Einstellungen</h3>
              <p className="text-gray-600 text-sm">System und E-Mail konfigurieren</p>
            </div>
          </div>
        </button>
      </div>

      {/* Status-Übersicht */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">System-Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span>E-Mail konfiguriert</span>
            <span className={`px-2 py-1 rounded text-xs ${config.email?.user ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {config.email?.user ? 'Ja' : 'Nein'}
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span>Unternehmensdaten</span>
            <span className={`px-2 py-1 rounded text-xs ${config.company?.name ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {config.company?.name ? 'Vollständig' : 'Fehlt'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  // RECHNUNGSÜBERSICHT KOMPONENTE
  const InvoiceList = () => (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">E-Rechnungsübersicht</h3>
          <p className="text-sm text-gray-600">Alle eingehenden und ausgehenden E-Rechnungen</p>
        </div>
        <button 
          onClick={fetchInvoices}
          className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </button>
      </div>
      
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-gray-600">Lade E-Rechnungen...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500">Noch keine E-Rechnungen vorhanden</p>
            <p className="text-sm text-gray-400 mt-1">Erstelle deine erste E-Rechnung im Dashboard</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rechnungs-ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Kunde
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Betrag
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Format
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Aktionen
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {invoices.map((invoice) => {
                const statusInfo = getStatusInfo(invoice.status);
                const StatusIcon = statusInfo.icon;
                
                return (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {invoice.invoiceNumber || invoice.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.customer?.name || invoice.receiver || 'Unbekannt'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="font-medium">
                        {invoice.total ? invoice.total.toFixed(2) : invoice.amount.toFixed(2)} {invoice.currency}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {invoice.format}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusInfo.text}
                      </span>
                      {invoice.error && (
                        <p className="text-xs text-red-600 mt-1">{invoice.error}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        {invoice.status === 'draft' && (
                          <button 
                            onClick={() => sendInvoiceEmail(invoice.id)}
                            disabled={submitting}
                            className="text-green-600 hover:text-green-900 disabled:opacity-50"
                            title="E-Mail versenden"
                          >
                            {submitting ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          </button>
                        )}
                        <button 
                          onClick={() => downloadPDF(invoice.id, invoice.invoiceNumber || invoice.id)}
                          className="text-blue-600 hover:text-blue-900"
                          title="PDF herunterladen"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteInvoice(invoice.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

  // KUNDEN-VERWALTUNG KOMPONENTE
  const CustomerManagement = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Kundenverwaltung</h3>
            <p className="text-sm text-gray-600">Alle Kunden und deren Rechnungen</p>
          </div>
          <button 
            onClick={() => setShowCustomerModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Neuer Kunde
          </button>
        </div>
        
        <div className="overflow-x-auto">
          {customers.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">Noch keine Kunden vorhanden</p>
              <p className="text-sm text-gray-400 mt-1">Füge deinen ersten Kunden hinzu</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    E-Mail
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ansprechpartner
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rechnungen
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aktionen
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {customer.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customer.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customer.contactPerson || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customer.invoiceCount || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => {
                            setEditingCustomer(customer);
                            setShowCustomerModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="Bearbeiten"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={async () => {
                            if (window.confirm('Kunde wirklich löschen?')) {
                              try {
                                const response = await fetch(`/api/customers?id=${customer.id}`, {
                                  method: 'DELETE'
                                });
                                if (response.ok) {
                                  await fetchCustomers();
                                }
                              } catch (error) {
                                alert('Fehler beim Löschen: ' + error.message);
                              }
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="Löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );

  // HAUPT-RENDER
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <FileText className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">E-Rechnungs Cloud</h1>
                <p className="text-sm text-gray-500">Professionelle E-Rechnungsverarbeitung</p>
              </div>
              <div className="ml-4 flex items-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <div className="w-2 h-2 bg-green-600 rounded-full mr-1 animate-pulse"></div>
                  LIVE
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">Version 2.0</div>
              <div className="text-xs font-mono text-gray-600">
                XRechnung 3.0 Ready
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'dashboard'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'invoices'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FileText className="w-4 h-4 mr-2" />
              E-Rechnungen ({invoices.length})
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'customers'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="w-4 h-4 mr-2" />
              Kunden ({customers.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'invoices' && <InvoiceList />}
        {activeTab === 'customers' && <CustomerManagement />}
      </div>

      {/* Modals */}
      <CustomerModal />
      <ConfigModal />
      <InvoiceModal />
    </div>
  );
};

export default EInvoiceEnhancedApp;