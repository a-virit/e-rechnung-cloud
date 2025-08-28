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
        return (
          <ProtectedRoute requirePermission={{ resource: 'invoices', action: 'create' }}>
            <InvoiceList />
          </ProtectedRoute>
        );
        
      case 'customers':
        return (
          <ProtectedRoute requirePermission={{ resource: 'customers', action: 'create' }}>
            <CustomerManagement />
          </ProtectedRoute>
        );
        
      case 'users':
        return (
          <ProtectedRoute requireRole="admin">
            <UserManagement />
          </ProtectedRoute>
        );
        
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
        {renderContent()}
      </div>

      {/* Modals - Mit Permission-Schutz */}
      <ProtectedRoute requirePermission={{ resource: 'customers', action: 'create' }}>
        <CustomerModal />
      </ProtectedRoute>
      
      <ProtectedRoute requireRole="admin">
        <ConfigModal />
      </ProtectedRoute>
      
      <ProtectedRoute requirePermission={{ resource: 'invoices', action: 'create' }}>
        <InvoiceModal />
      </ProtectedRoute>
    </div>
  );
};

export default App;