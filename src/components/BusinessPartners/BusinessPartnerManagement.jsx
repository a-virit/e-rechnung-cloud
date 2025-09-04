// src/components/BusinessPartners/BusinessPartnerList.jsx
import React from 'react';
import { Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const BusinessPartnerList = () => {
  const { state, actions } = useApp();
  const { businessPartners } = state;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Business Partner</h2>
        <button
          onClick={() => actions.openModal('businessPartner')}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Neuer Business Partner
        </button>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">Business Partner Liste</h3>
        {businessPartners.length === 0 ? (
          <p className="text-gray-500">Noch keine Business Partner erstellt.</p>
        ) : (
          <div className="space-y-2">
            {businessPartners.map(bp => (
              <div key={bp.businessPartnerNumber} className="p-3 bg-gray-50 rounded">
                <div className="font-medium">{bp.name}</div>
                <div className="text-sm text-gray-600">Nr: {bp.businessPartnerNumber}</div>
                <div className="text-sm text-gray-600">{bp.primaryEmail}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessPartnerManagement;