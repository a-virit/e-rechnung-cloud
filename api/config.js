// api/config.js - Konfigurationsverwaltung mit Authentifizierung
import { kv } from '@vercel/kv';
import { authenticateUser, hasPermission, logSecurityEvent } from './middleware/authMiddleware.js';

const CONFIG_KEY = 'e-config';

const DEFAULT_CONFIG = {
  company: {
    name: '',
    address: '',
    taxId: '',
    email: '',
    phone: '',
    website: '',
    logo: ''
  },
  email: {
    provider: 'sendgrid',
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
      subject: 'Neue Rechnung: {{invoiceId}}',
      body: `Sehr geehrte Damen und Herren,

anbei erhalten Sie die Rechnung {{invoiceId}} über {{amount}} {{currency}}.

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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 🔒 AUTHENTIFIZIERUNG PRÜFEN
  const authResult = await authenticateUser(req);
  if (!authResult.success) {
    logSecurityEvent('UNAUTHORIZED_ACCESS', null, {
      ip: req.headers['x-forwarded-for'] || 'unknown',
      resource: 'config',
      action: req.method,
      success: false
    });

    return res.status(authResult.status || 401).json({
      success: false,
      error: authResult.error
    });
  }

  const { user } = authResult;

  try {
    // GET - Konfiguration laden
    if (req.method === 'GET') {
      // 🔒 BERECHTIGUNG PRÜFEN
      if (!hasPermission(user, 'config', 'read')) {
        logSecurityEvent('PERMISSION_DENIED', user, {
          resource: 'config',
          action: 'read',
          success: false
        });

        return res.status(403).json({
          success: false,
          error: 'Keine Berechtigung zum Lesen der Konfiguration'
        });
      }

      // Firmen-spezifische Konfiguration laden
      const configKey = user.companyId === 'all' || user.isSupport 
        ? CONFIG_KEY 
        : `${CONFIG_KEY}-${user.companyId}`;
        
      let config = await kv.get(configKey);
      
      if (!config) {
        config = DEFAULT_CONFIG;
        await kv.set(configKey, config);
      }

      // 🔒 SENSIBLE DATEN FILTERN (für normale User)
      let responseConfig = config;
      
      if (user.role !== 'admin' && !user.isSupport) {
        // Passwörter für normale User entfernen
        responseConfig = {
          ...config,
          email: {
            ...config.email,
            password: config.email.password ? '***VERBORGEN***' : ''
          }
        };
      }

      logSecurityEvent('CONFIG_ACCESS', user, {
        resource: 'config',
        action: 'read',
        success: true,
        configKey
      });
      
      return res.status(200).json({
        success: true,
        data: responseConfig
      });
    }
    
    // PUT - Konfiguration aktualisieren
    if (req.method === 'PUT') {
      // 🔒 BERECHTIGUNG PRÜFEN (Nur Admin/Support darf Config ändern)
      if (!hasPermission(user, 'config', 'write')) {
        logSecurityEvent('PERMISSION_DENIED', user, {
          resource: 'config',
          action: 'write',
          success: false
        });

        return res.status(403).json({
          success: false,
          error: 'Keine Berechtigung zum Ändern der Konfiguration'
        });
      }

      const updates = req.body;
      
      // Firmen-spezifische Konfiguration
      const configKey = user.companyId === 'all' || user.isSupport 
        ? CONFIG_KEY 
        : `${CONFIG_KEY}-${user.companyId}`;
        
      let currentConfig = await kv.get(configKey) || DEFAULT_CONFIG;
      
      // 🔒 SENSIBLE ÄNDERUNGEN VALIDIEREN
      if (updates.email && updates.email.password) {
        // E-Mail-Passwort-Änderung loggen
        logSecurityEvent('SENSITIVE_CONFIG_CHANGE', user, {
          resource: 'config',
          action: 'email_password_change',
          success: true,
          configKey
        });
      }

      // Deep merge der Konfiguration
      const updatedConfig = mergeDeep(currentConfig, updates);
      updatedConfig.updatedAt = new Date().toISOString();
      updatedConfig.updatedBy = user.id;
      
      await kv.set(configKey, updatedConfig);

      logSecurityEvent('CONFIG_UPDATE', user, {
        resource: 'config',
        action: 'update',
        success: true,
        configKey,
        changedFields: Object.keys(updates)
      });
      
      return res.status(200).json({
        success: true,
        data: updatedConfig,
        message: 'Konfiguration erfolgreich aktualisiert'
      });
    }
    
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
    
  } catch (error) {
    console.error('❌ Config API error:', error);

    logSecurityEvent('API_ERROR', user, {
      resource: 'config',
      action: req.method,
      success: false,
      error: error.message
    });

    return res.status(500).json({
      success: false,
      error: 'Konfigurationsfehler: ' + error.message
    });
  }
}

// Helper function für deep merge
function mergeDeep(target, source) {
  const result = { ...target };
  
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      result[key] = mergeDeep(result[key] || {}, source[key]);
    } else {
      result[key] = source[key];
    }
  }
  
  return result;
}

// 🔒 ZUSÄTZLICHE SICHERHEITS-VALIDIERUNG für Config-Updates
function validateConfigSecurity(updates, user) {
  const issues = [];

  // E-Mail-Provider-Änderungen nur für Admin/Support
  if (updates.email?.provider && user.role !== 'admin' && !user.isSupport) {
    issues.push('Nur Administratoren dürfen E-Mail-Provider ändern');
  }

  // Gefährliche SMTP-Einstellungen prüfen
  if (updates.email?.host && !updates.email.host.includes('.')) {
    issues.push('Ungültiger SMTP-Server');
  }

  // Unternehmensdaten-Änderungen tracken
  if (updates.company?.taxId && user.role !== 'admin' && !user.isSupport) {
    issues.push('Nur Administratoren dürfen Steuernummer ändern');
  }

  return issues;
}