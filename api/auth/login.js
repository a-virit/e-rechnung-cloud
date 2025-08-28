// api/auth/login.js
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password } = req.body;

    // Eingabe-Validierung
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'E-Mail und Passwort sind erforderlich'
      });
    }

    // Support-Benutzer Check (Hersteller-Backdoor)
    if (email === process.env.SUPPORT_EMAIL && password === process.env.SUPPORT_PASSWORD) {
      const supportToken = jwt.sign(
        { 
          userId: 'support',
          email: process.env.SUPPORT_EMAIL,
          role: 'support',
          companyId: req.body.companyId || 'all' // Kann alle Firmen einsehen
        },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.status(200).json({
        success: true,
        data: {
          token: supportToken,
          user: {
            id: 'support',
            email: process.env.SUPPORT_EMAIL,
            name: 'Support User',
            role: 'support'
          }
        }
      });
    }

    // Standard-Benutzer authentifizierung
    const users = await kv.get('e-users') || [];
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.isActive);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Ungültige Anmeldedaten'
      });
    }

    // Passwort überprüfen
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Ungültige Anmeldedaten'
      });
    }

    // Last Login aktualisieren
    const updatedUsers = users.map(u => 
      u.id === user.id 
        ? { ...u, lastLogin: new Date().toISOString() }
        : u
    );
    await kv.set('e-users', updatedUsers);

    // JWT Token erstellen
    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId: user.companyId
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Antwort ohne Passwort
    const { password: _, ...userWithoutPassword } = user;

    return res.status(200).json({
      success: true,
      data: {
        token,
        user: userWithoutPassword
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      error: 'Anmeldung fehlgeschlagen'
    });
  }
}