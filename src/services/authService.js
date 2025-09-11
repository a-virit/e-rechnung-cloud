// src/services/authService.js
class AuthService {
  constructor() {
    this.baseURL = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '';
    this.tokenKey = 'token'; // Gleich wie in AuthContext
    this.userKey = 'user';   // Gleich wie in AuthContext
  }

  // Token und Benutzer speichern
  setAuthData(token, user) {
    localStorage.setItem(this.tokenKey, token);
    if (user) {
      localStorage.setItem(this.userKey, JSON.stringify(user));
    }
  }

  // Token abrufen
  getToken() {
    return localStorage.getItem(this.tokenKey);
  }

  // Aktueller Benutzer
  getCurrentUser() {
    const userStr = localStorage.getItem(this.userKey);
    if (!userStr) return null;

    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  // Aktuelle CompanyId
  getCompanyId() {
    return this.getCurrentUser()?.companyId || null;
  }

  // Logout (redirect zur Login-Seite)
  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    window.location.href = '/login';
  }

  // Prüfen ob eingeloggt
  isAuthenticated() {
    const token = this.getToken();
    const user = this.getCurrentUser();

    if (!token || !user) return false;

    // Einfache Token-Validierung
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;

      return payload.exp > now;
    } catch {
      return false;
    }
  }

  // Berechtigungen prüfen
  hasPermission(permission) {
    const user = this.getCurrentUser();
    if (!user) return false;

    // Admin und Support haben alle Berechtigungen
    if (user.role === 'admin' || user.isSupport) return true;

    // Standard-Berechtigungen je nach Rolle
    const permissions = {
      admin: ['*'],
      user: ['customers:read', 'customers:write', 'invoices:read', 'invoices:write', 'config:read'],
      support_readonly: ['customers:read', 'invoices:read', 'config:read'],
      guest: ['invoices:read']
    };

    const userPermissions = permissions[user.role] || [];

    return userPermissions.includes('*') || userPermissions.includes(permission);
  }

  // Authorization Header für API-Calls
  getAuthHeaders() {
    const token = this.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  }
}

export default new AuthService();