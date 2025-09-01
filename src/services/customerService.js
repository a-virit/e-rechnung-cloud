// src/services/customerService.js - Mit Authentifizierung
import authService from './authService';

class CustomerService {
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
      // Token abgelaufen oder ungültig
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
      const response = await fetch(`${this.baseURL}/api/customers`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        this.handleAuthError(new Error('Failed to fetch customers'), response);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Fehler beim Laden der Kunden');
      }

      return result.data || [];
    } catch (error) {
      console.error('Error fetching customers:', error);
      if (error.message.includes('Sitzung abgelaufen') || error.message.includes('Keine Berechtigung')) {
        throw error; // Auth-Fehler weiterwerfen
      }
      throw new Error('Verbindungsfehler beim Laden der Kunden');
    }
  }

  async create(customerData) {
    try {
      const response = await fetch(`${this.baseURL}/api/customers`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(customerData)
      });

      if (!response.ok) {
        this.handleAuthError(new Error('Failed to create customer'), response);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Fehler beim Erstellen des Kunden');
      }

      return result;
    } catch (error) {
      console.error('Error creating customer:', error);
      if (error.message.includes('Sitzung abgelaufen') || error.message.includes('Keine Berechtigung')) {
        throw error;
      }
      throw new Error('Fehler beim Erstellen des Kunden: ' + error.message);
    }
  }

  async update(customerId, customerData) {
    try {
      const response = await fetch(`${this.baseURL}/api/customers?id=${customerId}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(customerData)
      });

      if (!response.ok) {
        this.handleAuthError(new Error('Failed to update customer'), response);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Fehler beim Aktualisieren des Kunden');
      }

      return result;
    } catch (error) {
      console.error('Error updating customer:', error);
      if (error.message.includes('Sitzung abgelaufen') || error.message.includes('Keine Berechtigung')) {
        throw error;
      }
      throw new Error('Fehler beim Aktualisieren des Kunden: ' + error.message);
    }
  }

  async delete(customerId) {
    try {
      const response = await fetch(`${this.baseURL}/api/customers?id=${customerId}`, {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        this.handleAuthError(new Error('Failed to delete customer'), response);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Fehler beim Löschen des Kunden');
      }

      return result;
    } catch (error) {
      console.error('Error deleting customer:', error);
      if (error.message.includes('Sitzung abgelaufen') || error.message.includes('Keine Berechtigung')) {
        throw error;
      }
      throw new Error('Fehler beim Löschen des Kunden: ' + error.message);
    }
  }

  // 🔒 Berechtigungen für UI prüfen
  canRead() {
    return authService.hasPermission('customers:read');
  }

  canWrite() {
    return authService.hasPermission('customers:write');
  }

  canDelete() {
    return authService.hasPermission('customers:write'); // Delete braucht write-Berechtigung
  }
}

export const customerService = new CustomerService();