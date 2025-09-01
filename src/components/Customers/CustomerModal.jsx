// src/components/Customers/CustomerModal.jsx
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const CustomerModal = () => {
  const { state, actions } = useApp();
  const { modals, editingCustomer } = state;
  const isOpen = modals.customer;
  const isEditing = Boolean(editingCustomer);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    address: '',
    taxId: '',
    contactPerson: '',
    phone: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form mit Daten füllen wenn bearbeitet wird
  useEffect(() => {
    if (editingCustomer) {
      setFormData(editingCustomer);
    } else {
      setFormData({
        name: '',
        email: '',
        address: '',
        taxId: '',
        contactPerson: '',
        phone: ''
      });
    }
    setErrors({});
  }, [editingCustomer, isOpen]);

  // Modal schließen
  const handleClose = () => {
    actions.closeModal('customer');
    actions.editCustomer(null);
    setFormData({
      name: '',
      email: '',
      address: '',
      taxId: '',
      contactPerson: '',
      phone: ''
    });
    setErrors({});
  };

  // Form Validierung
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Firmenname ist erforderlich';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'E-Mail ist erforderlich';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Ungültige E-Mail-Adresse';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      await actions.saveCustomer(formData, isEditing);
      handleClose();
      
      // Erfolgreiche Benachrichtigung
      const message = isEditing ? 'Kunde erfolgreich aktualisiert!' : 'Kunde erfolgreich erstellt!';
      console.log(message);
      
    } catch (error) {
      console.log('Fehler beim Speichern: ' + error.message);
      console.error('Customer save error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Input Change Handler
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Fehler für dieses Feld löschen wenn User tippt
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
            <h2 className="text-xl font-bold">
              {isEditing ? 'Kunde bearbeiten' : 'Neuer Kunde'}
            </h2>
            <button 
              onClick={handleClose}
              disabled={isSubmitting}
              className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Firmenname */}
              <FormField
                label="Firmenname *"
                type="text"
                value={formData.name}
                onChange={(value) => handleInputChange('name', value)}
                error={errors.name}
                required
                placeholder="z.B. Muster GmbH"
              />
              
              {/* E-Mail */}
              <FormField
                label="E-Mail *"
                type="email"
                value={formData.email}
                onChange={(value) => handleInputChange('email', value)}
                error={errors.email}
                required
                placeholder="info@firma.de"
              />
              
              {/* Ansprechpartner */}
              <FormField
                label="Ansprechpartner"
                type="text"
                value={formData.contactPerson}
                onChange={(value) => handleInputChange('contactPerson', value)}
                placeholder="Max Mustermann"
              />
              
              {/* Telefon */}
              <FormField
                label="Telefon"
                type="tel"
                value={formData.phone}
                onChange={(value) => handleInputChange('phone', value)}
                placeholder="+49 123 456789"
              />
            </div>
            
            {/* Adresse */}
            <FormField
              label="Adresse"
              type="textarea"
              value={formData.address}
              onChange={(value) => handleInputChange('address', value)}
              placeholder="Musterstraße 1&#10;12345 Musterstadt"
              rows={3}
            />
            
            {/* Steuernummer */}
            <FormField
              label="Steuernummer / USt-IdNr."
              type="text"
              value={formData.taxId}
              onChange={(value) => handleInputChange('taxId', value)}
              placeholder="DE123456789"
            />
            
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
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              >
                {isSubmitting && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isSubmitting 
                  ? (isEditing ? 'Aktualisiere...' : 'Erstelle...') 
                  : (isEditing ? 'Aktualisieren' : 'Erstellen')
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// Form Field Komponente
const FormField = ({ 
  label, 
  type, 
  value, 
  onChange, 
  error, 
  required = false, 
  placeholder = '', 
  rows = 3 
}) => {
  const baseClasses = "w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";
  const errorClasses = error ? "border-red-300" : "border-gray-300";
  const inputClasses = `${baseClasses} ${errorClasses}`;

  return (
    <div className={type === 'textarea' ? 'md:col-span-2' : ''}>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      
      {type === 'textarea' ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={rows}
          placeholder={placeholder}
          className={inputClasses}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          placeholder={placeholder}
          className={inputClasses}
        />
      )}
      
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default CustomerModal;