'use client';

import React, { useState } from 'react';
import { api } from '@/lib/api';

export default function ExportOrderDetails() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf'>('excel');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      const response = await api.post('/admin/export/order-details', {
        format: exportFormat,
        filters: {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate
        }
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
      link.download = `order_details_${dateRange.startDate}_${dateRange.endDate}.${exportFormat === 'excel' ? 'xlsx' : 'pdf'}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
    } catch (error: any) {
      console.error('Export failed:', error);
      alert('Xuất file thất bại. Vui lòng thử lại.');
    } finally {
      setIsExporting(false);
    }
  };

  const setQuickRange = (days: number) => {
    const endDate = new Date();
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    setDateRange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-xl font-semibold mb-4">📋 Xuất Chi Tiết Đơn Hàng</h3>
      <p className="text-sm text-gray-600 mb-4">
        Xuất file chứa: Mã hóa đơn, Món ăn, Giá, Số lượng, Thời gian bán
      </p>

      <div className="space-y-4">
        {/* Date Range Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Từ ngày:</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">Đến ngày:</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setQuickRange(7)}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs hover:bg-blue-200"
            >
              7 ngày
            </button>
            <button
              onClick={() => setQuickRange(30)}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs hover:bg-blue-200"
            >
              30 ngày
            </button>
            <button
              onClick={() => setQuickRange(90)}
              className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs hover:bg-blue-200"
            >
              90 ngày
            </button>
          </div>
        </div>

        {/* Format Selector */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">Định dạng:</label>
          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as 'excel' | 'pdf')}
            className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="excel">Excel (.xlsx)</option>
            <option value="pdf">PDF</option>
          </select>
        </div>

        {/* Export Button */}
        <button
          onClick={handleExport}
          disabled={isExporting || !dateRange.startDate || !dateRange.endDate}
          className={`w-full sm:w-auto px-6 py-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            isExporting || !dateRange.startDate || !dateRange.endDate
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isExporting ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>Đang xuất...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Xuất Chi Tiết Đơn Hàng</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
