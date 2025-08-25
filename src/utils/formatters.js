// src/utils/formatters.js

/**
 * Formatiert einen Währungsbetrag
 * @param {number} amount - Der Betrag
 * @param {string} currency - Die Währung (Standard: EUR)
 * @param {string} locale - Die Locale (Standard: de-DE)
 * @returns {string} Formatierter Währungsbetrag
 */
export const formatCurrency = (amount, currency = 'EUR', locale = 'de-DE') => {
    if (typeof amount !== 'number' || isNaN(amount)) {
      return '0,00 €';
    }
    
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(amount);
    } catch (error) {
      // Fallback falls Intl nicht unterstützt wird
      return `${amount.toFixed(2).replace('.', ',')} ${currency}`;
    }
  };
  
  /**
   * Formatiert eine Zahl ohne Währungssymbol
   * @param {number} number - Die zu formatierende Zahl
   * @param {number} decimals - Anzahl Dezimalstellen (Standard: 2)
   * @param {string} locale - Die Locale (Standard: de-DE)
   * @returns {string} Formatierte Zahl
   */
  export const formatNumber = (number, decimals = 2, locale = 'de-DE') => {
    if (typeof number !== 'number' || isNaN(number)) {
      return '0';
    }
    
    try {
      return new Intl.NumberFormat(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      }).format(number);
    } catch (error) {
      return number.toFixed(decimals).replace('.', ',');
    }
  };
  
  /**
   * Formatiert ein Datum
   * @param {string|Date} date - Das zu formatierende Datum
   * @param {string} format - Format-Typ ('short', 'medium', 'long', 'full')
   * @param {string} locale - Die Locale (Standard: de-DE)
   * @returns {string} Formatiertes Datum
   */
  export const formatDate = (date, format = 'short', locale = 'de-DE') => {
    if (!date) return '-';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    if (isNaN(dateObj.getTime())) {
      return 'Ungültiges Datum';
    }
    
    const formatOptions = {
      short: { day: '2-digit', month: '2-digit', year: 'numeric' },
      medium: { day: '2-digit', month: 'short', year: 'numeric' },
      long: { day: '2-digit', month: 'long', year: 'numeric' },
      full: { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }
    };
    
    try {
      return new Intl.DateTimeFormat(locale, formatOptions[format]).format(dateObj);
    } catch (error) {
      // Fallback
      return dateObj.toLocaleDateString(locale);
    }
  };
  
  /**
   * Formatiert eine Uhrzeit
   * @param {string|Date} time - Die zu formatierende Zeit
   * @param {boolean} includeSeconds - Sekunden einschließen (Standard: false)
   * @param {string} locale - Die Locale (Standard: de-DE)
   * @returns {string} Formatierte Uhrzeit
   */
  export const formatTime = (time, includeSeconds = false, locale = 'de-DE') => {
    if (!time) return '-';
    
    const timeObj = typeof time === 'string' ? new Date(time) : time;
    
    if (isNaN(timeObj.getTime())) {
      return 'Ungültige Zeit';
    }
    
    const options = {
      hour: '2-digit',
      minute: '2-digit',
      ...(includeSeconds && { second: '2-digit' })
    };
    
    try {
      return new Intl.DateTimeFormat(locale, options).format(timeObj);
    } catch (error) {
      return timeObj.toLocaleTimeString(locale);
    }
  };
  
  /**
   * Formatiert Datum und Zeit zusammen
   * @param {string|Date} datetime - Datum und Zeit
   * @param {string} locale - Die Locale (Standard: de-DE)
   * @returns {string} Formatiertes Datum und Zeit
   */
  export const formatDateTime = (datetime, locale = 'de-DE') => {
    if (!datetime) return '-';
    
    const date = formatDate(datetime, 'short', locale);
    const time = formatTime(datetime, false, locale);
    
    return `${date} ${time}`;
  };
  
  /**
   * Berechnet und formatiert die Differenz zwischen zwei Daten
   * @param {string|Date} date - Das Zieldatum
   * @param {string|Date} referenceDate - Referenzdatum (Standard: jetzt)
   * @returns {string} Formatierte Zeitdifferenz
   */
  export const formatTimeAgo = (date, referenceDate = new Date()) => {
    if (!date) return '-';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const refObj = typeof referenceDate === 'string' ? new Date(referenceDate) : referenceDate;
    
    if (isNaN(dateObj.getTime()) || isNaN(refObj.getTime())) {
      return 'Ungültiges Datum';
    }
    
    const diffMs = refObj.getTime() - dateObj.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);
    
    if (diffSeconds < 60) return 'gerade eben';
    if (diffMinutes < 60) return `vor ${diffMinutes} Min.`;
    if (diffHours < 24) return `vor ${diffHours} Std.`;
    if (diffDays < 7) return `vor ${diffDays} Tag${diffDays !== 1 ? 'en' : ''}`;
    if (diffWeeks < 4) return `vor ${diffWeeks} Woche${diffWeeks !== 1 ? 'n' : ''}`;
    if (diffMonths < 12) return `vor ${diffMonths} Monat${diffMonths !== 1 ? 'en' : ''}`;
    return `vor ${diffYears} Jahr${diffYears !== 1 ? 'en' : ''}`;
  };
  
  /**
   * Formatiert eine Rechnungsnummer
   * @param {string} invoiceNumber - Die Rechnungsnummer
   * @param {string} prefix - Prefix falls nicht in Nummer enthalten
   * @returns {string} Formatierte Rechnungsnummer
   */
  export const formatInvoiceNumber = (invoiceNumber, prefix = '') => {
    if (!invoiceNumber) return '-';
    
    // Wenn bereits formatiert, direkt zurückgeben
    if (invoiceNumber.includes('-') || invoiceNumber.includes('/')) {
      return invoiceNumber;
    }
    
    // Prefix hinzufügen falls noch nicht vorhanden
    if (prefix && !invoiceNumber.startsWith(prefix)) {
      return `${prefix}${invoiceNumber}`;
    }
    
    return invoiceNumber;
  };
  
  /**
   * Formatiert eine Telefonnummer
   * @param {string} phone - Die Telefonnummer
   * @param {string} format - Format-Typ ('international', 'national', 'clean')
   * @returns {string} Formatierte Telefonnummer
   */
  export const formatPhoneNumber = (phone, format = 'national') => {
    if (!phone) return '-';
    
    // Nur Zahlen und + behalten
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    if (!cleaned) return phone;
    
    switch (format) {
      case 'international':
        if (cleaned.startsWith('+49')) {
          return cleaned.replace(/(\+49)(\d{3,4})(\d{3,4})(\d{2,4})/, '$1 $2 $3 $4');
        }
        return cleaned.replace(/(\+\d{1,3})(\d{3,4})(\d{3,4})(\d{2,4})/, '$1 $2 $3 $4');
        
      case 'national':
        if (cleaned.startsWith('+49')) {
          const national = '0' + cleaned.substring(3);
          return national.replace(/(\d{4})(\d{3,4})(\d{2,4})/, '$1 $2 $3');
        }
        if (cleaned.startsWith('0')) {
          return cleaned.replace(/(\d{4})(\d{3,4})(\d{2,4})/, '$1 $2 $3');
        }
        return cleaned;
        
      case 'clean':
        return cleaned;
        
      default:
        return phone;
    }
  };
  
  /**
   * Formatiert eine E-Mail-Adresse für die Anzeige
   * @param {string} email - Die E-Mail-Adresse
   * @param {number} maxLength - Maximale Länge (Standard: 30)
   * @returns {string} Formatierte E-Mail-Adresse
   */
  export const formatEmail = (email, maxLength = 30) => {
    if (!email) return '-';
    
    if (email.length <= maxLength) {
      return email;
    }
    
    const [localPart, domain] = email.split('@');
    if (!domain) return email;
    
    const availableLength = maxLength - domain.length - 4; // -4 für "...@"
    
    if (availableLength <= 0) {
      return `...@${domain}`;
    }
    
    return `${localPart.substring(0, availableLength)}...@${domain}`;
  };
  
  /**
   * Formatiert eine Adresse für die Anzeige
   * @param {string} address - Die Adresse
   * @param {boolean} oneLine - Als eine Zeile formatieren (Standard: false)
   * @returns {string} Formatierte Adresse
   */
  export const formatAddress = (address, oneLine = false) => {
    if (!address) return '-';
    
    if (oneLine) {
      return address.replace(/\n/g, ', ').replace(/,\s*,/g, ',');
    }
    
    return address;
  };
  
  /**
   * Formatiert einen Prozentsatz
   * @param {number} percentage - Der Prozentsatz
   * @param {number} decimals - Anzahl Dezimalstellen (Standard: 1)
   * @returns {string} Formatierter Prozentsatz
   */
  export const formatPercentage = (percentage, decimals = 1) => {
    if (typeof percentage !== 'number' || isNaN(percentage)) {
      return '0%';
    }
    
    return `${percentage.toFixed(decimals).replace('.', ',')}%`;
  };
  
  /**
   * Formatiert eine Dateigröße
   * @param {number} bytes - Die Größe in Bytes
   * @param {number} decimals - Anzahl Dezimalstellen (Standard: 1)
   * @returns {string} Formatierte Dateigröße
   */
  export const formatFileSize = (bytes, decimals = 1) => {
    if (typeof bytes !== 'number' || bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };
  
  /**
   * Truncate Text mit Ellipsis
   * @param {string} text - Der zu kürzende Text
   * @param {number} maxLength - Maximale Länge
   * @param {string} suffix - Suffix für gekürzte Texte (Standard: '...')
   * @returns {string} Gekürzter Text
   */
  export const truncateText = (text, maxLength, suffix = '...') => {
    if (!text || typeof text !== 'string') return '';
    
    if (text.length <= maxLength) return text;
    
    return text.substring(0, maxLength - suffix.length) + suffix;
  };