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
    externalBusinessPartnerNumber: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
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
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.name ? 'border-red-300' : 'border-gray-300'
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
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.primaryEmail ? 'border-red-300' : 'border-gray-300'
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
              
              {/* Externe BP Nummer */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Externe Business Partner Nummer (optional)
                </label>
                <input
                  type="text"
                  value={formData.externalBusinessPartnerNumber}
                  onChange={(e) => handleInputChange('externalBusinessPartnerNumber', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Externe ID aus anderem System"
                />
              </div>
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