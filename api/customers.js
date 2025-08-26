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