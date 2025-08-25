// src/App.js - Hauptkomponente (nur noch ~50 Zeilen)
import React, { useState } from 'react';
import Header from './components/Layout/Header';
import Navigation from './components/Layout/Navigation';
import Dashboard from './components/Dashboard/Dashboard';
import InvoiceList from './components/Invoices/InvoiceList';
import CustomerManagement from './components/Customers/CustomerManagement';
import CustomerModal from './components/Customers/CustomerModal';
import ConfigModal from './components/Config/ConfigModal';
import InvoiceModal from './components/Invoices/InvoiceModal';
import { AppProvider } from './context/AppContext';

const App = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <AppProvider>
      <div className="min-h-screen bg-gray-100">
        <Header />
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
          
          {/* Content */}
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'invoices' && <InvoiceList />}
          {activeTab === 'customers' && <CustomerManagement />}
        </div>

        {/* Modals */}
        <CustomerModal />
        <ConfigModal />
        <InvoiceModal />
      </div>
    </AppProvider>
  );
};

export default App;