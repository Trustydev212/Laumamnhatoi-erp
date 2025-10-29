'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

export default function VietQRTestPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testVietQRPrint = async () => {
    setLoading(true);
    setResult(null);

    try {
      const testBill = {
        id: 'HD20251029-001',
        cashier: user ? `${user.firstName} ${user.lastName}`.trim() : 'Thu ngân',
        date: new Date().toLocaleDateString('vi-VN'),
        startTime: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        items: [
          { name: 'Cà phê sữa', qty: 1, price: 20000 },
          { name: 'Bánh mì thịt', qty: 2, price: 15000 },
          { name: 'Nước ngọt', qty: 1, price: 10000 }
        ],
        total: 60000
      };

      console.log('🧪 Testing VietQR Print with data:', testBill);

      const response = await fetch('/api/printer/vietqr/print-bill', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testBill)
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        console.log('✅ VietQR Print test successful:', data);
      } else {
        console.error('❌ VietQR Print test failed:', data);
      }

    } catch (error) {
      console.error('❌ VietQR Print test error:', error);
      setResult({
        success: false,
        message: 'Lỗi khi test VietQR: ' + (error instanceof Error ? error.message : String(error))
      });
    } finally {
      setLoading(false);
    }
  };

  const testVietQRConfig = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/printer/vietqr/config', {
        method: 'GET'
      });

      const data = await response.json();
      setResult(data);

    } catch (error) {
      console.error('❌ VietQR Config test error:', error);
      setResult({
        success: false,
        message: 'Lỗi khi test config: ' + (error instanceof Error ? error.message : String(error))
      });
    } finally {
      setLoading(false);
    }
  };

  const testVietQRStatus = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/printer/vietqr/status', {
        method: 'GET'
      });

      const data = await response.json();
      setResult(data);

    } catch (error) {
      console.error('❌ VietQR Status test error:', error);
      setResult({
        success: false,
        message: 'Lỗi khi test status: ' + (error instanceof Error ? error.message : String(error))
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-6">
            🧾 Test VietQR Printer Integration
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <button
              onClick={testVietQRPrint}
              disabled={loading}
              className="bg-purple-500 text-white py-3 px-4 rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '⏳ Testing...' : '🧾 Test Print VietQR'}
            </button>

            <button
              onClick={testVietQRConfig}
              disabled={loading}
              className="bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '⏳ Testing...' : '⚙️ Test Config'}
            </button>

            <button
              onClick={testVietQRStatus}
              disabled={loading}
              className="bg-green-500 text-white py-3 px-4 rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '⏳ Testing...' : '🔍 Test Status'}
            </button>
          </div>

          {result && (
            <div className="bg-gray-100 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">
                {result.success ? '✅ Kết quả thành công' : '❌ Kết quả lỗi'}
              </h3>
              
              <div className="space-y-2">
                <p><strong>Message:</strong> {result.message}</p>
                <p><strong>Timestamp:</strong> {result.timestamp}</p>
                
                {result.billId && (
                  <p><strong>Bill ID:</strong> {result.billId}</p>
                )}
                
                {result.config && (
                  <div>
                    <strong>Config:</strong>
                    <pre className="bg-white p-2 rounded mt-1 text-sm overflow-auto">
                      {JSON.stringify(result.config, null, 2)}
                    </pre>
                  </div>
                )}
                
                {result.status && (
                  <div>
                    <strong>Status:</strong>
                    <pre className="bg-white p-2 rounded mt-1 text-sm overflow-auto">
                      {JSON.stringify(result.status, null, 2)}
                    </pre>
                  </div>
                )}
                
                {result.testBill && (
                  <div>
                    <strong>Test Bill:</strong>
                    <pre className="bg-white p-2 rounded mt-1 text-sm overflow-auto">
                      {JSON.stringify(result.testBill, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-yellow-800 mb-2">
              📋 Hướng dẫn sử dụng VietQR Printer
            </h3>
            <ul className="text-yellow-700 space-y-1 text-sm">
              <li>• <strong>Test Print VietQR:</strong> In hóa đơn test với QR code VietQR động</li>
              <li>• <strong>Test Config:</strong> Kiểm tra cấu hình VietQR hiện tại</li>
              <li>• <strong>Test Status:</strong> Kiểm tra trạng thái máy in</li>
              <li>• QR code sẽ được tạo động từ VietQR API với số tiền và thông tin hóa đơn</li>
              <li>• Hóa đơn sẽ được in qua máy Xprinter T80L với layout chuẩn</li>
            </ul>
          </div>

          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">
              🔧 Cấu hình VietQR
            </h3>
            <div className="text-blue-700 text-sm space-y-1">
              <p><strong>Ngân hàng:</strong> Vietcombank (970436)</p>
              <p><strong>Số tài khoản:</strong> 0123456789</p>
              <p><strong>Tên tài khoản:</strong> LAU MAM NHA TOI</p>
              <p><strong>API:</strong> https://img.vietqr.io/image/</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
