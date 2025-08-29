// api/customers.js - Kundendatenbank API mit Authentifizierung
import { kv } from '@vercel/kv';
import { authenticateUser, hasPermission, logSecurityEvent } from './middleware/authMiddleware.js';

const CUSTOMERS_KEY = 'e-customers';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 🔒 AUTHENTIFIZIERUNG PRÜFEN
  const authResult = await authenticateUser(req);
  if (!authResult.success) {
    logSecurityEvent('UNAUTHORIZED_ACCESS', null, {
      ip: req.headers['x-forwarded-for'] || 'unknown',
      resource: 'customers',
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
    // GET - Alle Kunden laden
    if (req.method === 'GET') {
      // 🔒 BERECHTIGUNG PRÜFEN
      if (!hasPermission(user, 'customers', 'read')) {
        logSecurityEvent('PERMISSION_DENIED', user, {
          resource: 'customers',
          action: 'read',
          success: false
        });

        return res.status(403).json({
          success: false,
          error: 'Keine Berechtigung zum Lesen von Kundendaten'
        });
      }

      const customers = await kv.get(CUSTOMERS_KEY) || [];
      
      // Support kann alle Kunden sehen, normale User nur ihre eigenen
      const filteredCustomers = user.isSupport || user.companyId === 'all' 
        ? customers
        : customers.filter(customer => customer.companyId === user.companyId);

      logSecurityEvent('DATA_ACCESS', user, {
        resource: 'customers',
        action: 'read',
        success: true,
        recordCount: filteredCustomers.length
      });

      return res.status(200).json({
        success: true,
        data: filteredCustomers,
        count: filteredCustomers.length
      });
    }
    
    // POST - Neuen Kunden erstellen
    if (req.method === 'POST') {
      // 🔒 BERECHTIGUNG PRÜFEN
      if (!hasPermission(user, 'customers', 'write')) {
        logSecurityEvent('PERMISSION_DENIED', user, {
          resource: 'customers',
          action: 'write',
          success: false
        });

        return res.status(403).json({
          success: false,
          error: 'Keine Berechtigung zum Erstellen von Kunden'
        });
      }

      const { name, email, address, taxId, contactPerson, phone } = req.body;
      
      if (!name || !email) {
        return res.status(400).json({
          success: false,
          error: 'Name und E-Mail sind erforderlich'
        });
      }

      const currentCustomers = await kv.get(CUSTOMERS_KEY) || [];
      
      // E-Mail-Duplikat prüfen (innerhalb der Firma)
      const companyCustomers = user.isSupport || user.companyId === 'all'
        ? currentCustomers
        : currentCustomers.filter(c => c.companyId === user.companyId);
      
      const emailExists = companyCustomers.some(c => c.email.toLowerCase() === email.toLowerCase());
      if (emailExists) {
        return res.status(400).json({
          success: false,
          error: 'Ein Kunde mit dieser E-Mail-Adresse existiert bereits'
        });
      }
      
      const newCustomer = {
        id: `CUST-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        name,
        email,
        address: address || '',
        taxId: taxId || '',
        contactPerson: contactPerson || '',
        phone: phone || '',
        companyId: user.companyId || 'default', // Kunde der Firma zuordnen
        createdAt: new Date().toISOString(),
        createdBy: user.id,
        invoiceCount: 0,
        lastInvoice: null
      };
      
      const updatedCustomers = [newCustomer, ...currentCustomers];
      await kv.set(CUSTOMERS_KEY, updatedCustomers);

      logSecurityEvent('DATA_CREATE', user, {
        resource: 'customers',
        action: 'create',
        success: true,
        recordId: newCustomer.id
      });
      
      return res.status(201).json({
        success: true,
        data: newCustomer
      });
    }

    // PUT - Kunden aktualisieren
    if (req.method === 'PUT') {
      // 🔒 BERECHTIGUNG PRÜFEN
      if (!hasPermission(user, 'customers', 'write')) {
        logSecurityEvent('PERMISSION_DENIED', user, {
          resource: 'customers',
          action: 'update',
          success: false
        });

        return res.status(403).json({
          success: false,
          error: 'Keine Berechtigung zum Bearbeiten von Kunden'
        });
      }

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

      // 🔒 ZUGRIFF AUF KUNDEN PRÜFEN
      const customer = currentCustomers[index];
      if (!user.isSupport && user.companyId !== 'all' && customer.companyId !== user.companyId) {
        logSecurityEvent('UNAUTHORIZED_ACCESS', user, {
          resource: 'customers',
          action: 'update',
          success: false,
          recordId: id
        });

        return res.status(403).json({
          success: false,
          error: 'Keine Berechtigung für diesen Kunden'
        });
      }
      
      currentCustomers[index] = {
        ...currentCustomers[index],
        ...updates,
        updatedAt: new Date().toISOString(),
        updatedBy: user.id
      };
      
      await kv.set(CUSTOMERS_KEY, currentCustomers);

      logSecurityEvent('DATA_UPDATE', user, {
        resource: 'customers',
        action: 'update',
        success: true,
        recordId: id
      });
      
      return res.status(200).json({
        success: true,
        data: currentCustomers[index]
      });
    }

    // DELETE - Kunde löschen
    if (req.method === 'DELETE') {
      // 🔒 BERECHTIGUNG PRÜFEN
      if (!hasPermission(user, 'customers', 'write')) {
        logSecurityEvent('PERMISSION_DENIED', user, {
          resource: 'customers',
          action: 'delete',
          success: false
        });

        return res.status(403).json({
          success: false,
          error: 'Keine Berechtigung zum Löschen von Kunden'
        });
      }

      const { id } = req.query;
      const currentCustomers = await kv.get(CUSTOMERS_KEY) || [];
      const index = currentCustomers.findIndex(customer => customer.id === id);
      
      if (index === -1) {
        return res.status(404).json({
          success: false,
          error: 'Kunde nicht gefunden'
        });
      }

      // 🔒 ZUGRIFF AUF KUNDEN PRÜFEN
      const customer = currentCustomers[index];
      if (!user.isSupport && user.companyId !== 'all' && customer.companyId !== user.companyId) {
        logSecurityEvent('UNAUTHORIZED_ACCESS', user, {
          resource: 'customers',
          action: 'delete',
          success: false,
          recordId: id
        });

        return res.status(403).json({
          success: false,
          error: 'Keine Berechtigung für diesen Kunden'
        });
      }
      
      const deleted = currentCustomers.splice(index, 1)[0];
      await kv.set(CUSTOMERS_KEY, currentCustomers);

      logSecurityEvent('DATA_DELETE', user, {
        resource: 'customers',
        action: 'delete',
        success: true,
        recordId: id
      });
      
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
    console.error('❌ Customer API error:', error);

    logSecurityEvent('API_ERROR', user, {
      resource: 'customers',
      action: req.method,
      success: false,
      error: error.message
    });

    return res.status(500).json({
      success: false,
      error: 'Datenbankfehler: ' + error.message
    });
  }
}