// api/middleware/authMiddleware.js
import jwt from 'jsonwebtoken';
import { kv } from '@vercel/kv';

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Authentifizierung prüfen
 */
export async function authenticateUser(req) {
  const authHeader = req?.headers?.authorization;
  if (!authHeader) {
    return { status: 401, message: 'Missing Authorization header' };
  }

  try {
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return {
        status: 401,
        message: 'Zugriff verweigert - Kein Token vorhanden'
      };
    }

    // Token verifizieren
    const decoded = jwt.verify(token, JWT_SECRET);

    // Support-User (super@user.com)
    if (decoded.isSupport && decoded.email === process.env.SUPPORT_EMAIL) {
      return {
        status: 200,
        user: {
          id: decoded.userId,
          email: decoded.email,
          name: 'Support Administrator',
          role: 'admin', // Admin-Rechte
          permissions: ['*'],
          isSupport: true,
          companyId: 'all'
        }
      };
    }

    // Standard-Benutzer aus KV-Store laden
    const users = await kv.get('e-users') || [];
    const user = users.find(u => u.id === decoded.userId && u.isActive);

    if (!user) {
      return {
        status: 401,
        message: 'Benutzer nicht gefunden oder deaktiviert'
      };
    }

    return {
      status: 200,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        permissions: user.permissions,
        companyId: user.companyId,
        isSupport: false
      }
    };

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return {
        status: 401,
        message: 'Token abgelaufen - bitte erneut anmelden'
      };
    }

    if (error.name === 'JsonWebTokenError') {
      return {
        status: 401,
        message: 'Ungültiger Token'
      };
    }

    console.error('Auth middleware error:', error);
    return {
      status: 500,
      message: 'Authentifizierungsfehler'
    };
  }
}

/**
 * Berechtigungen prüfen
 */
export function hasPermission(user, resource, action) {
  if (!user || !user.role) {
    return false;
  }

  // 🔧 KORRIGIERT: Support und Admin haben alle Rechte
  if (user.role === 'admin' || user.role === 'support' || user.isSupport === true) {
    console.log(`✅ Admin/Support access granted for ${user.email} (${user.role}, isSupport: ${user.isSupport})`);
    return true;
  }

  // Berechtigungen nach Rollen
  const rolePermissions = {
    user: {
      customers: ['read', 'write'],
      invoices: ['read', 'write'],
      config: ['read'],
      dashboard: ['read']
    },
    support_readonly: {
      customers: ['read'],
      invoices: ['read'],
      config: ['read'],
      dashboard: ['read']
    },
    admin: { // 🔧 HINZUGEFÜGT: Explizite Admin-Berechtigungen
      customers: ['read', 'write'],
      invoices: ['read', 'write'],
      config: ['read', 'write'], // Admin kann Config ändern
      dashboard: ['read']
    }
  };

  const userPermissions = rolePermissions[user.role];
  if (!userPermissions) {
    console.log(`❌ No permissions defined for role: ${user.role}`);
    return false;
  }

  const resourcePermissions = userPermissions[resource];
  if (!resourcePermissions) {
    console.log(`❌ No permissions for resource: ${resource} in role: ${user.role}`);
    return false;
  }

  return resourcePermissions.includes(action) || resourcePermissions.includes('*');
}

/**
 * Middleware-Wrapper für API-Routen
 */
export function withAuth(requiredResource, requiredAction) {
  return async function authWrapper(req, res, next) {
    const authResult = await authenticateUser(req, res);
    if (!authResult || authResult.status !== 200) {
      return res
        .status(authResult?.status || 401)
        .json({ error: authResult?.message || 'Unauthorized' });
    }

    // Berechtigungen prüfen (falls angegeben)
    if (requiredResource && requiredAction) {
      const hasAccess = hasPermission(authResult.user, requiredResource, requiredAction);

      if (!hasAccess) {
        console.log(`❌ Permission denied: ${authResult.user.email} tried ${requiredAction} on ${requiredResource}`);
        return res
          .status(403)
          .json({ error: `Keine Berechtigung für ${requiredAction} auf ${requiredResource}` });
      }
    }

    // User für weitere Verarbeitung anhängen
    req.user = authResult.user;

    // Für Express: next() aufrufen, für Vercel: direkt weiterleiten
    if (typeof next === 'function') {
      return next();
    }

    return authResult; // Für direkte Verwendung in Vercel-Funktionen
  };
}

/**
 * Audit-Log für Sicherheits-Events
 */
export function logSecurityEvent(type, user, details = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    type,
    user: user ? {
      id: user.id,
      email: user.email,
      role: user.role,
      isSupport: user.isSupport
    } : null,
    ip: details.ip || 'unknown',
    userAgent: details.userAgent || 'unknown',
    resource: details.resource,
    action: details.action,
    success: details.success
  };

  console.log(`🔒 SECURITY LOG [${type}]:`, JSON.stringify(logEntry));

  // Hier könnte später ein echtes Logging-System angebunden werden
}