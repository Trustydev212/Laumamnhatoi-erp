'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';

interface Order {
  id: string;
  orderNumber: string;
  subtotal: number;
  total: number;
  tax: number;
  createdAt: string;
  paidAt: string;
  table: {
    name: string;
  };
  user: {
    name: string;
  };
  orderItems: Array<{
    quantity: number;
    subtotal: number;
    menu: {
      name: string;
    };
  }>;
}

interface CustomerHistoryProps {
  customerId: string;
  customerName: string;
}

export default function CustomerHistory({ customerId, customerName }: CustomerHistoryProps) {
  const [history, setHistory] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCustomerHistory();
  }, [customerId]);

  const loadCustomerHistory = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/customers/${customerId}/orders`);
      setHistory(response.data);
    } catch (error) {
      console.error('Error loading customer history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!history) {
    return (
      <div className="p-4 text-center text-gray-500">
        Không thể tải lịch sử khách hàng
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Customer Info */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-800">
          Lịch sử khách hàng: {customerName}
        </h3>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {history.totalOrders}
            </div>
            <div className="text-sm text-gray-600">Tổng đơn hàng</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {history.totalSpent.toLocaleString('vi-VN')} ₫
            </div>
            <div className="text-sm text-gray-600">Tổng chi tiêu</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {Math.round(history.totalSpent / history.totalOrders).toLocaleString('vi-VN')} ₫
            </div>
            <div className="text-sm text-gray-600">Trung bình/đơn</div>
          </div>
        </div>
      </div>

      {/* Favorite Items */}
      {history.favoriteItems.length > 0 && (
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h4 className="text-lg font-semibold text-yellow-800 mb-3">
            🏆 Món yêu thích
          </h4>
          <div className="space-y-2">
            {history.favoriteItems.map((item: any, index: number) => (
              <div key={index} className="flex justify-between items-center bg-white p-2 rounded">
                <span className="font-medium">{item.name}</span>
                <div className="text-sm text-gray-600">
                  {item.quantity} lần • {item.totalSpent.toLocaleString('vi-VN')} ₫
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order History */}
      <div>
        <h4 className="text-lg font-semibold text-gray-800 mb-3">
          📋 Lịch sử đơn hàng
        </h4>
        {history.orders.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            Khách hàng chưa có đơn hàng nào
          </div>
        ) : (
          <div className="space-y-3">
            {history.orders.map((order: Order) => (
              <div key={order.id} className="bg-white border rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-semibold">#{order.orderNumber}</div>
                    <div className="text-sm text-gray-600">
                      {new Date(order.createdAt).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-green-600">
                      {order.subtotal.toLocaleString('vi-VN')} ₫
                    </div>
                    <div className="text-sm text-gray-600">
                      Bàn: {order.table.name}
                    </div>
                  </div>
                </div>
                
                <div className="border-t pt-2">
                  <div className="text-sm text-gray-600 mb-1">Món đã mua:</div>
                  <div className="space-y-1">
                    {order.orderItems.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.menu.name}</span>
                        <span>{item.subtotal.toLocaleString('vi-VN')} ₫</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
