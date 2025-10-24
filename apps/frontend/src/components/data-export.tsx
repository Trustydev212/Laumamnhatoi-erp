'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';

interface DataExportProps {
  dataType: 'users' | 'logs' | 'analytics' | 'orders';
  filters?: any;
}

export default function DataExport({ dataType, filters = {} }: DataExportProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      const response = await api.post(`/admin/export/${dataType}`, {
        format: exportFormat,
        filters
      }, {
        responseType: 'blob'
      });

      // Create download link
      const blob = new Blob([response.data], {
        type: exportFormat === 'excel' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf'
      });
      
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const timestamp = new Date().toISOString().split('T')[0];
      link.download = `${dataType}_export_${timestamp}.${exportFormat === 'excel' ? 'xlsx' : 'pdf'}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const getDataTypeLabel = () => {
    switch (dataType) {
      case 'users': return 'Users';
      case 'logs': return 'System Logs';
      case 'analytics': return 'Analytics Data';
      case 'orders': return 'Orders';
      default: return 'Data';
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Export {getDataTypeLabel()}
        </h3>
        <div className="flex items-center space-x-2">
          <label className="text-sm text-gray-600">Format:</label>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as 'excel' | 'pdf')}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value="excel">Excel (.xlsx)</option>
            <option value="pdf">PDF</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-sm text-gray-600">
          Export {getDataTypeLabel().toLowerCase()} data with current filters applied.
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              isExporting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isExporting ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Exporting...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Export {getDataTypeLabel()}</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
