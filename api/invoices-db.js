// api/invoices-db.js - Mit Authentifizierung
import { kv } from '@vercel/kv';
import { authenticateUser, hasPermission, logSecurityEvent } from './middleware/authMiddleware.js';

const INVOICES_KEY = 'e-invoices';

export default async function handler(req, res) {
  // CORS Headers
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
      resource: 'invoices',
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
    // GET - Alle Rechnungen aus Datenbank laden
    if (req.method === 'GET') {
      // 🔒 BERECHTIGUNG PRÜFEN
      if (!hasPermission(user, 'invoices', 'read')) {
        logSecurityEvent('PERMISSION_DENIED', user, {
          resource: 'invoices',
          action: 'read',
          success: false
        });

        return res.status(403).json({
          success: false,
          error: 'Keine Berechtigung zum Lesen von Rechnungen'
        });
      }

      const invoices = await kv.get(INVOICES_KEY) || [];
      
      // Support kann alle Rechnungen sehen, normale User nur ihre eigenen
      const filteredInvoices = user.isSupport || user.companyId === 'all' 
        ? invoices
        : invoices.filter(invoice => invoice.companyId === user.companyId);

      logSecurityEvent('DATA_ACCESS', user, {
        resource: 'invoices',
        action: 'read',
        success: true,
        recordCount: filteredInvoices.length
      });
      
      return res.status(200).json({
        success: true,
        data: filteredInvoices,
        count: filteredInvoices.length,
        source: 'database'
      });
    }
    
    // POST - Neue Rechnung in Datenbank speichern
    if (req.method === 'POST') {
      // 🔒 BERECHTIGUNG PRÜFEN
      if (!hasPermission(user, 'invoices', 'write')) {
        logSecurityEvent('PERMISSION_DENIED', user, {
          resource: 'invoices',
          action: 'write',
          success: false
        });

        return res.status(403).json({
          success: false,
          error: 'Keine Berechtigung zum Erstellen von Rechnungen'
        });
      }

      const { sender, receiver, amount, currency = 'EUR', format = 'XRechnung' } = req.body;
      
      if (!sender || !receiver || !amount) {
        return res.status(400).json({
          success: false,
          error: 'Sender, Receiver und Amount sind erforderlich'
        });
      }

      // Aktuelle Rechnungen laden
      const currentInvoices = await kv.get(INVOICES_KEY) || [];
      
      const newInvoice = {
        id: `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        sender,
        receiver,
        amount: parseFloat(amount),
        currency,
        format,
        date: new Date().toISOString().split('T')[0],
        status: 'processing',
        receivedAt: new Date().toISOString(),
        processedAt: null,
        sentAt: null,
        companyId: user.companyId || 'default', // 🔒 Firma zuordnen
        createdBy: user.id, // 🔒 Ersteller tracken
        createdAt: new Date().toISOString()
      };
      
      // Neue Rechnung am Anfang hinzufügen
      const updatedInvoices = [newInvoice, ...currentInvoices];
      
      // In Datenbank speichern
      await kv.set(INVOICES_KEY, updatedInvoices);

      logSecurityEvent('DATA_CREATE', user, {
        resource: 'invoices',
        action: 'create',
        success: true,
        recordId: newInvoice.id
      });
      
      // Simuliere E-Rechnung Verarbeitung (nach 3 Sekunden)
      setTimeout(async () => {
        try {
          const currentData = await kv.get(INVOICES_KEY) || [];
          const index = currentData.findIndex(inv => inv.id === newInvoice.id);
          
          if (index !== -1) {
            currentData[index] = {
              ...currentData[index],
              status: Math.random() > 0.15 ? 'sent' : 'failed',
              processedAt: new Date().toISOString(),
              sentAt: Math.random() > 0.15 ? new Date().toISOString() : null,
              error: Math.random() > 0.15 ? null : 'Fehler bei der Übermittlung'
            };
            
            await kv.set(INVOICES_KEY, currentData);
          }
        } catch (error) {
          console.error('Fehler bei der Nachverarbeitung:', error);
        }
      }, 3000);
      
      return res.status(201).json({
        success: true,
        data: newInvoice,
        message: 'Rechnung wird verarbeitet und in Datenbank gespeichert'
      });
    }

    // DELETE - Rechnung löschen
    if (req.method === 'DELETE') {
      // 🔒 BERECHTIGUNG PRÜFEN
      if (!hasPermission(user, 'invoices', 'write')) {
        logSecurityEvent('PERMISSION_DENIED', user, {
          resource: 'invoices',
          action: 'delete',
          success: false
        });

        return res.status(403).json({
          success: false,
          error: 'Keine Berechtigung zum Löschen von Rechnungen'
        });
      }

      const { id } = req.query;
      const currentInvoices = await kv.get(INVOICES_KEY) || [];
      const index = currentInvoices.findIndex(inv => inv.id === id);
      
      if (index === -1) {
        return res.status(404).json({
          success: false,
          error: 'Rechnung nicht gefunden'
        });
      }

      // 🔒 ZUGRIFF AUF RECHNUNG PRÜFEN
      const invoice = currentInvoices[index];
      if (!user.isSupport && user.companyId !== 'all' && invoice.companyId !== user.companyId) {
        logSecurityEvent('UNAUTHORIZED_ACCESS', user, {
          resource: 'invoices',
          action: 'delete',
          success: false,
          recordId: id
        });

        return res.status(403).json({
          success: false,
          error: 'Keine Berechtigung für diese Rechnung'
        });
      }
      
      const deleted = currentInvoices.splice(index, 1)[0];
      await kv.set(INVOICES_KEY, currentInvoices);

      logSecurityEvent('DATA_DELETE', user, {
        resource: 'invoices',
        action: 'delete',
        success: true,
        recordId: id
      });
      
      return res.status(200).json({
        success: true,
        data: deleted,
        message: 'Rechnung aus Datenbank gelöscht'
      });
    }
    
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
    
  } catch (error) {
    console.error('❌ Invoice DB error:', error);

    logSecurityEvent('API_ERROR', user, {
      resource: 'invoices',
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