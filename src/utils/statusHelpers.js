// src/utils/statusHelpers.js
import { CheckCircle, AlertCircle, Clock, FileX, FileText, Upload, Settings } from 'lucide-react';

/**
 * Gibt Status-Informationen für Rechnungen zurück
 * @param {string} status - Der Status der Rechnung
 * @returns {Object} Icon, Farben und Text für den Status
 */
export const getInvoiceStatusInfo = (status) => {
  const statusConfig = {
    sent: {
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-100',
      border: 'border-green-200',
      text: 'Versendet',
      description: 'Rechnung wurde erfolgreich versendet'
    },
    processing: {
      icon: Clock,
      color: 'text-yellow-600',
      bg: 'bg-yellow-100',
      border: 'border-yellow-200',
      text: 'Verarbeitung',
      description: 'Rechnung wird verarbeitet'
    },
    failed: {
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-100',
      border: 'border-red-200',
      text: 'Fehler',
      description: 'Beim Versenden ist ein Fehler aufgetreten'
    },
    draft: {
      icon: FileX,
      color: 'text-gray-600',
      bg: 'bg-gray-100',
      border: 'border-gray-200',
      text: 'Entwurf',
      description: 'Rechnung ist noch nicht versendet'
    },
    received: {
      icon: Upload,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      border: 'border-blue-200',
      text: 'Empfangen',
      description: 'Rechnung wurde empfangen'
    },
    paid: {
      icon: CheckCircle,
      color: 'text-green-700',
      bg: 'bg-green-50',
      border: 'border-green-300',
      text: 'Bezahlt',
      description: 'Rechnung wurde bezahlt'
    },
    overdue: {
      icon: AlertCircle,
      color: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-300',
      text: 'Überfällig',
      description: 'Zahlungsziel wurde überschritten'
    }
  };

  return statusConfig[status] || {
    icon: FileText,
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    border: 'border-gray-200',
    text: 'Unbekannt',
    description: 'Status unbekannt'
  };
};

/**
 * Gibt Status-Informationen für Kunden zurück
 * @param {Object} customer - Der Kunde
 * @returns {Object} Status-Informationen
 */
export const getCustomerStatusInfo = (customer) => {
  const invoiceCount = customer.invoiceCount || 0;
  const lastInvoice = customer.lastInvoice;
  
  if (invoiceCount === 0) {
    return {
      icon: FileX,
      color: 'text-gray-600',
      bg: 'bg-gray-100',
      text: 'Neu',
      description: 'Noch keine Rechnungen'
    };
  }
  
  if (invoiceCount >= 10) {
    return {
      icon: CheckCircle,
      color: 'text-green-600',
      bg: 'bg-green-100',
      text: 'Premium',
      description: `${invoiceCount} Rechnungen`
    };
  }
  
  if (invoiceCount >= 5) {
    return {
      icon: Settings,
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      text: 'Aktiv',
      description: `${invoiceCount} Rechnungen`
    };
  }
  
  return {
    icon: Clock,
    color: 'text-yellow-600',
    bg: 'bg-yellow-100',
    text: 'Gelegentlich',
    description: `${invoiceCount} Rechnungen`
  };
};

/**
 * Gibt E-Rechnungsformat-Informationen zurück
 * @param {string} format - Das E-Rechnungsformat
 * @returns {Object} Format-Informationen
 */
export const getInvoiceFormatInfo = (format) => {
  const formatConfig = {
    'XRechnung': {
      color: 'text-blue-600',
      bg: 'bg-blue-100',
      description: 'Standard für deutsche Behörden',
      version: '3.0'
    },
    'ZUGFeRD': {
      color: 'text-green-600',
      bg: 'bg-green-100',
      description: 'PDF mit eingebetteten XML-Daten',
      version: '2.1'
    },
    'UBL': {
      color: 'text-purple-600',
      bg: 'bg-purple-100',
      description: 'Universal Business Language',
      version: '2.1'
    },
    'CII': {
      color: 'text-orange-600',
      bg: 'bg-orange-100',
      description: 'Cross Industry Invoice',
      version: 'D16B'
    },
    'EDIFACT': {
      color: 'text-red-600',
      bg: 'bg-red-100',
      description: 'Electronic Data Interchange',
      version: 'D96A'
    }
  };

  return formatConfig[format] || {
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    description: 'Unbekanntes Format',
    version: 'N/A'
  };
};

/**
 * Bestimmt die Priorität einer Rechnung basierend auf Status und Datum
 * @param {Object} invoice - Die Rechnung
 * @returns {Object} Prioritäts-Informationen
 */
export const getInvoicePriority = (invoice) => {
  const now = new Date();
  const dueDate = new Date(invoice.dueDate);
  const daysDiff = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));
  
  if (invoice.status === 'paid') {
    return {
      level: 'none',
      color: 'text-green-600',
      bg: 'bg-green-50',
      text: 'Erledigt'
    };
  }
  
  if (invoice.status === 'draft') {
    return {
      level: 'medium',
      color: 'text-yellow-600',
      bg: 'bg-yellow-50',
      text: 'Versenden'
    };
  }
  
  if (daysDiff < 0) {
    return {
      level: 'high',
      color: 'text-red-600',
      bg: 'bg-red-50',
      text: `${Math.abs(daysDiff)} Tage überfällig`
    };
  }
  
  if (daysDiff <= 3) {
    return {
      level: 'medium',
      color: 'text-orange-600',
      bg: 'bg-orange-50',
      text: `Fällig in ${daysDiff} Tagen`
    };
  }
  
  return {
    level: 'low',
    color: 'text-gray-600',
    bg: 'bg-gray-50',
    text: `Fällig in ${daysDiff} Tagen`
  };
};

/**
 * Berechnet Statistiken für eine Liste von Rechnungen
 * @param {Array} invoices - Array von Rechnungen
 * @returns {Object} Berechnete Statistiken
 */
export const calculateInvoiceStats = (invoices) => {
  const stats = {
    total: invoices.length,
    sent: 0,
    draft: 0,
    processing: 0,
    failed: 0,
    paid: 0,
    overdue: 0,
    totalAmount: 0,
    avgAmount: 0,
    thisMonth: 0,
    thisYear: 0
  };
  
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  
  invoices.forEach(invoice => {
    const invoiceDate = new Date(invoice.date);
    const amount = invoice.total || invoice.amount || 0;
    
    // Status zählen
    stats[invoice.status] = (stats[invoice.status] || 0) + 1;
    
    // Beträge summieren
    stats.totalAmount += amount;
    
    // Diesen Monat
    if (invoiceDate.getMonth() === currentMonth && invoiceDate.getFullYear() === currentYear) {
      stats.thisMonth++;
    }
    
    // Dieses Jahr
    if (invoiceDate.getFullYear() === currentYear) {
      stats.thisYear++;
    }
    
    // Überfällige prüfen
    if (invoice.status !== 'paid' && new Date(invoice.dueDate) < now) {
      stats.overdue++;
    }
  });
  
  stats.avgAmount = stats.total > 0 ? stats.totalAmount / stats.total : 0;
  
  return stats;
};

/**
 * Gibt CSS-Klassen für verschiedene Status-Badges zurück
 * @param {string} type - Typ des Badges ('status', 'priority', 'format')
 * @param {string} value - Der Wert für den das Badge erstellt wird
 * @returns {string} CSS-Klassen
 */
export const getStatusBadgeClasses = (type, value) => {
  const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
  
  switch (type) {
    case 'status':
      const statusInfo = getInvoiceStatusInfo(value);
      return `${baseClasses} ${statusInfo.bg} ${statusInfo.color}`;
      
    case 'format':
      const formatInfo = getInvoiceFormatInfo(value);
      return `${baseClasses} ${formatInfo.bg} ${formatInfo.color}`;
      
    case 'priority':
      const priorityColors = {
        high: 'bg-red-100 text-red-800',
        medium: 'bg-yellow-100 text-yellow-800',
        low: 'bg-green-100 text-green-800',
        none: 'bg-gray-100 text-gray-800'
      };
      return `${baseClasses} ${priorityColors[value] || priorityColors.none}`;
      
    default:
      return `${baseClasses} bg-gray-100 text-gray-800`;
  }
};