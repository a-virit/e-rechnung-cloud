// src/components/BusinessPartners/BusinessPartnerModal.jsx
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const BusinessPartnerModal = () => {
  const { state, actions } = useApp();
  const { modals } = state;
  const isOpen = modals.businessPartner;

  const [formData, setFormData] = useState({
    name: '',
    primaryEmail: '',
    primaryPhone: '',
    externalBusinessPartnerNumber: '',
    selectedRoles: ['CUSTOMER'] // Standard: Kunde-Rolle
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State für die Dropdown-Anzeige erweitern:
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [roleSearchTerm, setRoleSearchTerm] = useState('');

  // Nach dem useState hinzufügen:
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showRoleDropdown && !event.target.closest('.relative')) {
        setShowRoleDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showRoleDropdown]);

  // Verfügbare Rollen definieren:
  const availableRoles = [
    { code: 'CUSTOMER', label: 'Kunde' },
    { code: 'SUPPLIER', label: 'Lieferant' },
    { code: 'BILLING', label: 'Rechnungsempfänger' },
    { code: 'DELIVERY', label: 'Lieferadresse' },
    { code: 'PARTNER', label: 'Geschäftspartner' },
    { code: 'CONTRACTOR', label: 'Auftragnehmer' }
  ];

  const filteredRoles = availableRoles.filter(role =>
    role.label.toLowerCase().includes(roleSearchTerm.toLowerCase()) ||
    role.code.toLowerCase().includes(roleSearchTerm.toLowerCase())
  );

  // Rollen-Handler:
  const toggleRole = (roleCode) => {
    const newRoles = formData.selectedRoles.includes(roleCode)
      ? formData.selectedRoles.filter(r => r !== roleCode)
      : [...formData.selectedRoles, roleCode];
    handleInputChange('selectedRoles', newRoles);
  };

  const getSelectedRoleLabels = () => {
    return formData.selectedRoles.map(roleCode =>
      availableRoles.find(r => r.code === roleCode)?.label || roleCode
    );
  };

  // Modal schließen
  const handleClose = () => {
    actions.closeModal('businessPartner');
    setFormData({
      name: '',
      primaryEmail: '',
      primaryPhone: '',
      externalBusinessPartnerNumber: ''
    });
    setErrors({});
  };

  // Form Validierung
  const validateForm = () => {
    const newErrors = {};

    if (!formData.selectedRoles || formData.selectedRoles.length === 0) {
      newErrors.selectedRoles = 'Mindestens eine Partner-Rolle muss ausgewählt werden';
    }

    if (!formData.name.trim()) {
      newErrors.name = 'Business Partner Name ist erforderlich';
    }

    if (!formData.primaryEmail.trim()) {
      newErrors.primaryEmail = 'Primäre E-Mail ist erforderlich';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.primaryEmail)) {
      newErrors.primaryEmail = 'Ungültige E-Mail-Adresse';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      const result = await actions.saveBusinessPartner(formData, false);

      if (result && result.success !== false) {
        handleClose();
        console.log('Business Partner erfolgreich erstellt!');
      } else {
        const errorMessage = result?.error || 'Fehler beim Speichern';
        alert('Fehler: ' + errorMessage);
      }

    } catch (error) {
      console.error('Business Partner save error:', error);
      alert('Fehler beim Speichern: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-visible">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Neuer Business Partner</h2>
            <button onClick={handleClose} disabled={isSubmitting}>
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Business Partner Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder="z.B. Muster GmbH"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              {/* Primäre E-Mail */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primäre E-Mail *
                </label>
                <input
                  type="email"
                  value={formData.primaryEmail}
                  onChange={(e) => handleInputChange('primaryEmail', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.primaryEmail ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder="info@firma.de"
                />
                {errors.primaryEmail && <p className="mt-1 text-sm text-red-600">{errors.primaryEmail}</p>}
              </div>

              {/* Primäre Telefonnummer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primäre Telefonnummer
                </label>
                <input
                  type="tel"
                  value={formData.primaryPhone}
                  onChange={(e) => handleInputChange('primaryPhone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+49 123 456789"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              {/* Multi-Select Rollen-Dropdown */}
              <div className="md:col-span-2 relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Partner-Rollen *
                </label>

                {/* Selected Roles Display */}
                <div
                  onClick={() => setShowRoleDropdown(!showRoleDropdown)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white cursor-pointer focus-within:ring-2 focus-within:ring-blue-500 min-h-[40px] flex items-center justify-between"
                >
                  <div className="flex flex-wrap gap-1">
                    {formData.selectedRoles.length > 0 ? (
                      getSelectedRoleLabels().map((label, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded-sm text-xs font-medium">
                          {label}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-400">Rollen auswählen...</span>
                    )}
                  </div>
                  <svg className={`w-4 h-4 transition-transform ${showRoleDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>

                {/* Dropdown */}
                {showRoleDropdown && (
                  <div className="absolute z-60 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                    {/* Search Input */}
                    <div className="p-2 border-b border-gray-200">
                      <input
                        type="text"
                        placeholder="Rollen suchen..."
                        value={roleSearchTerm}
                        onChange={(e) => setRoleSearchTerm(e.target.value)}
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                    </div>

                    {/* Rolle Options */}
                    <div className="max-h-40 overflow-y-auto">
                      {filteredRoles.map(role => (
                        <div
                          key={role.code}
                          onClick={() => toggleRole(role.code)}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                        >
                          <input
                            type="checkbox"
                            checked={formData.selectedRoles.includes(role.code)}
                            onChange={() => { }} // Handled by onClick
                            className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-sm">{role.label}</span>
                          <span className="text-xs text-gray-400 ml-auto">({role.code})</span>
                        </div>
                      ))}

                      {filteredRoles.length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          Keine Rollen gefunden für "{roleSearchTerm}"
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {errors.selectedRoles && <p className="mt-1 text-sm text-red-600">{errors.selectedRoles}</p>}
              </div>

              <p className="text-xs text-gray-500 mt-1">
                Mindestens eine Rolle muss ausgewählt werden.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                {isSubmitting ? 'Erstelle...' : 'Erstellen'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BusinessPartnerModal;