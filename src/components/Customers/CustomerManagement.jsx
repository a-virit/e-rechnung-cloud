// src/components/Customers/CustomerManagement.jsx - Mit Berechtigungen
import React, { useState } from 'react';
import { Users, Plus, Edit, Trash2, Search, Mail, Phone, Building, Shield, Lock } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import authService from '../../services/authService';

const CustomerManagement = () => {
  const { state, actions } = useApp();
  const { user } = useAuth();
  const { customers } = state;
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  // 🔒 Berechtigungen prüfen
  const canRead = authService.hasPermission('customers:read');
  const canWrite = authService.hasPermission('customers:write');
  const canDelete = authService.hasPermission('customers:write');

  // Wenn keine Leseberechtigung: Zugriff verweigern
  if (!canRead) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Lock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Zugriff verweigert</h3>
          <p className="text-gray-500">Sie haben keine Berechtigung zum Anzeigen von Kundendaten.</p>
        </div>
      </div>
    );
  }

  // Kunden filtern und sortieren
  const filteredAndSortedCustomers = customers
    .filter(customer => 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.contactPerson && customer.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    .sort((a, b) => {
      let aValue = a[sortBy] || '';
      let bValue = b[sortBy] || '';
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Kunde löschen (mit Berechtigung)
  const handleDeleteCustomer = async (customer) => {
    if (!canDelete) {
      console.log('Keine Berechtigung zum Löschen von Kunden');
      return;
    }

    if (window.confirm(`Kunde "${customer.name}" wirklich löschen?`)) {
      try {
        await actions.deleteCustomer(customer.id);
        console.log('Kunde erfolgreich gelöscht!');
      } catch (error) {
        console.log('Fehler beim Löschen: ' + error.message);
      }
    }
  };

  // Kunde bearbeiten (mit Berechtigung)
  const handleEditCustomer = (customer) => {
    if (!canWrite) {
      console.log('Keine Berechtigung zum Bearbeiten von Kunden');
      return;
    }
    actions.editCustomer(customer);
  };

  // Neuer Kunde (mit Berechtigung)
  const handleAddCustomer = () => {
    if (!canWrite) {
      console.log('Keine Berechtigung zum Erstellen von Kunden');
      return;
    }
    actions.openModal('customer');
  };

  // Sortierung ändern
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Admin-Info für Support-User */}
      {user?.isSupport && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <Shield className="w-5 h-5 text-yellow-600 mr-2" />
            <span className="text-yellow-800 font-medium">
              Support-Modus: Sie sehen Kunden aller Unternehmen
            </span>
          </div>
        </div>
      )}

      {/* Header mit Statistiken */}
      <CustomerStats customers={customers} />
      
      {/* Hauptbereich */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <CustomerHeader 
          onAddCustomer={handleAddCustomer}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          customerCount={customers.length}
          filteredCount={filteredAndSortedCustomers.length}
          canWrite={canWrite} // 🔒 Berechtigung weitergeben
        />
        
        <div className="overflow-x-auto">
          {filteredAndSortedCustomers.length === 0 ? (
            <EmptyState
            searchTerm={searchTerm}
            actions={actions} />
          ) : (
            <CustomerTable 
              customers={filteredAndSortedCustomers}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              onEdit={handleEditCustomer}
              onDelete={handleDeleteCustomer}
              canWrite={canWrite} // 🔒 Berechtigung weitergeben
              canDelete={canDelete} // 🔒 Berechtigung weitergeben
            />
          )}
        </div>
      </div>
    </div>
  );
};

// Kunden-Statistiken
const CustomerStats = ({ customers }) => {
  const totalCustomers = customers.length;
  const totalInvoices = customers.reduce((sum, customer) => sum + (customer.invoiceCount || 0), 0);
  const activeCustomers = customers.filter(customer => (customer.invoiceCount || 0) > 0).length;
  const recentCustomers = customers.filter(customer => {
    const createdDate = new Date(customer.createdAt || 0);
    const monthAgo = new Date();
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    return createdDate > monthAgo;
  }).length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <StatCard title="Gesamt" value={totalCustomers} color="blue" />
      <StatCard title="Aktive Kunden" value={activeCustomers} color="green" />
      <StatCard title="Neue (30 Tage)" value={recentCustomers} color="yellow" />
      <StatCard title="Rechnungen gesamt" value={totalInvoices} color="purple" />
    </div>
  );
};

// Statistik-Karte
const StatCard = ({ title, value, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 text-blue-900',
    green: 'bg-green-50 text-green-600 text-green-900',
    yellow: 'bg-yellow-50 text-yellow-600 text-yellow-900',
    purple: 'bg-purple-50 text-purple-600 text-purple-900'
  };

  const [bg, iconColor, textColor] = colorClasses[color].split(' ');

  return (
    <div className={`${bg} p-4 rounded-lg border`}>
      <div className="text-center">
        <p className={`${iconColor} text-sm font-medium`}>{title}</p>
        <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
      </div>
    </div>
  );
};

// Header mit Suche und Add-Button (🔒 mit Berechtigungen)
const CustomerHeader = ({ 
  onAddCustomer, 
  searchTerm, 
  onSearchChange, 
  customerCount, 
  filteredCount,
  canWrite // 🔒 Neue Prop
}) => (
  <div className="px-6 py-4 border-b bg-gray-50">
    <div className="flex justify-between items-center">
      <div>
        <h3 className="text-lg font-semibold">Kundenverwaltung</h3>
        <p className="text-sm text-gray-600">
          {searchTerm 
            ? `${filteredCount} von ${customerCount} Kunden gefunden`
            : `${customerCount} Kunden gesamt`
          }
        </p>
      </div>
      
      <div className="flex items-center space-x-3">
        {/* Suchfeld */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Kunden suchen..."
            className="pl-9 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        {/* Kunde hinzufügen Button - 🔒 Nur wenn Berechtigung */}
        {canWrite && (
          <button
            onClick={onAddCustomer}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Kunde hinzufügen
          </button>
        )}
        
        {/* Info für User ohne Berechtigung */}
        {!canWrite && (
          <div className="flex items-center text-gray-500 text-sm">
            <Lock className="w-4 h-4 mr-1" />
            Nur Lesezugriff
          </div>
        )}
      </div>
    </div>
  </div>
);

// Kunden-Tabelle (🔒 mit Berechtigungen)
const CustomerTable = ({ 
  customers, 
  sortBy, 
  sortOrder, 
  onSort, 
  onEdit, 
  onDelete,
  canWrite, // 🔒 Neue Props
  canDelete 
}) => (
  <table className="min-w-full divide-y divide-gray-200">
    <thead className="bg-gray-50">
      <tr>
        <SortableHeader field="name" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
          Unternehmen
        </SortableHeader>
        <SortableHeader field="email" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
          E-Mail
        </SortableHeader>
        <SortableHeader field="contactPerson" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
          Ansprechpartner
        </SortableHeader>
        <SortableHeader field="phone" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort}>
          Telefon
        </SortableHeader>
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Status
        </th>
        {/* Aktionen-Spalte nur anzeigen wenn Berechtigungen vorhanden */}
        {(canWrite || canDelete) && (
          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
            Aktionen
          </th>
        )}
      </tr>
    </thead>
    <tbody className="bg-white divide-y divide-gray-200">
      {customers.map((customer) => (
        <CustomerRow 
          key={customer.id}
          customer={customer}
          onEdit={onEdit}
          onDelete={onDelete}
          canWrite={canWrite} // 🔒 Berechtigung weitergeben
          canDelete={canDelete} // 🔒 Berechtigung weitergeben
        />
      ))}
    </tbody>
  </table>
);

// Sortierbare Spalten-Header
const SortableHeader = ({ field, sortBy, sortOrder, onSort, children }) => {
  const isActive = sortBy === field;
  
  return (
    <th 
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center">
        {children}
        {isActive && (
          <span className="ml-1">
            {sortOrder === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </th>
  );
};

// Kunden-Zeile (🔒 mit Berechtigungen)
const CustomerRow = ({ customer, onEdit, onDelete, canWrite, canDelete }) => (
  <tr className="hover:bg-gray-50 transition-colors">
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="flex items-center">
        <div className="flex-shrink-0 h-8 w-8">
          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
            <Building className="h-4 w-4 text-blue-600" />
          </div>
        </div>
        <div className="ml-3">
          <div className="text-sm font-medium text-gray-900">{customer.name}</div>
          {customer.taxId && (
            <div className="text-xs text-gray-500">USt-IdNr: {customer.taxId}</div>
          )}
        </div>
      </div>
    </td>
    
    <td className="px-6 py-4 whitespace-nowrap">
      <div className="flex items-center">
        <Mail className="h-4 w-4 text-gray-400 mr-2" />
        <a 
          href={`mailto:${customer.email}`}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          {customer.email}
        </a>
      </div>
    </td>
    
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
      {customer.contactPerson || '-'}
    </td>
    
    <td className="px-6 py-4 whitespace-nowrap">
      {customer.phone ? (
        <div className="flex items-center">
          <Phone className="h-4 w-4 text-gray-400 mr-2" />
          <a 
            href={`tel:${customer.phone}`}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {customer.phone}
          </a>
        </div>
      ) : (
        <span className="text-sm text-gray-500">-</span>
      )}
    </td>
    
    <td className="px-6 py-4 whitespace-nowrap">
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        (customer.invoiceCount || 0) > 0 
          ? 'bg-green-100 text-green-800'
          : 'bg-gray-100 text-gray-800'
      }`}>
        {(customer.invoiceCount || 0) > 0 ? 'Aktiv' : 'Neu'}
      </span>
    </td>
    
    {/* Aktionen nur anzeigen wenn Berechtigungen vorhanden */}
    {(canWrite || canDelete) && (
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <div className="flex items-center justify-end space-x-2">
          {canWrite && (
            <button
              onClick={() => onEdit(customer)}
              className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
              title="Kunde bearbeiten"
            >
              <Edit className="w-4 h-4" />
            </button>
          )}
          
          {canDelete && (
            <button
              onClick={() => onDelete(customer)}
              className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
              title="Kunde löschen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    )}
  </tr>
);

// Empty State
const EmptyState = ({ searchTerm, actions }) => (
  <div className="text-center py-12">
    <Users className="mx-auto h-12 w-12 text-gray-400" />
    <h3 className="mt-2 text-sm font-medium text-gray-900">
      {searchTerm ? 'Keine Kunden gefunden' : 'Noch keine Kunden'}
    </h3>
    <p className="mt-1 text-sm text-gray-500">
      {searchTerm 
        ? `Keine Kunden entsprechen dem Suchbegriff "${searchTerm}"`
        : 'Erstellen Sie Ihren ersten Kunden, um zu beginnen.'
      }
    </p>
    
    {/* Kunde hinzufügen Button nur mit Berechtigung */}
    {!searchTerm && authService.hasPermission('customers:write') && (
      <div className="mt-6">
        <button
          onClick={() => actions.openModal('customer')}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center mx-auto text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Ersten Kunden erstellen
        </button>
      </div>
    )}
  </div>
);

export default CustomerManagement;