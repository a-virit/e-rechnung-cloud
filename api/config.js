// api/config.js - Konfigurationsverwaltung
import { kv } from '@vercel/kv';

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

  try {
    // GET - Konfiguration laden
    if (req.method === 'GET') {
      let config = await kv.get(CONFIG_KEY);
      
      if (!config) {
        config = DEFAULT_CONFIG;
        await kv.set(CONFIG_KEY, config);
      }
      
      return res.status(200).json({
        success: true,
        data: config
      });
    }
    
    // PUT - Konfiguration aktualisieren
    if (req.method === 'PUT') {
      const updates = req.body;
      let currentConfig = await kv.get(CONFIG_KEY) || DEFAULT_CONFIG;
      
      // Deep merge der Konfiguration
      const updatedConfig = mergeDeep(currentConfig, updates);
      updatedConfig.updatedAt = new Date().toISOString();
      
      await kv.set(CONFIG_KEY, updatedConfig);
      
      return res.status(200).json({
        success: true,
        data: updatedConfig
      });
    }
    
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
    
  } catch (error) {
    console.error('Config API error:', error);
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