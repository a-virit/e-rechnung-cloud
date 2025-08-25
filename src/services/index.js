// src/services/index.js - Service Layer Export
export { invoiceService } from './invoiceService';
export { customerService } from './customerService';
export { configService } from './configService';

// src/services/baseService.js - Basis Service mit gemeinsamen Funktionen
class BaseService {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  async makeRequest(url, options = {}) {
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    try {
      const response = await fetch(`${this.baseUrl}${url}`, config);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      // Prüfen ob Response JSON ist
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return response;
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Netzwerkfehler: Server nicht erreichbar');
      }
      throw error;
    }
  }

  async get(url) {
    return this.makeRequest(url, { method: 'GET' });
  }

  async post(url, data) {
    return this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  async put(url, data) {
    return this.makeRequest(url, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }

  async delete(url) {
    return this.makeRequest(url, { method: 'DELETE' });
  }

  async downloadFile(url, filename) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      throw new Error(`Download fehlgeschlagen: ${error.message}`);
    }
  }
}

// src/services/invoiceService.js
class InvoiceService extends BaseService {
  constructor() {
    super('/api');
  }

  async getAll() {
    try {
      const result = await this.get('/invoices-db');
      return result.success ? result.data : [];
    } catch (error) {
      console.error('Error fetching invoices:', error);
      // Fallback für Offline-Modus
      const stored = localStorage.getItem('invoices_cache');
      return stored ? JSON.parse(stored) : [];
    }
  }

  async getById(id) {
    try {
      const invoices = await this.getAll();
      return invoices.find(invoice => invoice.id === id);
    } catch (error) {
      throw new Error(`Rechnung mit ID ${id} nicht gefunden: ${error.message}`);
    }
  }

  async create(invoiceData) {
    try {
      const result = await this.post('/invoices-enhanced', invoiceData);
      
      if (!result.success) {
        throw new Error(result.error || 'Rechnung konnte nicht erstellt werden');
      }
      
      // Cache aktualisieren
      this.updateCache();
      
      return result.data;
    } catch (error) {
      throw new Error(`Rechnung erstellen fehlgeschlagen: ${error.message}`);
    }
  }

  async update(id, invoiceData) {
    try {
      const result = await this.put(`/invoices-db?id=${id}`, invoiceData);
      
      if (!result.success) {
        throw new Error(result.error || 'Rechnung konnte nicht aktualisiert werden');
      }
      
      this.updateCache();
      return result.data;
    } catch (error) {
      throw new Error(`Rechnung aktualisieren fehlgeschlagen: ${error.message}`);
    }
  }

  async delete(id) {
    try {
      const result = await this.delete(`/invoices-db?id=${id}`);
      
      if (!result.success) {
        throw new Error(result.error || 'Rechnung konnte nicht gelöscht werden');
      }
      
      this.updateCache();
      return result.data;
    } catch (error) {
      throw new Error(`Rechnung löschen fehlgeschlagen: ${error.message}`);
    }
  }

  async sendEmail(invoiceId, options = {}) {
    try {
      const requestData = {
        invoiceId,
        attachXML: options.attachXML !== false,
        attachPDF: options.attachPDF || false,
        customMessage: options.customMessage || null
      };

      const result = await this.post('/send-email', requestData);
      
      if (!result.success) {
        throw new Error(result.error || 'E-Mail konnte nicht versendet werden');
      }
      
      return result.data;
    } catch (error) {
      throw new Error(`E-Mail-Versand fehlgeschlagen: ${error.message}`);
    }
  }

  async downloadPDF(invoiceId, invoiceNumber) {
    try {
      const filename = `Rechnung_${invoiceNumber || invoiceId}.pdf`;
      await this.downloadFile(`/api/generate-pdf?invoiceId=${invoiceId}`, filename);
    } catch (error) {
      throw new Error(`PDF-Download fehlgeschlagen: ${error.message}`);
    }
  }

  async generateXRechnung(invoiceId) {
    try {
      const result = await this.post('/generate-xrechnung', { invoiceId });
      
      if (!result.success) {
        throw new Error(result.error || 'XRechnung konnte nicht generiert werden');
      }
      
      return result.data;
    } catch (error) {
      throw new Error(`XRechnung-Generierung fehlgeschlagen: ${error.message}`);
    }
  }

  async downloadXRechnung(invoiceId, invoiceNumber) {
    try {
      const xmlData = await this.generateXRechnung(invoiceId);
      const filename = xmlData.fileName || `XRechnung_${invoiceNumber || invoiceId}.xml`;
      
      // XML als Datei herunterladen
      const blob = new Blob([xmlData.xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      
      URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(`XRechnung-Download fehlgeschlagen: ${error.message}`);
    }
  }

  // Cache-Management
  async updateCache() {
    try {
      const invoices = await this.getAll();
      localStorage.setItem('invoices_cache', JSON.stringify(invoices));
      localStorage.setItem('invoices_cache_timestamp', Date.now().toString());
    } catch (error) {
      console.warn('Cache update failed:', error);
    }
  }

  isCacheValid(maxAgeMinutes = 5) {
    const timestamp = localStorage.getItem('invoices_cache_timestamp');
    if (!timestamp) return false;
    
    const cacheAge = Date.now() - parseInt(timestamp);
    return cacheAge < (maxAgeMinutes * 60 * 1000);
  }
}

// src/services/customerService.js
class CustomerService extends BaseService {
  constructor() {
    super('/api');
  }

  async getAll() {
    try {
      const result = await this.get('/customers');
      return result.success ? result.data : [];
    } catch (error) {
      console.error('Error fetching customers:', error);
      // Fallback
      const stored = localStorage.getItem('customers_cache');
      return stored ? JSON.parse(stored) : [];
    }
  }

  async getById(id) {
    try {
      const customers = await this.getAll();
      const customer = customers.find(c => c.id === id);
      if (!customer) {
        throw new Error('Kunde nicht gefunden');
      }
      return customer;
    } catch (error) {
      throw new Error(`Kunde mit ID ${id} nicht gefunden: ${error.message}`);
    }
  }

  async create(customerData) {
    try {
      const result = await this.post('/customers', customerData);
      
      if (!result.success) {
        throw new Error(result.error || 'Kunde konnte nicht erstellt werden');
      }
      
      this.updateCache();
      return result.data;
    } catch (error) {
      throw new Error(`Kunde erstellen fehlgeschlagen: ${error.message}`);
    }
  }

  async update(id, customerData) {
    try {
      const result = await this.put(`/customers?id=${id}`, customerData);
      
      if (!result.success) {
        throw new Error(result.error || 'Kunde konnte nicht aktualisiert werden');
      }
      
      this.updateCache();
      return result.data;
    } catch (error) {
      throw new Error(`Kunde aktualisieren fehlgeschlagen: ${error.message}`);
    }
  }

  async delete(id) {
    try {
      const result = await this.delete(`/customers?id=${id}`);
      
      if (!result.success) {
        throw new Error(result.error || 'Kunde konnte nicht gelöscht werden');
      }
      
      this.updateCache();
      return result.data;
    } catch (error) {
      throw new Error(`Kunde löschen fehlgeschlagen: ${error.message}`);
    }
  }

  async getInvoices(customerId) {
    try {
      // Rechnungen für spezifischen Kunden laden
      const invoices = await new InvoiceService().getAll();
      return invoices.filter(invoice => invoice.customerId === customerId);
    } catch (error) {
      throw new Error(`Rechnungen für Kunde laden fehlgeschlagen: ${error.message}`);
    }
  }

  async updateCache() {
    try {
      const customers = await this.getAll();
      localStorage.setItem('customers_cache', JSON.stringify(customers));
    } catch (error) {
      console.warn('Customer cache update failed:', error);
    }
  }
}

// src/services/configService.js
class ConfigService extends BaseService {
  constructor() {
    super('/api');
  }

  async get() {
    try {
      const result = await this.get('/config');
      return result.success ? result.data : this.getDefaultConfig();
    } catch (error) {
      console.error('Error fetching config:', error);
      // Fallback zu gespeicherter oder Standard-Konfiguration
      const stored = localStorage.getItem('config_cache');
      return stored ? JSON.parse(stored) : this.getDefaultConfig();
    }
  }

  async update(configData) {
    try {
      const result = await this.put('/config', configData);
      
      if (!result.success) {
        throw new Error(result.error || 'Konfiguration konnte nicht gespeichert werden');
      }
      
      // Cache aktualisieren
      localStorage.setItem('config_cache', JSON.stringify(result.data));
      
      return result.data;
    } catch (error) {
      throw new Error(`Konfiguration speichern fehlgeschlagen: ${error.message}`);
    }
  }

  async testEmailConnection(emailConfig) {
    try {
      const result = await this.post('/test-email', emailConfig);
      
      if (!result.success) {
        throw new Error(result.error || 'E-Mail-Test fehlgeschlagen');
      }
      
      return result.data;
    } catch (error) {
      throw new Error(`E-Mail-Verbindungstest fehlgeschlagen: ${error.message}`);
    }
  }

  getDefaultConfig() {
    return {
      company: {
        name: '',
        address: '',
        taxId: '',
        email: '',
        phone: '',
        website: ''
      },
      email: {
        provider: 'gmail',
        host: '',
        port: 587,
        secure: false,
        user: '',
        password: '',
        from: '',
        replyTo: ''
      },
      templates: {
        invoice: {
          subject: 'Neue Rechnung: {{invoiceNumber}}',
          body: `Sehr geehrte Damen und Herren,

anbei erhalten Sie die Rechnung {{invoiceNumber}} über {{amount}} {{currency}}.

Mit freundlichen Grüßen
{{companyName}}`
        }
      },
      invoice: {
        numberPrefix: 'INV-',
        taxRate: 19,
        currency: 'EUR',
        paymentTerms: 30
      }
    };
  }

  async exportConfig() {
    try {
      const config = await this.get();
      
      // Sensible Daten entfernen
      const exportConfig = {
        ...config,
        email: {
          ...config.email,
          password: '' // Passwort nicht exportieren
        }
      };
      
      const dataStr = JSON.stringify(exportConfig, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const url = URL.createObjectURL(dataBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `e-rechnung-config-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      URL.revokeObjectURL(url);
    } catch (error) {
      throw new Error(`Konfiguration exportieren fehlgeschlagen: ${error.message}`);
    }
  }

  async importConfig(file) {
    try {
      const text = await file.text();
      const importedConfig = JSON.parse(text);
      
      // Validierung der importierten Konfiguration
      if (!this.validateImportedConfig(importedConfig)) {
        throw new Error('Ungültige Konfigurationsdatei');
      }
      
      return await this.update(importedConfig);
    } catch (error) {
      throw new Error(`Konfiguration importieren fehlgeschlagen: ${error.message}`);
    }
  }

  validateImportedConfig(config) {
    // Basis-Validierung der Konfigurationsstruktur
    return config && 
           typeof config === 'object' &&
           config.company && 
           config.email && 
           config.templates && 
           config.invoice;
  }
}

// Service Instanzen erstellen und exportieren
export const invoiceService = new InvoiceService();
export const customerService = new CustomerService();
export const configService = new ConfigService();