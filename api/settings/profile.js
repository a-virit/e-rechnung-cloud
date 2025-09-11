// api/settings/profile.js
import { authenticateToken } from '../middleware/authMiddleware.js';

export default async function handler(req, res) {
  try {
    const user = await authenticateToken(req);
    
    if (req.method === 'GET') {
      // Profildaten laden
      return res.json({ success: true, data: user });
    }
    
    if (req.method === 'PUT') {
      // Profil aktualisieren mit Validierung
      const { name, email, phone, department } = req.body;
      
      // Validierung hier...
      
      // Update in Datenbank...
      
      return res.json({ success: true, message: 'Profil aktualisiert' });
    }
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}