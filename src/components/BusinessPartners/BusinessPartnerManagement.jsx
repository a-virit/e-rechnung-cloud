// src/components/BusinessPartners/BusinessPartnerManagement.jsx
import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, Edit3, Trash2, Eye, MoreHorizontal } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const BusinessPartnerManagement = () => {
  const { state, actions } = useApp();
  const { businessPartners, loading } = state;

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('ALL');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  // Role mapping für Display
  const roleMapping = {
    'CUSTOMER': 'Kunde',
    'SUPPLIER': 'Lieferant',
    'BILLING': 'Rechnungsempfänger',
    'DELIVERY': 'Lieferadresse',
    'PARTNER': 'Geschäftspartner',
    'CONTRACTOR': 'Auftragnehmer'
  };

  // Filtered and sorted business partners
  const filteredAndSortedPartners = useMemo(() => {
    let filtered = businessPartners;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(bp =>
        bp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bp.primaryEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bp.businessPartnerNumber.includes(searchTerm) ||
        (bp.externalBusinessPartnerNumber && bp.externalBusinessPartnerNumber.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Role filter
    if (selectedRoleFilter !== 'ALL') {
      filtered = filtered.filter(bp =>
        bp.roles && bp.roles.some(role => role.roleCode === selectedRoleFilter)
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';

      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    return filtered;
  }, [businessPartners, searchTerm, selectedRoleFilter, sortField, sortDirection]);

  // Get unique roles for filter dropdown
  const availableRoles = useMemo(() => {
    const roles = new Set();
    businessPartners.forEach(bp => {
      if (bp.roles) {
        bp.roles.forEach(role => roles.add(role.roleCode));
      }
    });
    return Array.from(roles);
  }, [businessPartners]);

  // Sort handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Get role badges for a business partner
  const getRoleBadges = (roles) => {
    if (!roles || roles.length === 0) return null;
    
    return roles.map((role, index) => (
      <span
        key={index}
        className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full mr-1 mb-1"
      >
        {roleMapping[role.roleCode] || role.roleCode}
      </span>
    ));
  };

  // Actions
  const handleEdit = (partner) => {
    actions.editBusinessPartner(partner);
  };

  const handleDelete = (partner) => {
    console.log('Delete partner:', partner);
    // TODO: Implement delete functionality
  };

  const handleView = (partner) => {
    console.log('View partner details:', partner);
    // TODO: Implement view functionality
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Business Partner werden geladen...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Business Partner</h2>
          <p className="text-gray-600 mt-1">Verwalten Sie Ihre Geschäftspartner, Kunden und Lieferanten</p>
        </div>
        <button
          onClick={() => actions.openModal('businessPartner')}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          Neuer Business Partner
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white p-4 rounded-lg border space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Suchen nach Name, E-Mail oder Partner-Nummer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Role Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white min-w-[200px]"
            >
              <option value="ALL">Alle Rollen</option>
              {availableRoles.map(role => (
                <option key={role} value={role}>
                  {roleMapping[role] || role}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex justify-between items-center text-sm text-gray-600">
          <span>
            {filteredAndSortedPartners.length} von {businessPartners.length} Business Partner
          </span>
          {(searchTerm || selectedRoleFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedRoleFilter('ALL');
              }}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Filter zurücksetzen
            </button>
          )}
        </div>
      </div>

      {/* Business Partner Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        {filteredAndSortedPartners.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 mb-4">
              <Plus className="w-16 h-16 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || selectedRoleFilter !== 'ALL' 
                ? 'Keine Business Partner gefunden'
                : 'Noch keine Business Partner erstellt'
              }
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || selectedRoleFilter !== 'ALL'
                ? 'Versuchen Sie andere Suchkriterien oder entfernen Sie Filter.'
                : 'Erstellen Sie Ihren ersten Business Partner, um zu beginnen.'
              }
            </p>
            {!(searchTerm || selectedRoleFilter !== 'ALL') && (
              <button
                onClick={() => actions.openModal('businessPartner')}
                className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                Business Partner erstellen
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center">
                      Name
                      {sortField === 'name' && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('businessPartnerNumber')}
                  >
                    <div className="flex items-center">
                      Partner-Nr.
                      {sortField === 'businessPartnerNumber' && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('primaryEmail')}
                  >
                    <div className="flex items-center">
                      E-Mail
                      {sortField === 'primaryEmail' && (
                        <span className="ml-1">
                          {sortDirection === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rollen
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="relative px-6 py-3">
                    <span className="sr-only">Aktionen</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAndSortedPartners.map((partner) => (
                  <tr key={partner.businessPartnerNumber} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                            <span className="text-sm font-medium text-white">
                              {partner.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {partner.name}
                          </div>
                          {partner.externalBusinessPartnerNumber && (
                            <div className="text-sm text-gray-500">
                              Ext: {partner.externalBusinessPartnerNumber}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {partner.businessPartnerNumber}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{partner.primaryEmail}</div>
                      {partner.primaryPhone && (
                        <div className="text-sm text-gray-500">{partner.primaryPhone}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap">
                        {getRoleBadges(partner.roles)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        partner.status === 'ACTIVE' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {partner.status === 'ACTIVE' ? 'Aktiv' : 'Inaktiv'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleView(partner)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                          title="Details anzeigen"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(partner)}
                          className="text-indigo-600 hover:text-indigo-900 p-1 rounded hover:bg-indigo-50"
                          title="Bearbeiten"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(partner)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                          title="Löschen"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessPartnerManagement;