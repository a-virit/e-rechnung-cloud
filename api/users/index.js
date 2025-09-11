// ============================================
// 4. api/users/index.js - Benutzerverwaltung
// ============================================

import { kv } from '@vercel/kv';
import { authenticateToken } from '../middleware/authMiddleware.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  // Authentication Middleware
  const authResult = await authenticateToken(req);
  if (!authResult.success) {
    return res.status(401).json(authResult);
  }

  const { user } = authResult;

  switch (req.method) {
    case 'GET':
      return handleGetUsers(req, res, user);
    case 'POST':
      return handleCreateUser(req, res, user);
    case 'PUT':
      return handleUpdateUser(req, res, user);
    case 'DELETE':
      return handleDeleteUser(req, res, user);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

// Benutzer auflisten
async function handleGetUsers(req, res, currentUser) {
  try {
    const users = await kv.get('e-users') || [];
    
    // Support kann alle Benutzer sehen, normale User nur ihre Firma
    const filteredUsers = currentUser.role === 'support' 
      ? users
      : users.filter(u => u.companyId === currentUser.companyId);

    // Passwörter entfernen
    const safeUsers = filteredUsers.map(({ password, ...user }) => user);

    return res.status(200).json({
      success: true,
      data: safeUsers
    });
  } catch (error) {
    console.error('Get users error:', error);
    return res.status(500).json({
      success: false,
      error: 'Fehler beim Laden der Benutzer'
    });
  }
}

// Neuen Benutzer erstellen (nur Admin)
async function handleCreateUser(req, res, currentUser) {
  if (currentUser.role !== 'admin' && currentUser.role !== 'support') {
    return res.status(403).json({
      success: false,
      error: 'Keine Berechtigung zum Erstellen von Benutzern'
    });
  }

  try {
    const { email, password, name, role = 'user' } = req.body;

    // Validierung
    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'E-Mail, Passwort und Name sind erforderlich'
      });
    }

    const users = await kv.get('e-users') || [];
    
    // Doppelte E-Mail prüfen
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(400).json({
        success: false,
        error: 'E-Mail-Adresse bereits vergeben'
      });
    }

    // Neuen Benutzer erstellen
    const newUser = {
      id: uuidv4(),
      email: email.toLowerCase(),
      password: await bcrypt.hash(password, 12),
      name,
      role,
      companyId: currentUser.companyId,
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: currentUser.userId,
      lastLogin: null,
      permissions: getDefaultPermissions(role)
    };

    const updatedUsers = [...users, newUser];
    await kv.set('e-users', updatedUsers);

    // Erfolg ohne Passwort
    const { password: _, ...userWithoutPassword } = newUser;
    return res.status(201).json({
      success: true,
      data: userWithoutPassword,
      message: 'Benutzer erfolgreich erstellt'
    });

  } catch (error) {
    console.error('Create user error:', error);
    return res.status(500).json({
      success: false,
      error: 'Fehler beim Erstellen des Benutzers'
    });
  }
}

// Standard-Berechtigungen je Rolle
function getDefaultPermissions(role) {
  const permissions = {
    admin: {
      invoices: { create: true, edit: true, delete: true, send: true },
      customers: { create: true, edit: true, delete: true },
      users: { create: true, edit: true, delete: true },
      config: { view: true, edit: true },
      reports: { view: true }
    },
    user: {
      invoices: { create: true, edit: true, delete: false, send: true },
      customers: { create: true, edit: true, delete: false },
      users: { create: false, edit: false, delete: false },
      config: { view: false, edit: false },
      reports: { view: true }
    },
    support: {
      invoices: { create: true, edit: true, delete: true, send: true },
      customers: { create: true, edit: true, delete: true },
      users: { create: true, edit: true, delete: true },
      config: { view: true, edit: true },
      reports: { view: true }
    }
  };

  return permissions[role] || permissions.user;
}