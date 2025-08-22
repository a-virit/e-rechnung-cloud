import { kv } from '@vercel/kv';

const INVOICES_KEY = 'e-invoices';

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET - Alle Rechnungen aus Datenbank laden
    if (req.method === 'GET') {
      const invoices = await kv.get(INVOICES_KEY) || [];
      
      return res.status(200).json({
        success: true,
        data: invoices,
        count: invoices.length,
        source: 'database'
      });
    }
    
    // POST - Neue Rechnung in Datenbank speichern
    if (req.method === 'POST') {
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
        createdBy: 'API'
      };
      
      // Neue Rechnung am Anfang hinzufügen
      const updatedInvoices = [newInvoice, ...currentInvoices];
      
      // In Datenbank speichern
      await kv.set(INVOICES_KEY, updatedInvoices);
      
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
        data: deleted,
        message: 'Rechnung aus Datenbank gelöscht'
      });
    }
    
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
    
  } catch (error) {
    console.error('Database error:', error);
    return res.status(500).json({
      success: false,
      error: 'Datenbankfehler: ' + error.message
    });
  }
}