// api/send-email.js
import nodemailer from 'nodemailer';
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

    if (!config.email?.user || !config.email?.password) {
      return res.status(400).json({
        success: false,
        error: 'E-Mail-Konfiguration nicht vollständig'
      });
    }

    // Nodemailer Transporter erstellen
    const transporter = await createTransporter(config.email);
    
    // E-Mail-Template verarbeiten
    const emailContent = processEmailTemplate(invoice, config);
    
    // Anhänge vorbereiten
    const attachments = [];
    
    if (attachXML) {
      // XRechnung XML generieren
      const xmlResponse = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/generate-xrechnung`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId })
      });
      
      if (xmlResponse.ok) {
        const xmlData = await xmlResponse.json();
        attachments.push({
          filename: xmlData.data.fileName,
          content: xmlData.data.xml,
          contentType: 'application/xml'
        });
      }
    }

    // E-Mail senden
    const mailOptions = {
      from: config.email.from || config.email.user,
      to: invoice.customer.email,
      replyTo: config.email.replyTo || config.email.from || config.email.user,
      subject: emailContent.subject,
      text: emailContent.body,
      html: emailContent.htmlBody,
      attachments
    };

    const result = await transporter.sendMail(mailOptions);
    
    // Rechnungsstatus aktualisieren
    await updateInvoiceStatus(invoiceId, {
      status: 'sent',
      sentAt: new Date().toISOString(),
      emailMessageId: result.messageId
    });

    return res.status(200).json({
      success: true,
      data: {
        messageId: result.messageId,
        recipient: invoice.customer.email,
        subject: emailContent.subject,
        attachments: attachments.length
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

// Transporter erstellen basierend auf Provider
async function createTransporter(emailConfig) {
  switch (emailConfig.provider) {
    case 'gmail':
      return nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          user: emailConfig.user,
          pass: emailConfig.password // App-spezifisches Passwort
        }
      });
      
    case 'outlook':
      return nodemailer.createTransporter({
        service: 'hotmail',
        auth: {
          user: emailConfig.user,
          pass: emailConfig.password
        }
      });
      
    case 'smtp':
    default:
      return nodemailer.createTransporter({
        host: emailConfig.host,
        port: emailConfig.port || 587,
        secure: emailConfig.secure || false,
        auth: {
          user: emailConfig.user,
          pass: emailConfig.password
        }
      });
  }
}

// E-Mail-Template verarbeiten
function processEmailTemplate(invoice, config) {
  const template = config.templates?.invoice || {};
  const companyName = config.company?.name || 'Ihr Unternehmen';
  
  const variables = {
    invoiceId: invoice.invoiceNumber,
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

// ============================================
// api/generate-pdf.js - PDF-Generierung
// ============================================

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { invoiceId } = req.method === 'GET' ? req.query : req.body;
    
    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        error: 'Rechnungs-ID ist erforderlich'
      });
    }

    // Rechnung laden
    const invoices = await kv.get('e-invoices') || [];
    const invoice = invoices.find(inv => inv.id === invoiceId);
    const config = await kv.get('e-config') || {};
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Rechnung nicht gefunden'
      });
    }

    // HTML für PDF generieren
    const htmlContent = generateInvoiceHTML(invoice, config);
    
    // Für Entwicklung: HTML-Preview zurückgeben
    if (req.query.preview === 'true') {
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(htmlContent);
    }

    // In Produktion würde hier Puppeteer verwendet werden:
    // const browser = await puppeteer.launch();
    // const page = await browser.newPage();
    // await page.setContent(htmlContent);
    // const pdfBuffer = await page.pdf({ format: 'A4' });
    // await browser.close();
    
    // Für jetzt: Mock PDF-Daten
    const mockPdfData = Buffer.from('Mock PDF Content for ' + invoice.invoiceNumber);
    
    if (req.method === 'GET') {
      // PDF-Download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Rechnung_${invoice.invoiceNumber}.pdf"`);
      return res.status(200).send(mockPdfData);
    } else {
      // PDF-Daten als Base64 zurückgeben
      return res.status(200).json({
        success: true,
        data: {
          invoiceId: invoice.id,
          fileName: `Rechnung_${invoice.invoiceNumber}.pdf`,
          pdf: mockPdfData.toString('base64'),
          mimeType: 'application/pdf'
        }
      });
    }

  } catch (error) {
    console.error('PDF Generation Error:', error);
    return res.status(500).json({
      success: false,
      error: 'PDF-Generierung fehlgeschlagen: ' + error.message
    });
  }
}

// HTML für Rechnung generieren
function generateInvoiceHTML(invoice, config) {
  const company = config.company || {};
  
  return `
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rechnung ${invoice.invoiceNumber}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 40px; 
            color: #333; 
            line-height: 1.6;
        }
        .header { 
            border-bottom: 2px solid #2563eb; 
            padding-bottom: 20px; 
            margin-bottom: 30px; 
        }
        .company-info { 
            text-align: right; 
            margin-bottom: 20px; 
        }
        .invoice-info { 
            background: #f8fafc; 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0; 
        }
        .customer-info { 
            margin: 20px 0; 
        }
        .items-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 20px 0; 
        }
        .items-table th, .items-table td { 
            border: 1px solid #e2e8f0; 
            padding: 12px; 
            text-align: left; 
        }
        .items-table th { 
            background: #f1f5f9; 
            font-weight: bold; 
        }
        .total-section { 
            text-align: right; 
            margin-top: 20px; 
        }
        .total-row { 
            display: flex; 
            justify-content: space-between; 
            margin: 5px 0; 
        }
        .total-final { 
            font-weight: bold; 
            font-size: 1.2em; 
            border-top: 2px solid #2563eb; 
            padding-top: 10px; 
        }
        .footer { 
            margin-top: 40px; 
            padding-top: 20px; 
            border-top: 1px solid #e2e8f0; 
            font-size: 0.9em; 
            color: #64748b; 
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-info">
            <h1>${company.name || 'Ihr Unternehmen'}</h1>
            <p>${company.address || ''}</p>
            <p>USt-IdNr.: ${company.taxId || ''}</p>
            <p>E-Mail: ${company.email || ''}</p>
            ${company.website ? `<p>Web: ${company.website}</p>` : ''}
        </div>
    </div>

    <div class="customer-info">
        <h3>Rechnungsempfänger:</h3>
        <p><strong>${invoice.customer.name}</strong></p>
        <p>${invoice.customer.address || ''}</p>
        ${invoice.customer.taxId ? `<p>USt-IdNr.: ${invoice.customer.taxId}</p>` : ''}
    </div>

    <div class="invoice-info">
        <h2>Rechnung ${invoice.invoiceNumber}</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
                <p><strong>Rechnungsdatum:</strong> ${formatDateDE(invoice.date)}</p>
                <p><strong>Fälligkeitsdatum:</strong> ${formatDateDE(invoice.dueDate)}</p>
            </div>
            <div>
                <p><strong>Währung:</strong> ${invoice.currency}</p>
                <p><strong>Format:</strong> ${invoice.format}</p>
            </div>
        </div>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th>Pos.</th>
                <th>Beschreibung</th>
                <th>Menge</th>
                <th>Einzelpreis</th>
                <th>Gesamt</th>
            </tr>
        </thead>
        <tbody>
            ${invoice.items.map((item, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.description || item.name || 'Leistung'}</td>
                    <td>${item.quantity}</td>
                    <td>${item.price.toFixed(2)} ${invoice.currency}</td>
                    <td>${(item.quantity * item.price).toFixed(2)} ${invoice.currency}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="total-section">
        <div style="width: 300px; margin-left: auto;">
            <div class="total-row">
                <span>Zwischensumme:</span>
                <span>${invoice.subtotal.toFixed(2)} ${invoice.currency}</span>
            </div>
            <div class="total-row">
                <span>MwSt. (${invoice.taxRate}%):</span>
                <span>${invoice.taxAmount.toFixed(2)} ${invoice.currency}</span>
            </div>
            <div class="total-row total-final">
                <span>Gesamtbetrag:</span>
                <span>${invoice.total.toFixed(2)} ${invoice.currency}</span>
            </div>
        </div>
    </div>

    ${invoice.notes ? `
    <div style="margin-top: 30px;">
        <h3>Anmerkungen:</h3>
        <p>${invoice.notes}</p>
    </div>
    ` : ''}

    <div class="footer">
        <p>Vielen Dank für Ihr Vertrauen!</p>
        <p>Diese Rechnung wurde automatisch erstellt und ist ohne Unterschrift gültig.</p>
    </div>
</body>
</html>`;
}

function formatDateDE(dateString) {
  return new Date(dateString).toLocaleDateString('de-DE');
}