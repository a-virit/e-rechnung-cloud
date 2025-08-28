// api/generate-pdf.js - PDF-Generierung
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
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(htmlContent);
    }

    // In Produktion würde hier Puppeteer oder ein PDF-Service verwendet werden
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
            ${company.taxId ? `<p>USt-IdNr.: ${company.taxId}</p>` : ''}
            ${company.email ? `<p>E-Mail: ${company.email}</p>` : ''}
            ${company.phone ? `<p>Tel.: ${company.phone}</p>` : ''}
            ${company.website ? `<p>Web: ${company.website}</p>` : ''}
        </div>
    </div>

    <div class="customer-info">
        <h3>Rechnungsempfänger:</h3>
        <p><strong>${invoice.customer?.name || 'Kunde'}</strong></p>
        ${invoice.customer?.address ? `<p>${invoice.customer.address}</p>` : ''}
        ${invoice.customer?.taxId ? `<p>USt-IdNr.: ${invoice.customer.taxId}</p>` : ''}
    </div>

    <div class="invoice-info">
        <h2>Rechnung ${invoice.invoiceNumber || invoice.id}</h2>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
                <p><strong>Rechnungsdatum:</strong> ${formatDateDE(invoice.date)}</p>
                <p><strong>Fälligkeitsdatum:</strong> ${formatDateDE(invoice.dueDate)}</p>
            </div>
            <div>
                <p><strong>Währung:</strong> ${invoice.currency || 'EUR'}</p>
                <p><strong>Format:</strong> ${invoice.format || 'Standard'}</p>
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
            ${(invoice.items || []).map((item, index) => `
                <tr>
                    <td>${index + 1}</td>
                    <td>${item.description || item.name || 'Leistung'}</td>
                    <td>${item.quantity || 1}</td>
                    <td>${(item.price || 0).toFixed(2)} ${invoice.currency || 'EUR'}</td>
                    <td>${((item.quantity || 1) * (item.price || 0)).toFixed(2)} ${invoice.currency || 'EUR'}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="total-section">
        <div style="width: 300px; margin-left: auto;">
            <div class="total-row">
                <span>Zwischensumme:</span>
                <span>${(invoice.subtotal || 0).toFixed(2)} ${invoice.currency || 'EUR'}</span>
            </div>
            <div class="total-row">
                <span>MwSt. (${invoice.taxRate || 19}%):</span>
                <span>${(invoice.taxAmount || 0).toFixed(2)} ${invoice.currency || 'EUR'}</span>
            </div>
            <div class="total-row total-final">
                <span>Gesamtbetrag:</span>
                <span>${(invoice.total || invoice.amount || 0).toFixed(2)} ${invoice.currency || 'EUR'}</span>
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
        ${config.invoice?.paymentTerms ? `<p>Zahlungsziel: ${config.invoice.paymentTerms} Tage</p>` : ''}
    </div>
</body>
</html>`;
}

function formatDateDE(dateString) {
  if (!dateString) return 'Kein Datum';
  return new Date(dateString).toLocaleDateString('de-DE');
}