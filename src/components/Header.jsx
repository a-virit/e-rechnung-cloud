// ===================================================
// src/components/Layout/Header.jsx - Header Component
// ===================================================

import React from 'react';
import { FileText } from 'lucide-react';

const Header = () => (
  <div className="bg-white shadow">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center py-6">
        <div className="flex items-center">
          <FileText className="h-8 w-8 text-blue-600 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">E-Rechnungs Cloud</h1>
            <p className="text-sm text-gray-500">Professionelle E-Rechnungsverarbeitung</p>
          </div>
          <div className="ml-4 flex items-center">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <div className="w-2 h-2 bg-green-600 rounded-full mr-1 animate-pulse"></div>
              LIVE
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm text-gray-500">Version 2.0</div>
          <div className="text-xs font-mono text-gray-600">XRechnung 3.0 Ready</div>
        </div>
      </div>
    </div>
  </div>
);

export default Header;