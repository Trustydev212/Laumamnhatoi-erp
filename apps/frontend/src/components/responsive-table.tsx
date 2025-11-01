'use client';

import React from 'react';

interface Column {
  key: string;
  label: string;
  render?: (item: any) => React.ReactNode;
  mobileHidden?: boolean;
  tabletHidden?: boolean;
  className?: string;
}

interface ResponsiveTableProps {
  columns: Column[];
  data: any[];
  keyField?: string;
  emptyMessage?: string;
  mobileCardView?: boolean; // Hiển thị dạng card trên mobile thay vì table
}

/**
 * Responsive Table Component
 * - Hiển thị table trên desktop
 * - Hiển thị card view trên mobile (nếu mobileCardView = true)
 * - Ẩn cột ít quan trọng trên mobile/tablet
 */
export default function ResponsiveTable({
  columns,
  data,
  keyField = 'id',
  emptyMessage = 'Không có dữ liệu',
  mobileCardView = true,
}: ResponsiveTableProps) {
  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.className || ''}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item) => (
              <tr key={item[keyField]} className="hover:bg-gray-50">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`px-4 py-3 whitespace-nowrap text-sm text-gray-900 ${column.className || ''}`}
                  >
                    {column.render
                      ? column.render(item)
                      : item[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tablet Table View (ẩn một số cột) */}
      <div className="hidden sm:block md:hidden overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.filter(col => !col.tabletHidden).map((column) => (
                <th
                  key={column.key}
                  className={`px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${column.className || ''}`}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item) => (
              <tr key={item[keyField]} className="hover:bg-gray-50">
                {columns.filter(col => !col.tabletHidden).map((column) => (
                  <td
                    key={column.key}
                    className={`px-3 py-2 whitespace-nowrap text-xs text-gray-900 ${column.className || ''}`}
                  >
                    {column.render
                      ? column.render(item)
                      : item[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      {mobileCardView && (
        <div className="block sm:hidden space-y-3">
          {data.map((item) => (
            <div
              key={item[keyField]}
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
            >
              {columns
                .filter(col => !col.mobileHidden)
                .map((column, index) => (
                  <div
                    key={column.key}
                    className={`flex justify-between items-start ${
                      index !== 0 ? 'mt-3 pt-3 border-t border-gray-100' : ''
                    }`}
                  >
                    <span className="text-xs font-medium text-gray-500">
                      {column.label}:
                    </span>
                    <div className="text-right flex-1 ml-2">
                      {column.render
                        ? column.render(item)
                        : <span className="text-sm text-gray-900">{item[column.key] || '-'}</span>}
                    </div>
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}

      {/* Mobile Table View (nếu không dùng card view) */}
      {!mobileCardView && (
        <div className="block sm:hidden overflow-x-auto -mx-2 px-2">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50">
              <tr>
                {columns.filter(col => !col.mobileHidden).map((column) => (
                  <th
                    key={column.key}
                    className="px-2 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.map((item) => (
                <tr key={item[keyField]} className="hover:bg-gray-50">
                  {columns.filter(col => !col.mobileHidden).map((column) => (
                    <td
                      key={column.key}
                      className="px-2 py-2 text-gray-900"
                    >
                      {column.render
                        ? column.render(item)
                        : item[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

