// api/customers.js - Kundendatenbank API
import { kv } from '@vercel/kv';

const CUSTOMERS_KEY = 'e-customers';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET - Alle Kunden laden
    if (req.method === 'GET') {
      const customers = await kv.get(CUSTOMERS_KEY) || [];
      return res.status(200).json({
        success: true,
        data: customers,
        count: customers.length
      });
    }
    
    // POST - Neuen Kunden erstellen
    if (req.method === 'POST') {
      const { name, email, address, taxId, contactPerson, phone } = req.body;
      
      if (!name || !email) {
        return res.status(400).json({
          success: false,
          error: 'Name und E-Mail sind erforderlich'
        });
      }

      const currentCustomers = await kv.get(CUSTOMERS_KEY) || [];
      
      const newCustomer = {
        id: `CUST-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        name,
        email,
        address: address || '',
        taxId: taxId || '',
        contactPerson: contactPerson || '',
        phone: phone || '',
        createdAt: new Date().toISOString(),
        invoiceCount: 0,
        lastInvoice: null
      };
      
      const updatedCustomers = [newCustomer, ...currentCustomers];
      await kv.set(CUSTOMERS_KEY, updatedCustomers);
      
      return res.status(201).json({
        success: true,
        data: newCustomer
      });
    }

    // PUT - Kunden aktualisieren
    if (req.method === 'PUT') {
      const { id } = req.query;
      const updates = req.body;
      
      const currentCustomers = await kv.get(CUSTOMERS_KEY) || [];
      const index = currentCustomers.findIndex(customer => customer.id === id);
      
      if (index === -1) {
        return res.status(404).json({
          success: false,
          error: 'Kunde nicht gefunden'
        });
      }
      
      currentCustomers[index] = {
        ...currentCustomers[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      await kv.set(CUSTOMERS_KEY, currentCustomers);
      
      return res.status(200).json({
        success: true,
        data: currentCustomers[index]
      });
    }

    // DELETE - Kunde löschen
    if (req.method === 'DELETE') {
      const { id } = req.query;
      const currentCustomers = await kv.get(CUSTOMERS_KEY) || [];
      const index = currentCustomers.findIndex(customer => customer.id === id);
      
      if (index === -1) {
        return res.status(404).json({
          success: false,
          error: 'Kunde nicht gefunden'
        });
      }
      
      const deleted = currentCustomers.splice(index, 1)[0];
      await kv.set(CUSTOMERS_KEY, currentCustomers);
      
      return res.status(200).json({
        success: true,
        data: deleted
      });
    }
    
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
    
  } catch (error) {
    console.error('Customer API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Datenbankfehler: ' + error.message
    });
  }
}

// ============================================
// api/config.js - Konfigurationsverwaltung
// ============================================

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
    provider: 'gmail', // gmail, outlook, smtp
    host: '',
    port: 587,
    secure: false,
    user: '',
    password: '', // App-spezifisches Passwort für Gmail
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

// ============================================
// api/invoices-enhanced.js - Erweiterte Rechnungs-API
// ============================================

import { kv } from '@vercel/kv';

const INVOICES_KEY = 'e-invoices';
const CUSTOMERS_KEY = 'e-customers';
const CONFIG_KEY = 'e-config';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET - Alle Rechnungen laden
    if (req.method === 'GET') {
      const invoices = await kv.get(INVOICES_KEY) || [];
      
      return res.status(200).json({
        success: true,
        data: invoices,
        count: invoices.length,
        source: 'database'
      });
    }
    
    // POST - Neue Rechnung erstellen mit Kundendaten
    if (req.method === 'POST') {
      const { customerId, items, format = 'XRechnung', notes } = req.body;
      
      if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Kunde und Rechnungspositionen sind erforderlich'
        });
      }

      // Kundendaten laden
      const customers = await kv.get(CUSTOMERS_KEY) || [];
      const customer = customers.find(c => c.id === customerId);
      
      if (!customer) {
        return res.status(400).json({
          success: false,
          error: 'Kunde nicht gefunden'
        });
      }

      // Konfiguration laden
      const config = await kv.get(CONFIG_KEY) || {};
      const taxRate = config.invoice?.taxRate || 19;
      const currency = config.invoice?.currency || 'EUR';

      // Rechnungssumme berechnen
      const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
      const taxAmount = subtotal * (taxRate / 100);
      const total = subtotal + taxAmount;

      // Rechnungsnummer generieren
      const currentInvoices = await kv.get(INVOICES_KEY) || [];
      const invoiceNumber = generateInvoiceNumber(config.invoice?.numberPrefix || 'INV-');
      
      const newInvoice = {
        id: `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        invoiceNumber,
        customerId,
        customer: {
          name: customer.name,
          email: customer.email,
          address: customer.address,
          taxId: customer.taxId
        },
        items,
        subtotal: Math.round(subtotal * 100) / 100,
        taxRate,
        taxAmount: Math.round(taxAmount * 100) / 100,
        total: Math.round(total * 100) / 100,
        currency,
        format,
        notes: notes || '',
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + (config.invoice?.paymentTerms || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        receivedAt: new Date().toISOString(),
        processedAt: null,
        sentAt: null,
        paidAt: null,
        createdBy: 'API'
      };
      
      const updatedInvoices = [newInvoice, ...currentInvoices];
      await kv.set(INVOICES_KEY, updatedInvoices);

      // Kundenstatistik aktualisieren
      const customerIndex = customers.findIndex(c => c.id === customerId);
      if (customerIndex !== -1) {
        customers[customerIndex].invoiceCount += 1;
        customers[customerIndex].lastInvoice = new Date().toISOString();
        await kv.set(CUSTOMERS_KEY, customers);
      }
      
      return res.status(201).json({
        success: true,
        data: newInvoice,
        message: 'Rechnung erfolgreich erstellt'
      });
    }

    // PUT - Rechnung aktualisieren (Status, etc.)
    if (req.method === 'PUT') {
      const { id } = req.query;
      const updates = req.body;
      
      const currentInvoices = await kv.get(INVOICES_KEY) || [];
      const index = currentInvoices.findIndex(inv => inv.id === id);
      
      if (index === -1) {
        return res.status(404).json({
          success: false,
          error: 'Rechnung nicht gefunden'
        });
      }
      
      currentInvoices[index] = {
        ...currentInvoices[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      await kv.set(INVOICES_KEY, currentInvoices);
      
      return res.status(200).json({
        success: true,
        data: currentInvoices[index]
      });
    }

    // DELETE - Rechnung löschen
    if (req.method === 'DELETE') {
      const { id } = req.query;
      const currentInvoices = await kv.get(INVOICES_KEY) || [];
      const index = currentInvoices.findIndex(inv => inv.id === id);
      
      if (index === -1) {
        return res.status(404).json({
          success: false,
          error: 'Rechnung nicht gefunden'
        });
      }
      
      const deleted = currentInvoices.splice(index, 1)[0];
      await kv.set(INVOICES_KEY, currentInvoices);
      
      return res.status(200).json({
        success: true,
        data: deleted
      });
    }
    
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
    
  } catch (error) {
    console.error('Enhanced Invoice API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Datenbankfehler: ' + error.message
    });
  }
}

// Rechnungsnummer generieren
function generateInvoiceNumber(prefix) {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}${year}-${timestamp}`;
}