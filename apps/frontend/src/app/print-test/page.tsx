'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

export default function PrintTestPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const testBill = {
    id: 'HD20251029-001',
    table: 'Bàn 1',
    time: new Date().toLocaleTimeString('vi-VN'),
    items: [
      { name: 'Cà phê sữa', qty: 1, price: 20000 },
      { name: 'Bánh mì thịt', qty: 2, price: 15000 },
      { name: 'Nước ngọt', qty: 1, price: 10000 }
    ],
    total: 60000,
    tax: 0
  };

  const testQR = {
    amount: 50000,
    billId: 'HD20251029-001'
  };

  const handleTestBill = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/print/test-bill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`✅ Test in hóa đơn: ${result.message}`);
      } else {
        alert('❌ Lỗi khi test in hóa đơn');
      }
    } catch (error) {
      console.error('❌ Error testing bill:', error);
      alert('❌ Lỗi khi test in hóa đơn: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  const handleTestQR = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/print/test-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`✅ Test in QR: ${result.message}`);
      } else {
        alert('❌ Lỗi khi test in QR');
      }
    } catch (error) {
      console.error('❌ Error testing QR:', error);
      alert('❌ Lỗi khi test in QR: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  const handlePrintBill = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/print/print-bill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testBill)
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`✅ In hóa đơn: ${result.message}`);
      } else {
        alert('❌ Lỗi khi in hóa đơn');
      }
    } catch (error) {
      console.error('❌ Error printing bill:', error);
      alert('❌ Lỗi khi in hóa đơn: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  const handlePrintQR = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/print/print-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testQR)
      });
      
      if (response.ok) {
        const result = await response.json();
        alert(`✅ In QR: ${result.message}`);
      } else {
        alert('❌ Lỗi khi in QR');
      }
    } catch (error) {
      console.error('❌ Error printing QR:', error);
      alert('❌ Lỗi khi in QR: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">
            🖨️ Test In Hóa Đơn & QR Thanh Toán
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Test Bill */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-blue-800 mb-4">
                🧾 Test In Hóa Đơn
              </h2>
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  <p><strong>Số đơn:</strong> {testBill.id}</p>
                  <p><strong>Bàn:</strong> {testBill.table}</p>
                  <p><strong>Thời gian:</strong> {testBill.time}</p>
                  <p><strong>Tổng tiền:</strong> {testBill.total.toLocaleString()} đ</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleTestBill}
                    disabled={loading}
                    className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50"
                  >
                    {loading ? '⏳ Đang test...' : '🧪 Test API'}
                  </button>
                  <button
                    onClick={handlePrintBill}
                    disabled={loading}
                    className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 disabled:opacity-50"
                  >
                    {loading ? '⏳ Đang in...' : '🖨️ In thật'}
                  </button>
                </div>
              </div>
            </div>

            {/* Test QR */}
            <div className="bg-green-50 p-4 rounded-lg">
              <h2 className="text-lg font-semibold text-green-800 mb-4">
                💳 Test In QR Thanh Toán
              </h2>
              <div className="space-y-3">
                <div className="text-sm text-gray-600">
                  <p><strong>Số tiền:</strong> {testQR.amount.toLocaleString()} đ</p>
                  <p><strong>Mã hóa đơn:</strong> {testQR.billId}</p>
                  <p><strong>Ngân hàng:</strong> Vietcombank</p>
                  <p><strong>STK:</strong> 0123456789</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleTestQR}
                    disabled={loading}
                    className="flex-1 bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600 disabled:opacity-50"
                  >
                    {loading ? '⏳ Đang test...' : '🧪 Test API'}
                  </button>
                  <button
                    onClick={handlePrintQR}
                    disabled={loading}
                    className="flex-1 bg-purple-500 text-white py-2 px-4 rounded-lg hover:bg-purple-600 disabled:opacity-50"
                  >
                    {loading ? '⏳ Đang in...' : '🖨️ In thật'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* API Endpoints */}
          <div className="mt-8 bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              📡 API Endpoints
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-blue-600 mb-2">In Hóa Đơn</h4>
                <p><strong>POST</strong> /api/print/print-bill</p>
                <p><strong>POST</strong> /api/print/test-bill</p>
              </div>
              <div>
                <h4 className="font-semibold text-green-600 mb-2">In QR Thanh Toán</h4>
                <p><strong>POST</strong> /api/print/print-qr</p>
                <p><strong>POST</strong> /api/print/test-qr</p>
              </div>
            </div>
          </div>

          {/* User Info */}
          {user && (
            <div className="mt-6 bg-yellow-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-yellow-800 mb-2">
                👤 Thông tin User
              </h3>
              <p className="text-sm text-gray-600">
                <strong>Tên:</strong> {user.firstName} {user.lastName}
              </p>
              <p className="text-sm text-gray-600">
                <strong>Email:</strong> {user.email}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
