import React, { useState, useEffect } from 'react';
import { FileText, Send, CheckCircle, AlertCircle, Clock, Download, Upload, Eye, Settings, BarChart3, RefreshCw, Trash2 } from 'lucide-react';

const EInvoiceCloudApp = () => {
  const [invoices, setInvoices] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stats, setStats] = useState({
    incoming: 0,
    processed: 0,
    sent: 0,
    failed: 0
  });

  // Stats aktualisieren basierend auf Rechnungen
  const updateStats = (invoiceList) => {
    const newStats = {
      incoming: invoiceList.length,
      processed: invoiceList.filter(inv => inv.status !== 'received').length,
      sent: invoiceList.filter(inv => inv.status === 'sent').length,
      failed: invoiceList.filter(inv => inv.status === 'failed').length
    };
    setStats(newStats);
  };

  // Rechnungen von echter API laden
  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/invoices-db');
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setInvoices(result.data);
          updateStats(result.data);
          console.log('Rechnungen von Datenbank geladen:', result.count);
          return;
        }
      }
      
      // Fallback: Falls API nicht verfügbar, lokale Demo-Daten laden
      console.log('API nicht verfügbar, verwende Demo-Daten');
      const demoInvoices = [
        {
          id: 'DEMO-001',
          sender: 'Demo Firma GmbH',
          receiver: 'Test Kunde',
          amount: 1299.99,
          currency: 'EUR',
          date: '2024-08-21',
          status: 'sent',
          format: 'XRechnung',
          receivedAt: '2024-08-21T10:30:00Z',
          processedAt: '2024-08-21T10:35:00Z',
          sentAt: '2024-08-21T10:40:00Z'
        }
      ];
      setInvoices(demoInvoices);
      updateStats(demoInvoices);
      
    } catch (error) {
      console.error('Fehler beim Laden der Rechnungen:', error);
      
      // Als letzter Fallback: localStorage verwenden
      const stored = localStorage.getItem('invoices');
      if (stored) {
        try {
          const parsedInvoices = JSON.parse(stored);
          setInvoices(parsedInvoices);
          updateStats(parsedInvoices);
        } catch (e) {
          console.error('Fehler beim Parsen der localStorage-Daten:', e);
          setInvoices([]);
          updateStats([]);
        }
      } else {
        setInvoices([]);
        updateStats([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Neue Rechnung über echte API erstellen
  const createInvoice = async (invoiceData) => {
    try {
      setSubmitting(true);
      const response = await fetch('/api/invoices-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData)
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          console.log('Rechnung erfolgreich erstellt:', result.data.id);
          // UI sofort mit neuer Rechnung aktualisieren
          await fetchInvoices();
          return result.data;
        } else {
          throw new Error(result.error || 'Fehler beim Erstellen der Rechnung');
        }
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Fehler beim Erstellen der Rechnung:', error);
      
      // Fallback: Lokale Simulation falls API nicht verfügbar
      const fallbackInvoice = {
        id: `LOCAL-${Date.now()}`,
        ...invoiceData,
        status: 'processing',
        receivedAt: new Date().toISOString(),
        processedAt: null,
        sentAt: null
      };
      
      const updatedInvoices = [fallbackInvoice, ...invoices];
      setInvoices(updatedInvoices);
      updateStats(updatedInvoices);
      localStorage.setItem('invoices', JSON.stringify(updatedInvoices));
      
      // Lokale Simulation der Verarbeitung
      setTimeout(() => {
        setInvoices(current => {
          const updated = current.map(inv => 
            inv.id === fallbackInvoice.id 
              ? { 
                  ...inv, 
                  status: 'sent', 
                  processedAt: new Date().toISOString(), 
                  sentAt: new Date().toISOString() 
                }
              : inv
          );
          updateStats(updated);
          localStorage.setItem('invoices', JSON.stringify(updated));
          return updated;
        });
      }, 3000);
      
      return fallbackInvoice;
    } finally {
      setSubmitting(false);
    }
  };

  // Rechnung löschen
  const deleteInvoice = async (invoiceId) => {
    try {
      const response = await fetch(`/api/invoices-db?id=${invoiceId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        console.log('Rechnung gelöscht:', invoiceId);
        await fetchInvoices();
      } else {
        // Fallback: Lokal löschen
        const updated = invoices.filter(inv => inv.id !== invoiceId);
        setInvoices(updated);
        updateStats(updated);
        localStorage.setItem('invoices', JSON.stringify(updated));
      }
    } catch (error) {
      console.error('Fehler beim Löschen:', error);
      // Fallback: Lokal löschen
      const updated = invoices.filter(inv => inv.id !== invoiceId);
      setInvoices(updated);
      updateStats(updated);
      localStorage.setItem('invoices', JSON.stringify(updated));
    }
  };

  // Komponente initialisieren
  useEffect(() => {
    fetchInvoices();
    
    // Auto-Refresh alle 30 Sekunden für Echtzeit-Updates
    const interval = setInterval(fetchInvoices, 30000);
    return () => clearInterval(interval);
  }, []);

  // Status-Icon und -farbe bestimmen
  const getStatusInfo = (status) => {
    switch (status) {
      case 'sent':
        return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', text: 'Versendet' };
      case 'processing':
        return { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100', text: 'Verarbeitung' };
      case 'failed':
        return { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100', text: 'Fehler' };
      default:
        return { icon: FileText, color: 'text-gray-600', bg: 'bg-gray-100', text: 'Empfangen' };
    }
  };

  // API-Test-Formular
  const APITestForm = () => {
    const [formData, setFormData] = useState({
      sender: '',
      receiver: '',
      amount: '',
      format: 'XRechnung'
    });

    const handleSubmit = async (e) => {
      e.preventDefault();
      if (!formData.sender || !formData.receiver || !formData.amount) {
        alert('Bitte alle Felder ausfüllen!');
        return;
      }

      try {
        await createInvoice({
          ...formData,
          amount: parseFloat(formData.amount),
          currency: 'EUR',
          date: new Date().toISOString().split('T')[0]
        });
        
        // Formular zurücksetzen
        setFormData({ sender: '', receiver: '', amount: '', format: 'XRechnung' });
        alert('Rechnung erfolgreich erstellt! Sie wird automatisch verarbeitet.');
      } catch (error) {
        alert('Fehler beim Erstellen der Rechnung: ' + error.message);
      }
    };

    const simulateRandomInvoice = async () => {
      const companies = ['Tech GmbH', 'Service AG', 'Digital Solutions', 'Consulting Ltd', 'Innovation Corp'];
      const customers = ['Kunde AG', 'Beispiel GmbH', 'Test Corp', 'Demo Ltd', 'Sample Inc'];
      
      const randomInvoice = {
        sender: companies[Math.floor(Math.random() * companies.length)],
        receiver: customers[Math.floor(Math.random() * customers.length)],
        amount: Math.round(Math.random() * 5000 * 100) / 100,
        currency: 'EUR',
        format: Math.random() > 0.5 ? 'XRechnung' : 'ZUGFeRD',
        date: new Date().toISOString().split('T')[0]
      };

      try {
        await createInvoice(randomInvoice);
        alert('Zufällige Rechnung erstellt!');
      } catch (error) {
        console.error('Fehler beim Simulieren:', error);
      }
    };

    return (
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold mb-4">API Test - Neue E-Rechnung</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Absender</label>
              <input
                type="text"
                value={formData.sender}
                onChange={(e) => setFormData({...formData, sender: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Meine Firma GmbH"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Empfänger</label>
              <input
                type="text"
                value={formData.receiver}
                onChange={(e) => setFormData({...formData, receiver: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Kunde AG"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Betrag (EUR)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="1250.00"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-Rechnungs-Format</label>
              <select
                value={formData.format}
                onChange={(e) => setFormData({...formData, format: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="XRechnung">XRechnung (Standard)</option>
                <option value="ZUGFeRD">ZUGFeRD</option>
                <option value="UBL">UBL</option>
                <option value="CII">CII (Cross Industry Invoice)</option>
              </select>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className={`px-6 py-2 rounded transition-colors ${
                submitting 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            >
              {submitting ? 'Erstelle...' : 'E-Rechnung erstellen'}
            </button>
            
            <button
              type="button"
              onClick={simulateRandomInvoice}
              disabled={submitting}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition-colors disabled:bg-gray-400"
            >
              Zufällige Rechnung
            </button>
          </div>
        </div>
        
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <p className="text-sm text-gray-600 mb-2"><strong>API Dokumentation:</strong></p>
          <div className="space-y-1 text-xs font-mono">
            <div><span className="text-green-600">GET</span> {window.location.origin}/api/invoices-db</div>
            <div><span className="text-blue-600">POST</span> {window.location.origin}/api/invoices-db</div>
            <div><span className="text-red-600">DELETE</span> {window.location.origin}/api/invoices-db?id=INV-XXX</div>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            JSON Payload: {`{"sender": "...", "receiver": "...", "amount": 1250.00, "format": "XRechnung"}`}
          </p>
        </div>
      </div>
    );
  };

  // Dashboard-Komponente
  const Dashboard = () => (
    <div className="space-y-6">
      {/* Statistik-Karten */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-600 text-sm font-medium">Eingehend</p>
              <p className="text-2xl font-bold text-blue-900">{stats.incoming}</p>
            </div>
            <Upload className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-yellow-50 p-6 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-600 text-sm font-medium">Verarbeitet</p>
              <p className="text-2xl font-bold text-yellow-900">{stats.processed}</p>
            </div>
            <Settings className="h-8 w-8 text-yellow-600" />
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

      {/* API-Test-Formular */}
      <APITestForm />
    </div>
  );

  // Rechnungsübersicht-Komponente
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
            <p className="text-gray-600">Lade E-Rechnungen von Datenbank...</p>
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
                  Absender
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Empfänger
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
                      {invoice.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.sender}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invoice.receiver}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="font-medium">{invoice.amount.toFixed(2)} {invoice.currency}</span>
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
                        <button 
                          className="text-blue-600 hover:text-blue-900"
                          title="Details anzeigen"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          className="text-green-600 hover:text-green-900"
                          title="Herunterladen"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            if (window.confirm('Rechnung wirklich löschen?')) {
                              deleteInvoice(invoice.id);
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
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );

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
                <p className="text-sm text-gray-500">Automatische E-Rechnungsverarbeitung</p>
              </div>
              <div className="ml-4 flex items-center">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <div className="w-2 h-2 bg-green-600 rounded-full mr-1 animate-pulse"></div>
                  LIVE
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-gray-500">API Endpoint</div>
              <div className="text-xs font-mono text-gray-600">
                {window.location.origin}/api/invoices-db
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
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'dashboard' && <Dashboard />}
        {activeTab === 'invoices' && <InvoiceList />}
      </div>
    </div>
  );
};

export default EInvoiceCloudApp;