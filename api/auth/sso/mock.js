// api/auth/sso/mock.js - Mock SSO für Tests ohne Azure
import jwt from 'jsonwebtoken';
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, provider = 'microsoft' } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({
      success: false,
      error: 'Gültige E-Mail erforderlich'
    });
  }

  try {
    // Domain aus E-Mail extrahieren
    const domain = email.split('@')[1].toLowerCase();
    
    // SSO-Config für Domain prüfen
    const domainKey = `company-by-domain:${domain}`;
    const companyMapping = await kv.get(domainKey);
    
    if (!companyMapping || !companyMapping.ssoEnabled) {
      return res.status(400).json({
        success: false,
        error: `SSO nicht aktiviert für Domain: ${domain}`
      });
    }

    // Mock User-Daten erstellen
    const mockUser = {
      email: email,
      name: email.split('@')[0].replace(/\./g, ' ').replace(/\w\S*/g, (txt) => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()),
      provider: provider,
      externalId: `mock-${Date.now()}`,
      avatar: null
    };

    // User in System erstellen/finden
    const users = await kv.get('e-users') || [];
    let user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (user) {
      // Existierenden User aktualisieren
      user.lastLogin = new Date().toISOString();
      user.ssoProvider = provider;
    } else {
      // Neuen User erstellen
      user = {
        id: `usr-${Date.now()}-mock`,
        email: mockUser.email,
        name: mockUser.name,
        role: 'user', // Immer als normaler User
        companyId: companyMapping.companyId,
        ssoProvider: provider,
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };
      users.push(user);
    }

    // Users aktualisieren
    const updatedUsers = users.map(u => u.id === user.id ? user : u);
    await kv.set('e-users', updatedUsers);

    // JWT Token erstellen
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId,
        ssoProvider: provider
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          companyId: user.companyId,
          ssoProvider: provider
        }
      },
      message: `Mock SSO erfolgreich für ${domain}`
    });

  } catch (error) {
    console.error('Mock SSO Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Mock SSO fehlgeschlagen'
    });
  }
}