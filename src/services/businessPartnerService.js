// src/services/businessPartnerService.js
import authService from './authService';

class BusinessPartnerService {
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
      const response = await fetch(`${this.baseURL}/api/business-partners`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        this.handleAuthError(new Error('Failed to fetch business partners'), response);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Fehler beim Laden der Business Partner');
      }

      return result.data || [];
    } catch (error) {
      console.error('Error fetching business partners:', error);
      if (error.message.includes('Sitzung abgelaufen') || error.message.includes('Keine Berechtigung')) {
        throw error;
      }
      throw new Error('Verbindungsfehler beim Laden der Business Partner');
    }
  }

  async create(partnerData) {
    try {
      const response = await fetch(`${this.baseURL}/api/business-partners`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(partnerData)
      });

      if (!response.ok) {
        this.handleAuthError(new Error('Failed to create business partner'), response);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Fehler beim Erstellen des Business Partners');
      }

      return result;
    } catch (error) {
      console.error('Error creating business partner:', error);
      throw new Error('Fehler beim Erstellen des Business Partners: ' + error.message);
    }
  }

  // Berechtigungen prüfen
  canRead() {
    return authService.hasPermission('customers:read'); // Verwenden erstmal customer permissions
  }

  canWrite() {
    return authService.hasPermission('customers:write');
  }
}

export const businessPartnerService = new BusinessPartnerService();