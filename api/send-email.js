// api/send-email.js - Produktionsreife Version mit direkten Funktionsaufrufen
import { kv } from '@vercel/kv';

// Import der Funktionen aus generate-formats.js
import { 
  generateFormats,
  generateXRechnung,
  generateZUGFeRD,
  getBusinessPartnerInfo,
  escapeXML
} from './generate-formats.js';

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

  // Rate-Limiting (100 E-Mails pro Tag in Dev, 1000 in Prod)
  const rateLimitKey = 'email-rate-limit-' + new Date().toDateString();
  const emailsToday = await kv.get(rateLimitKey) || 0;

  if (emailsToday >= (process.env.NODE_ENV === 'production' ? 1000 : 100)) {
    return res.status(429).json({
      success: false,
      error: 'Tägliches E-Mail-Limit erreicht'
    });
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

    // Business Partner E-Mail-Validierung
    const recipientEmail = getRecipientEmail(invoice);
    if (!recipientEmail) {
      return res.status(400).json({
        success: false,
        error: 'Empfänger-E-Mail nicht gefunden'
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

    // Rate Counter erhöhen
    await kv.set(rateLimitKey, emailsToday + 1, { ex: 86400 });

    return res.status(200).json({
      success: true,
      data: {
        messageId: emailResult.messageId,
        recipient: recipientEmail,
        recipientName: getRecipientName(invoice),
        sender: config.email.senderEmail,
        attachments: emailResult.attachments || 0,
        attachmentFiles: emailResult.attachmentFiles || [],
        usedRole: invoice.businessPartner?.selectedRole || 'CUSTOMER'
      },
      message: `E-Rechnung erfolgreich versendet mit ${emailResult.attachments || 0} Anhang(en)`
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

// Business Partner Empfänger-E-Mail ermitteln
function getRecipientEmail(invoice) {
  // Business Partner E-Mail verwenden (neue Struktur)
  if (invoice.businessPartner?.email) {
    return invoice.businessPartner.email;
  }

  // Fallback: Alte Customer-Struktur
  if (invoice.customer?.email) {
    return invoice.customer.email;
  }

  return null;
}

// Business Partner Empfänger-Name ermitteln  
function getRecipientName(invoice) {
  return invoice.businessPartner?.name || invoice.customer?.name || 'Kunde';
}

// E-Mail über externen Provider versenden
async function sendEmailViaProvider(invoice, config) {
  const emailProvider = config.email.provider || 'sendgrid';

  // E-Mail-Template verarbeiten
  const emailContent = processEmailTemplate(invoice, config);

  // Anhänge direkt generieren (ohne HTTP-Aufruf)
  const attachments = [];

  try {
    console.log('Generiere E-Rechnung-Formate direkt...');
    
    // Nutze die importierte generateFormats Funktion
    const requestedFormat = invoice.format || 'XRechnung';
    const formatResult = await generateFormats(invoice, config, requestedFormat, {});
    
    console.log('Format-Generierung erfolgreich:', Object.keys(formatResult.formats));
    
    // XRechnung anhängen falls generiert
    if (formatResult.formats.xrechnung) {
      const xr = formatResult.formats.xrechnung;
      attachments.push({
        filename: xr.fileName,
        content: Buffer.from(xr.xml).toString('base64'),
        type: xr.mimeType
      });
      console.log(`XRechnung Anhang hinzugefügt: ${xr.fileName} (${xr.size} bytes)`);
    }
    
    // ZUGFeRD anhängen falls generiert
    if (formatResult.formats.zugferd) {
      const zf = formatResult.formats.zugferd;
      attachments.push({
        filename: zf.fileName,
        content: Buffer.from(zf.xml).toString('base64'),
        type: zf.mimeType
      });
      console.log(`ZUGFeRD Anhang hinzugefügt: ${zf.fileName} (${zf.size} bytes)`);
    }
    
    // Sicherstellen, dass mindestens ein Anhang generiert wurde
    if (attachments.length === 0) {
      throw new Error('Keine E-Rechnung-Anhänge generiert');
    }
    
    console.log(`${attachments.length} Anhang(e) erfolgreich erstellt`);
    
  } catch (error) {
    console.error('KRITISCHER FEHLER bei Anhang-Generierung:', error);
    throw new Error(`Anhang konnte nicht erstellt werden: ${error.message}`);
  }

  // E-Mail über gewählten Provider versenden
  let emailResult;
  switch (emailProvider) {
    case 'sendgrid':
      emailResult = await sendViaSendGrid(invoice, config, emailContent, attachments);
      break;

    case 'mailgun':
      emailResult = await sendViaMailgun(invoice, config, emailContent, attachments);
      break;

    case 'postmark':
      emailResult = await sendViaPostmark(invoice, config, emailContent, attachments);
      break;

    default:
      throw new Error(`Unbekannter E-Mail-Provider: ${emailProvider}`);
  }

  // Anhang-Info zu Result hinzufügen
  emailResult.attachmentFiles = attachments.map(a => a.filename);
  return emailResult;
}

// SendGrid Integration
async function sendViaSendGrid(invoice, config, emailContent, attachments) {
  const API_KEY = process.env.SENDGRID_API_KEY;

  if (!API_KEY) {
    throw new Error('SendGrid API-Key nicht konfiguriert');
  }

  const recipientEmail = getRecipientEmail(invoice);
  const recipientName = getRecipientName(invoice);

  const emailData = {
    personalizations: [{
      to: [{ email: recipientEmail, name: recipientName }],
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
    ]
  };

  // Anhänge nur hinzufügen wenn vorhanden
  if (attachments.length > 0) {
    emailData.attachments = attachments.map(att => ({
      content: att.content,
      filename: att.filename,
      type: att.type,
      disposition: 'attachment'
    }));
  }

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

  const recipientEmail = getRecipientEmail(invoice);
  const recipientName = getRecipientName(invoice);

  const formData = new FormData();
  formData.append('from', `${config.email.senderName || config.company?.name || 'E-Rechnung'} <${config.email.senderEmail}>`);
  formData.append('to', `${recipientName} <${recipientEmail}>`);
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

  const recipientEmail = getRecipientEmail(invoice);
  const recipientName = getRecipientName(invoice);

  const emailData = {
    From: `${config.email.senderName || config.company?.name || 'E-Rechnung'} <${config.email.senderEmail}>`,
    To: `${recipientName} <${recipientEmail}>`,
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
  const customerName = getRecipientName(invoice);
  const selectedRole = invoice.businessPartner?.selectedRole || 'CUSTOMER';

  const variables = {
    invoiceNumber: invoice.invoiceNumber,
    amount: invoice.total.toFixed(2),
    currency: invoice.currency,
    customerName: customerName,
    companyName: companyName,
    dueDate: formatDate(invoice.dueDate),
    date: formatDate(invoice.date),
    selectedRole: selectedRole
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
- Adress-Rolle: {{selectedRole}}

Die Rechnung ist als strukturierte E-Rechnung beigefügt und kann direkt in Ihr System importiert werden.

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