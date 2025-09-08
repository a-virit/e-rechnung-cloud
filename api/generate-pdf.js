// api/generate-pdf.js - Echte PDF-Generierung mit jsPDF
import { kv } from '@vercel/kv';
import { jsPDF } from 'jspdf';

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

    // HTML für Preview generieren
    if (req.query.preview === 'true') {
      const htmlContent = generateInvoiceHTML(invoice, config);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(htmlContent);
    }

    // ECHTE PDF-Generierung mit jsPDF
    const pdfBuffer = generatePDFBuffer(invoice, config);
    
    if (req.method === 'GET') {
      // PDF-Download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="Rechnung_${invoice.invoiceNumber || invoice.id}.pdf"`);
      return res.status(200).send(pdfBuffer);
    } else {
      // PDF-Daten als Base64 zurückgeben
      return res.status(200).json({
        success: true,
        data: {
          invoiceId: invoice.id,
          fileName: `Rechnung_${invoice.invoiceNumber || invoice.id}.pdf`,
          pdf: pdfBuffer.toString('base64'),
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

// Echte PDF-Generierung mit jsPDF
function generatePDFBuffer(invoice, config) {
  // Neue PDF-Instanz erstellen
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  // Farben definieren
  const primaryColor = [37, 99, 235]; // Blau
  const textColor = [51, 51, 51]; // Dunkelgrau
  const lightGray = [100, 116, 139]; // Hellgrau

  // Hilfsfunktionen
  const addText = (text, x, y, options = {}) => {
    if (options.color) doc.setTextColor(...options.color);
    if (options.fontSize) doc.setFontSize(options.fontSize);
    if (options.fontStyle) doc.setFont(undefined, options.fontStyle);
    doc.text(text, x, y);
    // Reset
    doc.setTextColor(...textColor);
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
  };

  const addLine = (x1, y1, x2, y2, color = [229, 231, 235]) => {
    doc.setDrawColor(...color);
    doc.line(x1, y1, x2, y2);
  };

  let yPos = 20;

  // === HEADER ===
  // Firmenname
  addText(config.company?.name || 'Ihr Unternehmen', 20, yPos, { 
    fontSize: 20, 
    fontStyle: 'bold',
    color: primaryColor 
  });
  yPos += 10;

  // Firmenadresse
  if (config.company?.address) {
    addText(config.company.address, 20, yPos, { fontSize: 9, color: lightGray });
    yPos += 5;
  }
  if (config.company?.taxId) {
    addText(`USt-IdNr.: ${config.company.taxId}`, 20, yPos, { fontSize: 9, color: lightGray });
    yPos += 5;
  }
  if (config.email?.senderEmail) {
    addText(`E-Mail: ${config.email.senderEmail}`, 20, yPos, { fontSize: 9, color: lightGray });
    yPos += 5;
  }

  // Trennlinie
  yPos += 5;
  addLine(20, yPos, 190, yPos, primaryColor);
  yPos += 10;

  // === RECHNUNGSTITEL ===
  addText(`RECHNUNG ${invoice.invoiceNumber || invoice.id}`, 20, yPos, { 
    fontSize: 16, 
    fontStyle: 'bold' 
  });
  yPos += 10;

  // Rechnungsdaten in zwei Spalten
  const leftCol = 20;
  const rightCol = 110;
  
  addText('Rechnungsdatum:', leftCol, yPos, { fontStyle: 'bold', fontSize: 9 });
  addText(formatDateDE(invoice.date), leftCol + 35, yPos, { fontSize: 9 });
  
  addText('Fälligkeitsdatum:', rightCol, yPos, { fontStyle: 'bold', fontSize: 9 });
  addText(formatDateDE(invoice.dueDate), rightCol + 35, yPos, { fontSize: 9 });
  yPos += 6;

  addText('Format:', leftCol, yPos, { fontStyle: 'bold', fontSize: 9 });
  addText(invoice.format || 'Standard', leftCol + 35, yPos, { fontSize: 9 });
  
  addText('Währung:', rightCol, yPos, { fontStyle: 'bold', fontSize: 9 });
  addText(invoice.currency || 'EUR', rightCol + 35, yPos, { fontSize: 9 });
  yPos += 10;

  // === KUNDENADRESSE ===
  addText('RECHNUNGSEMPFÄNGER', 20, yPos, { 
    fontSize: 10, 
    fontStyle: 'bold',
    color: lightGray 
  });
  yPos += 6;

  // Business Partner Name mit Rolle
  const customerName = getCustomerName(invoice);
  addText(customerName, 20, yPos, { fontSize: 11, fontStyle: 'bold' });
  
  // Role Badge
  if (invoice.businessPartner?.selectedRole) {
    const role = invoice.businessPartner.selectedRole;
    doc.setFillColor(219, 234, 254); // Hellblau
    doc.setTextColor(30, 64, 175); // Dunkelblau
    doc.setFontSize(8);
    const roleWidth = doc.getTextWidth(role) + 4;
    doc.roundedRect(20 + doc.getTextWidth(customerName) + 5, yPos - 4, roleWidth, 5, 1, 1, 'F');
    doc.text(role, 20 + doc.getTextWidth(customerName) + 7, yPos - 0.5);
    doc.setTextColor(...textColor);
  }
  yPos += 6;

  // Kundenadresse
  const addressLines = getCustomerAddressLines(invoice);
  addressLines.forEach(line => {
    if (line) {
      addText(line, 20, yPos, { fontSize: 9 });
      yPos += 4;
    }
  });

  // Kunden-Steuernummer
  const customerTaxId = invoice.businessPartner?.taxId || invoice.customer?.taxId;
  if (customerTaxId) {
    addText(`USt-IdNr.: ${customerTaxId}`, 20, yPos, { fontSize: 9 });
    yPos += 4;
  }
  yPos += 5;

  // === RECHNUNGSPOSITIONEN ===
  addText('POSITIONEN', 20, yPos, { 
    fontSize: 10, 
    fontStyle: 'bold',
    color: lightGray 
  });
  yPos += 6;

  // Tabellenkopf
  doc.setFillColor(241, 245, 249); // Sehr hellgrau
  doc.rect(20, yPos - 4, 170, 8, 'F');
  
  addText('Pos.', 22, yPos, { fontSize: 9, fontStyle: 'bold' });
  addText('Beschreibung', 35, yPos, { fontSize: 9, fontStyle: 'bold' });
  addText('Menge', 120, yPos, { fontSize: 9, fontStyle: 'bold' });
  addText('Einzelpreis', 140, yPos, { fontSize: 9, fontStyle: 'bold' });
  addText('Gesamt', 165, yPos, { fontSize: 9, fontStyle: 'bold' });
  yPos += 8;

  // Tabellenzeilen
  const items = invoice.items || [];
  if (items.length === 0) {
    addText('1', 22, yPos, { fontSize: 9 });
    addText('Keine Positionen angegeben', 35, yPos, { fontSize: 9 });
    addText('1', 120, yPos, { fontSize: 9 });
    addText('0,00', 140, yPos, { fontSize: 9 });
    addText('0,00', 165, yPos, { fontSize: 9 });
    yPos += 6;
  } else {
    items.forEach((item, index) => {
      const quantity = item.quantity || 1;
      const price = item.price || 0;
      const total = quantity * price;

      addText(`${index + 1}`, 22, yPos, { fontSize: 9 });
      
      // Beschreibung (ggf. umbrechen)
      const description = item.description || item.name || 'Leistung';
      const maxWidth = 80;
      const lines = doc.splitTextToSize(description, maxWidth);
      lines.forEach((line, i) => {
        addText(line, 35, yPos + (i * 4), { fontSize: 9 });
      });
      
      addText(`${quantity}`, 120, yPos, { fontSize: 9 });
      addText(formatCurrency(price), 140, yPos, { fontSize: 9 });
      addText(formatCurrency(total), 165, yPos, { fontSize: 9 });
      
      yPos += Math.max(6, lines.length * 4);
      
      // Trennlinie zwischen Positionen
      if (index < items.length - 1) {
        addLine(20, yPos - 2, 190, yPos - 2);
      }
    });
  }

  // === SUMMEN ===
  yPos += 5;
  addLine(20, yPos, 190, yPos, primaryColor);
  yPos += 8;

  // Rechte Ausrichtung für Summen
  const labelX = 130;
  const valueX = 165;

  // Zwischensumme
  addText('Zwischensumme:', labelX, yPos, { fontSize: 10 });
  addText(formatCurrency(invoice.subtotal || 0), valueX, yPos, { fontSize: 10 });
  yPos += 6;

  // MwSt
  const taxRate = invoice.taxRate || 19;
  const taxAmount = invoice.taxAmount || invoice.tax || 0;
  addText(`MwSt. (${taxRate}%):`, labelX, yPos, { fontSize: 10 });
  addText(formatCurrency(taxAmount), valueX, yPos, { fontSize: 10 });
  yPos += 6;

  // Gesamtbetrag
  addLine(labelX - 5, yPos - 2, 190, yPos - 2, primaryColor);
  yPos += 4;
  addText('Gesamtbetrag:', labelX, yPos, { 
    fontSize: 12, 
    fontStyle: 'bold' 
  });
  addText(formatCurrency(invoice.total || invoice.amount || 0), valueX, yPos, { 
    fontSize: 12, 
    fontStyle: 'bold',
    color: primaryColor 
  });
  addText(invoice.currency || 'EUR', valueX + 20, yPos, { 
    fontSize: 10,
    color: primaryColor 
  });

  // === NOTIZEN ===
  if (invoice.notes) {
    yPos += 15;
    addText('ANMERKUNGEN', 20, yPos, { 
      fontSize: 10, 
      fontStyle: 'bold',
      color: lightGray 
    });
    yPos += 6;
    
    const noteLines = doc.splitTextToSize(invoice.notes, 170);
    noteLines.forEach(line => {
      addText(line, 20, yPos, { fontSize: 9 });
      yPos += 4;
    });
  }

  // === FOOTER ===
  const footerY = 270;
  addLine(20, footerY, 190, footerY);
  
  addText('Vielen Dank für Ihr Vertrauen!', 105, footerY + 6, { 
    fontSize: 9, 
    color: lightGray,
    align: 'center'
  });
  
  addText('Diese Rechnung wurde automatisch erstellt und ist ohne Unterschrift gültig.', 105, footerY + 10, { 
    fontSize: 8, 
    color: lightGray,
    align: 'center'
  });

  // PDF als Buffer zurückgeben
  const pdfOutput = doc.output('arraybuffer');
  return Buffer.from(pdfOutput);
}

// === HILFSFUNKTIONEN ===

function getCustomerName(invoice) {
  return invoice.businessPartner?.name || invoice.customer?.name || 'Kunde';
}

function getCustomerAddressLines(invoice) {
  const lines = [];
  
  if (invoice.businessPartner?.address) {
    const addr = invoice.businessPartner.address;
    const street = `${addr.street || ''} ${addr.houseNumber || ''}`.trim();
    if (street) lines.push(street);
    
    const cityLine = `${addr.postalCode || addr.zip || ''} ${addr.city || ''}`.trim();
    if (cityLine) lines.push(cityLine);
    
    if (addr.country && addr.country !== 'Deutschland') {
      lines.push(addr.country);
    }
  } else if (invoice.customer?.address) {
    // Alte Struktur als String
    const addressParts = invoice.customer.address.split(',').map(s => s.trim());
    addressParts.forEach(part => {
      if (part) lines.push(part);
    });
  }
  
  return lines;
}

function formatDateDE(dateString) {
  if (!dateString) return 'Kein Datum';
  return new Date(dateString).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

function formatCurrency(amount) {
  return amount.toLocaleString('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// HTML für Preview (optional behalten)
function generateInvoiceHTML(invoice, config) {
  // ... Ihr existierender HTML-Code ...
  // Kann für die Preview-Funktion behalten werden
  return `<!DOCTYPE html><html><body><h1>Rechnung ${invoice.invoiceNumber}</h1></body></html>`;
}