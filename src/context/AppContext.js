// src/context/AppContext.js
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { invoiceService, customerService, configService, businessPartnerService } from '../services';
import authService from '../services/authService.js';
import { calculateInvoiceStats } from '../utils/statusHelpers.js';

// Context erstellen
const AppContext = createContext();

// Initial State
const initialState = {
  // Daten
  notification: null,
  invoices: [],
  customers: [],
  businessPartners: [],
  config: {
    company: {},
    email: {},
    templates: { invoice: {} },
    invoice: {}
  },

  // NEU: Test-E-Mail Status
  testEmailStatus: {
    status: 'idle', // 'idle', 'sending', 'success', 'error'
    message: '',
    timestamp: null
  },

  // UI State
  loading: true,
  submitting: false,
  error: null,

  // Modal States
  modals: {
    customer: false,
    config: false,
    invoice: false,
    businessPartner: false  // NEU
  },

  // Edit States
  editingCustomer: null,
  editingInvoice: null,
  editingBusinessPartner: null,  // NEU - nach editingInvoice

  // Berechnete Werte
  stats: {
    incoming: 0,
    processed: 0,
    sent: 0,
    failed: 0,
    totalAmount: 0,
    avgAmount: 0,
    thisMonth: 0,
    thisYear: 0
  }
};

// Action Types
const ActionTypes = {
  // NEU: Test-E-Mail Actions
  SET_TEST_EMAIL_STATUS: 'SET_TEST_EMAIL_STATUS',
  CLEAR_TEST_EMAIL_STATUS: 'CLEAR_TEST_EMAIL_STATUS',

  SET_EDITING_BUSINESS_PARTNER: 'SET_EDITING_BUSINESS_PARTNER',  // NEU

  // NEU: Notification Actions
  SET_NOTIFICATION: 'SET_NOTIFICATION',
  CLEAR_NOTIFICATION: 'CLEAR_NOTIFICATION',

  // Data Actions
  SET_INVOICES: 'SET_INVOICES',
  SET_CUSTOMERS: 'SET_CUSTOMERS',
  SET_CONFIG: 'SET_CONFIG',

  // UI Actions
  SET_LOADING: 'SET_LOADING',
  SET_SUBMITTING: 'SET_SUBMITTING',
  SET_ERROR: 'SET_ERROR',

  // Modal Actions
  OPEN_MODAL: 'OPEN_MODAL',
  CLOSE_MODAL: 'CLOSE_MODAL',

  // Edit Actions
  SET_EDITING_CUSTOMER: 'SET_EDITING_CUSTOMER',
  SET_EDITING_INVOICE: 'SET_EDITING_INVOICE',

  // Batch Actions
  RESET_STATE: 'RESET_STATE',

  // NEU: Business Partner Actions
  SET_BUSINESS_PARTNERS: 'SET_BUSINESS_PARTNERS'
};

// Reducer Function
function appReducer(state, action) {
  switch (action.type) {

    // NEU: Notification Cases
    case ActionTypes.SET_NOTIFICATION:
      return {
        ...state,
        notification: action.payload
      };
      
    case ActionTypes.CLEAR_NOTIFICATION:
      return {
        ...state,
        notification: null
      };

    case ActionTypes.SET_BUSINESS_PARTNERS:
      return {
        ...state,
        businessPartners: action.payload
      };

    case ActionTypes.SET_EDITING_BUSINESS_PARTNER:
      return {
        ...state,
        editingBusinessPartner: action.payload
      };

    // NEU: Test-E-Mail Reducer Cases
    case ActionTypes.SET_TEST_EMAIL_STATUS:
      return {
        ...state,
        testEmailStatus: {
          status: action.payload.status,
          message: action.payload.message,
          timestamp: new Date().toISOString()
        }
      };

    case ActionTypes.CLEAR_TEST_EMAIL_STATUS:
      return {
        ...state,
        testEmailStatus: { status: 'idle', message: '', timestamp: null }
      };

    case ActionTypes.SET_INVOICES:
      return {
        ...state,
        invoices: action.payload,
        stats: calculateInvoiceStats(action.payload),
        error: null
      };

    case ActionTypes.SET_CUSTOMERS:
      return {
        ...state,
        customers: action.payload,
        error: null
      };

    case ActionTypes.SET_CONFIG:
      return {
        ...state,
        config: {
          company: action.payload.company || {},
          email: action.payload.email || {},
          templates: action.payload.templates || { invoice: {} },
          invoice: action.payload.invoice || {}
        },
        error: null
      };

    case ActionTypes.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };

    case ActionTypes.SET_SUBMITTING:
      return {
        ...state,
        submitting: action.payload
      };

    case ActionTypes.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false,
        submitting: false
      };

    case ActionTypes.OPEN_MODAL:
      return {
        ...state,
        modals: {
          ...state.modals,
          [action.modal]: true
        }
      };

    case ActionTypes.CLOSE_MODAL:
      return {
        ...state,
        modals: {
          ...state.modals,
          [action.modal]: false
        },
        // Reset editing states when closing modals
        ...(action.modal === 'customer' && { editingCustomer: null }),
        ...(action.modal === 'invoice' && { editingInvoice: null }),
        ...(action.modal === 'businessPartner' && { editingBusinessPartner: null }) // NEU

      };

    case ActionTypes.SET_EDITING_CUSTOMER:
      return {
        ...state,
        editingCustomer: action.payload
      };

    case ActionTypes.SET_EDITING_INVOICE:
      return {
        ...state,
        editingInvoice: action.payload
      };

    case ActionTypes.RESET_STATE:
      return {
        ...initialState,
        config: state.config // Config beibehalten
      };

    default:
      console.warn(`Unhandled action type: ${action.type}`);
      return state;
  }
}

// Provider Component
export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Error Handler
  const handleError = (error, context = '') => {
    console.error(`Error in ${context}:`, error);
    const errorMessage = error.message || 'Ein unbekannter Fehler ist aufgetreten';
    dispatch({
      type: ActionTypes.SET_ERROR,
      payload: `${context}: ${errorMessage}`
    });
  };

  // Data Loading Functions
  const loadInvoices = async () => {
    try {
      const invoices = await invoiceService.getAll();
      dispatch({ type: ActionTypes.SET_INVOICES, payload: invoices });
      return invoices;
    } catch (error) {
      handleError(error, 'Rechnungen laden');
      return [];
    }
  };

  const loadCustomers = async () => {
    try {
      const customers = await customerService.getAll();
      dispatch({ type: ActionTypes.SET_CUSTOMERS, payload: customers });
      return customers;
    } catch (error) {
      handleError(error, 'Kunden laden');
      return [];
    }
  };

  const loadBusinessPartners = async () => {
    try {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      const companyId = authService.getCompanyId();
      const businessPartners = await businessPartnerService.getAll(companyId);
      dispatch({
        type: ActionTypes.SET_BUSINESS_PARTNERS,
        payload: businessPartners
      });
    } catch (error) {
      handleError(error, 'Business Partner laden');
    } finally {
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    }
  };

  const loadConfig = async () => {
    try {
      const config = await configService.get();
      dispatch({ type: ActionTypes.SET_CONFIG, payload: config });
      return config;
    } catch (error) {
      handleError(error, 'Konfiguration laden');
      return {};
    }
  };

  // Actions Object
  const actions = {

    // NEU: Notification Actions
    showNotification: (type, message, details = null) => {
      dispatch({
        type: ActionTypes.SET_NOTIFICATION,
        payload: { type, message, details }
      });
    },
    
    showError: (message, details = null) => {
      dispatch({
        type: ActionTypes.SET_NOTIFICATION,
        payload: { type: 'error', message, details }
      });
    },
    
    showWarning: (message, details = null) => {
      dispatch({
        type: ActionTypes.SET_NOTIFICATION,
        payload: { type: 'warning', message, details }
      });
    },
    
    showSuccess: (message, details = null) => {
      dispatch({
        type: ActionTypes.SET_NOTIFICATION,
        payload: { type: 'success', message, details }
      });
    },
    
    showInfo: (message, details = null) => {
      dispatch({
        type: ActionTypes.SET_NOTIFICATION,
        payload: { type: 'info', message, details }
      });
    },
    
    clearNotification: () => {
      dispatch({ type: ActionTypes.CLEAR_NOTIFICATION });
    },

    // === BUSINESS PARTNER ACTIONS ===
    loadBusinessPartners,

    refreshBusinessPartners: async () => {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      await loadBusinessPartners();
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    },

    editBusinessPartner: (partner) => {
      dispatch({ type: ActionTypes.SET_EDITING_BUSINESS_PARTNER, payload: partner });
      if (partner) {
        dispatch({ type: ActionTypes.OPEN_MODAL, modal: 'businessPartner' });
      }
    },

    saveBusinessPartner: async (partnerData, isEdit = false) => {
      dispatch({ type: ActionTypes.SET_SUBMITTING, payload: true });
      try {
        if (isEdit && state.editingBusinessPartner) {
          await businessPartnerService.update(state.editingBusinessPartner.businessPartnerNumber, partnerData);
        } else {
          await businessPartnerService.create(partnerData);
        }
        await loadBusinessPartners();
        const message = isEdit ? 'Business Partner erfolgreich aktualisiert!' : 'Business Partner erfolgreich erstellt!';
        return { success: true, message };
      } catch (error) {
        handleError(error, isEdit ? 'Business Partner aktualisieren' : 'Business Partner erstellen');
        return { success: false, error: error.message };
      } finally {
        dispatch({ type: ActionTypes.SET_SUBMITTING, payload: false });
      }
    },

    deactivateBusinessPartner: async (businessPartnerNumber) => {
      dispatch({ type: ActionTypes.SET_SUBMITTING, payload: true });
      try {
        await businessPartnerService.deactivate(businessPartnerNumber);
        await loadBusinessPartners();
        return { success: true, message: 'Business Partner deaktiviert' };
      } catch (error) {
        handleError(error, 'Business Partner deaktivieren');
        return { success: false, error: error.message };
      } finally {
        dispatch({ type: ActionTypes.SET_SUBMITTING, payload: false });
      }
    },

    // NEU: Test-E-Mail-Funktionen
    sendTestEmail: async (emailConfig, companyConfig) => {
      dispatch({
        type: ActionTypes.SET_TEST_EMAIL_STATUS,
        payload: { status: 'sending', message: 'Test-E-Mail wird versendet...' }
      });

      try {
        const response = await fetch('/api/test-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emailConfig,
            companyConfig
          })
        });

        const result = await response.json();

        if (result.success) {
          dispatch({
            type: ActionTypes.SET_TEST_EMAIL_STATUS,
            payload: {
              status: 'success',
              message: `✅ Test-E-Mail erfolgreich versendet über ${result.data.provider}! Überprüfen Sie: ${emailConfig.senderEmail}`
            }
          });
        } else {
          throw new Error(result.error);
        }

        return result;
      } catch (error) {
        dispatch({
          type: ActionTypes.SET_TEST_EMAIL_STATUS,
          payload: {
            status: 'error',
            message: `❌ Test-Versand fehlgeschlagen: ${error.message}`
          }
        });
        throw error;
      }
    },

    clearTestEmailStatus: () => {
      dispatch({ type: ActionTypes.CLEAR_TEST_EMAIL_STATUS });
    },

    // === INVOICE ACTIONS ===
    refreshInvoices: async () => {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      await loadInvoices();
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    },

    createInvoice: async (invoiceData) => {
      dispatch({ type: ActionTypes.SET_SUBMITTING, payload: true });
      try {
        await invoiceService.create(invoiceData);
        await loadInvoices();
        return { success: true };
      } catch (error) {
        handleError(error, 'Rechnung erstellen');
        return { success: false, error: error.message };
      } finally {
        dispatch({ type: ActionTypes.SET_SUBMITTING, payload: false });
      }
    },

    sendInvoice: async (invoiceId) => {
      dispatch({ type: ActionTypes.SET_SUBMITTING, payload: true });
      try {
        await invoiceService.sendEmail(invoiceId);
        await loadInvoices();
        return { success: true, message: 'E-Rechnung erfolgreich versendet!' };
      } catch (error) {
        handleError(error, 'Rechnung versenden');
        return { success: false, error: error.message };
      } finally {
        dispatch({ type: ActionTypes.SET_SUBMITTING, payload: false });
      }
    },

    deleteInvoice: async (invoiceId) => {
      try {
        await invoiceService.delete(invoiceId);
        await loadInvoices();
        return { success: true, message: 'Rechnung erfolgreich gelöscht!' };
      } catch (error) {
        handleError(error, 'Rechnung löschen');
        return { success: false, error: error.message };
      }
    },

    downloadInvoicePDF: async (invoiceId, invoiceNumber) => {
      try {
        await invoiceService.downloadPDF(invoiceId, invoiceNumber);
        return { success: true };
      } catch (error) {
        handleError(error, 'PDF herunterladen');
        return { success: false, error: error.message };
      }
    },

    // === CUSTOMER ACTIONS ===
    refreshCustomers: async () => {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });
      await loadCustomers();
      dispatch({ type: ActionTypes.SET_LOADING, payload: false });
    },

    saveCustomer: async (customerData, isEdit = false) => {
      dispatch({ type: ActionTypes.SET_SUBMITTING, payload: true });
      try {
        if (isEdit) {
          console.log('Updating following: ', customerData); // logging
          await customerService.update(customerData.id, customerData);
        } else {
          console.log('Creating following: ', customerData); // logging
          await customerService.create(customerData);
        }
        await loadCustomers();
        const message = isEdit ? 'Kunde erfolgreich aktualisiert!' : 'Kunde erfolgreich erstellt!';
        return { success: true, message };
      } catch (error) {
        handleError(error, isEdit ? 'Kunde aktualisieren' : 'Kunde erstellen');
        return { success: false, error: error.message };
      } finally {
        dispatch({ type: ActionTypes.SET_SUBMITTING, payload: false });
      }
    },

    deleteCustomer: async (customerId) => {
      try {
        await customerService.delete(customerId);
        await loadCustomers();
        return { success: true, message: 'Kunde erfolgreich gelöscht!' };
      } catch (error) {
        handleError(error, 'Kunde löschen');
        return { success: false, error: error.message };
      }
    },

    // === CONFIG ACTIONS ===
    updateConfig: async (configData) => {
      dispatch({ type: ActionTypes.SET_SUBMITTING, payload: true });
      try {
        await configService.update(configData);
        await loadConfig();
        return { success: true, message: 'Konfiguration erfolgreich gespeichert!' };
      } catch (error) {
        handleError(error, 'Konfiguration speichern');
        return { success: false, error: error.message };
      } finally {
        dispatch({ type: ActionTypes.SET_SUBMITTING, payload: false });
      }
    },

    // === MODAL ACTIONS ===
    openModal: (modalName) => {
      dispatch({ type: ActionTypes.OPEN_MODAL, modal: modalName });
    },

    closeModal: (modalName) => {
      dispatch({ type: ActionTypes.CLOSE_MODAL, modal: modalName });
    },

    // === EDIT ACTIONS ===
    editCustomer: (customer) => {
      dispatch({ type: ActionTypes.SET_EDITING_CUSTOMER, payload: customer });
      if (customer) {
        dispatch({ type: ActionTypes.OPEN_MODAL, modal: 'customer' });
      }
    },

    editInvoice: (invoice) => {
      dispatch({ type: ActionTypes.SET_EDITING_INVOICE, payload: invoice });
      if (invoice) {
        dispatch({ type: ActionTypes.OPEN_MODAL, modal: 'invoice' });
      }
    },

    // === UTILITY ACTIONS ===
    clearError: () => {
      dispatch({ type: ActionTypes.SET_ERROR, payload: null });
    },

    resetApp: () => {
      dispatch({ type: ActionTypes.RESET_STATE });
    }
  };

  // Initial Data Loading
  useEffect(() => {
    const initializeApp = async () => {
      dispatch({ type: ActionTypes.SET_LOADING, payload: true });

      try {
        // Alle Daten parallel laden
        await Promise.all([
          loadInvoices(),
          loadCustomers(),
          loadBusinessPartners(),
          loadConfig()
        ]);
      } catch (error) {
        handleError(error, 'App initialisieren');
      } finally {
        dispatch({ type: ActionTypes.SET_LOADING, payload: false });
      }
    };

    initializeApp();

    // Auto-refresh für Rechnungen alle 30 Sekunden
    const interval = setInterval(() => {
      loadInvoices().catch(error =>
        console.warn('Auto-refresh failed:', error)
      );
    }, 30000);

    // Cleanup
    return () => clearInterval(interval);
  }, []);

  // Error Auto-Clear (nach 10 Sekunden)
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => {
        dispatch({ type: ActionTypes.SET_ERROR, payload: null });
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [state.error]);

  // Context Value
  const contextValue = {
    state,
    actions,
    // Convenience getters
    get isLoading() { return state.loading; },
    get isSubmitting() { return state.submitting; },
    get hasError() { return !!state.error; },
    get invoiceCount() { return state.invoices.length; },
    get customerCount() { return state.customers.length; },
    get isConfigured() {
      return !!(state.config.company?.name && state.config.email?.user);
    }
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

// Hook für Context-Verwendung
export const useApp = () => {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }

  return context;
};

// Hook für spezifische State-Teile (Performance-Optimierung)
export const useInvoices = () => {
  const { state } = useApp();
  return state.invoices;
};

export const useCustomers = () => {
  const { state } = useApp();
  return state.customers;
};

export const useConfig = () => {
  const { state } = useApp();
  return state.config;
};

export const useStats = () => {
  const { state } = useApp();
  return state.stats;
};

// Action Types für externe Verwendung exportieren
export { ActionTypes };