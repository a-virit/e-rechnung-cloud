// api/auth/sso/config.js
import { kv } from '@vercel/kv';
import { withAuth } from '../../middleware/authMiddleware.js';

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Multi-Tenant Isolation sicherstellen
  const companyId = req.user.companyId;
  if (!companyId || companyId === 'undefined') {
    return res.status(400).json({
      success: false,
      error: 'Keine Company ID gefunden'
    });
  }

  const companyKey = `e-company-${companyId}`;

  try {
    if (req.method === 'GET') {
      // SSO-Konfiguration für diese Company laden
      const company = await kv.get(companyKey) || {};
      
      return res.status(200).json({
        success: true,
        data: {
          ssoEnabled: company.ssoEnabled || false,
          provider: company.ssoProvider || 'microsoft',
          config: {
            clientId: company.ssoConfig?.clientId || '',
            tenantId: company.ssoConfig?.tenantId || '',
            domain: company.ssoConfig?.domain || ''
          }
        }
      });
    }

    if (req.method === 'PUT') {
      // SSO-Konfiguration für diese Company speichern
      const { ssoEnabled, provider, config } = req.body;
      
      // Validierung
      if (ssoEnabled && (!config.clientId || !config.tenantId || !config.domain)) {
        return res.status(400).json({
          success: false,
          error: 'Client ID, Tenant ID und Domain sind für aktiviertes SSO erforderlich'
        });
      }

      // Bestehende Company-Daten laden
      const company = await kv.get(companyKey) || {};
      
      // SSO-Konfiguration aktualisieren
      company.ssoEnabled = ssoEnabled;
      company.ssoProvider = provider;
      company.ssoConfig = {
        clientId: config.clientId || '',
        tenantId: config.tenantId || '',
        domain: config.domain || ''
      };
      
      // Aktualisierungsdatum setzen
      company.ssoUpdatedAt = new Date().toISOString();
      company.ssoUpdatedBy = req.user.email;
      
      // Company-Daten speichern
      await kv.set(companyKey, company);
      
      // Domain-Mapping für Multi-Tenant SSO erstellen/aktualisieren
      if (config.domain) {
        const domainKey = `company-by-domain:${config.domain.toLowerCase()}`;
        await kv.set(domainKey, {
          companyId: companyId,
          name: company.name || `Company ${companyId}`,
          ssoEnabled: ssoEnabled,
          ssoProvider: provider
        });
        
        console.log(`SSO Domain mapping created: ${config.domain} -> ${companyId}`);
      }
      
      // Audit-Log
      console.log(`SSO Config updated for company ${companyId}: enabled=${ssoEnabled}, provider=${provider}`);
      
      return res.status(200).json({
        success: true,
        message: 'SSO-Konfiguration erfolgreich gespeichert'
      });
    }

    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
    
  } catch (error) {
    console.error('SSO Config API error:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Serverfehler beim Verarbeiten der SSO-Konfiguration' 
    });
  }
}

export default withAuth('config', 'edit')(handler);