// src/components/Layout/Header.jsx
import React, { useState, useRef, useEffect } from 'react';
import { FileText, User, LogOut, Settings, Shield, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';

const Header = ({ setActiveTab }) => {
  const { user, logout, hasRole } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const menuRef = useRef(null);

  // Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showUserMenu]);

  const handleLogout = () => {
    setShowUserMenu(false);
    if (window.confirm('Möchten Sie sich wirklich abmelden?')) {
      logout();
    }
  };

  const getRoleColor = (role) => {
    const colors = {
      admin: 'text-red-600',
      user: 'text-blue-600', 
      support: 'text-purple-600'
    };
    return colors[role] || 'text-gray-600';
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Administrator',
      user: 'Benutzer',
      support: 'Support'
    };
    return labels[role] || role;
  };

  const getUserInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };
  const { actions } = useApp();

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo & Title */}
          <div className="flex items-center">
            <div className="bg-blue-600 p-2 rounded-lg mr-3">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">E-Rechnung Pro</h1>
              <p className="text-xs text-gray-500">XRechnung-konforme Rechnungssoftware</p>
            </div>
          </div>

          {/* Support-Badge */}
          {user?.role === 'support' && (
            <div className="absolute top-2 right-2">
              <span className="bg-purple-100 text-purple-800 text-xs font-medium px-2 py-1 rounded-full flex items-center">
                <Shield className="w-3 h-3 mr-1" />
                Support-Modus
              </span>
            </div>
          )}

          {/* User Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-3 text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md px-3 py-2 transition-colors"
            >
              {/* User Avatar */}
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">
                  {getUserInitials(user?.name)}
                </span>
              </div>
              
              {/* User Info */}
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium">{user?.name || 'Unbekannt'}</div>
                <div className={`text-xs ${getRoleColor(user?.role)} flex items-center`}>
                  {user?.role === 'support' && <Shield className="w-3 h-3 mr-1" />}
                  {getRoleLabel(user?.role)}
                </div>
              </div>
              
              <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${
                showUserMenu ? 'rotate-180' : ''
              }`} />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                
                {/* User Info Header */}
                <div className="px-4 py-4 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-medium">
                        {getUserInitials(user?.name)}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{user?.name || 'Unbekannt'}</div>
                      <div className="text-sm text-gray-500">{user?.email || ''}</div>
                      <div className={`text-xs ${getRoleColor(user?.role)} flex items-center mt-1`}>
                        {user?.role === 'support' && <Shield className="w-3 h-3 mr-1" />}
                        {user?.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                        {user?.role === 'user' && <User className="w-3 h-3 mr-1" />}
                        {getRoleLabel(user?.role)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Menu Items */}
                <div className="py-2">
                  
                  {/* Profil bearbeiten */}
                  <button
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
                    onClick={() => {
                      setShowUserMenu(false);
                      setActiveTab('settings'); // ⬅️ Diese Funktion von AuthenticatedApp übergeben
                    }}
                  >
                    <User className="w-4 h-4 mr-3 text-gray-400" />
                    <div>
                      <div className="font-medium">Profil bearbeiten</div>
                      <div className="text-xs text-gray-500">Name, E-Mail, Passwort ändern</div>
                    </div>
                  </button>

                  {/* Einstellungen (nur Admin/Support) */}
                  {hasRole('admin') && (
                    <button
                      className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center transition-colors"
                      onClick={() => {
  setShowUserMenu(false);
  setActiveTab('settings'); // ⬅️ Diese Funktion übergeben
}}
                    >
                      <Settings className="w-4 h-4 mr-3 text-gray-400" />
                      <div>
                        <div className="font-medium">Systemeinstellungen</div>
                        <div className="text-xs text-gray-500">Unternehmen, E-Mail, Rechnungen</div>
                      </div>
                    </button>
                  )}

                  {/* Support-spezifische Optionen */}
                  {user?.role === 'support' && (
                    <>
                      <div className="border-t border-gray-100 my-2"></div>
                      <div className="px-4 py-2">
                        <div className="text-xs font-semibold text-purple-600 mb-3 uppercase tracking-wider">
                          Support-Funktionen
                        </div>
                        
                        <button 
                          className="w-full text-left text-sm text-gray-600 hover:text-purple-600 py-2 px-2 hover:bg-purple-50 rounded transition-colors"
                          onClick={() => {
                            setShowUserMenu(false);
                            actions.showInfo('System-Diagnose wird implementiert...');
                          }}
                        >
                          🔍 System-Diagnose
                        </button>
                        
                        <button 
                          className="w-full text-left text-sm text-gray-600 hover:text-purple-600 py-2 px-2 hover:bg-purple-50 rounded transition-colors"
                          onClick={() => {
                            setShowUserMenu(false);
                            actions.showInfo('Performance-Monitor wird implementiert...');
                          }}
                        >
                          📊 Performance-Monitor
                        </button>
                        
                        <button 
                          className="w-full text-left text-sm text-gray-600 hover:text-purple-600 py-2 px-2 hover:bg-purple-50 rounded transition-colors"
                          onClick={() => {
                            setShowUserMenu(false);
                            actions.showInfo('Multi-Tenant-View wird implementiert...');
                          }}
                        >
                          🏢 Alle Unternehmen
                        </button>
                        
                        <div className="text-xs text-gray-400 mt-2 px-2">
                          Company-ID: {user?.companyId || 'global'}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Logout */}
                  <div className="border-t border-gray-100 mt-2 pt-2">
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center transition-colors"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      <div>
                        <div className="font-medium">Abmelden</div>
                        <div className="text-xs text-red-500">Sitzung beenden</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;