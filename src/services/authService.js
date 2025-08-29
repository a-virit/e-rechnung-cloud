// src/services/authService.js
class AuthService {
  constructor() {
    this.baseURL = process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : '';
    this.tokenKey = 'e-rechnungs-token';
    this.userKey = 'e-rechnungs-user';
  }

  // Login
  async login(credentials) {
    try {
      const response = await fetch(`${this.baseURL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login fehlgeschlagen');
      }

      // Token und Benutzer speichern
      localStorage.setItem(this.tokenKey, data.token);
      localStorage.setItem(this.userKey, JSON.stringify(data.user));

      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  }

  // Logout
  logout() {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    window.location.href = '/login';
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

  // Prüfen ob eingeloggt
  isAuthenticated() {
    const token = this.getToken();
    const user = this.getCurrentUser();
    
    if (!token || !user) return false;

    // Einfache Token-Validierung (später mit JWT-Decode erweitern)
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

    // Admin hat alle Berechtigungen
    if (user.role === 'admin') return true;

    // Spezifische Berechtigungen je nach Rolle
    const permissions = {
      admin: ['*'], // Alle Berechtigungen
      user: ['invoices:read', 'invoices:write', 'customers:read', 'customers:write'],
      support: ['invoices:read', 'customers:read', 'config:read'],
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