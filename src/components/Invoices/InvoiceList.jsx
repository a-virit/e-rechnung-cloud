// src/components/Invoices/InvoiceList.jsx (KORRIGIERT für PDF-Download)
import React from 'react';
import { 
  RefreshCw, FileText, CheckCircle, AlertCircle, Clock, FileX, 
  Send, Download, Trash2, Loader 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

const InvoiceList = () => {
  const { state, actions } = useApp();
  const { invoices, loading, submitting } = state;

  // KORRIGIERT: PDF-Download über wrapper function
  const handleDownloadPDF = async (invoiceId, invoiceNumber) => {
    try {
      const result = await actions.downloadInvoicePDF(invoiceId, invoiceNumber);
      if (!result.success) {
        alert('PDF-Download fehlgeschlagen: ' + result.error);
      }
    } catch (error) {
      alert('PDF-Download fehlgeschlagen: ' + error.message);
    }
  };

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <InvoiceHeader 
        onRefresh={actions.refreshInvoices}
        loading={loading}
      />
      
      <div className="overflow-x-auto">
        {loading ? (
          <LoadingState />
        ) : invoices.length === 0 ? (
          <EmptyState />
        ) : (
          <InvoiceTable 
            invoices={invoices}
            submitting={submitting}
            onSendEmail={actions.sendInvoice}
            onDownloadPDF={handleDownloadPDF}  // KORRIGIERT: Wrapper verwenden
            onDelete={actions.deleteInvoice}
          />
        )}
      </div>
    </div>
  );
};

// Header Komponente
const InvoiceHeader = ({ onRefresh, loading }) => (
  <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
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
const EmptyState = () => (
  <div className="p-8 text-center">
    <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
    <p className="text-gray-500">Noch keine E-Rechnungen vorhanden</p>
    <p className="text-sm text-gray-400 mt-1">Erstelle deine erste E-Rechnung im Dashboard</p>
  </div>
);

// Invoice Table
const InvoiceTable = ({ invoices, submitting, onSendEmail, onDownloadPDF, onDelete }) => (
  <table className="w-full">
    <thead className="bg-gray-50">
      <tr>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Rechnungs-ID
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Business Partner
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Betrag
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Format
        </th>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Status
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

// Invoice Row - KORRIGIERT für Business Partner
const InvoiceRow = ({ invoice, submitting, onSendEmail, onDownloadPDF, onDelete }) => {
  const statusInfo = getStatusInfo(invoice.status);
  const StatusIcon = statusInfo.icon;

  const handleSendEmail = () => {
    if (window.confirm('E-Rechnung jetzt versenden?')) {
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

  // KORRIGIERT: Business Partner Daten verwenden statt Customer
  const customerName = invoice.businessPartner?.name || invoice.customer?.name || 'Unbekannter Kunde';
  const customerEmail = invoice.businessPartner?.email || invoice.customer?.email || '';
  const selectedRole = invoice.businessPartner?.selectedRole || 'CUSTOMER';

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="text-sm font-mono text-gray-900">
          {invoice.invoiceNumber || invoice.id}
        </div>
        <div className="text-xs text-gray-500">
          {invoice.date}
        </div>
      </td>
      
      {/* KORRIGIERT: Business Partner anzeigen */}
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
          {invoice.status === 'draft' && (
            <button
              onClick={handleSendEmail}
              disabled={submitting}
              className="inline-flex items-center p-1 text-blue-600 hover:text-blue-800 disabled:opacity-50"
              title="E-Rechnung versenden"
            >
              {submitting ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          )}
          
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