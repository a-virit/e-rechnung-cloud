// src/services/configService.js - Mit Authentifizierung & robuster Fehlerbehandlung
import authService from './authService';

class ConfigService {
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

  // Hilfsfunktion: JSON sicher parsen
  async safeJson(response) {
    try {
      return await response.json();
    } catch (err) {
      console.error("⚠️ Invalid JSON in response:", err);
      throw new Error("Ungültige Server-Antwort (kein JSON)");
    }
  }

  async get() {
    try {
      const response = await fetch(`${this.baseURL}/api/config`, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (!response.ok) {
        this.handleAuthError(new Error('Failed to fetch config'), response);
      }

      const result = await this.safeJson(response);

      if (!result.success) {
        throw new Error(result.error || 'Fehler beim Laden der Konfiguration');
      }

      return result.data || {};
    } catch (error) {
      console.error('❌ Error fetching config:', error);
      if (error.message.includes('Sitzung abgelaufen') || error.message.includes('Keine Berechtigung')) {
        throw error; // Auth-Fehler weiterwerfen
      }
      throw new Error('Verbindungsfehler beim Laden der Konfiguration: ' + error.message);
    }
  }

  async update(configData) {
    try {
      const response = await fetch(`${this.baseURL}/api/config`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(configData)
      });

      if (!response.ok) {
        this.handleAuthError(new Error('Failed to update config'), response);
      }

      const result = await this.safeJson(response);

      if (!result.success) {
        throw new Error(result.error || 'Fehler beim Speichern der Konfiguration');
      }

      return result;
    } catch (error) {
      console.error('❌ Error updating config:', error);
      if (error.message.includes('Sitzung abgelaufen') || error.message.includes('Keine Berechtigung')) {
        throw error;
      }
      throw new Error('Fehler beim Speichern der Konfiguration: ' + error.message);
    }
  }

  // Test-E-Mail mit Auth senden
  async sendTestEmail(emailConfig, companyConfig) {
    try {
      const response = await fetch(`${this.baseURL}/api/test-email`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({
          emailConfig,
          companyConfig
        })
      });

      if (!response.ok) {
        this.handleAuthError(new Error('Failed to send test email'), response);
      }

      const result = await this.safeJson(response);

      if (!result.success) {
        throw new Error(result.error || 'Test-E-Mail-Versand fehlgeschlagen');
      }

      return result;
    } catch (error) {
      console.error('❌ Error sending test email:', error);
      if (error.message.includes('Sitzung abgelaufen') || error.message.includes('Keine Berechtigung')) {
        throw error;
      }
      throw new Error('Test-E-Mail-Versand fehlgeschlagen: ' + error.message);
    }
  }

  // 🔒 Berechtigungen für UI prüfen
  canRead() {
    return authService.hasPermission('config:read');
  }

  canWrite() {
    return authService.hasPermission('config:write');
  }

  // 🔒 Admin-Level Einstellungen prüfen
  canEditSensitiveSettings() {
    const user = authService.getCurrentUser();
    return user?.role === 'admin' || user?.isSupport;
  }

  // 🔒 E-Mail-Provider Einstellungen prüfen
  canEditEmailSettings() {
    const user = authService.getCurrentUser();
    // Nur Admin/Support darf E-Mail-Provider-Einstellungen ändern
    return user?.role === 'admin' || user?.isSupport;
  }
}

export const configService = new ConfigService();