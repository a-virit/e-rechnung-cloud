// src/services/invoiceService.js - Mit Authentifizierung
import authService from './authService';

class InvoiceService {
  constructor() {
    this.baseURL = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '';
  }

  // Auth-Headers abrufen
  getAuthHeaders() {
    const token = authService.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  }

  // Fehlerbehandlung für Auth-Probleme
  handleAuthError(error, response) {
    if (response?.status === 401) {
      authService.logout();
      throw new Error('Sitzung abgelaufen - bitte melden Sie sich erneut an');
    }
    if (response?.status === 403) {
      throw new Error('Keine Berechtigung für diese Aktion');
    }
    throw error;
  }

  async getAll() {
    try {
      const response = await fetch(`${this.baseURL}/api/invoices-db`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        this.handleAuthError(new Error('Failed to fetch invoices'), response);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Fehler beim Laden der Rechnungen');
      }

      return result.data || [];
    } catch (error) {
      console.error('Error fetching invoices:', error);
      if (error.message.includes('Sitzung abgelaufen') || error.message.includes('Keine Berechtigung')) {
        throw error;
      }
      throw new Error('Verbindungsfehler beim Laden der Rechnungen');
    }
  }

  async create(invoiceData) {
    try {
      const response = await fetch(`${this.baseURL}/api/invoices-enhanced`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(invoiceData)
      });

      if (!response.ok) {
        this.handleAuthError(new Error('Failed to create invoice'), response);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Fehler beim Erstellen der Rechnung');
      }

      return result;
    } catch (error) {
      console.error('Error creating invoice:', error);
      if (error.message.includes('Sitzung abgelaufen') || error.message.includes('Keine Berechtigung')) {
        throw error;
      }
      throw new Error('Fehler beim Erstellen der Rechnung: ' + error.message);
    }
  }

  async sendEmail(invoiceId, options = {}) {
    try {
      const requestBody = {
        invoiceId,
        attachXML: options.attachXML !== false, // Default: XML anhängen
        attachPDF: options.attachPDF || false,
        recipientOverride: options.recipientOverride,
        ...options
      };

      const response = await fetch(`${this.baseURL}/api/send-email`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        this.handleAuthError(new Error('Failed to send email'), response);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'E-Mail-Versand fehlgeschlagen');
      }

      return result;
    } catch (error) {
      console.error('Error sending email:', error);
      if (error.message.includes('Sitzung abgelaufen') || error.message.includes('Keine Berechtigung')) {
        throw error;
      }
      if (error.message.includes('Tägliches E-Mail-Limit')) {
        throw error; // Rate-Limit-Fehler weiterwerfen
      }
      throw new Error('E-Mail-Versand fehlgeschlagen: ' + error.message);
    }
  }

  async downloadPDF(invoiceId, invoiceNumber) {
    try {
      const response = await fetch(`${this.baseURL}/api/generate-pdf?invoiceId=${invoiceId}`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        this.handleAuthError(new Error('Failed to generate PDF'), response);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Rechnung_${invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('Error downloading PDF:', error);
      if (error.message.includes('Sitzung abgelaufen') || error.message.includes('Keine Berechtigung')) {
        throw error;
      }
      throw new Error('PDF-Download fehlgeschlagen: ' + error.message);
    }
  }

  async delete(invoiceId) {
    try {
      const response = await fetch(`${this.baseURL}/api/invoices-db?id=${invoiceId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        this.handleAuthError(new Error('Failed to delete invoice'), response);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Fehler beim Löschen der Rechnung');
      }

      return result;
    } catch (error) {
      console.error('Error deleting invoice:', error);
      if (error.message.includes('Sitzung abgelaufen') || error.message.includes('Keine Berechtigung')) {
        throw error;
      }
      throw new Error('Fehler beim Löschen der Rechnung: ' + error.message);
    }
  }

  // 🔒 Berechtigungen für UI prüfen
  canRead() {
    return authService.hasPermission('invoices:read');
  }

  canWrite() {
    return authService.hasPermission('invoices:write');
  }

  canDelete() {
    return authService.hasPermission('invoices:write');
  }

  canSendEmail() {
    return authService.hasPermission('invoices:write');
  }

  // 🔒 Zusätzliche Invoice-spezifische Checks
  canDownloadPDF() {
    return authService.hasPermission('invoices:read');
  }

  canGenerateXML() {
    return authService.hasPermission('invoices:read');
  }
}

export const invoiceService = new InvoiceService();