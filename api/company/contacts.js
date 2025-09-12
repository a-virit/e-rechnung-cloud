// api/company/contacts.js - Verwaltung der Hauptkontakte eines Unternehmens
import { kv } from '@vercel/kv';
import { withAuth } from '../middleware/authMiddleware.js';

async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const companyKey = `e-company-${req.user.companyId}`;

  try {
    const company = await kv.get(companyKey) || {};

    if (req.method === 'GET') {
      const contacts = company.mainContacts || [];
      return res.status(200).json({ success: true, data: contacts });
    }

    if (req.method === 'PUT') {
      const { mainContacts } = req.body;

      if (!Array.isArray(mainContacts) || mainContacts.length !== 2) {
        return res.status(400).json({
          success: false,
          error: 'Genau zwei Kontakte sind erforderlich'
        });
        }

      for (const contact of mainContacts) {
        if (!contact.name || !contact.email || !contact.phone) {
          return res.status(400).json({
            success: false,
            error: 'Alle Felder für beide Kontakte sind erforderlich'
          });
        }
      }

      company.mainContacts = mainContacts;
      await kv.set(companyKey, company);

      return res.status(200).json({
        success: true,
        data: company.mainContacts,
        message: 'Kontakte erfolgreich aktualisiert'
      });
    }

    return res.status(405).json({ success: false, error: 'Method not allowed' });
  } catch (error) {
    console.error('Contacts API error:', error);
    return res.status(500).json({ success: false, error: 'Serverfehler' });
  }
}

export default withAuth('config', 'edit')(handler);