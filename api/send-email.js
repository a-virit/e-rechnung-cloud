// api/send-email.js - Überarbeitet für externe Mailprovider
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
    const { invoiceId, attachXML = true, attachPDF = false } = req.body;
    
    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        error: 'Rechnungs-ID ist erforderlich'
      });
    }

    // Rechnung und Konfiguration laden
    const invoices = await kv.get('e-invoices') || [];
    const invoice = invoices.find(inv => inv.id === invoiceId);
    const config = await kv.get('e-config') || {};
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Rechnung nicht gefunden'
      });
    }

    // Validierung der Konfiguration
    if (!config.email?.senderEmail) {
      return res.status(400).json({
        success: false,
        error: 'Absender-E-Mail nicht konfiguriert'
      });
    }

    // E-Mail über externen Service versenden
    const emailResult = await sendEmailViaProvider(invoice, config);
    
    if (!emailResult.success) {
      throw new Error(emailResult.error);
    }
    
    // Rechnungsstatus aktualisieren
    await updateInvoiceStatus(invoiceId, {
      status: 'sent',
      sentAt: new Date().toISOString(),
      emailMessageId: emailResult.messageId
    });

    return res.status(200).json({
      success: true,
      data: {
        messageId: emailResult.messageId,
        recipient: invoice.customer.email,
        sender: config.email.senderEmail,
        attachments: emailResult.attachments || 0
      },
      message: 'E-Rechnung erfolgreich versendet'
    });

  } catch (error) {
    console.error('Email sending error:', error);
    
    // Bei Fehler Rechnungsstatus auf 'failed' setzen
    if (req.body.invoiceId) {
      await updateInvoiceStatus(req.body.invoiceId, {
        status: 'failed',
        error: error.message,
        errorAt: new Date().toISOString()
      });
    }
    
    return res.status(500).json({
      success: false,
      error: 'E-Mail-Versand fehlgeschlagen: ' + error.message
    });
  }
}

// E-Mail über externen Provider versenden
async function sendEmailViaProvider(invoice, config) {
  const emailProvider = config.email.provider || 'sendgrid';
  
  // E-Mail-Template verarbeiten
  const emailContent = processEmailTemplate(invoice, config);
  
  // Anhänge vorbereiten
  const attachments = [];
  
  // XRechnung XML anhängen
  try {
    const xmlResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/generate-xrechnung`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId: invoice.id })
    });
    
    if (xmlResponse.ok) {
      const xmlData = await xmlResponse.json();
      attachments.push({
        filename: xmlData.data.fileName,
        content: Buffer.from(xmlData.data.xml).toString('base64'),
        type: 'application/xml'
      });
    }
  } catch (error) {
    console.error('XRechnung attachment error:', error);
  }

  // E-Mail über gewählten Provider versenden
  switch (emailProvider) {
    case 'sendgrid':
      return await sendViaSendGrid(invoice, config, emailContent, attachments);
      
    case 'mailgun':
      return await sendViaMailgun(invoice, config, emailContent, attachments);
      
    case 'postmark':
      return await sendViaPostmark(invoice, config, emailContent, attachments);
      
    default:
      throw new Error(`Unbekannter E-Mail-Provider: ${emailProvider}`);
  }
}

// SendGrid Integration
async function sendViaSendGrid(invoice, config, emailContent, attachments) {
  const API_KEY = process.env.SENDGRID_API_KEY; // System-API-Key
  
  if (!API_KEY) {
    throw new Error('SendGrid API-Key nicht konfiguriert');
  }

  const emailData = {
    personalizations: [{
      to: [{ email: invoice.customer.email, name: invoice.customer.name }],
      subject: emailContent.subject
    }],
    from: {
      email: config.email.senderEmail,
      name: config.email.senderName || config.company?.name || 'E-Rechnung System'
    },
    content: [
      {
        type: 'text/plain',
        value: emailContent.body
      },
      {
        type: 'text/html', 
        value: emailContent.htmlBody
      }
    ],
    attachments: attachments.map(att => ({
      content: att.content,
      filename: att.filename,
      type: att.type,
      disposition: 'attachment'
    }))
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
    messageId: response.headers.get('x-message-id') || 'sendgrid-' + Date.now(),
    provider: 'sendgrid',
    attachments: attachments.length
  };
}

// Mailgun Integration  
async function sendViaMailgun(invoice, config, emailContent, attachments) {
  const API_KEY = process.env.MAILGUN_API_KEY;
  const DOMAIN = process.env.MAILGUN_DOMAIN;
  
  if (!API_KEY || !DOMAIN) {
    throw new Error('Mailgun API-Key oder Domain nicht konfiguriert');
  }

  const formData = new FormData();
  formData.append('from', `${config.email.senderName || config.company?.name || 'E-Rechnung'} <${config.email.senderEmail}>`);
  formData.append('to', `${invoice.customer.name} <${invoice.customer.email}>`);
  formData.append('subject', emailContent.subject);
  formData.append('text', emailContent.body);
  formData.append('html', emailContent.htmlBody);

  // Anhänge hinzufügen
  attachments.forEach((att, index) => {
    formData.append('attachment', new Blob([Buffer.from(att.content, 'base64')], { type: att.type }), att.filename);
  });

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
    provider: 'mailgun',
    attachments: attachments.length
  };
}

// Postmark Integration
async function sendViaPostmark(invoice, config, emailContent, attachments) {
  const API_KEY = process.env.POSTMARK_SERVER_TOKEN;
  
  if (!API_KEY) {
    throw new Error('Postmark Server-Token nicht konfiguriert');
  }

  const emailData = {
    From: `${config.email.senderName || config.company?.name || 'E-Rechnung'} <${config.email.senderEmail}>`,
    To: `${invoice.customer.name} <${invoice.customer.email}>`,
    Subject: emailContent.subject,
    TextBody: emailContent.body,
    HtmlBody: emailContent.htmlBody,
    Attachments: attachments.map(att => ({
      Name: att.filename,
      Content: att.content,
      ContentType: att.type
    }))
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
    provider: 'postmark',
    attachments: attachments.length
  };
}

// E-Mail-Template verarbeiten
function processEmailTemplate(invoice, config) {
  const template = config.templates?.invoice || {};
  const companyName = config.company?.name || 'Ihr Unternehmen';
  
  const variables = {
    invoiceNumber: invoice.invoiceNumber,
    amount: invoice.total.toFixed(2),
    currency: invoice.currency,
    customerName: invoice.customer.name,
    companyName: companyName,
    dueDate: formatDate(invoice.dueDate),
    date: formatDate(invoice.date)
  };

  // Template-Variablen ersetzen
  const subject = replaceVariables(template.subject || 'Neue Rechnung: {{invoiceNumber}}', variables);
  const body = replaceVariables(template.body || getDefaultEmailTemplate(), variables);
  
  // HTML-Version erstellen
  const htmlBody = convertToHTML(body);

  return { subject, body, htmlBody };
}

// Template-Variablen ersetzen
function replaceVariables(template, variables) {
  let result = template;
  Object.keys(variables).forEach(key => {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    result = result.replace(regex, variables[key]);
  });
  return result;
}

// Standard E-Mail-Template
function getDefaultEmailTemplate() {
  return `Sehr geehrte Damen und Herren,

anbei erhalten Sie die Rechnung {{invoiceNumber}} vom {{date}} über {{amount}} {{currency}}.

Rechnungsdetails:
- Rechnungsnummer: {{invoiceNumber}}
- Rechnungsbetrag: {{amount}} {{currency}}
- Fälligkeitsdatum: {{dueDate}}

Die Rechnung ist als strukturierte E-Rechnung (XRechnung) beigefügt und kann direkt in Ihr System importiert werden.

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

Mit freundlichen Grüßen
{{companyName}}`;
}

// Text zu HTML konvertieren
function convertToHTML(text) {
  return text
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>')
    .replace(/<p><\/p>/g, '');
}

// Datum formatieren
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE');
}

// Rechnungsstatus aktualisieren
async function updateInvoiceStatus(invoiceId, updates) {
  try {
    const invoices = await kv.get('e-invoices') || [];
    const index = invoices.findIndex(inv => inv.id === invoiceId);
    
    if (index !== -1) {
      invoices[index] = {
        ...invoices[index],
        ...updates,
        updatedAt: new Date().toISOString()
      };
      
      await kv.set('e-invoices', invoices);
    }
  } catch (error) {
    console.error('Status update error:', error);
  }
}