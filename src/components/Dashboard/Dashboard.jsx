// src/components/Dashboard/Dashboard.jsx
import React from 'react';
import { FileText, Clock, Send, AlertCircle, Plus, Users, Settings } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const Dashboard = () => {
  const { state, actions } = useApp();
  const { stats, customers, config } = state;

  return (
    <div className="space-y-6">
      {/* Statistik-Karten */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Gesamt"
          value={stats.incoming}
          icon={FileText}
          color="blue"
        />
        <StatCard
          title="In Bearbeitung"
          value={stats.processed}
          icon={Clock}
          color="yellow"
        />
        <StatCard
          title="Versendet"
          value={stats.sent}
          icon={Send}
          color="green"
        />
        <StatCard
          title="Fehlgeschlagen"
          value={stats.failed}
          icon={AlertCircle}
          color="red"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickActionCard
          title="Neue Rechnung"
          description="E-Rechnung erstellen und versenden"
          icon={Plus}
          color="blue"
          onClick={() => actions.openModal('invoice')}
        />
        <QuickActionCard
          title="Neuer Kunde"
          description={`Kundendaten hinzufügen (${customers.length} vorhanden)`}
          icon={Users}
          color="green"
          onClick={() => actions.openModal('customer')}
        />
        <QuickActionCard
          title="Einstellungen"
          description="System und E-Mail konfigurieren"
          icon={Settings}
          color="purple"
          onClick={() => actions.openModal('config')}
        />
      </div>

      {/* Status-Übersicht */}
      <SystemStatus config={config} />
    </div>
  );
};

// Statistik-Karte Komponente
const StatCard = ({ title, value, icon: Icon, color }) => {
  const colorClasses = {
    blue: 'bg-blue-50 border-blue-200 text-blue-600 text-blue-900',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-600 text-yellow-900',
    green: 'bg-green-50 border-green-200 text-green-600 text-green-900',
    red: 'bg-red-50 border-red-200 text-red-600 text-red-900'
  };

  const [bg, border, iconColor, textColor] = colorClasses[color].split(' ');

  return (
    <div className={`${bg} p-6 rounded-lg border ${border}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`${iconColor} text-sm font-medium`}>{title}</p>
          <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
        </div>
        <Icon className={`h-8 w-8 ${iconColor}`} />
      </div>
    </div>
  );
};

// Quick Action Karte Komponente
const QuickActionCard = ({ title, description, icon: Icon, color, onClick }) => {
  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600'
  };

  return (
    <button
      onClick={onClick}
      className="p-6 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow text-left"
    >
      <div className="flex items-center">
        <Icon className={`h-8 w-8 ${colorClasses[color]} mr-3`} />
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-gray-600 text-sm">{description}</p>
        </div>
      </div>
    </button>
  );
};

// System Status Komponente
const SystemStatus = ({ config }) => (
  <div className="bg-white p-6 rounded-lg border">
    <h3 className="text-lg font-semibold mb-4">System-Status</h3>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <StatusItem
        label="E-Mail konfiguriert"
        status={config.email?.user}
        statusText={config.email?.user ? 'Ja' : 'Nein'}
      />
      <StatusItem
        label="Unternehmensdaten"
        status={config.company?.name}
        statusText={config.company?.name ? 'Vollständig' : 'Fehlt'}
      />
    </div>
  </div>
);

// Status Item Komponente
const StatusItem = ({ label, status, statusText }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
    <span>{label}</span>
    <span className={`px-2 py-1 rounded text-xs ${
      status 
        ? 'bg-green-100 text-green-800' 
        : 'bg-red-100 text-red-800'
    }`}>
      {statusText}
    </span>
  </div>
);

export default Dashboard;