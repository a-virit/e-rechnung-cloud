// api/config.js - Konfigurationsverwaltung mit Authentifizierung
import { getCompanyKV } from './utils/kv.js';
import { authenticateUser, hasPermission, logSecurityEvent } from './middleware/authMiddleware.js';
import { encrypt, decrypt } from './utils/encryption.js';

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
  },
  sso: {
    provider: '',
    issuer: '',
    clientId: '',
    clientSecret: ''
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
  let authResult;
  try {
    authResult = await authenticateUser(req);
  } catch (err) {
    console.error("AUTH ERROR:", err.message || err);
    return res.status(500).json({ error: "Authentication failed." });
  }

  if (!authResult || authResult.status !== 200) {
    logSecurityEvent('UNAUTHORIZED_ACCESS', null, {
      ip: req.headers['x-forwarded-for'] || 'unknown',
      resource: 'config',
      action: req.method,
      success: false
    });

    return res
      .status(authResult?.status || 401)
      .json({ error: authResult?.message || 'Unauthorized' });
  }

  const { user } = authResult;
  const kv = getCompanyKV(user.companyId);

  try {
    // GET - Konfiguration laden
    if (req.method === 'GET') {
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

      const configKey = user.companyId === 'all' || user.isSupport
        ? CONFIG_KEY
        : `${CONFIG_KEY}-${user.companyId}`;

      let config = await kv.get(configKey);

      if (!config) {
        config = DEFAULT_CONFIG;
        await kv.set(configKey, config);
      }

      // SSO-ClientSecret für Admin/Support entschlüsseln
      if ((user.role === 'admin' || user.isSupport) && config.sso?.clientSecret) {
        try {
          config.sso.clientSecret = decrypt(config.sso.clientSecret);
        } catch (e) {
          console.error('❌ Failed to decrypt SSO secret:', e.message);
          config.sso.clientSecret = '';
        }
      }

      let responseConfig = config;

      if (user.role !== 'admin' && !user.isSupport) {
        responseConfig = {
          ...config,
          email: {
            ...config.email,
            password: config.email.password ? '***VERBORGEN***' : ''
          },
          sso: {
            ...config.sso,
            clientSecret: config.sso?.clientSecret ? '***VERBORGEN***' : ''
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

      // 🔒 Validierung vor Übernahme
      const issues = validateConfigSecurity(updates, user);
      if (issues.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Ungültige Konfiguration: ' + issues.join(', ')
        });
      }

      if (updates.sso && updates.sso.clientSecret) {
        try {
          updates.sso.clientSecret = encrypt(updates.sso.clientSecret);
        } catch (e) {
          console.error("❌ Failed to encrypt SSO secret:", e.message);
          return res.status(400).json({
            success: false,
            error: "Ungültiges SSO-Secret"
          });
        }
        logSecurityEvent('SENSITIVE_CONFIG_CHANGE', user, {
          resource: 'config',
          action: 'sso_client_secret_change',
          success: true
        });
      }

      const configKey = user.companyId === 'all' || user.isSupport
        ? CONFIG_KEY
        : `${CONFIG_KEY}-${user.companyId}`;

      let currentConfig = await kv.get(configKey) || DEFAULT_CONFIG;

      const updatedConfig = mergeDeep(currentConfig, updates);
      updatedConfig.updatedAt = new Date().toISOString();
      updatedConfig.updatedBy = user.id;

      await kv.set(configKey, updatedConfig);

      if ((user.role === 'admin' || user.isSupport) && updatedConfig.sso?.clientSecret) {
        try {
          updatedConfig.sso.clientSecret = decrypt(updatedConfig.sso.clientSecret);
        } catch (e) {
          console.error('❌ Failed to decrypt SSO secret after update:', e.message);
          updatedConfig.sso.clientSecret = '';
        }
      }

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

// Helper Deep Merge
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

// 🔒 Sicherheitsvalidierung für Updates
function validateConfigSecurity(updates, user) {
  const issues = [];
  if (updates.email?.provider && user.role !== 'admin' && !user.isSupport) {
    issues.push('Nur Administratoren dürfen E-Mail-Provider ändern');
  }
  if (updates.email?.host && !updates.email.host.includes('.')) {
    issues.push('Ungültiger SMTP-Server');
  }
  if (updates.company?.taxId && user.role !== 'admin' && !user.isSupport) {
    issues.push('Nur Administratoren dürfen Steuernummer ändern');
  }
  return issues;
}