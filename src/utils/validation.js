// src/utils/validation.js

/**
 * Validiert eine E-Mail-Adresse
 * @param {string} email - Die zu validierende E-Mail
 * @returns {Object} Validierungsresultat
 */
export const validateEmail = (email) => {
    const result = { isValid: false, error: '' };
    
    if (!email || typeof email !== 'string') {
      result.error = 'E-Mail-Adresse ist erforderlich';
      return result;
    }
    
    const emailTrimmed = email.trim();
    
    if (emailTrimmed.length === 0) {
      result.error = 'E-Mail-Adresse ist erforderlich';
      return result;
    }
    
    // Basis E-Mail Regex (RFC 5322 vereinfacht)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(emailTrimmed)) {
      result.error = 'Ungültige E-Mail-Adresse';
      return result;
    }
    
    if (emailTrimmed.length > 254) {
      result.error = 'E-Mail-Adresse zu lang (max. 254 Zeichen)';
      return result;
    }
    
    result.isValid = true;
    return result;
  };
  
  /**
   * Validiert eine deutsche USt-IdNr
   * @param {string} taxId - Die zu validierende Steuernummer
   * @returns {Object} Validierungsresultat
   */
  export const validateGermanTaxId = (taxId) => {
    const result = { isValid: false, error: '' };
    
    if (!taxId || typeof taxId !== 'string') {
      result.error = 'Steuernummer ist erforderlich';
      return result;
    }
    
    const cleaned = taxId.replace(/\s/g, '');
    
    // Deutsche USt-IdNr: DE + 9 Ziffern
    const germanTaxIdRegex = /^DE[0-9]{9}$/;
    
    if (!germanTaxIdRegex.test(cleaned)) {
      result.error = 'Ungültige deutsche USt-IdNr (Format: DE123456789)';
      return result;
    }
    
    // Prüfziffer-Validierung für deutsche USt-IdNr
    const digits = cleaned.substring(2).split('').map(Number);
    let sum = 0;
    let product = 10;
    
    for (let i = 0; i < 8; i++) {
      sum = (digits[i] + product) % 10;
      if (sum === 0) sum = 10;
      product = (2 * sum) % 11;
    }
    
    const checkDigit = product === 1 ? 0 : 11 - product;
    
    if (checkDigit !== digits[8]) {
      result.error = 'Ungültige Prüfziffer der USt-IdNr';
      return result;
    }
    
    result.isValid = true;
    return result;
  };
  
  /**
   * Validiert eine Telefonnummer
   * @param {string} phone - Die zu validierende Telefonnummer
   * @param {boolean} required - Ob das Feld erforderlich ist
   * @returns {Object} Validierungsresultat
   */
  export const validatePhone = (phone, required = false) => {
    const result = { isValid: false, error: '' };
    
    if (!phone || typeof phone !== 'string') {
      if (required) {
        result.error = 'Telefonnummer ist erforderlich';
        return result;
      }
      result.isValid = true;
      return result;
    }
    
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');
    
    // Basis Telefonnummer-Validierung (internationale oder nationale Formate)
    const phoneRegex = /^(\+49|0)[1-9][0-9]{1,14}$/;
    
    if (!phoneRegex.test(cleaned)) {
      result.error = 'Ungültige Telefonnummer';
      return result;
    }
    
    result.isValid = true;
    return result;
  };
  
  /**
   * Validiert einen Währungsbetrag
   * @param {string|number} amount - Der zu validierende Betrag
   * @param {number} min - Mindestbetrag (Standard: 0)
   * @param {number} max - Höchstbetrag (Standard: 999999999)
   * @returns {Object} Validierungsresultat
   */
  export const validateAmount = (amount, min = 0, max = 999999999) => {
    const result = { isValid: false, error: '' };
    
    if (amount === null || amount === undefined || amount === '') {
      result.error = 'Betrag ist erforderlich';
      return result;
    }
    
    const numericAmount = typeof amount === 'string' ? parseFloat(amount.replace(',', '.')) : amount;
    
    if (isNaN(numericAmount)) {
      result.error = 'Ungültiger Betrag';
      return result;
    }
    
    if (numericAmount < min) {
      result.error = `Betrag muss mindestens ${min} sein`;
      return result;
    }
    
    if (numericAmount > max) {
      result.error = `Betrag darf höchstens ${max} sein`;
      return result;
    }
    
    // Prüfe auf zu viele Dezimalstellen
    const decimalPlaces = (numericAmount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 2) {
      result.error = 'Maximal 2 Dezimalstellen erlaubt';
      return result;
    }
    
    result.isValid = true;
    result.value = numericAmount;
    return result;
  };
  
  /**
   * Validiert eine Rechnungsposition
   * @param {Object} item - Die zu validierende Position
   * @returns {Object} Validierungsresultat
   */
  export const validateInvoiceItem = (item) => {
    const result = { isValid: false, errors: {} };
    
    if (!item || typeof item !== 'object') {
      result.errors.general = 'Ungültige Rechnungsposition';
      return result;
    }
    
    // Beschreibung validieren
    if (!item.description || typeof item.description !== 'string' || item.description.trim().length === 0) {
      result.errors.description = 'Beschreibung ist erforderlich';
    } else if (item.description.trim().length > 500) {
      result.errors.description = 'Beschreibung zu lang (max. 500 Zeichen)';
    }
    
    // Menge validieren
    const quantityValidation = validateAmount(item.quantity, 0.01, 99999);
    if (!quantityValidation.isValid) {
      result.errors.quantity = quantityValidation.error;
    }
    
    // Preis validieren
    const priceValidation = validateAmount(item.price, 0, 999999);
    if (!priceValidation.isValid) {
      result.errors.price = priceValidation.error;
    }
    
    result.isValid = Object.keys(result.errors).length === 0;
    return result;
  };
  
  /**
   * Validiert eine komplette Rechnung
   * @param {Object} invoice - Die zu validierende Rechnung
   * @returns {Object} Validierungsresultat
   */
  export const validateInvoice = (invoice) => {
    const result = { isValid: false, errors: {} };
    
    if (!invoice || typeof invoice !== 'object') {
      result.errors.general = 'Ungültige Rechnungsdaten';
      return result;
    }
    
    // Kunde validieren
    if (!invoice.customerId || typeof invoice.customerId !== 'string' || invoice.customerId.trim().length === 0) {
      result.errors.customerId = 'Kunde ist erforderlich';
    }
    
    // Format validieren
    const validFormats = ['XRechnung', 'ZUGFeRD', 'UBL', 'CII', 'EDIFACT'];
    if (!invoice.format || !validFormats.includes(invoice.format)) {
      result.errors.format = 'Gültiges E-Rechnungsformat erforderlich';
    }
    
    // Rechnungspositionen validieren
    if (!invoice.items || !Array.isArray(invoice.items) || invoice.items.length === 0) {
      result.errors.items = 'Mindestens eine Rechnungsposition erforderlich';
    } else {
      invoice.items.forEach((item, index) => {
        const itemValidation = validateInvoiceItem(item);
        if (!itemValidation.isValid) {
          result.errors[`item_${index}`] = itemValidation.errors;
        }
      });
    }
    
    // Notizen validieren (optional)
    if (invoice.notes && typeof invoice.notes === 'string' && invoice.notes.length > 1000) {
      result.errors.notes = 'Notizen zu lang (max. 1000 Zeichen)';
    }
    
    result.isValid = Object.keys(result.errors).length === 0;
    return result;
  };
  
  /**
   * Validiert Kundendaten
   * @param {Object} customer - Die zu validierenden Kundendaten
   * @returns {Object} Validierungsresultat
   */
  export const validateCustomer = (customer) => {
    const result = { isValid: false, errors: {} };
    
    if (!customer || typeof customer !== 'object') {
      result.errors.general = 'Ungültige Kundendaten';
      return result;
    }
    
    // Name validieren
    if (!customer.name || typeof customer.name !== 'string' || customer.name.trim().length === 0) {
      result.errors.name = 'Firmenname ist erforderlich';
    } else if (customer.name.trim().length > 200) {
      result.errors.name = 'Firmenname zu lang (max. 200 Zeichen)';
    }
    
    // E-Mail validieren
    const emailValidation = validateEmail(customer.email);
    if (!emailValidation.isValid) {
      result.errors.email = emailValidation.error;
    }
    
    // Telefon validieren (optional)
    if (customer.phone) {
      const phoneValidation = validatePhone(customer.phone, false);
      if (!phoneValidation.isValid) {
        result.errors.phone = phoneValidation.error;
      }
    }
    
    // Steuernummer validieren (optional)
    if (customer.taxId && customer.taxId.trim().length > 0) {
      const taxIdValidation = validateGermanTaxId(customer.taxId);
      if (!taxIdValidation.isValid) {
        result.errors.taxId = taxIdValidation.error;
      }
    }
    
    // Ansprechpartner validieren (optional)
    if (customer.contactPerson && typeof customer.contactPerson === 'string' && customer.contactPerson.length > 100) {
      result.errors.contactPerson = 'Ansprechpartner zu lang (max. 100 Zeichen)';
    }
    
    // Adresse validieren (optional)
    if (customer.address && typeof customer.address === 'string' && customer.address.length > 500) {
      result.errors.address = 'Adresse zu lang (max. 500 Zeichen)';
    }
    
    result.isValid = Object.keys(result.errors).length === 0;
    return result;
  };
  
  /**
   * Validiert E-Mail-Konfiguration
   * @param {Object} emailConfig - Die zu validierende E-Mail-Konfiguration
   * @returns {Object} Validierungsresultat
   */
  export const validateEmailConfig = (emailConfig) => {
    const result = { isValid: false, errors: {} };
    
    if (!emailConfig || typeof emailConfig !== 'object') {
      result.errors.general = 'Ungültige E-Mail-Konfiguration';
      return result;
    }
    
    // Provider validieren
    const validProviders = ['gmail', 'outlook', 'smtp'];
    if (!emailConfig.provider || !validProviders.includes(emailConfig.provider)) {
      result.errors.provider = 'Gültiger E-Mail-Provider erforderlich';
    }
    
    // Benutzer (E-Mail) validieren
    const emailValidation = validateEmail(emailConfig.user);
    if (!emailValidation.isValid) {
      result.errors.user = emailValidation.error;
    }
    
    // Passwort validieren
    if (!emailConfig.password || typeof emailConfig.password !== 'string' || emailConfig.password.trim().length === 0) {
      result.errors.password = 'Passwort ist erforderlich';
    }
    
    // SMTP-spezifische Validierung
    if (emailConfig.provider === 'smtp') {
      if (!emailConfig.host || typeof emailConfig.host !== 'string' || emailConfig.host.trim().length === 0) {
        result.errors.host = 'SMTP-Server ist erforderlich';
      }
      
      if (!emailConfig.port || typeof emailConfig.port !== 'number' || emailConfig.port < 1 || emailConfig.port > 65535) {
        result.errors.port = 'Gültiger Port erforderlich (1-65535)';
      }
    }
    
    // Absender-Name validieren (optional)
    if (emailConfig.from && typeof emailConfig.from === 'string' && emailConfig.from.length > 100) {
      result.errors.from = 'Absender-Name zu lang (max. 100 Zeichen)';
    }
    
    result.isValid = Object.keys(result.errors).length === 0;
    return result;
  };
  
  /**
   * Validiert Unternehmensdaten
   * @param {Object} company - Die zu validierenden Unternehmensdaten
   * @returns {Object} Validierungsresultat
   */
  export const validateCompanyData = (company) => {
    const result = { isValid: false, errors: {} };
    
    if (!company || typeof company !== 'object') {
      result.errors.general = 'Ungültige Unternehmensdaten';
      return result;
    }
    
    // Name validieren
    if (!company.name || typeof company.name !== 'string' || company.name.trim().length === 0) {
      result.errors.name = 'Firmenname ist erforderlich';
    } else if (company.name.trim().length > 200) {
      result.errors.name = 'Firmenname zu lang (max. 200 Zeichen)';
    }
    
    // E-Mail validieren (optional)
    if (company.email && company.email.trim().length > 0) {
      const emailValidation = validateEmail(company.email);
      if (!emailValidation.isValid) {
        result.errors.email = emailValidation.error;
      }
    }
    
    // Telefon validieren (optional)
    if (company.phone && company.phone.trim().length > 0) {
      const phoneValidation = validatePhone(company.phone, false);
      if (!phoneValidation.isValid) {
        result.errors.phone = phoneValidation.error;
      }
    }
    
    // Website validieren (optional)
    if (company.website && company.website.trim().length > 0) {
      const urlRegex = /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/;
      if (!urlRegex.test(company.website)) {
        result.errors.website = 'Ungültige Website-URL';
      }
    }
    
    // Steuernummer validieren (optional)
    if (company.taxId && company.taxId.trim().length > 0) {
      const taxIdValidation = validateGermanTaxId(company.taxId);
      if (!taxIdValidation.isValid) {
        result.errors.taxId = taxIdValidation.error;
      }
    }
    
    // Adresse validieren (optional)
    if (company.address && typeof company.address === 'string' && company.address.length > 500) {
      result.errors.address = 'Adresse zu lang (max. 500 Zeichen)';
    }
    
    result.isValid = Object.keys(result.errors).length === 0;
    return result;
  };
  
  /**
   * Sammelt alle Validierungsfehler und formatiert sie für die Anzeige
   * @param {Object} errors - Fehler-Objekt aus Validierungen
   * @returns {Array} Array von formatierten Fehlermeldungen
   */
  export const formatValidationErrors = (errors) => {
    const messages = [];
    
    Object.keys(errors).forEach(key => {
      if (typeof errors[key] === 'string') {
        messages.push(errors[key]);
      } else if (typeof errors[key] === 'object') {
        // Verschachtelte Fehler (z.B. von Rechnungspositionen)
        Object.keys(errors[key]).forEach(nestedKey => {
          if (typeof errors[key][nestedKey] === 'string') {
            messages.push(`${key}: ${errors[key][nestedKey]}`);
          }
        });
      }
    });
    
    return messages;
  };
  
  /**
   * Hilfsfunktion zum Bereinigen und Validieren von Eingabedaten
   * @param {string} input - Der zu bereinigende Input
   * @param {string} type - Typ der Bereinigung ('text', 'email', 'phone', 'number')
   * @returns {string} Bereinigter Input
   */
  export const sanitizeInput = (input, type = 'text') => {
    if (!input || typeof input !== 'string') return '';
    
    switch (type) {
      case 'email':
        return input.trim().toLowerCase();
        
      case 'phone':
        return input.replace(/[^\d+\-\s\(\)]/g, '').trim();
        
      case 'number':
        return input.replace(/[^\d.,\-]/g, '').replace(',', '.');
        
      case 'text':
      default:
        return input.trim();
    }
  };