// src/components/Invoices/InvoiceList.jsx - Erweiterte Version mit Filtern
import React, { useState, useMemo } from 'react';
import { 
  RefreshCw, FileText, CheckCircle, AlertCircle, Clock, FileX, 
  Send, Download, Trash2, Loader, Search, Filter, Calendar,
  ChevronUp, ChevronDown, X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const InvoiceList = () => {
  const { state, actions } = useApp();
  const { invoices, loading, submitting, businessPartners } = state;

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState('ALL');
  const [selectedFormat, setSelectedFormat] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [dateFilter, setDateFilter] = useState({
    from: '',
    to: ''
  });
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');

  // Erweiterte Filter-Sichtbarkeit
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  // Gefilterte und sortierte Rechnungen
  const filteredAndSortedInvoices = useMemo(() => {
    let filtered = [...invoices];

    // Textsuche (Rechnungsnummer, Kunde)
    if (searchTerm) {
      filtered = filtered.filter(invoice => {
        const invoiceNumber = invoice.invoiceNumber || invoice.id || '';
        const customerName = invoice.businessPartner?.name || invoice.customer?.name || '';
        const customerEmail = invoice.businessPartner?.email || invoice.customer?.email || '';
        
        return (
          invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          customerEmail.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    // Kundenfilter
    if (selectedCustomer !== 'ALL') {
      filtered = filtered.filter(invoice => {
        const customerName = invoice.businessPartner?.name || invoice.customer?.name || '';
        return customerName === selectedCustomer;
      });
    }

    // Format-Filter
    if (selectedFormat !== 'ALL') {
      filtered = filtered.filter(invoice => 
        (invoice.format || 'Standard') === selectedFormat
      );
    }

    // Status-Filter
    if (selectedStatus !== 'ALL') {
      filtered = filtered.filter(invoice => 
        (invoice.status || 'draft') === selectedStatus
      );
    }

    // Datumsfilter
    if (dateFilter.from) {
      filtered = filtered.filter(invoice => 
        new Date(invoice.date) >= new Date(dateFilter.from)
      );
    }
    if (dateFilter.to) {
      filtered = filtered.filter(invoice => 
        new Date(invoice.date) <= new Date(dateFilter.to)
      );
    }

    // Sortierung
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch(sortField) {
        case 'invoiceNumber':
          aVal = a.invoiceNumber || a.id || '';
          bVal = b.invoiceNumber || b.id || '';
          break;
        case 'customer':
          aVal = a.businessPartner?.name || a.customer?.name || '';
          bVal = b.businessPartner?.name || b.customer?.name || '';
          break;
        case 'amount':
          aVal = a.total || a.amount || 0;
          bVal = b.total || b.amount || 0;
          break;
        case 'date':
          aVal = new Date(a.date || 0);
          bVal = new Date(b.date || 0);
          break;
        case 'status':
          aVal = a.status || 'draft';
          bVal = b.status || 'draft';
          break;
        default:
          aVal = a[sortField];
          bVal = b[sortField];
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [invoices, searchTerm, selectedCustomer, selectedFormat, selectedStatus, dateFilter, sortField, sortDirection]);

  // Unique Werte für Filter-Dropdowns
  const uniqueCustomers = useMemo(() => {
    const customers = new Set();
    invoices.forEach(invoice => {
      const name = invoice.businessPartner?.name || invoice.customer?.name;
      if (name) customers.add(name);
    });
    return Array.from(customers).sort();
  }, [invoices]);

  const uniqueFormats = useMemo(() => {
    const formats = new Set();
    invoices.forEach(invoice => {
      formats.add(invoice.format || 'Standard');
    });
    return Array.from(formats);
  }, [invoices]);

  // PDF-Download Handler
  const handleDownloadPDF = async (invoiceId, invoiceNumber) => {
    try {
      const result = await actions.downloadInvoicePDF(invoiceId, invoiceNumber);
      if (!result.success) {
        actions.showError('PDF-Download fehlgeschlagen: ' + result.error);
      }
    } catch (error) {
      actions.showError('PDF-Download fehlgeschlagen: ' + error.message);
    }
  };

  // Sortier-Handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Filter zurücksetzen
  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCustomer('ALL');
    setSelectedFormat('ALL');
    setSelectedStatus('ALL');
    setDateFilter({ from: '', to: '' });
  };

  const hasActiveFilters = searchTerm || selectedCustomer !== 'ALL' || 
    selectedFormat !== 'ALL' || selectedStatus !== 'ALL' || 
    dateFilter.from || dateFilter.to;

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <InvoiceHeader 
        onRefresh={actions.refreshInvoices}
        loading={loading}
      />
      
      {/* Filter-Bereich */}
      <div className="px-6 py-4 bg-gray-50 border-b space-y-4">
        {/* Hauptfilter-Zeile */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Suchfeld */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Suchen nach Rechnungsnummer oder Kunde..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Kunde Filter */}
          <select
            value={selectedCustomer}
            onChange={(e) => setSelectedCustomer(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Alle Kunden</option>
            {uniqueCustomers.map(customer => (
              <option key={customer} value={customer}>{customer}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">Alle Status</option>
            <option value="draft">Entwurf</option>
            <option value="sent">Versendet</option>
            <option value="paid">Bezahlt</option>
            <option value="overdue">Überfällig</option>
            <option value="failed">Fehlgeschlagen</option>
          </select>

          {/* Erweiterte Filter Toggle */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Erweiterte Filter
            {showAdvancedFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Erweiterte Filter */}
        {showAdvancedFilters && (
          <div className="flex flex-col lg:flex-row gap-4 pt-4 border-t border-gray-200">
            {/* Format Filter */}
            <select
              value={selectedFormat}
              onChange={(e) => setSelectedFormat(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Alle Formate</option>
              {uniqueFormats.map(format => (
                <option key={format} value={format}>{format}</option>
              ))}
            </select>

            {/* Datum Von */}
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={dateFilter.from}
                onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Von"
              />
            </div>

            {/* Datum Bis */}
            <div className="flex items-center gap-2">
              <span className="text-gray-500">bis</span>
              <input
                type="date"
                value={dateFilter.to}
                onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Bis"
              />
            </div>
          </div>
        )}

        {/* Filter-Info und Reset */}
        {hasActiveFilters && (
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">
              {filteredAndSortedInvoices.length} von {invoices.length} Rechnungen
            </span>
            <button
              onClick={resetFilters}
              className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Filter zurücksetzen
            </button>
          </div>
        )}
      </div>
      
      <div className="overflow-x-auto">
        {loading ? (
          <LoadingState />
        ) : filteredAndSortedInvoices.length === 0 ? (
          <EmptyState hasFilters={hasActiveFilters} />
        ) : (
          <InvoiceTable 
            invoices={filteredAndSortedInvoices}
            submitting={submitting}
            onSendEmail={actions.sendInvoice}
            onDownloadPDF={handleDownloadPDF}
            onDelete={actions.deleteInvoice}
            onSort={handleSort}
            sortField={sortField}
            sortDirection={sortDirection}
          />
        )}
      </div>
    </div>
  );
};

// Header Komponente
const InvoiceHeader = ({ onRefresh, loading }) => (
  <div className="px-6 py-4 border-b bg-white flex justify-between items-center">
    <div>
      <h3 className="text-lg font-semibold">E-Rechnungsübersicht</h3>
      <p className="text-sm text-gray-600">Alle eingehenden und ausgehenden E-Rechnungen</p>
    </div>
    <button 
      onClick={onRefresh}
      className="flex items-center text-blue-600 hover:text-blue-800 text-sm"
      disabled={loading}
    >
      <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
      Aktualisieren
    </button>
  </div>
);

// Loading State
const LoadingState = () => (
  <div className="p-8 text-center">
    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
    <p className="text-gray-600">Lade E-Rechnungen...</p>
  </div>
);

// Empty State
const EmptyState = ({ hasFilters }) => (
  <div className="p-8 text-center">
    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
    <p className="text-gray-500">
      {hasFilters ? 'Keine Rechnungen gefunden' : 'Noch keine E-Rechnungen vorhanden'}
    </p>
    <p className="text-sm text-gray-400 mt-1">
      {hasFilters ? 'Versuchen Sie andere Filterkriterien' : 'Erstelle deine erste E-Rechnung im Dashboard'}
    </p>
  </div>
);

// Invoice Table mit Sortierung
const InvoiceTable = ({ invoices, submitting, onSendEmail, onDownloadPDF, onDelete, onSort, sortField, sortDirection }) => {
  
  const SortIcon = ({ field }) => {
    if (sortField !== field) {
      return <ChevronUp className="w-3 h-3 text-gray-400" />;
    }
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-3 h-3 text-blue-600" /> : 
      <ChevronDown className="w-3 h-3 text-blue-600" />;
  };

  return (
    <table className="w-full">
      <thead className="bg-gray-50">
        <tr>
          <th 
            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            onClick={() => onSort('invoiceNumber')}
          >
            <div className="flex items-center gap-1">
              Rechnungs-ID
              <SortIcon field="invoiceNumber" />
            </div>
          </th>
          <th 
            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            onClick={() => onSort('customer')}
          >
            <div className="flex items-center gap-1">
              Business Partner
              <SortIcon field="customer" />
            </div>
          </th>
          <th 
            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            onClick={() => onSort('amount')}
          >
            <div className="flex items-center gap-1">
              Betrag
              <SortIcon field="amount" />
            </div>
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Format
          </th>
          <th 
            className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
            onClick={() => onSort('status')}
          >
            <div className="flex items-center gap-1">
              Status
              <SortIcon field="status" />
            </div>
          </th>
          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
            Aktionen
          </th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-gray-200">
        {invoices.map((invoice) => (
          <InvoiceRow
            key={invoice.id}
            invoice={invoice}
            submitting={submitting}
            onSendEmail={onSendEmail}
            onDownloadPDF={onDownloadPDF}
            onDelete={onDelete}
          />
        ))}
      </tbody>
    </table>
  );
};

// Invoice Row - Mit permanentem Senden-Button
const InvoiceRow = ({ invoice, submitting, onSendEmail, onDownloadPDF, onDelete }) => {
  const statusInfo = getStatusInfo(invoice.status);
  const StatusIcon = statusInfo.icon;

  const handleSendEmail = () => {
    const message = invoice.status === 'sent' 
      ? 'Diese E-Rechnung wurde bereits versendet. Erneut senden?'
      : invoice.status === 'failed'
      ? 'Versand erneut versuchen?'
      : 'E-Rechnung jetzt versenden?';
      
    if (window.confirm(message)) {
      onSendEmail(invoice.id);
    }
  };

  const handleDownloadPDF = () => {
    onDownloadPDF(invoice.id, invoice.invoiceNumber || invoice.id);
  };

  const handleDelete = () => {
    if (window.confirm('Rechnung wirklich löschen?')) {
      onDelete(invoice.id);
    }
  };

  const customerName = invoice.businessPartner?.name || invoice.customer?.name || 'Unbekannter Kunde';
  const customerEmail = invoice.businessPartner?.email || invoice.customer?.email || '';
  const selectedRole = invoice.businessPartner?.selectedRole || 'CUSTOMER';

  // Bestimme Senden-Button Stil basierend auf Status
  const getSendButtonStyle = () => {
    if (invoice.status === 'failed') {
      return 'text-red-600 hover:text-red-800';
    } else if (invoice.status === 'sent' || invoice.status === 'paid') {
      return 'text-gray-400 hover:text-gray-600';
    }
    return 'text-blue-600 hover:text-blue-800';
  };

  const getSendButtonTitle = () => {
    if (invoice.status === 'failed') {
      return 'Versand wiederholen';
    } else if (invoice.status === 'sent') {
      return 'Erneut versenden';
    } else if (invoice.status === 'paid') {
      return 'Bereits bezahlt - Erneut versenden?';
    }
    return 'E-Rechnung versenden';
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-mono text-gray-900">
          {invoice.invoiceNumber || invoice.id}
        </div>
        <div className="text-xs text-gray-500">
          {new Date(invoice.date).toLocaleDateString('de-DE')}
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-8 w-8">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <FileText className="h-4 w-4 text-blue-600" />
            </div>
          </div>
          <div className="ml-3">
            <div className="text-sm font-medium text-gray-900">
              {customerName}
            </div>
            <div className="text-xs text-gray-500">
              {customerEmail}
              {invoice.businessPartner && (
                <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {selectedRole}
                </span>
              )}
            </div>
          </div>
        </div>
      </td>

      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm text-gray-900 font-mono">
          {(invoice.total || invoice.amount || 0).toFixed(2)} {invoice.currency || 'EUR'}
        </div>
        <div className="text-xs text-gray-500">
          Netto: {(invoice.subtotal || 0).toFixed(2)} {invoice.currency || 'EUR'}
        </div>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {invoice.format || 'Standard'}
        </span>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {statusInfo.label}
        </span>
      </td>
      
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center space-x-2">
          {/* Senden-Button - IMMER sichtbar */}
          <button
            onClick={handleSendEmail}
            disabled={submitting}
            className={`inline-flex items-center p-1 ${getSendButtonStyle()} disabled:opacity-50`}
            title={getSendButtonTitle()}
          >
            {submitting ? (
              <Loader className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
          
          <button
            onClick={handleDownloadPDF}
            className="inline-flex items-center p-1 text-green-600 hover:text-green-800"
            title="PDF herunterladen"
          >
            <Download className="w-4 h-4" />
          </button>
          
          <button
            onClick={handleDelete}
            className="inline-flex items-center p-1 text-red-600 hover:text-red-800"
            title="Rechnung löschen"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
};

// Status-Helper Funktion
const getStatusInfo = (status) => {
  const statusMap = {
    'draft': { 
      label: 'Entwurf', 
      color: 'bg-gray-100 text-gray-800', 
      icon: Clock 
    },
    'sent': { 
      label: 'Versendet', 
      color: 'bg-blue-100 text-blue-800', 
      icon: Send 
    },
    'paid': { 
      label: 'Bezahlt', 
      color: 'bg-green-100 text-green-800', 
      icon: CheckCircle 
    },
    'overdue': { 
      label: 'Überfällig', 
      color: 'bg-red-100 text-red-800', 
      icon: AlertCircle 
    },
    'failed': { 
      label: 'Fehlgeschlagen', 
      color: 'bg-red-100 text-red-800', 
      icon: FileX 
    }
  };
  
  return statusMap[status] || statusMap['draft'];
};

export default InvoiceList;