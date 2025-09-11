// src/components/Layout/NotificationBar.jsx
import React, { useEffect } from 'react';
import { X, AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const NotificationBar = () => {
  const { state, actions } = useApp();
  const { notification } = state;

  // Auto-dismiss nach 5 Sekunden für Success-Meldungen
  useEffect(() => {
    if (notification && notification.type === 'success') {
      const timer = setTimeout(() => {
        actions.clearNotification();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification, actions]);

  if (!notification) return null;

  const getNotificationStyle = () => {
    switch (notification.type) {
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-800',
          icon: AlertCircle,
          iconColor: 'text-red-400'
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-800',
          icon: AlertTriangle,
          iconColor: 'text-yellow-400'
        };
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-800',
          icon: CheckCircle,
          iconColor: 'text-green-400'
        };
      case 'info':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-800',
          icon: Info,
          iconColor: 'text-blue-400'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          text: 'text-gray-800',
          icon: Info,
          iconColor: 'text-gray-400'
        };
    }
  };

  const style = getNotificationStyle();
  const Icon = style.icon;

  return (
    <div className={`${style.bg} ${style.border} border-b`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-3 flex items-center justify-between">
          <div className="flex items-center">
            <Icon className={`w-5 h-5 ${style.iconColor} mr-3`} />
            <div className={`text-sm font-medium ${style.text}`}>
              {notification.message}
            </div>
            {notification.details && (
              <div className={`ml-3 text-sm ${style.text} opacity-75`}>
                {notification.details}
              </div>
            )}
          </div>
          <button
            onClick={() => actions.clearNotification()}
            className={`ml-4 p-1 rounded-md hover:bg-white hover:bg-opacity-50 transition-colors ${style.text}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationBar;