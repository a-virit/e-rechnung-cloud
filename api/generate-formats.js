// api/generate-formats.js - Multi-Format Engine für E-Invoicing
import { kv } from '@vercel/kv';

// Unterstützte Formate
const SUPPORTED_FORMATS = {
  XRECHNUNG: 'XRechnung',
  ZUGFERD: 'ZUGFeRD',
  BOTH: 'Both'
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      error: 'Method not allowed' 
    });
  }

  try {
    const { invoiceId, format = 'XRechnung', options = {} } = req.body;
    
    if (!invoiceId) {
      return res.status(400).json({
        success: false,
        error: 'Rechnungs-ID ist erforderlich'
      });
    }

    // Rechnung direkt aus KV laden (keine Auth nötig für Background-Tasks)
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
    
    // Format(e) generieren
    const result = await generateFormats(invoice, config, format, options);
    
    return res.status(200).json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Format generation error:', error);
    return res.status(500).json({
      success: false,
      error: 'Format-Generierung fehlgeschlagen: ' + error.message
    });
  }
}

// Multi-Format-Generierung
async function generateFormats(invoice, config, requestedFormat, options) {
  const results = {
    invoiceId: invoice.id,
    formats: {},
    metadata: {
      generatedAt: new Date().toISOString(),
      requestedFormat,
      businessPartner: getBusinessPartnerInfo(invoice)
    }
  };

  switch (requestedFormat.toUpperCase()) {
    case 'XRECHNUNG':
      results.formats.xrechnung = await generateXRechnung(invoice, config, options);
      break;
      
    case 'ZUGFERD':
      results.formats.zugferd = await generateZUGFeRD(invoice, config, options);
      break;
      
    case 'BOTH':
      results.formats.xrechnung = await generateXRechnung(invoice, config, options);
      results.formats.zugferd = await generateZUGFeRD(invoice, config, options);
      break;
      
    default:
      throw new Error(`Unbekanntes Format: ${requestedFormat}`);
  }

  return results;
}

// XRechnung 3.0 Generierung (Business Partner optimiert)
async function generateXRechnung(invoice, config, options) {
  const companyInfo = config.company || {};
  const customerData = extractCustomerData(invoice);
  
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<ubl:Invoice 
  xmlns:ubl="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2">
  
  <!-- XRechnung 3.0 Customization -->
  <cbc:CustomizationID>urn:cen.eu:en16931:2017#compliant#urn:xeinkauf.de:kosit:xrechnung_3.0</cbc:CustomizationID>
  <cbc:ProfileID>urn:fdc:peppol.eu:2017:poacc:billing:01:1.0</cbc:ProfileID>
  
  <!-- Rechnungsinformationen -->
  <cbc:ID>${escapeXML(invoice.invoiceNumber)}</cbc:ID>
  <cbc:IssueDate>${invoice.date}</cbc:IssueDate>
  <cbc:DueDate>${invoice.dueDate}</cbc:DueDate>
  <cbc:InvoiceTypeCode>380</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>${invoice.currency || 'EUR'}</cbc:DocumentCurrencyCode>
  
  ${invoice.notes ? `<cbc:Note>${escapeXML(invoice.notes)}</cbc:Note>` : ''}
  
  <!-- Verkäufer (Rechnungssteller) -->
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${escapeXML(companyInfo.name || 'Muster Unternehmen GmbH')}</cbc:Name>
      </cac:PartyName>
      ${generateSupplierAddress(companyInfo)}
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
  
  <!-- Käufer (Business Partner optimiert) -->
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName>
        <cbc:Name>${escapeXML(customerData.name)}</cbc:Name>
      </cac:PartyName>
      ${generateCustomerAddress(customerData)}
      ${customerData.taxId ? `
      <cac:PartyTaxScheme>
        <cbc:CompanyID>${escapeXML(customerData.taxId)}</cbc:CompanyID>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:PartyTaxScheme>
      ` : ''}
      <cac:PartyLegalEntity>
        <cbc:RegistrationName>${escapeXML(customerData.name)}</cbc:RegistrationName>
      </cac:PartyLegalEntity>
      <cac:Contact>
        <cbc:ElectronicMail>${escapeXML(customerData.email)}</cbc:ElectronicMail>
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
    <cbc:TaxAmount currencyID="${invoice.currency || 'EUR'}">${(invoice.taxAmount || 0).toFixed(2)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="${invoice.currency || 'EUR'}">${(invoice.subtotal || 0).toFixed(2)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="${invoice.currency || 'EUR'}">${(invoice.taxAmount || 0).toFixed(2)}</cbc:TaxAmount>
      <cac:TaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${invoice.taxRate || 19}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  
  <!-- Rechnungssumme -->
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="${invoice.currency || 'EUR'}">${(invoice.subtotal || 0).toFixed(2)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="${invoice.currency || 'EUR'}">${(invoice.subtotal || 0).toFixed(2)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="${invoice.currency || 'EUR'}">${(invoice.total || 0).toFixed(2)}</cbc:TaxInclusiveAmount>
    <cbc:PayableAmount currencyID="${invoice.currency || 'EUR'}">${(invoice.total || 0).toFixed(2)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  
  <!-- Rechnungspositionen -->
  ${generateInvoiceLines(invoice)}
  
</ubl:Invoice>`;

  return {
    format: 'XRechnung 3.0',
    version: '3.0',
    standard: 'EN16931',
    xml: xml,
    fileName: `XRechnung_${invoice.invoiceNumber || invoice.id}.xml`,
    mimeType: 'application/xml',
    size: Buffer.byteLength(xml, 'utf8')
  };
}

// ZUGFeRD 2.2 Generierung
async function generateZUGFeRD(invoice, config, options) {
  const companyInfo = config.company || {};
  const customerData = extractCustomerData(invoice);
  
  // ZUGFeRD basiert auf UBL, aber mit erweiterten Metadaten
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rsm:CrossIndustryInvoice 
  xmlns:rsm="urn:un:unece:uncefact:data:standard:CrossIndustryInvoice:100"
  xmlns:qdt="urn:un:unece:uncefact:data:standard:QualifiedDataType:100"
  xmlns:ram="urn:un:unece:uncefact:data:standard:ReusableAggregateBusinessInformationEntity:100"
  xmlns:xs="http://www.w3.org/2001/XMLSchema"
  xmlns:udt="urn:un:unece:uncefact:data:standard:UnqualifiedDataType:100">
  
  <!-- ZUGFeRD Context -->
  <rsm:ExchangedDocumentContext>
    <ram:GuidelineSpecifiedDocumentContextParameter>
      <ram:ID>urn:cen.eu:en16931:2017#compliant#urn:zugferd.de:2p2:extended</ram:ID>
    </ram:GuidelineSpecifiedDocumentContextParameter>
  </rsm:ExchangedDocumentContext>
  
  <!-- Dokumentheader -->
  <rsm:ExchangedDocument>
    <ram:ID>${escapeXML(invoice.invoiceNumber)}</ram:ID>
    <ram:TypeCode>380</ram:TypeCode>
    <ram:IssueDateTime>
      <udt:DateTimeString format="102">${formatDateZUGFeRD(invoice.date)}</udt:DateTimeString>
    </ram:IssueDateTime>
    ${invoice.notes ? `<ram:Note><ram:Content>${escapeXML(invoice.notes)}</ram:Content></ram:Note>` : ''}
  </rsm:ExchangedDocument>
  
  <!-- Geschäftsprozess -->
  <rsm:SupplyChainTradeTransaction>
    <!-- Rechnungspositionen (ZUGFeRD Format) -->
    ${generateZUGFeRDLines(invoice)}
    
    <!-- Handelsvereinbarung -->
    <ram:ApplicableHeaderTradeAgreement>
      <!-- Verkäufer -->
      <ram:SellerTradeParty>
        <ram:Name>${escapeXML(companyInfo.name || 'Muster Unternehmen GmbH')}</ram:Name>
        ${generateZUGFeRDSupplierAddress(companyInfo)}
        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${escapeXML(companyInfo.taxId || 'DE123456789')}</ram:ID>
        </ram:SpecifiedTaxRegistration>
      </ram:SellerTradeParty>
      
      <!-- Käufer -->
      <ram:BuyerTradeParty>
        <ram:Name>${escapeXML(customerData.name)}</ram:Name>
        ${generateZUGFeRDCustomerAddress(customerData)}
        ${customerData.taxId ? `
        <ram:SpecifiedTaxRegistration>
          <ram:ID schemeID="VA">${escapeXML(customerData.taxId)}</ram:ID>
        </ram:SpecifiedTaxRegistration>
        ` : ''}
      </ram:BuyerTradeParty>
    </ram:ApplicableHeaderTradeAgreement>
    
    <!-- Lieferdetails -->
    <ram:ApplicableHeaderTradeDelivery>
      <ram:ActualDeliverySupplyChainEvent>
        <ram:OccurrenceDateTime>
          <udt:DateTimeString format="102">${formatDateZUGFeRD(invoice.date)}</udt:DateTimeString>
        </ram:OccurrenceDateTime>
      </ram:ActualDeliverySupplyChainEvent>
    </ram:ApplicableHeaderTradeDelivery>
    
    <!-- Abrechnungsdetails -->
    <ram:ApplicableHeaderTradeSettlement>
      <ram:InvoiceCurrencyCode>${invoice.currency || 'EUR'}</ram:InvoiceCurrencyCode>
      
      <!-- Zahlungsbedingungen -->
      <ram:SpecifiedTradePaymentTerms>
        <ram:DueDateDateTime>
          <udt:DateTimeString format="102">${formatDateZUGFeRD(invoice.dueDate)}</udt:DateTimeString>
        </ram:DueDateDateTime>
      </ram:SpecifiedTradePaymentTerms>
      
      <!-- Steuern -->
      <ram:ApplicableTradeTax>
        <ram:CalculatedAmount>${(invoice.taxAmount || 0).toFixed(2)}</ram:CalculatedAmount>
        <ram:TypeCode>VAT</ram:TypeCode>
        <ram:CategoryCode>S</ram:CategoryCode>
        <ram:RateApplicablePercent>${invoice.taxRate || 19}</ram:RateApplicablePercent>
        <ram:BasisAmount>${(invoice.subtotal || 0).toFixed(2)}</ram:BasisAmount>
      </ram:ApplicableTradeTax>
      
      <!-- Gesamtsummen -->
      <ram:SpecifiedTradeSettlementHeaderMonetarySummation>
        <ram:LineTotalAmount>${(invoice.subtotal || 0).toFixed(2)}</ram:LineTotalAmount>
        <ram:TaxBasisTotalAmount>${(invoice.subtotal || 0).toFixed(2)}</ram:TaxBasisTotalAmount>
        <ram:TaxTotalAmount currencyID="${invoice.currency || 'EUR'}">${(invoice.taxAmount || 0).toFixed(2)}</ram:TaxTotalAmount>
        <ram:GrandTotalAmount>${(invoice.total || 0).toFixed(2)}</ram:GrandTotalAmount>
        <ram:DuePayableAmount>${(invoice.total || 0).toFixed(2)}</ram:DuePayableAmount>
      </ram:SpecifiedTradeSettlementHeaderMonetarySummation>
    </ram:ApplicableHeaderTradeSettlement>
  </rsm:SupplyChainTradeTransaction>
</rsm:CrossIndustryInvoice>`;

  return {
    format: 'ZUGFeRD 2.2',
    version: '2.2',
    standard: 'EN16931',
    xml: xml,
    fileName: `ZUGFeRD_${invoice.invoiceNumber || invoice.id}.xml`,
    mimeType: 'application/xml',
    size: Buffer.byteLength(xml, 'utf8')
  };
}

// Business Partner Daten extrahieren (mit Customer-Fallback)
function extractCustomerData(invoice) {
  // Business Partner Daten verwenden (neue Struktur)
  if (invoice.businessPartner) {
    const bp = invoice.businessPartner;
    const addr = bp.address || {};
    
    return {
      name: bp.name || 'Unbekannter Kunde',
      email: bp.email || addr.email || '',
      taxId: bp.taxId || addr.taxId || '',
      street: addr.street || '',
      houseNumber: addr.houseNumber || '',
      city: addr.city || '',
      postalCode: addr.postalCode || '',
      country: addr.country || 'Deutschland',
      countryCode: getCountryCode(addr.country || 'Deutschland'),
      selectedRole: bp.selectedRole || 'CUSTOMER'
    };
  }
  
  // Fallback: Alte Customer-Struktur
  if (invoice.customer) {
    return {
      name: invoice.customer.name || 'Unbekannter Kunde',
      email: invoice.customer.email || '',
      taxId: invoice.customer.taxId || '',
      street: 'Kundenstraße 1',
      houseNumber: '',
      city: 'Kundenstadt',
      postalCode: '54321',
      country: 'Deutschland',
      countryCode: 'DE',
      selectedRole: 'CUSTOMER'
    };
  }
  
  // Ultimate Fallback
  return {
    name: 'Unbekannter Kunde',
    email: '',
    taxId: '',
    street: '',
    houseNumber: '',
    city: '',
    postalCode: '',
    country: 'Deutschland',
    countryCode: 'DE',
    selectedRole: 'CUSTOMER'
  };
}

// Business Partner Info für Metadata
function getBusinessPartnerInfo(invoice) {
  if (invoice.businessPartner) {
    return {
      type: 'BusinessPartner',
      name: invoice.businessPartner.name,
      role: invoice.businessPartner.selectedRole,
      email: invoice.businessPartner.email
    };
  }
  
  if (invoice.customer) {
    return {
      type: 'Customer',
      name: invoice.customer.name,
      role: 'CUSTOMER',
      email: invoice.customer.email
    };
  }
  
  return {
    type: 'Unknown',
    name: 'Unbekannt',
    role: 'UNKNOWN',
    email: ''
  };
}

// XRechnung Rechnungspositionen
function generateInvoiceLines(invoice) {
  if (!invoice.items || invoice.items.length === 0) {
    return '<cac:InvoiceLine><cbc:ID>1</cbc:ID><cbc:InvoicedQuantity unitCode="C62">1</cbc:InvoicedQuantity><cbc:LineExtensionAmount currencyID="EUR">0.00</cbc:LineExtensionAmount><cac:Item><cbc:Name>Keine Positionen</cbc:Name></cac:Item><cac:Price><cbc:PriceAmount currencyID="EUR">0.00</cbc:PriceAmount></cac:Price></cac:InvoiceLine>';
  }

  return invoice.items.map((item, index) => {
    const lineTotal = (item.quantity || 1) * (item.price || 0);
    return `
  <cac:InvoiceLine>
    <cbc:ID>${index + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">${item.quantity || 1}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="${invoice.currency || 'EUR'}">${lineTotal.toFixed(2)}</cbc:LineExtensionAmount>
    <cac:Item>
      <cbc:Name>${escapeXML(item.description || item.name || 'Leistung')}</cbc:Name>
      <cac:ClassifiedTaxCategory>
        <cbc:ID>S</cbc:ID>
        <cbc:Percent>${invoice.taxRate || 19}</cbc:Percent>
        <cac:TaxScheme>
          <cbc:ID>VAT</cbc:ID>
        </cac:TaxScheme>
      </cac:ClassifiedTaxCategory>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="${invoice.currency || 'EUR'}">${(item.price || 0).toFixed(2)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`;
  }).join('');
}

// ZUGFeRD Rechnungspositionen
function generateZUGFeRDLines(invoice) {
  if (!invoice.items || invoice.items.length === 0) {
    return '<ram:IncludedSupplyChainTradeLineItem><ram:AssociatedDocumentLineDocument><ram:LineID>1</ram:LineID></ram:AssociatedDocumentLineDocument><ram:SpecifiedTradeProduct><ram:Name>Keine Positionen</ram:Name></ram:SpecifiedTradeProduct></ram:IncludedSupplyChainTradeLineItem>';
  }

  return invoice.items.map((item, index) => {
    const lineTotal = (item.quantity || 1) * (item.price || 0);
    return `
    <ram:IncludedSupplyChainTradeLineItem>
      <ram:AssociatedDocumentLineDocument>
        <ram:LineID>${index + 1}</ram:LineID>
      </ram:AssociatedDocumentLineDocument>
      <ram:SpecifiedTradeProduct>
        <ram:Name>${escapeXML(item.description || item.name || 'Leistung')}</ram:Name>
      </ram:SpecifiedTradeProduct>
      <ram:SpecifiedLineTradeAgreement>
        <ram:NetPriceProductTradePrice>
          <ram:ChargeAmount>${(item.price || 0).toFixed(2)}</ram:ChargeAmount>
        </ram:NetPriceProductTradePrice>
      </ram:SpecifiedLineTradeAgreement>
      <ram:SpecifiedLineTradeDelivery>
        <ram:BilledQuantity unitCode="C62">${item.quantity || 1}</ram:BilledQuantity>
      </ram:SpecifiedLineTradeDelivery>
      <ram:SpecifiedLineTradeSettlement>
        <ram:ApplicableTradeTax>
          <ram:TypeCode>VAT</ram:TypeCode>
          <ram:CategoryCode>S</ram:CategoryCode>
          <ram:RateApplicablePercent>${invoice.taxRate || 19}</ram:RateApplicablePercent>
        </ram:ApplicableTradeTax>
        <ram:SpecifiedTradeSettlementLineMonetarySummation>
          <ram:LineTotalAmount>${lineTotal.toFixed(2)}</ram:LineTotalAmount>
        </ram:SpecifiedTradeSettlementLineMonetarySummation>
      </ram:SpecifiedLineTradeSettlement>
    </ram:IncludedSupplyChainTradeLineItem>`;
  }).join('');
}

// Adress-Generierung Funktionen
function generateSupplierAddress(companyInfo) {
  return `
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXML(companyInfo.address || 'Musterstraße 1')}</cbc:StreetName>
        <cbc:CityName>Musterstadt</cbc:CityName>
        <cbc:PostalZone>12345</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>DE</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>`;
}

function generateCustomerAddress(customerData) {
  return `
      <cac:PostalAddress>
        <cbc:StreetName>${escapeXML(customerData.street || 'Kundenstraße 1')}</cbc:StreetName>
        ${customerData.houseNumber ? `<cbc:BuildingNumber>${escapeXML(customerData.houseNumber)}</cbc:BuildingNumber>` : ''}
        <cbc:CityName>${escapeXML(customerData.city || 'Kundenstadt')}</cbc:CityName>
        <cbc:PostalZone>${escapeXML(customerData.postalCode || '54321')}</cbc:PostalZone>
        <cac:Country>
          <cbc:IdentificationCode>${customerData.countryCode}</cbc:IdentificationCode>
        </cac:Country>
      </cac:PostalAddress>`;
}

function generateZUGFeRDSupplierAddress(companyInfo) {
  return `
        <ram:PostalTradeAddress>
          <ram:LineOne>${escapeXML(companyInfo.address || 'Musterstraße 1')}</ram:LineOne>
          <ram:CityName>Musterstadt</ram:CityName>
          <ram:PostcodeCode>12345</ram:PostcodeCode>
          <ram:CountryID>DE</ram:CountryID>
        </ram:PostalTradeAddress>`;
}

function generateZUGFeRDCustomerAddress(customerData) {
  const streetLine = `${customerData.street || 'Kundenstraße 1'} ${customerData.houseNumber || ''}`.trim();
  return `
        <ram:PostalTradeAddress>
          <ram:LineOne>${escapeXML(streetLine)}</ram:LineOne>
          <ram:CityName>${escapeXML(customerData.city || 'Kundenstadt')}</ram:CityName>
          <ram:PostcodeCode>${escapeXML(customerData.postalCode || '54321')}</ram:PostcodeCode>
          <ram:CountryID>${customerData.countryCode}</ram:CountryID>
        </ram:PostalTradeAddress>`;
}

// Helper-Funktionen
function getCountryCode(country) {
  const countryCodes = {
    'Deutschland': 'DE',
    'Germany': 'DE', 
    'Österreich': 'AT',
    'Austria': 'AT',
    'Schweiz': 'CH',
    'Switzerland': 'CH',
    'Frankreich': 'FR',
    'France': 'FR',
    'Niederlande': 'NL',
    'Netherlands': 'NL'
  };
  
  return countryCodes[country] || 'DE';
}

function formatDateZUGFeRD(dateString) {
  if (!dateString) return new Date().toISOString().split('T')[0].replace(/-/g, '');
  return dateString.replace(/-/g, '');
}

function escapeXML(text) {
  if (!text) return '';
  return text.toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}