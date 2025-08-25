// api/generate-xrechnung.js
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
    const { invoiceId } = req.body;
    
    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        error: 'Rechnungs-ID ist erforderlich'
      });
    }

    // Rechnung aus Datenbank laden
    const invoices = await kv.get('e-invoices') || [];
    const invoice = invoices.find(inv => inv.id === invoiceId);
    
    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Rechnung nicht gefunden'
      });
    }

    // Konfiguration laden
    const config = await kv.get('e-config') || {};
    
    // XRechnung 3.0 XML generieren
    const xrechnungXML = generateXRechnungXML(invoice, config);
    
    return res.status(200).json({
      success: true,
      data: {
        invoiceId: invoice.id,
        format: 'XRechnung 3.0',
        xml: xrechnungXML,
        fileName: `XRechnung_${invoice.invoiceNumber}.xml`
      }
    });

  } catch (error) {
    console.error('XRechnung Generation Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Fehler bei der XRechnung-Generierung: ' + error.message
    });
  }
}

function generateXRechnungXML(invoice, config) {
  const companyInfo = config.company || {};
  const currentDate = new Date().toISOString().split('T')[0];
  
  // XRechnung 3.0 UBL XML Template
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ubl:Invoice 
  xmlns:ubl="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  
  <!-- Customization ID für XRechnung 3.0 -->
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  
  <!-- Rechnungsinformationen -->
  <cbc:ID>${escapeXML(invoice.invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${invoice.date}</cbc:IssueDate>
  <cbc:DueDate>${invoice.dueDate}</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${invoice.currency}</cbc:DocumentCurrencyCode>
  
  ${invoice.notes ? `<cbc:Note>${escapeXML(invoice.notes)}</cbc:Note>` : ''}
  
  <!-- Verkäufer (Rechnungssteller) -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${escapeXML(companyInfo.name || 'Muster Unternehmen GmbH')}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXML(companyInfo.address || 'Musterstraße 1')}</cbc:StreetName>
        <cbc:CityName>Musterstadt</cbc:CityName>
        <cbc:PostalZone>12345</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>DE</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXML(companyInfo.taxId || 'DE123456789')}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXML(companyInfo.name || 'Muster Unternehmen GmbH')}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:ElectronicMail>${escapeXML(companyInfo.email || 'info@example.com')}</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>
  
  <!-- Käufer (Rechnungsempfänger) -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${escapeXML(invoice.customer.name)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXML(invoice.customer.address || 'Kundenstraße 1')}</cbc:StreetName>
        <cbc:CityName>Kundenstadt</cbc:CityName>
        <cbc:PostalZone>54321</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>DE</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>
      ${invoice.customer.taxId ? `
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXML(invoice.customer.taxId)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      ` : ''}
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXML(invoice.customer.name)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:ElectronicMail>${escapeXML(invoice.customer.email)}</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingCustomerParty>
  
  <!-- Zahlungsbedingungen -->
  <cac:PaymentMeans>
    <cbc:PaymentMeansCode>58</cbc:PaymentMeansCode>
    <cbc:PaymentID>${escapeXML(invoice.invoiceNumber)}</cbc:PaymentID>
  </cac:PaymentMeans>
  
  <!-- Steuerinformationen -->
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="${invoice.currency}">${invoice.taxAmount.toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${invoice.currency}">${invoice.subtotal.toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${invoice.currency}">${invoice.taxAmount.toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${invoice.taxRate}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  
  <!-- Rechnungssumme -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${invoice.currency}">${invoice.subtotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${invoice.currency}">${invoice.subtotal.toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${invoice.currency}">${invoice.total.toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${invoice.currency}">${invoice.total.toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  
  <!-- Rechnungspositionen -->
  ${invoice.items.map((item, index) => {
    const lineTotal = item.quantity * item.price;
    return `
  <cac:InvoiceLine>
    <cbc:ID>${index + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">${item.quantity}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${invoice.currency}">${lineTotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${escapeXML(item.description || item.name || 'Leistung')}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${invoice.taxRate}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${invoice.currency}">${item.price.toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`;
  }).join('')}
  
</ubl:Invoice>`;

  return xml;
}

// XML-Escape-Funktion
function escapeXML(text) {
  if (!text) return '';
  return text.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}