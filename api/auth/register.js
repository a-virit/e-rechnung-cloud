// ============================================
// 3. api/auth/register.js - Erster Admin Setup
// ============================================

import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, name, companyName } = req.body;

    // Validierung
    if (!email || !password || !name || !companyName) {
      return res.status(400).json({
        success: false,
        error: 'Alle Felder sind erforderlich'
      });
    }

    // Passwort-Stärke prüfen
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Passwort muss mindestens 8 Zeichen haben'
      });
    }

    // Überprüfen ob bereits Benutzer existieren
    const existingUsers = await kv.get('e-users') || [];
    const existingUserWithEmail = existingUsers.find(u => 
      u.email.toLowerCase() === email.toLowerCase()
    );

    if (existingUserWithEmail) {
      return res.status(400).json({
        success: false,
        error: 'E-Mail-Adresse bereits registriert'
      });
    }

    // Company ID generieren
    const companyId = uuidv4();
    const userId = uuidv4();

    // Passwort hashen
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Ersten Admin-Benutzer erstellen
    const newUser = {
      id: userId,
      email: email.toLowerCase(),
      password: hashedPassword,
      name,
      role: 'admin', // Erster Benutzer ist immer Admin
      companyId,
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: userId, // Selbst erstellt
      lastLogin: null,
      permissions: {
        invoices: { create: true, edit: true, delete: true, send: true },
        customers: { create: true, edit: true, delete: true },
        users: { create: true, edit: true, delete: true },
        config: { view: true, edit: true },
        reports: { view: true }
      }
    };

    // Company-Konfiguration erstellen
    const companyConfig = {
      id: companyId,
      name: companyName,
      createdAt: new Date().toISOString(),
       mainContacts: [
        { name: '', email: '', phone: '' },
        { name: '', email: '', phone: '' }
      ],
      settings: {
        company: { name: companyName },
        email: {},
        templates: { invoice: {} },
        invoice: {}
      }
    };

    // Speichern
    await kv.set('e-users', [...existingUsers, newUser]);
    await kv.set(`e-company-${companyId}`, companyConfig);

    // Erfolg
    const { password: _, ...userWithoutPassword } = newUser;
    return res.status(201).json({
      success: true,
      data: {
        user: userWithoutPassword,
        company: companyConfig
      },
      message: 'Unternehmen erfolgreich registriert'
    });

  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({
      success: false,
      error: 'Registrierung fehlgeschlagen'
    });
  }
}