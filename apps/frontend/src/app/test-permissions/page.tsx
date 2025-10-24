'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function TestPermissionsPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [testResults, setTestResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
  }, [user, router]);

  const testPermissions = async () => {
    setLoading(true);
    const results = [];

    try {
      // Test 1: Admin panel access
      try {
        await api.get('/admin/logs');
        results.push({
          test: 'Admin Panel Access',
          status: '✅ ALLOWED',
          description: 'Can access admin panel'
        });
      } catch (error: any) {
        results.push({
          test: 'Admin Panel Access',
          status: '❌ DENIED',
          description: error.response?.data?.message || 'Access denied'
        });
      }

      // Test 2: User profile access
      try {
        await api.get('/auth/profile');
        results.push({
          test: 'User Profile Access',
          status: '✅ ALLOWED',
          description: 'Can access own profile'
        });
      } catch (error: any) {
        results.push({
          test: 'User Profile Access',
          status: '❌ DENIED',
          description: error.response?.data?.message || 'Access denied'
        });
      }

      // Test 3: System health check
      try {
        await api.get('/admin/health');
        results.push({
          test: 'System Health Check',
          status: '✅ ALLOWED',
          description: 'Can check system health'
        });
      } catch (error: any) {
        results.push({
          test: 'System Health Check',
          status: '❌ DENIED',
          description: error.response?.data?.message || 'Access denied'
        });
      }

    } catch (error) {
      console.error('Error testing permissions:', error);
    }

    setTestResults(results);
    setLoading(false);
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Permission Testing</h1>
              <p className="text-gray-600">Test user permissions and role-based access</p>
            </div>
            <button
              onClick={logout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
            >
              Đăng xuất
            </button>
          </div>

          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h2 className="text-lg font-semibold text-blue-900 mb-2">Current User Info</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <span className="text-sm text-blue-600">Username:</span>
                <div className="font-medium">{user.username}</div>
              </div>
              <div>
                <span className="text-sm text-blue-600">Role:</span>
                <div className="font-medium">{user.role}</div>
              </div>
              <div>
                <span className="text-sm text-blue-600">Email:</span>
                <div className="font-medium">{user.email}</div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <button
              onClick={testPermissions}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Testing...' : 'Test Permissions'}
            </button>
          </div>

          {testResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Test Results</h3>
              {testResults.map((result, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{result.test}</h4>
                    <span className="text-sm font-medium">{result.status}</span>
                  </div>
                  <p className="text-sm text-gray-600">{result.description}</p>
                </div>
              ))}
            </div>
          )}

          <div className="mt-8 p-4 bg-gray-50 rounded-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Test Accounts</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="font-medium">👑 Admin</div>
                <div className="text-sm text-gray-600">admin / admin123</div>
                <div className="text-xs text-gray-500">Full access to everything</div>
              </div>
              <div className="space-y-2">
                <div className="font-medium">👨‍💼 Manager</div>
                <div className="text-sm text-gray-600">manager / manager123</div>
                <div className="text-xs text-gray-500">Limited admin access</div>
              </div>
              <div className="space-y-2">
                <div className="font-medium">💰 Cashier</div>
                <div className="text-sm text-gray-600">cashier / cashier123</div>
                <div className="text-xs text-gray-500">Payment processing only</div>
              </div>
              <div className="space-y-2">
                <div className="font-medium">🍽️ Waiter</div>
                <div className="text-sm text-gray-600">waiter / waiter123</div>
                <div className="text-xs text-gray-500">Order management only</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
