// src/components/Customers/CustomerManagement.jsx
import React, { useState } from 'react';
import { Users, Plus, Edit, Trash2, Search, Mail, Phone, Building } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const CustomerManagement = () => {
  const { state, actions } = useApp();
  const { customers } = state;
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

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

  // Kunde löschen
  const handleDeleteCustomer = async (customer) => {
    if (window.confirm(`Kunde "${customer.name}" wirklich löschen?`)) {
      try {
        await actions.deleteCustomer(customer.id);
        alert('Kunde erfolgreich gelöscht!');
      } catch (error) {
        alert('Fehler beim Löschen: ' + error.message);
      }
    }
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
      {/* Header mit Statistiken */}
      <CustomerStats customers={customers} />
      
      {/* Hauptbereich */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <CustomerHeader 
          onAddCustomer={() => actions.openModal('customer')}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          customerCount={customers.length}
          filteredCount={filteredAndSortedCustomers.length}
        />
        
        <div className="overflow-x-auto">
          {filteredAndSortedCustomers.length === 0 ? (
            <EmptyState searchTerm={searchTerm} />
          ) : (
            <CustomerTable 
              customers={filteredAndSortedCustomers}
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={handleSort}
              onEdit={actions.editCustomer}
              onDelete={handleDeleteCustomer}
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

// Header mit Suche und Add-Button
const CustomerHeader = ({ 
  onAddCustomer, 
  searchTerm, 
  onSearchChange, 
  customerCount, 
  filteredCount 
}) => (
  <div className="px-6 py-4 border-b bg-gray-50">
    <div className="flex justify-between items-center">
      <div>
        <h3 className="text-lg font-semibold">Kundenverwaltung</h3>
        <p className="text-sm text-gray-600">
          {searchTerm ? `${filteredCount} von ${customerCount} Kunden` : `${customerCount} Kunden insgesamt`}
        </p>
      </div>
      
      <div className="flex items-center space-x-4">
        {/* Suchfeld */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Kunden suchen..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
          />
        </div>
        
        {/* Neuer Kunde Button */}
        <button 
          onClick={onAddCustomer}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Neuer Kunde
        </button>
      </div>
    </div>
  </div>
);

// Empty State
const EmptyState = ({ searchTerm }) => (
  <div className="p-8 text-center">
    <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
    {searchTerm ? (
      <>
        <p className="text-gray-500">Keine Kunden für "{searchTerm}" gefunden</p>
        <p className="text-sm text-gray-400 mt-1">Versuche einen anderen Suchbegriff</p>
      </>
    ) : (
      <>
        <p className="text-gray-500">Noch keine Kunden vorhanden</p>
        <p className="text-sm text-gray-400 mt-1">Füge deinen ersten Kunden hinzu</p>
      </>
    )}
  </div>
);

// Kunden-Tabelle
const CustomerTable = ({ customers, sortBy, sortOrder, onSort, onEdit, onDelete }) => (
  <table className="w-full">
    <thead className="bg-gray-50">
      <tr>
        <SortableHeader
          field="name"
          label="Name"
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={onSort}
        />
        <SortableHeader
          field="email"
          label="E-Mail"
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={onSort}
        />
        <SortableHeader
          field="contactPerson"
          label="Ansprechpartner"
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={onSort}
        />
        <SortableHeader
          field="phone"
          label="Telefon"
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={onSort}
        />
        <SortableHeader
          field="invoiceCount"
          label="Rechnungen"
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={onSort}
        />
        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
          Aktionen
        </th>
      </tr>
    </thead>
    <tbody className="bg-white divide-y divide-gray-200">
      {customers.map((customer) => (
        <CustomerRow
          key={customer.id}
          customer={customer}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </tbody>
  </table>
);

// Sortierbare Tabellen-Header
const SortableHeader = ({ field, label, sortBy, sortOrder, onSort }) => {
  const isActive = sortBy === field;
  
  return (
    <th 
      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center space-x-1">
        <span>{label}</span>
        {isActive && (
          <span className="text-blue-600">
            {sortOrder === 'asc' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </th>
  );
};

// Kunden-Zeile
const CustomerRow = ({ customer, onEdit, onDelete }) => (
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
        {customer.invoiceCount || 0}
      </span>
    </td>
    
    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
      <div className="flex space-x-2">
        <ActionButton
          onClick={() => onEdit(customer)}
          title="Bearbeiten"
          color="blue"
        >
          <Edit className="w-4 h-4" />
        </ActionButton>
        
        <ActionButton
          onClick={() => onDelete(customer)}
          title="Löschen"
          color="red"
        >
          <Trash2 className="w-4 h-4" />
        </ActionButton>
      </div>
    </td>
  </tr>
);

// Action Button Komponente
const ActionButton = ({ onClick, title, color, children }) => {
  const colorClasses = {
    blue: 'text-blue-600 hover:text-blue-900',
    red: 'text-red-600 hover:text-red-900',
    green: 'text-green-600 hover:text-green-900'
  };

  return (
    <button 
      onClick={onClick}
      className={`${colorClasses[color]} transition-colors`}
      title={title}
    >
      {children}
    </button>
  );
};

export default CustomerManagement;