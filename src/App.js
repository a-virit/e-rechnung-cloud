// src/App.js - Mit vollständiger Authentication
import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Header from './components/Layout/Header';
import Navigation from './components/Layout/Navigation';
import Dashboard from './components/Dashboard/Dashboard';
import InvoiceList from './components/Invoices/InvoiceList';
import CustomerManagement from './components/Customers/CustomerManagement';
import UserManagement from './components/Users/UserManagement';
import CustomerModal from './components/Customers/CustomerModal';
import ConfigModal from './components/Config/ConfigModal';
import InvoiceModal from './components/Invoices/InvoiceModal';
import ProfileSystemSettings from './components/Settings/ProfileSystemSettings';
import BusinessPartnerModal from './components/BusinessPartners/BusinessPartnerModal';


const App = () => {
  return (
    <AuthProvider>
      <ProtectedRoute>
        <AppProvider>
          <AuthenticatedApp />
        </AppProvider>
      </ProtectedRoute>
    </AuthProvider>
  );
};

const AuthenticatedApp = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
        
      case 'invoices':
        // 🔧 KORRIGIERT: Nur Leseberechtigung erforderlich für die Liste
        return <InvoiceList />;
        
      case 'customers':
        // 🔧 KORRIGIERT: Nur Leseberechtigung erforderlich für die Liste  
        return <CustomerManagement />;

      case 'business-partners':  // NEU
        return <div className="text-center p-8">Business Partner Management - Coming Soon</div>;
        
      case 'users':
        return (
          <ProtectedRoute requireRole="admin">
            <UserManagement />
          </ProtectedRoute>
        );
      // 🆕 NEUE ROUTE
      case 'settings':
        return <ProfileSystemSettings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header setActiveTab={setActiveTab} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
        {renderContent()}
      </div>

      {/* 🔧 KORRIGIERT: Modals brauchen keine extra Protection - wird in den Komponenten selbst geprüft */}
      <CustomerModal />
      <ConfigModal />
      <InvoiceModal />
      <BusinessPartnerModal />
    </div>
  );
};

export default App;