// api/invoices-enhanced.js - Erweiterte Rechnungs-API mit Auth
import { kv } from '@vercel/kv';
import { authenticateUser, hasPermission, logSecurityEvent } from './middleware/authMiddleware.js';

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

  // 🔒 AUTHENTIFIZIERUNG PRÜFEN
  const authResult = await authenticateUser(req);
  if (!authResult.success) {
    logSecurityEvent('UNAUTHORIZED_ACCESS', null, {
      ip: req.headers['x-forwarded-for'] || 'unknown',
      resource: 'invoices-enhanced',
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
    // GET - Alle Rechnungen laden
    if (req.method === 'GET') {
      // 🔒 BERECHTIGUNG PRÜFEN
      if (!hasPermission(user, 'invoices', 'read')) {
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
      
      return res.status(200).json({
        success: true,
        data: filteredInvoices,
        count: filteredInvoices.length,
        source: 'database'
      });
    }
    
    // POST - Neue Rechnung erstellen mit Kundendaten
    if (req.method === 'POST') {
      // 🔒 BERECHTIGUNG PRÜFEN
      if (!hasPermission(user, 'invoices', 'write')) {
        return res.status(403).json({
          success: false,
          error: 'Keine Berechtigung zum Erstellen von Rechnungen'
        });
      }

      const { customerId, items, format = 'XRechnung', notes, dueDate } = req.body;
      
      if (!customerId || !items || !Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Kunde und Rechnungspositionen sind erforderlich'
        });
      }

      // Kundendaten laden und Berechtigung prüfen
      const customers = await kv.get(CUSTOMERS_KEY) || [];
      const customer = customers.find(c => c.id === customerId);
      
      if (!customer) {
        return res.status(400).json({
          success: false,
          error: 'Kunde nicht gefunden'
        });
      }

      // 🔒 ZUGRIFF AUF KUNDEN PRÜFEN
      if (!user.isSupport && user.companyId !== 'all' && customer.companyId !== user.companyId) {
        logSecurityEvent('UNAUTHORIZED_ACCESS', user, {
          resource: 'invoices',
          action: 'create_for_customer',
          success: false,
          customerId
        });

        return res.status(403).json({
          success: false,
          error: 'Keine Berechtigung für diesen Kunden'
        });
      }

      // Konfiguration laden (firmen-spezifisch)
      const configKey = user.companyId === 'all' || user.isSupport 
        ? CONFIG_KEY 
        : `${CONFIG_KEY}-${user.companyId}`;
      const config = await kv.get(configKey) || {};
      
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
        dueDate: dueDate || new Date(Date.now() + (config.invoice?.paymentTerms || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'draft',
        companyId: user.companyId || 'default', // 🔒 Firma zuordnen
        createdBy: user.id, // 🔒 Ersteller tracken
        receivedAt: new Date().toISOString(),
        processedAt: null,
        sentAt: null,
        paidAt: null
      };
      
      const updatedInvoices = [newInvoice, ...currentInvoices];
      await kv.set(INVOICES_KEY, updatedInvoices);

      // Kundenstatistik aktualisieren
      const customerIndex = customers.findIndex(c => c.id === customerId);
      if (customerIndex !== -1) {
        customers[customerIndex].invoiceCount = (customers[customerIndex].invoiceCount || 0) + 1;
        customers[customerIndex].lastInvoice = new Date().toISOString();
        await kv.set(CUSTOMERS_KEY, customers);
      }

      logSecurityEvent('INVOICE_CREATED', user, {
        resource: 'invoices',
        action: 'create',
        success: true,
        invoiceId: newInvoice.id,
        customerId,
        amount: total
      });
      
      return res.status(201).json({
        success: true,
        data: newInvoice,
        message: 'Rechnung erfolgreich erstellt'
      });
    }

    // DELETE - Rechnung löschen
    if (req.method === 'DELETE') {
      // 🔒 BERECHTIGUNG PRÜFEN
      if (!hasPermission(user, 'invoices', 'write')) {
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
    console.error('❌ Invoice Enhanced API error:', error);

    logSecurityEvent('API_ERROR', user, {
      resource: 'invoices-enhanced',
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

// Rechnungsnummer generieren
function generateInvoiceNumber(prefix = 'INV-') {
  const year = new Date().getFullYear();
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}${year}-${timestamp}`;
}