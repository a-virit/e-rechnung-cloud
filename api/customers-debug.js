// api/customers-debug.js - Debug-Version
export default async function handler(req, res) {
  console.log('🔍 DEBUG - Method:', req.method);
  console.log('🔍 DEBUG - Headers:', req.headers);
  console.log('🔍 DEBUG - Body:', req.body);
  console.log('🔍 DEBUG - JWT_SECRET exists:', !!process.env.JWT_SECRET);
  console.log('🔍 DEBUG - SUPPORT_EMAIL:', process.env.SUPPORT_EMAIL);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Token aus Header extrahieren
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];
  
  console.log('🔍 DEBUG - Token exists:', !!token);
  
  if (token) {
    try {
      // Token ohne Verifikation dekodieren
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(token);
      console.log('🔍 DEBUG - Decoded token:', decoded);
    } catch (error) {
      console.log('🔍 DEBUG - Token decode error:', error.message);
    }
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      success: true,
      data: [],
      debug: 'GET endpoint works'
    });
  }

  if (req.method === 'POST') {
    const { name, email } = req.body;
    
    console.log('🔍 DEBUG - POST Data:', { name, email });
    
    if (!name || !email) {
      console.log('❌ DEBUG - Missing name or email');
      return res.status(400).json({
        success: false,
        error: 'Name und E-Mail sind erforderlich',
        debug: { receivedName: !!name, receivedEmail: !!email }
      });
    }

    // Erfolgreiche Mock-Antwort
    const newCustomer = {
      id: 'DEBUG-' + Date.now(),
      name,
      email,
      address: req.body.address || '',
      createdAt: new Date().toISOString(),
      debug: 'POST endpoint works'
    };

    console.log('✅ DEBUG - Created customer:', newCustomer);

    return res.status(201).json({
      success: true,
      data: newCustomer
    });
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
}