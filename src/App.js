// src/App.js - Mit vollständiger Authentication
import React, { useState } from 'react';
import NotificationBar from './components/Layout/NotificationBar';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';
import Header from './components/Layout/Header';
import Navigation from './components/Layout/Navigation';
import Dashboard from './components/Dashboard/Dashboard';
import InvoiceList from './components/Invoices/InvoiceList';
import UserManagement from './components/Users/UserManagement';
import ConfigModal from './components/Config/ConfigModal';
import InvoiceModal from './components/Invoices/InvoiceModal';
import ProfileSystemSettings from './components/Settings/ProfileSystemSettings';
import BusinessPartnerModal from './components/BusinessPartners/BusinessPartnerModal';
import BusinessPartnerManagement from './components/BusinessPartners/BusinessPartnerManagement'; // NEU

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

// In Ihrer App.js - Ersetzen Sie NUR die AuthenticatedApp Komponente:

const AuthenticatedApp = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
        
      case 'invoices':
        return <InvoiceList />;
        
      case 'business-partners':
        return <BusinessPartnerManagement />;
        
      case 'users':
        return (
          <ProtectedRoute requireRole="admin">
            <UserManagement />
          </ProtectedRoute>
        );
      case 'settings':
        return <ProfileSystemSettings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* NEU: Sticky Container für Header und Navigation */}
      <div className="sticky top-0 z-40 bg-white shadow-md">
        <Header setActiveTab={setActiveTab} />
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
        <NotificationBar />
      </div>
      
      {/* Content - kein padding-top nötig bei sticky */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderContent()}
      </div>
      
      {/* Modals bleiben unverändert */}
      <ConfigModal />
      <InvoiceModal />
      <BusinessPartnerModal />
    </div>
  );
};

export default App;