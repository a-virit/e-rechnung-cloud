// src/components/Layout/Navigation.jsx
import React from 'react';
import { BarChart3, FileText, Users, Settings } from 'lucide-react';

import { useApp } from '../../context/AppContext';

const Navigation = ({ activeTab, setActiveTab }) => {
  const { state } = useApp();
  const { invoices, customers } = state;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      description: 'Übersicht und Statistiken'
    },
    {
      id: 'invoices',
      label: 'E-Rechnungen',
      icon: FileText,
      count: invoices.length,
      description: 'Alle Rechnungen verwalten'
    },
    {
      id: 'customers',
      label: 'Kunden',
      icon: Users,
      count: customers.length,
      description: 'Kundendaten verwalten'
    },
    {
    id: 'settings',
    label: 'Einstellungen', 
    icon: Settings,
    description: 'Profile und Systemkonfiguration'
    }
  ];

  return (
    <div className="mb-8">
      <nav className="flex space-x-8 overflow-x-auto">
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            isActive={activeTab === item.id}
            onClick={() => setActiveTab(item.id)}
          />
        ))}
      </nav>
    </div>
  );
};

// Einzelnes Navigation Item
const NavItem = ({ item, isActive, onClick }) => {
  const { id, label, icon: Icon, count, description } = item;
  
  const baseClasses = "flex items-center py-3 px-4 border-b-2 font-medium text-sm transition-colors whitespace-nowrap group";
  const activeClasses = isActive 
    ? "border-blue-500 text-blue-600" 
    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300";

  return (
    <button
      onClick={onClick}
      className={`${baseClasses} ${activeClasses}`}
      title={description}
    >
      <Icon className="w-4 h-4 mr-2 flex-shrink-0" />
      <span className="flex items-center">
        {label}
        {typeof count === 'number' && (
          <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
            isActive 
              ? 'bg-blue-100 text-blue-700' 
              : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'
          }`}>
            {count}
          </span>
        )}
      </span>
    </button>
  );
};

export default Navigation;