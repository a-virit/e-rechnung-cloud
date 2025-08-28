// ===== /api/send-email.js (Komplett überarbeitet für SaaS) =====
import sgMail from '@sendgrid/mail';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { kv } from '@vercel/kv';
import dns from 'dns/promises';

// SendGrid als primärer Provider
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Amazon SES als Fallback
const sesClient = new SESClient({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

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
    const { tenantId, invoiceId, attachXML = true, attachPDF = false } = req.body;
    
    if (!tenantId || !invoiceId) {
      return res.status(400).json({
        success: false,
        error: 'Tenant ID und Rechnungs-ID erforderlich'
      });
    }

    // Tenant-Konfiguration und Rechnung laden
    const config = await kv.get(`config-${tenantId}`) || {};
    const invoices = await kv.get(`invoices-${tenantId}`) || [];
    const invoice = invoices.find(inv => inv.id === invoiceId);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Rechnung nicht gefunden'
      });
    }

    // E-Mail-Konfiguration validieren
    const emailConfig = config.email;
    const validation = validateSaaSEmailConfig(emailConfig);
    
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'E-Mail-Konfiguration unvollständig',
        errors: validation.errors,
        setupRequired: {
          step1: 'Absender-E-Mail konfigurieren',
          step2: 'Domain verifizieren',
          step3: 'Test-E-Mail senden'
        }
      });
    }

    // Domain-Berechtigung prüfen
    await validateTenantDomain(emailConfig.senderEmail, tenantId);

    // Usage-Limit prüfen
    await checkEmailQuota(tenantId);

    // E-Mail über zentralen SaaS-Service versenden
    const emailService = new SaaSEmailService();
    const result = await emailService.sendInvoiceEmail(tenantId, invoice, emailConfig, {
      attachXML,
      attachPDF
    });

    // Usage tracken und billing
    await trackEmailUsage(tenantId, 1, result.provider);
    
    // Rechnungsstatus aktualisieren
    await updateInvoiceStatus(tenantId, invoiceId, {
      status: 'sent',
      sentAt: new Date().toISOString(),
      emailMessageId: result.messageId,
      sentFrom: emailConfig.senderEmail,
      provider: 'saas-service'
    });

    return res.status(200).json({
      success: true,
      data: {
        messageId: result.messageId,
        recipient: invoice.customer.email,
        sender: emailConfig.senderEmail,
        subject: result.subject,
        provider: result.provider
      },
      message: 'E-Rechnung erfolgreich versendet'
    });

  } catch (error) {
    console.error('SaaS Email Error:', error);
    
    // Fehler-Status setzen
    if (req.body.tenantId && req.body.invoiceId) {
      await updateInvoiceStatus(req.body.tenantId, req.body.invoiceId, {
        status: 'failed',
        error: error.message,
        errorAt: new Date().toISOString()
      });
    }
    
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
}

// ===== SaaS E-Mail-Service Klasse =====
class SaaSEmailService {
  constructor() {
    this.providers = ['sendgrid', 'amazonses']; // Fallback-Chain
    this.currentProvider = 'sendgrid';
  }

  async sendInvoiceEmail(tenantId, invoice, emailConfig, options) {
    // E-Mail-Content erstellen
    const emailContent = this.processEmailTemplate(invoice, emailConfig);
    
    // Anhänge vorbereiten
    const attachments = await this.prepareAttachments(tenantId, invoice, options);
    
    const mailData = {
      // ZENTRAL: From ist Kunden-Domain über unseren Service!
      from: `${emailConfig.senderName} <${emailConfig.senderEmail}>`,
      replyTo: emailConfig.replyTo || emailConfig.senderEmail,
      to: invoice.customer.email,
      subject: emailContent.subject,
      html: emailContent.htmlBody,
      text: emailContent.textBody,
      attachments: attachments,
      
      // Tracking für SaaS
      headers: {
        'X-Tenant-ID': tenantId,
        'X-Invoice-ID': invoice.id,
        'X-Service': 'YourSaaS-EInvoice',
        'X-Original-Sender': emailConfig.senderEmail
      }
    };

    // Mit Fallback-Logic senden
    return await this.sendWithFallback(mailData);
  }

  // Robust: Primary + Fallback Provider
  async sendWithFallback(mailData) {
    let lastError;
    
    for (const provider of this.providers) {
      try {
        let result;
        
        switch (provider) {
          case 'sendgrid':
            result = await this.sendViaSendGrid(mailData);
            break;
          case 'amazonses':
            result = await this.sendViaAmazonSES(mailData);
            break;
          default:
            continue;
        }
        
        // Erfolgreich gesendet
        return {
          ...result,
          provider: provider,
          subject: mailData.subject
        };
        
      } catch (error) {
        console.warn(`${provider} failed:`, error.message);
        lastError = error;
        continue;
      }
    }

    throw new Error(`Alle E-Mail-Provider fehlgeschlagen. Letzter Fehler: ${lastError.message}`);
  }

  // SendGrid Implementation
  async sendViaSendGrid(mailData) {
    const msg = {
      to: mailData.to,
      from: mailData.from,
      replyTo: mailData.replyTo,
      subject: mailData.subject,
      html: mailData.html,
      text: mailData.text,
      attachments: mailData.attachments?.map(att => ({
        content: Buffer.from(att.content).toString('base64'),
        filename: att.filename,
        type: att.contentType,
        disposition: 'attachment'
      })) || [],
      
      // DSGVO-konforme Einstellungen
      trackingSettings: {
        clickTracking: { enable: false },
        openTracking: { enable: false },
        subscriptionTracking: { enable: false },
        ganalytics: { enable: false }
      },
      
      headers: mailData.headers
    };

    const result = await sgMail.send(msg);
    
    return {
      success: true,
      messageId: result[0].headers['x-message-id'] || 'sendgrid-sent',
      timestamp: new Date().toISOString()
    };
  }

  // Amazon SES als Fallback
  async sendViaAmazonSES(mailData) {
    const command = new SendEmailCommand({
      Source: mailData.from,
      ReplyToAddresses: [mailData.replyTo],
      Destination: {
        ToAddresses: [mailData.to]
      },
      Message: {
        Subject: { Data: mailData.subject },
        Body: {
          Html: { Data: mailData.html },
          Text: { Data: mailData.text }
        }
      }
    });

    const result = await sesClient.send(command);
    
    return {
      success: true,
      messageId: result.MessageId,
      timestamp: new Date().toISOString()
    };
  }

  // Template-Processing
  processEmailTemplate(invoice, emailConfig) {
    const template = emailConfig.emailTemplate || this.getDefaultTemplate();
    
    const variables = {
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.total.toFixed(2).replace('.', ','),
      currency: invoice.currency,
      customerName: invoice.customer.name,
      companyName: emailConfig.senderName,
      dueDate: this.formatDate(invoice.dueDate),
      date: this.formatDate(invoice.date)
    };

    const subject = this.replaceVariables(template.subject, variables);
    const htmlBody = this.replaceVariables(template.htmlBody, variables);
    const textBody = this.stripHtml(htmlBody);

    return { subject, htmlBody, textBody };
  }

  getDefaultTemplate() {
    return {
      subject: 'Neue Rechnung {{invoiceNumber}} - {{companyName}}',
      htmlBody: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333; border-bottom: 2px solid #007acc; padding-bottom: 10px;">
            Neue Rechnung {{invoiceNumber}}
          </h2>
          
          <p>Sehr geehrte Damen und Herren,</p>
          
          <p>anbei erhalten Sie unsere Rechnung {{invoiceNumber}} vom {{date}} über <strong>{{amount}} {{currency}}</strong>.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #007acc;">
            <h3 style="margin: 0 0 15px 0; color: #333;">Rechnungsdetails:</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr><td style="padding: 5px 0;"><strong>Rechnungsnummer:</strong></td><td>{{invoiceNumber}}</td></tr>
              <tr><td style="padding: 5px 0;"><strong>Rechnungsbetrag:</strong></td><td>{{amount}} {{currency}}</td></tr>
              <tr><td style="padding: 5px 0;"><strong>Fälligkeitsdatum:</strong></td><td>{{dueDate}}</td></tr>
            </table>
          </div>
          
          <p>Die Rechnung ist als strukturierte E-Rechnung (XRechnung) beigefügt und kann direkt in Ihr System importiert werden.</p>
          
          <p>Bei Fragen stehen wir Ihnen gerne zur Verfügung.</p>
          
          <p style="margin-top: 30px;">
            Mit freundlichen Grüßen<br>
            <strong>{{companyName}}</strong>
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="font-size: 12px; color: #666; text-align: center;">
            Diese E-Mail wurde automatisch erstellt und ist ohne Unterschrift gültig.<br>
            Powered by YourSaaS E-Invoice System
          </p>
        </div>
      `
    };
  }

  replaceVariables(template, variables) {
    let result = template;
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
      result = result.replace(regex, variables[key] || '');
    });
    return result;
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
  }

  formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('de-DE');
  }

  // Anhänge vorbereiten
  async prepareAttachments(tenantId, invoice, options) {
    const attachments = [];
    
    if (options.attachXML) {
      try {
        const xmlResponse = await fetch(`${process.env.API_BASE_URL}/api/generate-xrechnung`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, invoiceId: invoice.id })
        });
        
        if (xmlResponse.ok) {
          const xmlData = await xmlResponse.json();
          attachments.push({
            filename: `XRechnung-${invoice.invoiceNumber}.xml`,
            content: xmlData.data.xml,
            contentType: 'application/xml'
          });
        }
      } catch (error) {
        console.warn('XML-Anhang Fehler:', error.message);
      }
    }

    return attachments;
  }
}

// ===== Domain-Validation und Sicherheit =====
async function validateTenantDomain(senderEmail, tenantId) {
  const domain = senderEmail.split('@')[1];
  
  if (!domain) {
    throw new Error('Ungültige E-Mail-Adresse');
  }

  // 1. Tenant-Berechtigung prüfen
  const tenant = await kv.get(`tenant-${tenantId}`);
  if (!tenant?.verifiedDomains?.includes(domain)) {
    throw new Error(`Domain ${domain} nicht für Ihren Account verifiziert. Bitte DNS-Record setzen und Domain verifizieren.`);
  }

  // 2. SPF-Record empfehlung prüfen (Warnung, nicht blockierend)
  try {
    const txtRecords = await dns.resolveTxt(domain);
    const spfRecord = txtRecords.flat().find(record => record.startsWith('v=spf1'));
    
    if (!spfRecord?.includes('mail.ihre-software.com')) {
      console.warn(`SPF-Record für ${domain} nicht optimal. Deliverability könnte beeinträchtigt sein.`);
      // TODO: Admin-Benachrichtigung für Support
    }
  } catch (error) {
    console.warn(`SPF-Check für ${domain} fehlgeschlagen:`, error.message);
  }
}

// ===== Quota-Management =====
async function checkEmailQuota(tenantId) {
  const tenant = await kv.get(`tenant-${tenantId}`);
  const plan = tenant?.plan || 'basic';
  
  const quotaLimits = {
    basic: { monthly: 100, daily: 10 },
    pro: { monthly: 1000, daily: 50 },
    enterprise: { monthly: 10000, daily: 500 }
  };
  
  const currentMonth = new Date().toISOString().substring(0, 7);
  const currentDay = new Date().toISOString().substring(0, 10);
  
  // Monatliche und tägliche Nutzung prüfen
  const monthlyUsage = await kv.hget(`email-usage-${tenantId}`, currentMonth) || 0;
  const dailyUsage = await kv.hget(`email-daily-usage-${tenantId}`, currentDay) || 0;
  
  const limits = quotaLimits[plan];
  
  if (parseInt(monthlyUsage) >= limits.monthly) {
    throw new Error(`E-Mail-Limit erreicht (${limits.monthly}/Monat). Bitte upgraden Sie Ihren Plan.`);
  }
  
  if (parseInt(dailyUsage) >= limits.daily) {
    throw new Error(`Tägliches E-Mail-Limit erreicht (${limits.daily}/Tag). Versuchen Sie es morgen erneut.`);
  }
  
  return true;
}

// ===== Usage-Tracking für Billing =====
async function trackEmailUsage(tenantId, emailCount, provider) {
  const currentMonth = new Date().toISOString().substring(0, 7);
  const currentDay = new Date().toISOString().substring(0, 10);
  
  // Monatlich und täglich tracken
  await kv.hincrby(`email-usage-${tenantId}`, currentMonth, emailCount);
  await kv.hincrby(`email-daily-usage-${tenantId}`, currentDay, emailCount);
  
  // Provider-spezifische Kosten
  const providerCosts = {
    sendgrid: 0.0006,  // $0.0006 pro E-Mail
    amazonses: 0.0001  // $0.0001 pro E-Mail
  };
  
  const cost = emailCount * (providerCosts[provider] || 0.001);
  await kv.hincrbyfloat(`email-costs-${tenantId}`, currentMonth, cost);
  
  // Gesamt-Statistics
  await kv.hincrby(`email-total-${tenantId}`, 'sent', emailCount);
  await kv.hset(`email-total-${tenantId}`, 'lastSent', new Date().toISOString());
  
  return { count: emailCount, cost: cost.toFixed(4) };
}

// ===== Konfiguration-Validation =====
function validateSaaSEmailConfig(emailConfig) {
  const errors = {};
  
  if (!emailConfig) {
    errors.general = 'E-Mail-Konfiguration fehlt';
    return { isValid: false, errors };
  }
  
  // Absender-E-Mail prüfen
  if (!emailConfig.senderEmail) {
    errors.senderEmail = 'Absender-E-Mail ist erforderlich';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailConfig.senderEmail)) {
    errors.senderEmail = 'Ungültige E-Mail-Adresse';
  }
  
  // Absender-Name prüfen  
  if (!emailConfig.senderName?.trim()) {
    errors.senderName = 'Absender-Name ist erforderlich';
  } else if (emailConfig.senderName.length > 100) {
    errors.senderName = 'Absender-Name zu lang (max. 100 Zeichen)';
  }
  
  // Reply-To validieren (optional)
  if (emailConfig.replyTo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailConfig.replyTo)) {
    errors.replyTo = 'Ungültige Reply-To-Adresse';
  }
  
  // Template validieren
  if (!emailConfig.emailTemplate?.subject?.trim()) {
    errors.templateSubject = 'E-Mail-Betreff ist erforderlich';
  }
  
  if (!emailConfig.emailTemplate?.htmlBody?.trim()) {
    errors.templateBody = 'E-Mail-Template ist erforderlich';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

// ===== Invoice Status Update =====
async function updateInvoiceStatus(tenantId, invoiceId, statusUpdate) {
  try {
    const invoices = await kv.get(`invoices-${tenantId}`) || [];
    const invoiceIndex = invoices.findIndex(inv => inv.id === invoiceId);
    
    if (invoiceIndex !== -1) {
      invoices[invoiceIndex] = {
        ...invoices[invoiceIndex],
        ...statusUpdate,
        updatedAt: new Date().toISOString()
      };
      await kv.set(`invoices-${tenantId}`, invoices);
    }
  } catch (error) {
    console.error('Status update failed:', error);
  }
}

// ===== /api/verify-domain.js (Domain-Verifikation) =====
export async function verifyDomainHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tenantId, domain } = req.body;
    
    if (!tenantId || !domain) {
      return res.status(400).json({
        error: 'Tenant ID und Domain erforderlich'
      });
    }

    // Verifikations-Token generieren (falls noch nicht vorhanden)
    const tokenKey = `domain-token-${tenantId}-${domain}`;
    let verificationToken = await kv.get(tokenKey);
    
    if (!verificationToken) {
      verificationToken = `verify-${tenantId}-${Date.now()}-${Math.random().toString(36).substring(2)}`;
      await kv.set(tokenKey, verificationToken, { ex: 7 * 24 * 3600 }); // 7 Tage gültig
    }

    // DNS-Record prüfen
    try {
      const txtRecords = await dns.resolveTxt(`_mail-auth.${domain}`);
      const authRecord = txtRecords
        .flat()
        .find(record => record.includes(verificationToken));
      
      if (!authRecord) {
        return res.status(400).json({
          success: false,
          error: 'Domain-Verifikation fehlgeschlagen',
          required: {
            recordType: 'TXT',
            recordName: `_mail-auth.${domain}`,
            recordValue: `v=spf1 include:mail.ihre-software.com token=${verificationToken} ~all`
          },
          help: 'Setzen Sie den DNS-Record und warten Sie bis zu 48h auf Propagierung'
        });
      }

      // Domain als verifiziert markieren
      const tenant = await kv.get(`tenant-${tenantId}`) || {};
      const verifiedDomains = new Set(tenant.verifiedDomains || []);
      verifiedDomains.add(domain);
      
      await kv.set(`tenant-${tenantId}`, {
        ...tenant,
        verifiedDomains: Array.from(verifiedDomains),
        lastDomainVerification: new Date().toISOString()
      });

      // Token kann gelöscht werden
      await kv.del(tokenKey);

      return res.status(200).json({
        success: true,
        message: `Domain ${domain} erfolgreich verifiziert`,
        data: { 
          domain, 
          verified: true,
          verifiedAt: new Date().toISOString()
        }
      });

    } catch (dnsError) {
      return res.status(400).json({
        success: false,
        error: `DNS-Lookup fehlgeschlagen: ${dnsError.message}`,
        required: {
          recordType: 'TXT',
          recordName: `_mail-auth.${domain}`,
          recordValue: `v=spf1 include:mail.ihre-software.com token=${verificationToken} ~all`
        },
        help: 'DNS-Propagierung kann bis zu 48 Stunden dauern'
      });
    }

  } catch (error) {
    console.error('Domain verification error:', error);
    return res.status(500).json({
      success: false,
      error: 'Domain-Verifikation fehlgeschlagen',
      message: error.message
    });
  }
}

// ===== /api/email-usage.js (Usage Analytics) =====
export async function emailUsageHandler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tenantId } = req.query;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'Tenant ID erforderlich' });
    }

    // Tenant und Plan laden
    const tenant = await kv.get(`tenant-${tenantId}`) || {};
    const plan = tenant.plan || 'basic';
    
    const planDetails = {
      basic: { monthly: 100, daily: 10, cost: 0, name: 'Basic' },
      pro: { monthly: 1000, daily: 50, cost: 10, name: 'Professional' },
      enterprise: { monthly: 10000, daily: 500, cost: 50, name: 'Enterprise' }
    };

    // Aktuelle Nutzung
    const currentMonth = new Date().toISOString().substring(0, 7);
    const currentDay = new Date().toISOString().substring(0, 10);
    
    const monthlyUsage = parseInt(await kv.hget(`email-usage-${tenantId}`, currentMonth)) || 0;
    const dailyUsage = parseInt(await kv.hget(`email-daily-usage-${tenantId}`, currentDay)) || 0;
    const totalStats = await kv.hgetall(`email-total-${tenantId}`) || {};
    
    // Kosten berechnen
    const monthlyCosts = parseFloat(await kv.hget(`email-costs-${tenantId}`, currentMonth)) || 0;
    
    return res.status(200).json({
      success: true,
      data: {
        usage: {
          monthly: {
            sent: monthlyUsage,
            limit: planDetails[plan].monthly,
            remaining: Math.max(0, planDetails[plan].monthly - monthlyUsage),
            percentage: Math.round((monthlyUsage / planDetails[plan].monthly) * 100)
          },
          daily: {
            sent: dailyUsage,
            limit: planDetails[plan].daily,
            remaining: Math.max(0, planDetails[plan].daily - dailyUsage)
          },
          total: {
            sent: parseInt(totalStats.sent) || 0,
            lastSent: totalStats.lastSent || null
          }
        },
        billing: {
          currentMonth: monthlyCosts.toFixed(2),
          planCost: planDetails[plan].cost,
          currency: 'EUR'
        },
        plan: planDetails[plan],
        tenant: {
          id: tenantId,
          verifiedDomains: tenant.verifiedDomains || [],
          plan: plan
        }
      }
    });

  } catch (error) {
    console.error('Usage tracking error:', error);
    return res.status(500).json({
      success: false,
      error: 'Nutzungsdaten konnten nicht geladen werden'
    });
  }
}

// ===== Test-E-Mail API =====
// /api/send-test-email.js
export async function sendTestEmailHandler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { tenantId, emailConfig } = req.body;
    
    // Validation
    const validation = validateSaaSEmailConfig(emailConfig);
    if (!validation.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Konfiguration unvollständig',
        errors: validation.errors
      });
    }

    // Domain-Check
    const domain = emailConfig.senderEmail.split('@')[1];
    const tenant = await kv.get(`tenant-${tenantId}`) || {};
    
    if (!tenant.verifiedDomains?.includes(domain)) {
      return res.status(400).json({
        success: false,
        error: `Domain ${domain} nicht verifiziert`,
        action: 'VERIFY_DOMAIN_REQUIRED'
      });
    }

    // Test-E-Mail senden
    const emailService = new SaaSEmailService();
    
    const testMailData = {
      from: `${emailConfig.senderName} <${emailConfig.senderEmail}>`,
      replyTo: emailConfig.replyTo || emailConfig.senderEmail,
      to: emailConfig.senderEmail, // Test-Mail an sich selbst
      subject: '✅ Test-E-Mail von YourSaaS E-Invoice System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #28a745;">✅ E-Mail-Konfiguration erfolgreich!</h2>
          
          <p>Herzlichen Glückwunsch! Ihre E-Mail-Konfiguration funktioniert einwandfrei.</p>
          
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3>Ihre Konfiguration:</h3>
            <p><strong>Absender:</strong> ${emailConfig.senderName} &lt;${emailConfig.senderEmail}&gt;</p>
            <p><strong>Domain:</strong> ${domain} ✅ Verifiziert</p>
            <p><strong>Service:</strong> YourSaaS E-Mail-Service</p>
          </div>
          
          <p>Sie können jetzt E-Rechnungen von Ihrer eigenen Domain versenden!</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="font-size: 12px; color: #666;">
            Dies ist eine automatisch generierte Test-E-Mail von YourSaaS E-Invoice System.
          </p>
        </div>
      `,
      text: `✅ E-Mail-Konfiguration erfolgreich!\n\nIhre E-Mail-Konfiguration funktioniert. Sie können jetzt E-Rechnungen von ${emailConfig.senderEmail} versenden.`,
      headers: {
        'X-Tenant-ID': tenantId,
        'X-Test-Email': 'true'
      }
    };

    const result = await emailService.sendWithFallback(testMailData);
    
    // Test-E-Mail nicht gegen Quota zählen
    
    return res.status(200).json({
      success: true,
      data: {
        messageId: result.messageId,
        provider: result.provider,
        sentTo: emailConfig.senderEmail
      },
      message: 'Test-E-Mail erfolgreich versendet'
    });

  } catch (error) {
    console.error('Test email error:', error);
    return res.status(500).json({
      success: false,
      error: `Test-E-Mail fehlgeschlagen: ${error.message}`
    });
  }
}

// ===== Environment Variables für .env =====
/*
# SaaS E-Mail-Service Konfiguration
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=your_sendgrid_api_key_here

# Amazon SES Fallback
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key

# Service-Konfiguration  
SERVICE_HOST=mail.ihre-software.com
API_BASE_URL=https://ihre-software.vercel.app

# Features
ENABLE_EMAIL_TRACKING=false  # DSGVO-konform
ENABLE_USAGE_ANALYTICS=true
ENABLE_COST_TRACKING=true
*/