// src/components/Invoices/InvoiceModal.jsx - KORRIGIERT
import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Calculator } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { validateInvoice, validateInvoiceItem } from '../../utils/validation';
import { formatCurrency } from '../../utils/formatters';

// Format-Informationen helper - AUSGELAGERT
function getFormatInfo(format) {
  const formatDetails = {
    'XRechnung': {
      title: 'XRechnung - Standard für Deutschland',
      details: 'Strukturierte E-Rechnung nach EN16931. Verpflichtend für B2B-Rechnungen an öffentliche Auftraggeber seit 2020.'
    },
    'ZUGFeRD': {
      title: 'ZUGFeRD - Hybridformat',
      details: 'Kombiniert PDF für Menschen mit XML für Maschinen. Ideal für B2B-Kommunikation mit verschiedenen Systemen.'
    },
    'Both': {
      title: 'Maximale Kompatibilität',
      details: 'Beide Formate werden generiert und als separate Anhänge versendet. Empfänger kann gewünschtes Format wählen.'
    }
  };

  return formatDetails[format] || formatDetails['XRechnung'];
}

// Format-Auswahl-Sektion - KOMPAKTE horizontale Version
const FormatSelectionSection = ({ formData, setFormData }) => {
  const formatOptions = [
    {
      value: 'XRechnung',
      label: 'XRechnung 3.0', 
      description: 'Standard für Deutschland',
      icon: '🇩🇪',
      recommended: true
    },
    {
      value: 'ZUGFeRD',
      label: 'ZUGFeRD 2.2',
      description: 'Hybridformat',
      icon: '📄',
      recommended: false
    },
    {
      value: 'Both',
      label: 'Beide Formate',
      description: 'XRechnung + ZUGFeRD',
      icon: '📊',
      recommended: false
    }
  ];

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        E-Rechnungsformat auswählen
      </label>
      
      {/* Horizontale Format-Cards */}
      <div className="grid grid-cols-3 gap-3">
        {formatOptions.map((option) => (
          <div
            key={option.value}
            className={`relative rounded-lg border-2 cursor-pointer transition-all ${
              formData.format === option.value
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
            onClick={() => setFormData(prev => ({ ...prev, format: option.value }))}
          >
            <div className="p-3 text-center">
              <div className="flex items-center justify-center mb-2">
                <span className="text-2xl">{option.icon}</span>
                {option.recommended && (
                  <span className="absolute -top-2 -right-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Empfohlen
                  </span>
                )}
              </div>
              <div className="text-sm font-medium text-gray-900 mb-1">
                {option.label}
              </div>
              <p className="text-xs text-gray-600 mb-2">{option.description}</p>
              
              <input
                type="radio"
                name="format"
                value={option.value}
                checked={formData.format === option.value}
                onChange={(e) => setFormData(prev => ({ ...prev, format: e.target.value }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Kompakte Format-Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <div className="flex items-center">
          <svg className="h-4 w-4 text-blue-400 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <div>
            <span className="text-sm font-medium text-blue-800">
              {getFormatInfo(formData.format).title}
            </span>
            <span className="text-sm text-blue-700 ml-2">
              - {getFormatInfo(formData.format).details}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const InvoiceModal = () => {
  const { state, actions } = useApp();
  const { modals, customers, businessPartners, config, editingInvoice } = state;
  const isOpen = modals.invoice;
  const isEditing = Boolean(editingInvoice);

  const [formData, setFormData] = useState({
    customerId: '',
    items: [{ description: '', quantity: 1, price: 0 }],
    format: 'XRechnung',
    notes: '',
    dueDate: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentAddressIndex, setCurrentAddressIndex] = useState(0);

  // Gefilterte Business Partner für Kunden-Auswahl
  const availableCustomers = useMemo(() => {
    return businessPartners
      .filter(bp => bp.status === 'ACTIVE')
      .filter(bp => bp.roles && bp.roles.some(role => role.roleCode === 'CUSTOMER'))
      .map(bp => ({
        id: bp.businessPartnerNumber,
        name: bp.name,
        email: bp.primaryEmail,
        roles: bp.roles,
        addresses: bp.roles.reduce((acc, role) => {
          acc[role.roleCode] = role.address;
          return acc;
        }, {})
      }));
  }, [businessPartners]);

  useEffect(() => {
    setCurrentAddressIndex(0);
  }, [formData.customerId]);

  // Form initialisieren
  useEffect(() => {
    if (editingInvoice) {
      setFormData({
        customerId: editingInvoice.customerId || '',
        items: editingInvoice.items || [{ description: '', quantity: 1, price: 0 }],
        format: editingInvoice.format || 'XRechnung',
        notes: editingInvoice.notes || '',
        dueDate: editingInvoice.dueDate || calculateDefaultDueDate()
      });
    } else {
      setFormData({
        customerId: '',
        items: [{ description: '', quantity: 1, price: 0 }],
        format: 'XRechnung',
        notes: '',
        dueDate: calculateDefaultDueDate()
      });
    }
    setErrors({});
  }, [editingInvoice, isOpen, config]);

  // Standard-Fälligkeitsdatum berechnen
  const calculateDefaultDueDate = () => {
    const paymentTerms = config.invoice?.paymentTerms || 30;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + paymentTerms);
    return dueDate.toISOString().split('T')[0];
  };

  // Modal schließen
  const handleClose = () => {
    actions.closeModal('invoice');
    setFormData({
      customerId: '',
      items: [{ description: '', quantity: 1, price: 0 }],
      format: 'XRechnung',
      notes: '',
      dueDate: calculateDefaultDueDate()
    });
    setErrors({});
  };

  // Item-Management
  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { description: '', quantity: 1, price: 0 }]
    }));
  };

  const removeItem = (index) => {
    if (formData.items.length <= 1) return;

    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));

    const newErrors = { ...errors };
    delete newErrors[`item_${index}`];
    setErrors(newErrors);
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };

    setFormData(prev => ({ ...prev, items: newItems }));

    if (errors[`item_${index}`]) {
      const newErrors = { ...errors };
      delete newErrors[`item_${index}`][field];
      if (Object.keys(newErrors[`item_${index}`]).length === 0) {
        delete newErrors[`item_${index}`];
      }
      setErrors(newErrors);
    }
  };

  // Berechnungen
  const calculations = React.useMemo(() => {
    const subtotal = formData.items.reduce((sum, item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.price) || 0;
      return sum + (quantity * price);
    }, 0);

    const taxRate = config.invoice?.taxRate || 19;
    const taxAmount = subtotal * (taxRate / 100);
    const total = subtotal + taxAmount;

    return {
      subtotal: Math.round(subtotal * 100) / 100,
      taxRate,
      taxAmount: Math.round(taxAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
      currency: config.invoice?.currency || 'EUR'
    };
  }, [formData.items, config]);

  // Validierung
  const validateForm = () => {
    const validation = validateInvoice(formData);
    setErrors(validation.errors);
    return validation.isValid;
  };

  // Form Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const selectedBP = availableCustomers.find(bp => bp.id === formData.customerId);
      const availableAddressRoles = selectedBP?.roles?.filter(role =>
        ['CUSTOMER', 'BILLING', 'DELIVERY'].includes(role.roleCode) &&
        role.address?.city
      ) || [];

      const selectedRole = availableAddressRoles[currentAddressIndex]?.roleCode || 'CUSTOMER';

      const invoiceData = {
        ...formData,
        selectedAddressRole: selectedRole,
        ...calculations,
        date: new Date().toISOString().split('T')[0]
      };

      const result = await actions.createInvoice(invoiceData);

      if (result.success) {
        handleClose();
        actions.showSuccess('Rechnung erfolgreich erstellt!');
      } else {
        actions.showError('Fehler beim Erstellen: ' + result.error);
      }
    } catch (error) {
      actions.showError('Fehler beim Erstellen: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-5xl w-full max-h-[95vh] overflow-y-auto">
        <div className="p-6">
          <InvoiceModalHeader
            isEditing={isEditing}
            onClose={handleClose}
            isSubmitting={isSubmitting}
          />

          <form onSubmit={handleSubmit} className="space-y-6">
            <BasicInfoSection
              formData={formData}
              setFormData={setFormData}
              availableCustomers={availableCustomers}
              errors={errors}
              actions={actions}
              currentAddressIndex={currentAddressIndex}
              setCurrentAddressIndex={setCurrentAddressIndex}
            />

            <InvoiceItemsSection
              items={formData.items}
              onAddItem={addItem}
              onRemoveItem={removeItem}
              onUpdateItem={updateItem}
              errors={errors}
              calculations={calculations}
            />

            <CalculationSummary calculations={calculations} />

            <NotesSection
              notes={formData.notes}
              onChange={(notes) => setFormData(prev => ({ ...prev, notes }))}
              error={errors.notes}
            />

            <FormButtons
              onCancel={handleClose}
              isSubmitting={isSubmitting}
              isEditing={isEditing}
            />
          </form>
        </div>
      </div>
    </div>
  );
};

// Header Komponente
const InvoiceModalHeader = ({ isEditing, onClose, isSubmitting }) => (
  <div className="flex justify-between items-center mb-6">
    <div>
      <h2 className="text-xl font-bold">
        {isEditing ? 'Rechnung bearbeiten' : 'Neue Rechnung erstellen'}
      </h2>
      <p className="text-sm text-gray-600 mt-1">
        Erstelle eine professionelle E-Rechnung im gewünschten Format
      </p>
    </div>
    <button
      onClick={onClose}
      disabled={isSubmitting}
      className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
    >
      <X className="w-6 h-6" />
    </button>
  </div>
);

// KORRIGIERTE Basis-Informationen Sektion
const BasicInfoSection = ({ formData, setFormData, availableCustomers, errors, actions, currentAddressIndex, setCurrentAddressIndex }) => (
  <div className="space-y-4">
    {/* Erste Zeile: Business Partner Auswahl */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Business Partner (Kunde) auswählen *
        </label>
        <select
          value={formData.customerId}
          onChange={(e) => setFormData(prev => ({ ...prev, customerId: e.target.value }))}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors.customerId ? 'border-red-300' : 'border-gray-300'
          }`}
          required
        >
          <option value="">Business Partner wählen...</option>
          {availableCustomers.map(customer => (
            <option key={customer.id} value={customer.id}>
              {customer.name} ({customer.email})
            </option>
          ))}
        </select>
        {errors.customerId && (
          <p className="mt-1 text-sm text-red-600">{errors.customerId}</p>
        )}
        {availableCustomers.length === 0 && (
          <p className="mt-1 text-sm text-amber-600">
            Keine aktiven Business Partner mit Kunden-Rolle gefunden.
            <button
              type="button"
              onClick={() => actions.openModal('businessPartner')}
              className="ml-1 text-blue-600 hover:text-blue-800 underline"
            >
              Jetzt erstellen
            </button>
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Fälligkeitsdatum
        </label>
        <input
          type="date"
          value={formData.dueDate}
          onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
    </div>

    {/* Zweite Zeile: Format-Auswahl */}
    <div className="p-4 bg-gray-50 rounded-lg">
      <FormatSelectionSection
        formData={formData}
        setFormData={setFormData}
      />
    </div>

    {/* Dritte Zeile: Adress-Auswahl */}
    {formData.customerId && (() => {
      const selectedBP = availableCustomers.find(bp => bp.id === formData.customerId);
      const availableAddresses = selectedBP?.roles?.filter(role =>
        ['CUSTOMER', 'BILLING', 'DELIVERY'].includes(role.roleCode) &&
        role.address?.city
      ) || [];

      if (availableAddresses.length === 0) {
        return (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Rechnungsadresse</h4>
            <p className="text-sm text-amber-700">
              Keine vollständige Adresse hinterlegt.
              <button
                type="button"
                onClick={() => actions.editBusinessPartner(selectedBP)}
                className="ml-1 text-blue-600 hover:text-blue-800 underline"
              >
                Adresse ergänzen
              </button>
            </p>
          </div>
        );
      }

      const currentRole = availableAddresses[currentAddressIndex];
      const currentAddress = currentRole.address;
      const displayEmail = currentAddress.email || selectedBP.email;

      const roleLabels = {
        'CUSTOMER': 'Kundenadresse',
        'BILLING': 'Rechnungsadresse',
        'DELIVERY': 'Lieferadresse'
      };

      return (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex justify-between items-center mb-2">
            <h4 className="text-sm font-medium text-blue-900">Rechnungsadresse</h4>

            {availableAddresses.length > 1 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-blue-800">
                  {roleLabels[currentRole.roleCode]}
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    type="button"
                    onClick={() => setCurrentAddressIndex(Math.max(0, currentAddressIndex - 1))}
                    disabled={currentAddressIndex === 0}
                    className="p-1 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Vorherige Adresse"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-xs text-blue-600">
                    {currentAddressIndex + 1} / {availableAddresses.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentAddressIndex(Math.min(availableAddresses.length - 1, currentAddressIndex + 1))}
                    disabled={currentAddressIndex >= availableAddresses.length - 1}
                    className="p-1 rounded hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Nächste Adresse"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="text-sm text-gray-700">
            <p className="font-medium">{selectedBP.name}</p>
            <p>{currentAddress.street} {currentAddress.houseNumber}</p>
            <p>{currentAddress.postalCode} {currentAddress.city}</p>
            <p>{currentAddress.country}</p>
            <p className="mt-1 text-blue-700">E-Mail: {displayEmail}</p>
          </div>
        </div>
      );
    })()}
  </div>
);

// Rest der Komponenten bleiben unverändert...
const InvoiceItemsSection = ({ items, onAddItem, onRemoveItem, onUpdateItem, errors, calculations }) => (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <h3 className="text-lg font-semibold">Rechnungspositionen</h3>
      <button
        type="button"
        onClick={onAddItem}
        className="flex items-center px-3 py-2 text-blue-600 border border-blue-300 rounded hover:bg-blue-50 transition-colors"
      >
        <Plus className="w-4 h-4 mr-1" />
        Position hinzufügen
      </button>
    </div>

    {errors.items && (
      <p className="text-sm text-red-600">{errors.items}</p>
    )}

    <div className="space-y-3">
      {items.map((item, index) => (
        <InvoiceItem
          key={index}
          item={item}
          index={index}
          onUpdate={onUpdateItem}
          onRemove={onRemoveItem}
          canRemove={items.length > 1}
          errors={errors[`item_${index}`]}
          currency={calculations.currency}
        />
      ))}
    </div>
  </div>
);

const InvoiceItem = ({ item, index, onUpdate, onRemove, canRemove, errors, currency }) => {
  const lineTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.price) || 0);

  return (
    <div className="flex gap-3 items-start p-4 border rounded-lg bg-white">
      <div className="flex-1">
        <input
          type="text"
          placeholder="Beschreibung der Leistung"
          value={item.description}
          onChange={(e) => onUpdate(index, 'description', e.target.value)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            errors?.description ? 'border-red-300' : 'border-gray-300'
          }`}
          required
        />
        {errors?.description && (
          <p className="mt-1 text-xs text-red-600">{errors.description}</p>
        )}
      </div>

      <div className="w-20">
        <input
          type="number"
          placeholder="Menge"
          min="0.01"
          step="0.01"
          value={item.quantity}
          onChange={(e) => onUpdate(index, 'quantity', parseFloat(e.target.value) || 1)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right ${
            errors?.quantity ? 'border-red-300' : 'border-gray-300'
          }`}
          required
        />
        {errors?.quantity && (
          <p className="mt-1 text-xs text-red-600">{errors.quantity}</p>
        )}
      </div>

      <div className="w-32">
        <input
          type="number"
          placeholder="Einzelpreis"
          min="0"
          step="0.01"
          value={item.price}
          onChange={(e) => onUpdate(index, 'price', parseFloat(e.target.value) || 0)}
          className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-right ${
            errors?.price ? 'border-red-300' : 'border-gray-300'
          }`}
          required
        />
        {errors?.price && (
          <p className="mt-1 text-xs text-red-600">{errors.price}</p>
        )}
      </div>

      <div className="w-32 px-3 py-2 text-right font-medium">
        {formatCurrency(lineTotal, currency)}
      </div>

      {canRemove && (
        <button
          type="button"
          onClick={() => onRemove(index)}
          className="text-red-600 hover:text-red-800 p-2"
          title="Position entfernen"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

const CalculationSummary = ({ calculations }) => (
  <div className="bg-gray-50 p-4 rounded-lg">
    <h4 className="font-semibold mb-3 flex items-center">
      <Calculator className="w-4 h-4 mr-2" />
      Rechnungssumme
    </h4>

    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span>Zwischensumme:</span>
        <span>{formatCurrency(calculations.subtotal, calculations.currency)}</span>
      </div>

      <div className="flex justify-between text-sm">
        <span>MwSt. ({calculations.taxRate}%):</span>
        <span>{formatCurrency(calculations.taxAmount, calculations.currency)}</span>
      </div>

      <div className="flex justify-between text-lg font-bold border-t pt-2">
        <span>Gesamtsumme:</span>
        <span>{formatCurrency(calculations.total, calculations.currency)}</span>
      </div>
    </div>
  </div>
);

const NotesSection = ({ notes, onChange, error }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">
      Notizen / Zahlungsbedingungen
    </label>
    <textarea
      value={notes}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      placeholder="Zusätzliche Informationen zur Rechnung..."
      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        error ? 'border-red-300' : 'border-gray-300'
      }`}
    />
    {error && (
      <p className="mt-1 text-sm text-red-600">{error}</p>
    )}
  </div>
);

const FormButtons = ({ onCancel, isSubmitting, isEditing }) => (
  <div className="flex justify-end space-x-3 pt-4 border-t">
    <button
      type="button"
      onClick={onCancel}
      disabled={isSubmitting}
      className="px-6 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
    >
      Abbrechen
    </button>
    <button
      type="submit"
      disabled={isSubmitting}
      className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
    >
      {isSubmitting && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {isSubmitting
        ? (isEditing ? 'Aktualisiere...' : 'Erstelle...')
        : (isEditing ? 'Rechnung aktualisieren' : 'Rechnung erstellen')
      }
    </button>
  </div>
);

export default InvoiceModal;