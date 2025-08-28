// api/test-email.js - Neue API-Route für Test-E-Mails
import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { emailConfig, companyConfig } = req.body;
    
    // Validierung der Test-E-Mail-Konfiguration
    if (!emailConfig?.senderEmail) {
      return res.status(400).json({
        success: false,
        error: 'Absender-E-Mail ist erforderlich für Test-Versand'
      });
    }

    // Test-E-Mail über externen Provider versenden
    const result = await sendTestEmail(emailConfig, companyConfig);
    
    if (!result.success) {
      throw new Error(result.error);
    }

    return res.status(200).json({
      success: true,
      data: {
        messageId: result.messageId,
        provider: result.provider,
        recipient: emailConfig.senderEmail
      },
      message: `Test-E-Mail erfolgreich über ${result.provider} versendet!`
    });

  } catch (error) {
    console.error('Test email error:', error);
    
    return res.status(500).json({
      success: false,
      error: 'Test-E-Mail-Versand fehlgeschlagen: ' + error.message
    });
  }
}

// Test-E-Mail über externen Provider versenden
async function sendTestEmail(emailConfig, companyConfig) {
  const provider = emailConfig.provider || 'sendgrid';
  const senderName = emailConfig.senderName || companyConfig?.name || 'E-Rechnung System';
  
  // Test-E-Mail-Inhalt
  const testContent = {
    subject: `✅ Test-E-Mail von ${senderName} - Konfiguration erfolgreich`,
    text: createTestEmailText(senderName, provider),
    html: createTestEmailHTML(senderName, provider)
  };

  // E-Mail über gewählten Provider versenden
  switch (provider) {
    case 'sendgrid':
      return await sendTestViaSendGrid(emailConfig, testContent);
      
    case 'mailgun':
      return await sendTestViaMailgun(emailConfig, testContent);
      
    case 'postmark':
      return await sendTestViaPostmark(emailConfig, testContent);
      
    default:
      throw new Error(`Unbekannter E-Mail-Provider: ${provider}`);
  }
}

// Test-E-Mail via SendGrid
async function sendTestViaSendGrid(emailConfig, content) {
  const API_KEY = process.env.SENDGRID_API_KEY;
  
  if (!API_KEY) {
    throw new Error('SendGrid API-Key nicht konfiguriert');
  }

  const emailData = {
    personalizations: [{
      to: [{ 
        email: emailConfig.senderEmail, 
        name: emailConfig.senderName || 'Test-Empfänger'
      }],
      subject: content.subject
    }],
    from: {
      email: emailConfig.senderEmail,
      name: emailConfig.senderName || 'E-Rechnung System'
    },
    content: [
      { type: 'text/plain', value: content.text },
      { type: 'text/html', value: content.html }
    ]
  };

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(emailData)
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`SendGrid-Fehler: ${errorData}`);
  }

  return {
    success: true,
    messageId: response.headers.get('x-message-id') || 'sendgrid-test-' + Date.now(),
    provider: 'SendGrid'
  };
}

// Test-E-Mail via Mailgun
async function sendTestViaMailgun(emailConfig, content) {
  const API_KEY = process.env.MAILGUN_API_KEY;
  const DOMAIN = process.env.MAILGUN_DOMAIN;
  
  if (!API_KEY || !DOMAIN) {
    throw new Error('Mailgun API-Key oder Domain nicht konfiguriert');
  }

  const formData = new FormData();
  formData.append('from', `${emailConfig.senderName || 'E-Rechnung'} <${emailConfig.senderEmail}>`);
  formData.append('to', emailConfig.senderEmail);
  formData.append('subject', content.subject);
  formData.append('text', content.text);
  formData.append('html', content.html);

  const response = await fetch(`https://api.mailgun.net/v3/${DOMAIN}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(`api:${API_KEY}`).toString('base64')
    },
    body: formData
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Mailgun-Fehler: ${errorData}`);
  }

  const result = await response.json();
  return {
    success: true,
    messageId: result.id,
    provider: 'Mailgun'
  };
}

// Test-E-Mail via Postmark
async function sendTestViaPostmark(emailConfig, content) {
  const API_KEY = process.env.POSTMARK_SERVER_TOKEN;
  
  if (!API_KEY) {
    throw new Error('Postmark Server-Token nicht konfiguriert');
  }

  const emailData = {
    From: `${emailConfig.senderName || 'E-Rechnung'} <${emailConfig.senderEmail}>`,
    To: emailConfig.senderEmail,
    Subject: content.subject,
    TextBody: content.text,
    HtmlBody: content.html
  };

  const response = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'X-Postmark-Server-Token': API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(emailData)
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Postmark-Fehler: ${errorData.Message || 'Unbekannter Fehler'}`);
  }

  const result = await response.json();
  return {
    success: true,
    messageId: result.MessageID,
    provider: 'Postmark'
  };
}

// Test-E-Mail Text erstellen
function createTestEmailText(senderName, provider) {
  return `✅ E-Mail-Konfiguration erfolgreich!

Hallo,

diese Test-E-Mail bestätigt, dass Ihre E-Mail-Konfiguration korrekt eingerichtet ist.

Konfigurationsdetails:
- Absender: ${senderName}
- E-Mail-Provider: ${provider}
- Zeitstempel: ${new Date().toLocaleString('de-DE')}

Ihre E-Rechnung-Software ist jetzt bereit, automatisch Rechnungen per E-Mail zu versenden!

🚀 Nächste Schritte:
1. Erstellen Sie Ihre erste Rechnung
2. Versenden Sie sie direkt per E-Mail
3. Die XRechnung wird automatisch als XML-Anhang beigefügt

Bei Fragen wenden Sie sich gerne an den Support.

Mit freundlichen Grüßen
Ihr E-Rechnung System`;
}

// Test-E-Mail HTML erstellen
function createTestEmailHTML(senderName, provider) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>E-Mail-Konfiguration erfolgreich</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px; text-align: center; color: white; margin-bottom: 30px;">
    <h1 style="margin: 0; font-size: 24px;">✅ Konfiguration erfolgreich!</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">Ihre E-Mail-Integration ist einsatzbereit</p>
  </div>

  <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
    <h2 style="color: #2d3748; margin-top: 0;">📧 Konfigurationsdetails</h2>
    <ul style="list-style: none; padding: 0;">
      <li style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>Absender:</strong> ${senderName}</li>
      <li style="padding: 8px 0; border-bottom: 1px solid #e2e8f0;"><strong>E-Mail-Provider:</strong> ${provider}</li>
      <li style="padding: 8px 0;"><strong>Zeitstempel:</strong> ${new Date().toLocaleString('de-DE')}</li>
    </ul>
  </div>

  <div style="background: #e6fffa; border-left: 4px solid #38b2ac; padding: 20px; margin-bottom: 20px;">
    <h3 style="color: #2d3748; margin-top: 0;">🚀 Nächste Schritte</h3>
    <ol style="color: #2d3748; margin: 0;">
      <li>Erstellen Sie Ihre erste Rechnung</li>
      <li>Versenden Sie sie direkt per E-Mail</li>
      <li>Die XRechnung wird automatisch als XML-Anhang beigefügt</li>
    </ol>
  </div>

  <div style="text-align: center; padding: 20px; color: #718096;">
    <p style="margin: 0;">Ihre E-Rechnung-Software ist jetzt bereit für den professionellen Einsatz!</p>
    <p style="margin: 10px 0 0 0; font-size: 12px;">Bei Fragen wenden Sie sich gerne an den Support.</p>
  </div>

</body>
</html>`;
}