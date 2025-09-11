// api/business-partners.js - Business Partner API
import { authenticateUser } from './middleware/authMiddleware.js';
import { getCompanyKV } from './utils/kv.js';

const BUSINESS_PARTNERS_KEY = 'e-business-partners';
//const JWT_SECRET = process.env.JWT_SECRET;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  const authResult = await authenticateUser(req);
  if (!authResult.success) {
    return res.status(authResult.status || 401).json({
      success: false,
      error: authResult.error
    });
  }

   const { user } = authResult;
  const kv = getCompanyKV(user.companyId);

  try {
    // GET - Alle Business Partner laden
    if (req.method === 'GET') {
      const businessPartners = await kv.get(BUSINESS_PARTNERS_KEY) || [];
      const { companyId } = req.query;
      const filteredPartners = companyId
        ? businessPartners.filter(bp => bp.companyId === companyId)
        : businessPartners;

      return res.status(200).json({
        success: true,
        data: filteredPartners,
        count: filteredPartners.length
      });
    }

    // POST - Neuen Business Partner erstellen
    if (req.method === 'POST') {
      const { name, primaryEmail, primaryPhone, externalBusinessPartnerNumber, selectedRoles, roleAddresses } = req.body;

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

      const createRolesFromSelection = (selectedRoles, roleAddresses) => {
        const roleMap = {
          'CUSTOMER': 'Kunde',
          'SUPPLIER': 'Lieferant',
          'BILLING': 'Rechnungsempfänger',
          'DELIVERY': 'Lieferadresse',
          'PARTNER': 'Geschäftspartner',
          'CONTRACTOR': 'Auftragnehmer'
        };

        return selectedRoles.map(roleCode => ({
          roleCode,
          roleLabel: roleMap[roleCode] || roleCode,
          status: 'ACTIVE',
          address: roleAddresses[roleCode] || {
            street: '',
            houseNumber: '',
            postalCode: '',
            city: '',
            country: 'Deutschland',
            email: '',
            phone: ''
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
        roles: createRolesFromSelection(selectedRoles || ['CUSTOMER'], roleAddresses || {}),

        contacts: [], // Leer starten, später erweitern
        companyId: user.companyId,
        createdAt: new Date().toISOString(),
        createdBy: user.id
      };

      const updatedPartners = [newPartner, ...currentPartners];
      await kv.set(BUSINESS_PARTNERS_KEY, updatedPartners);

      console.log('✅ Business Partner created with number:', businessPartnerNumber);

      return res.status(201).json({
        success: true,
        data: newPartner
      });
    }

    // PUT - Business Partner aktualisieren oder deaktivieren
    if (req.method === 'PUT') {
      const { businessPartnerNumber, action } = req.query;

      if (!businessPartnerNumber) {
        return res.status(400).json({
          success: false,
          error: 'Business Partner Nummer ist erforderlich'
        });
      }

      const currentPartners = await kv.get(BUSINESS_PARTNERS_KEY) || [];
      const partnerIndex = currentPartners.findIndex(bp => bp.businessPartnerNumber === businessPartnerNumber);

      if (partnerIndex === -1) {
        return res.status(404).json({
          success: false,
          error: 'Business Partner nicht gefunden'
        });
      }

      // Deaktivierung
      if (action === 'deactivate') {
        currentPartners[partnerIndex] = {
          ...currentPartners[partnerIndex],
          status: 'INACTIVE',
          updatedAt: new Date().toISOString(),
          updatedBy: user.id
        };

        await kv.set(BUSINESS_PARTNERS_KEY, currentPartners);

        return res.status(200).json({
          success: true,
          data: currentPartners[partnerIndex]
        });
      }

      // Normale Aktualisierung
      const { name, primaryEmail, primaryPhone, externalBusinessPartnerNumber, selectedRoles, roleAddresses } = req.body;

      if (!name || !primaryEmail) {
        return res.status(400).json({
          success: false,
          error: 'Name und primäre E-Mail sind erforderlich'
        });
      }

      // Rollen aktualisieren
      const createRolesFromSelection = (selectedRoles, roleAddresses) => {
        const roleMap = {
          'CUSTOMER': 'Kunde',
          'SUPPLIER': 'Lieferant',
          'BILLING': 'Rechnungsempfänger',
          'DELIVERY': 'Lieferadresse',
          'PARTNER': 'Geschäftspartner',
          'CONTRACTOR': 'Auftragnehmer'
        };

        return selectedRoles.map(roleCode => ({
          roleCode,
          roleLabel: roleMap[roleCode] || roleCode,
          status: 'ACTIVE',
          address: roleAddresses[roleCode] || {
            street: '',
            houseNumber: '',
            addressLine2: '',
            postalCode: '',
            city: '',
            country: 'Deutschland',
            poBox: '',
            email: primaryEmail || '',
            phone: primaryPhone || ''
          }
        }));
      };

      // Business Partner aktualisieren
      currentPartners[partnerIndex] = {
        ...currentPartners[partnerIndex],
        name,
        primaryEmail,
        primaryPhone: primaryPhone || '',
        externalBusinessPartnerNumber: externalBusinessPartnerNumber || '',
        roles: createRolesFromSelection(selectedRoles || ['CUSTOMER'], roleAddresses || {}),
        updatedAt: new Date().toISOString(),
        updatedBy: user.id
      };

      await kv.set(BUSINESS_PARTNERS_KEY, currentPartners);

      return res.status(200).json({
        success: true,
        data: currentPartners[partnerIndex]
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