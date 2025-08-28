// ============================================
// 5. MIDDLEWARE - Authentication
// ============================================

// api/middleware/auth.js
import jwt from 'jsonwebtoken';
import { kv } from '@vercel/kv';

export async function authenticateToken(req) {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return { success: false, error: 'Zugriff verweigert - Kein Token' };
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Support-User Check
    if (decoded.role === 'support') {
      return {
        success: true,
        user: {
          userId: 'support',
          email: process.env.SUPPORT_EMAIL,
          role: 'support',
          companyId: decoded.companyId
        }
      };
    }

    // Standard-User validieren
    const users = await kv.get('e-users') || [];
    const user = users.find(u => u.id === decoded.userId && u.isActive);

    if (!user) {
      return { success: false, error: 'Benutzer nicht gefunden' };
    }

    return { success: true, user: decoded };
  } catch (error) {
    return { success: false, error: 'Ungültiger Token' };
  }
}

// ============================================
// 6. ENVIRONMENT VARIABLES ERWEITERN
// ============================================

// .env.local hinzufügen:
/*
# JWT Secret für Token-Signierung
JWT_SECRET=super_sicherer_jwt_secret_hier_einsetzen

# Support-Zugang (Hersteller-Backdoor)
SUPPORT_EMAIL=support@ihr-unternehmen.de
SUPPORT_PASSWORD=super_sicheres_support_passwort_hier

# Bestehende E-Mail-Provider...
SENDGRID_API_KEY=...
*/