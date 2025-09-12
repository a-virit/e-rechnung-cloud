// api/auth/check-sso.js - Prüft ob SSO für E-Mail-Domain verfügbar ist
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({
      success: false,
      ssoAvailable: false
    });
  }

  try {
    const domain = email.split('@')[1].toLowerCase();
    const domainKey = `company-by-domain:${domain}`;
    const companyMapping = await kv.get(domainKey);

    if (companyMapping && companyMapping.ssoEnabled) {
      return res.status(200).json({
        success: true,
        ssoAvailable: true,
        provider: companyMapping.ssoProvider,
        companyName: companyMapping.name
      });
    } else {
      return res.status(200).json({
        success: true,
        ssoAvailable: false
      });
    }
  } catch (error) {
    console.error('Check SSO error:', error);
    return res.status(200).json({
      success: true,
      ssoAvailable: false
    });
  }
}