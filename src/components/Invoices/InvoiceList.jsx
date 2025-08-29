// src/components/Invoices/InvoiceList.jsx
import React from 'react';
import { 
  RefreshCw, FileText, CheckCircle, AlertCircle, Clock, FileX, 
  Send, Download, Trash2, Loader 
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { invoiceService } from '../../services';

const InvoiceList = () => {
  const { state, actions } = useApp();
  const { invoices, loading, submitting } = state;

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
            onDownloadPDF={invoiceService.downloadPDF}
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
          Kunde
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

// Invoice Row
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

  return (
    <tr className="hover:bg-gray-50">
      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
        {invoice.invoiceNumber || invoice.id}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        {invoice.customer?.name || invoice.receiver || 'Unbekannt'}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        <span className="font-medium">
        {(invoice.total || invoice.amount || 0).toFixed(2)} {invoice.currency || 'EUR'}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          {invoice.format}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.bg} ${statusInfo.color}`}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {statusInfo.text}
        </span>
        {invoice.error && (
          <p className="text-xs text-red-600 mt-1">{invoice.error}</p>
        )}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
        <div className="flex space-x-2">
          {invoice.status === 'draft' && (
            <ActionButton
              onClick={handleSendEmail}
              disabled={submitting}
              title="E-Mail versenden"
              color="green"
            >
              {submitting ? <Loader className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </ActionButton>
          )}
          <ActionButton
            onClick={handleDownloadPDF}
            title="PDF herunterladen"
            color="blue"
          >
            <Download className="w-4 h-4" />
          </ActionButton>
          <ActionButton
            onClick={handleDelete}
            title="Löschen"
            color="red"
          >
            <Trash2 className="w-4 h-4" />
          </ActionButton>
        </div>
      </td>
    </tr>
  );
};

// Action Button Komponente
const ActionButton = ({ onClick, disabled = false, title, color, children }) => {
  const colorClasses = {
    green: 'text-green-600 hover:text-green-900',
    blue: 'text-blue-600 hover:text-blue-900',
    red: 'text-red-600 hover:text-red-900'
  };

  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`${colorClasses[color]} disabled:opacity-50`}
      title={title}
    >
      {children}
    </button>
  );
};

// Status Helper Function
const getStatusInfo = (status) => {
  switch (status) {
    case 'sent':
      return { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-100', text: 'Versendet' };
    case 'processing':
      return { icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100', text: 'Verarbeitung' };
    case 'failed':
      return { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-100', text: 'Fehler' };
    case 'draft':
      return { icon: FileX, color: 'text-gray-600', bg: 'bg-gray-100', text: 'Entwurf' };
    default:
      return { icon: FileText, color: 'text-blue-600', bg: 'bg-blue-100', text: 'Empfangen' };
  }
};

export default InvoiceList;