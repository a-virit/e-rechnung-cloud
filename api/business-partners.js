// api/business-partners.js - Business Partner API
import jwt from 'jsonwebtoken';
import { kv } from '@vercel/kv';

const BUSINESS_PARTNERS_KEY = 'e-business-partners';
const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Einfache Token-Validierung (wie bei customers.js)
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Kein Token vorhanden'
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      companyId: decoded.companyId || 'all',
      isSupport: decoded.isSupport || false
    };

    console.log('✅ Auth successful for:', user.email);

  } catch (error) {
    console.error('❌ Auth failed:', error.message);
    return res.status(401).json({
      success: false,
      error: 'Ungültiger Token'
    });
  }

  try {
    // GET - Alle Business Partner laden
    if (req.method === 'GET') {
      const businessPartners = await kv.get(BUSINESS_PARTNERS_KEY) || [];
      
      return res.status(200).json({
        success: true,
        data: businessPartners,
        count: businessPartners.length
      });
    }

    // POST - Neuen Business Partner erstellen
    if (req.method === 'POST') {
      const { name, primaryEmail, primaryPhone, externalBusinessPartnerNumber, selectedRoles } = req.body;
      
      if (!name || !primaryEmail) {
        return res.status(400).json({
          success: false,
          error: 'Name und primäre E-Mail sind erforderlich'
        });
      }

      const currentPartners = await kv.get(BUSINESS_PARTNERS_KEY) || [];
      
      // Automatische Business Partner Nummer generieren
      const generatePartnerNumber = (existingPartners) => {
        const existingNumbers = existingPartners
          .map(bp => parseInt(bp.businessPartnerNumber) || 0)
          .filter(n => n > 0);
        
        const nextNumber = existingNumbers.length > 0 
          ? Math.max(...existingNumbers) + 1 
          : 1;
        
        return nextNumber.toString().padStart(15, '0');
      };
      
      const businessPartnerNumber = generatePartnerNumber(currentPartners);
      
      // Rollen basierend auf Auswahl erstellen
const createRolesFromSelection = (selectedRoles, primaryEmail, primaryPhone) => {
  const roleMap = {
    'CUSTOMER': 'Kunde',
    'SUPPLIER': 'Lieferant', 
    'BILLING': 'Rechnungsempfänger',
    'DELIVERY': 'Lieferadresse'
  };

    return selectedRoles.map(roleCode => ({
    roleCode,
    roleLabel: roleMap[roleCode] || roleCode,
    status: 'ACTIVE',
    address: {
      street: '',
      houseNumber: '',
      addressLine2: '',
      postalCode: '',
      city: '',
      country: 'Deutschland',
      poBox: '',
      email: primaryEmail, // Übernimmt primäre E-Mail als Standard
      phone: primaryPhone || ''
    }
  }));
};

      const newPartner = {
        businessPartnerNumber,
        externalBusinessPartnerNumber: externalBusinessPartnerNumber || '',
        name,
        status: 'ACTIVE',
        primaryEmail,
        primaryPhone: primaryPhone || '',
 // Rollen basierend auf Auswahl
  roles: createRolesFromSelection(selectedRoles || ['CUSTOMER'], primaryEmail, primaryPhone),
  
        contacts: [], // Leer starten, später erweitern
        companyId: 'default',
        createdAt: new Date().toISOString(),
        createdBy: 'current-user'
      };
      
      const updatedPartners = [newPartner, ...currentPartners];
      await kv.set(BUSINESS_PARTNERS_KEY, updatedPartners);
      
      console.log('✅ Business Partner created with number:', businessPartnerNumber);
      
      return res.status(201).json({
        success: true,
        data: newPartner
      });
    }

    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
    
  } catch (error) {
    console.error('❌ Business Partner API error:', error);
    return res.status(500).json({
      success: false,
      error: 'Datenbankfehler: ' + error.message
    });
  }
}