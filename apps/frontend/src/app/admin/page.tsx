'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import AnalyticsCharts from '@/components/analytics-charts';
import NotificationSystem from '@/components/notification-system';
import DataExport from '@/components/data-export';
import AdvancedFilter from '@/components/advanced-filter';
import AIChatbot from '@/components/ai-chatbot';
import ExportOrderDetails from '@/components/export-order-details';

interface SystemHealth {
  status: string;
  timestamp: string;
  database: {
    status: string;
    responseTime: string;
  };
  statistics: {
    totalUsers: number;
    totalOrders: number;
    totalCustomers: number;
    activeUsers: number;
  };
}

interface SystemLog {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  userId?: string;
  username?: string;
  userRole?: string;
  ip?: string;
  userAgent?: string;
  details?: {
    entity: string;
    entityId: string;
    oldValues?: any;
    newValues?: any;
  };
}

interface UserActivity {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  createdAt: string;
  username?: string;
  role?: string;
  orders?: Array<{
    id: string;
    orderNumber: string;
    createdAt: string;
    status: string;
  }>;
  recentActivities?: Array<{
    id: string;
    action: string;
    entity: string;
    createdAt: string;
  }>;
}

interface PerformanceMetrics {
  responseTime: {
    average: string;
    p95: string;
    p99: string;
  };
  throughput: {
    requestsPerSecond: number;
    peakRequestsPerSecond: number;
  };
  errors: {
    errorRate: string;
    totalErrors: number;
  };
  resources: {
    memoryUsage: string;
    cpuUsage: string;
    diskUsage: string;
  };
  businessMetrics?: {
    totalUsers: number;
    totalOrders: number;
    totalCustomers: number;
    ordersLast24h: number;
    ordersPerHour: number;
  };
}

export default function AdminPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('health');
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics | null>(null);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // User Management states
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  
  // Advanced Filtering states
  const [logFilters, setLogFilters] = useState({});
  const [userFilters, setUserFilters] = useState({});
  const [analyticsFilters, setAnalyticsFilters] = useState({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Search and filter states for System Logs
  const [logSearchTerm, setLogSearchTerm] = useState('');
  const [logLevelFilter, setLogLevelFilter] = useState('');
  const [logUserFilter, setLogUserFilter] = useState('');
  const [logDateFilter, setLogDateFilter] = useState('');
  
  // Tax config states
  const [taxConfig, setTaxConfig] = useState({
    vatEnabled: false,
    vatRate: 0,
    vatName: 'VAT',
    taxInclusive: false,
    serviceChargeEnabled: false,
    serviceChargeRate: 0,
    serviceChargeName: 'Phí phục vụ'
  });
  const [taxConfigLoading, setTaxConfigLoading] = useState(false);
  const [showChatbot, setShowChatbot] = useState(false);
  const [vietQRConfig, setVietQRConfig] = useState({
    acqId: 970436,
    accountNo: '0123456789',
    accountName: 'LAU MAM NHA TOI'
  });
  const [vietQRConfigLoading, setVietQRConfigLoading] = useState(false);
  const [printerConfig, setPrinterConfig] = useState({
    type: 'usb' as 'usb' | 'network',
    ip: '192.168.1.100',
    port: 9100
  });
  const [printerConfigLoading, setPrinterConfigLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    if (user.role !== 'ADMIN') {
      router.push('/dashboard');
      return;
    }

    loadData();

    // Auto refresh disabled - manual refresh only
    // const interval = setInterval(() => {
    //   loadData();
    // }, 30000);

    // return () => clearInterval(interval);
  }, [user, router]);

  // Load tax config when tax-settings tab is active
  useEffect(() => {
    if (activeTab === 'tax-settings') {
      loadTaxConfig();
    }
  }, [activeTab]);

  // Load VietQR config when vietqr-settings tab is active
  useEffect(() => {
    if (activeTab === 'vietqr-settings') {
      loadVietQRConfig();
    }
  }, [activeTab]);

  // Load printer config when printer-settings tab is active
  useEffect(() => {
    if (activeTab === 'printer-settings') {
      loadPrinterConfig();
    }
  }, [activeTab]);

  const loadPrinterConfig = async () => {
    try {
      setPrinterConfigLoading(true);
      const response = await api.get('/print/printer-config');
      if (response.data.success && response.data.printerConfig) {
        setPrinterConfig({
          type: response.data.printerConfig.type || 'usb',
          ip: response.data.printerConfig.ip || '192.168.1.100',
          port: response.data.printerConfig.port || 9100
        });
      }
    } catch (error) {
      console.error('Error loading printer config:', error);
      // Giữ giá trị mặc định nếu không load được
    } finally {
      setPrinterConfigLoading(false);
    }
  };

  const loadVietQRConfig = async () => {
    try {
      setVietQRConfigLoading(true);
      const response = await api.get('/print/vietqr-config');
      if (response.data.success && response.data.vietQRConfig) {
        setVietQRConfig({
          acqId: response.data.vietQRConfig.acqId || 970436,
          accountNo: response.data.vietQRConfig.accountNo || '0123456789',
          accountName: response.data.vietQRConfig.accountName || 'LAU MAM NHA TOI'
        });
      }
    } catch (error) {
      console.error('Error loading VietQR config:', error);
      // Giữ giá trị mặc định nếu không load được
    } finally {
      setVietQRConfigLoading(false);
    }
  };

  const loadTaxConfig = async () => {
    try {
      setTaxConfigLoading(true);
      const response = await api.get('/print/tax-config');
      if (response.data.success && response.data.taxConfig) {
        setTaxConfig({
          vatEnabled: response.data.taxConfig.vatEnabled || false,
          vatRate: response.data.taxConfig.vatRate || 0,
          vatName: response.data.taxConfig.taxName || response.data.taxConfig.vatName || 'VAT',
          taxInclusive: response.data.taxConfig.taxInclusive || false,
          serviceChargeEnabled: response.data.taxConfig.serviceChargeEnabled || false,
          serviceChargeRate: response.data.taxConfig.serviceChargeRate || 0,
          serviceChargeName: response.data.taxConfig.serviceChargeName || 'Phí phục vụ'
        });
      }
    } catch (error) {
      console.error('Error loading tax config:', error);
      // Giữ giá trị mặc định nếu không load được
    } finally {
      setTaxConfigLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [healthRes, logsRes, activityRes, performanceRes, analyticsRes] = await Promise.all([
        api.get('/admin/health'),
        api.get('/admin/logs?limit=50'),
        api.get('/admin/users/activity?limit=10'),
        api.get('/admin/performance'),
        api.get('/admin/analytics/dashboard')
      ]);

      console.log('📊 Admin data loaded:', {
        health: healthRes.data,
        logs: logsRes.data,
        activity: activityRes.data,
        performance: performanceRes.data,
        analytics: analyticsRes.data
      });
      
      setSystemHealth(healthRes.data);
      setSystemLogs(logsRes.data);
      setUserActivity(activityRes.data);
      setPerformanceMetrics(performanceRes.data);
      setAnalyticsData(analyticsRes.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error loading admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'ERROR': return 'text-red-600 bg-red-100';
      case 'WARN': return 'text-yellow-600 bg-yellow-100';
      case 'INFO': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // User Management functions
  const handleAddUser = async (userData: any) => {
    try {
      await api.post('/admin/users', userData);
      await loadData();
      setShowAddUserModal(false);
      alert('User created successfully!');
    } catch (error) {
      console.error('Error creating user:', error);
      alert('Error creating user');
    }
  };

  const handleEditUser = async (userId: string, userData: any) => {
    try {
      await api.put(`/admin/users/${userId}`, userData);
      await loadData();
      setShowEditUserModal(false);
      setSelectedUser(null);
      alert('User updated successfully!');
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error updating user');
    }
  };

  const handleToggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      await api.put(`/admin/users/${userId}/toggle-status`, { isActive });
      await loadData();
      alert(`User ${isActive ? 'activated' : 'deactivated'} successfully!`);
    } catch (error) {
      console.error('Error toggling user status:', error);
      alert('Error updating user status');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      try {
        await api.delete(`/admin/users/${userId}`);
        await loadData();
        alert('User deleted successfully!');
      } catch (error) {
        console.error('Error deleting user:', error);
        alert('Error deleting user');
      }
    }
  };

  // Filter users based on search and role
  const filteredUsers = userActivity.filter((user) => {
    const matchesSearch = !searchTerm || 
      user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = !roleFilter || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  // Filter system logs
  const filteredSystemLogs = systemLogs.filter(log => {
    const matchesSearch = !logSearchTerm || 
      log.message.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
      log.username?.toLowerCase().includes(logSearchTerm.toLowerCase()) ||
      log.details?.entityId?.toLowerCase().includes(logSearchTerm.toLowerCase());
    const matchesLevel = !logLevelFilter || log.level === logLevelFilter;
    const matchesUser = !logUserFilter || log.username === logUserFilter;
    const matchesDate = !logDateFilter || 
      new Date(log.timestamp).toDateString() === new Date(logDateFilter).toDateString();
    return matchesSearch && matchesLevel && matchesUser && matchesDate;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <button
                  onClick={() => router.push('/dashboard')}
                  className="text-blue-600 hover:text-blue-800 flex items-center text-sm font-medium"
                >
                  ← Quay lại Dashboard
                </button>
                <span className="text-gray-400">|</span>
                <span className="text-sm text-gray-600">Admin Dashboard</span>
              </div>
              <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
              <p className="text-gray-600 mt-2">System monitoring and administration</p>
            </div>
            <div className="flex items-center space-x-4">
              <NotificationSystem />
              <button
                onClick={loadData}
                className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm flex items-center space-x-2"
                disabled={loading}
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Refresh</span>
              </button>
              {lastUpdated && (
                <span className="text-xs text-gray-500">
                  Cập nhật: {lastUpdated.toLocaleTimeString()}
                </span>
              )}
              <span className="text-sm text-gray-600">
                Xin chào, {user?.firstName} {user?.lastName}
              </span>
              <button
                onClick={logout}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="flex border-b border-gray-200">
            <button
              className={`py-2 px-4 text-sm font-medium ${activeTab === 'health' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('health')}
            >
              System Health
            </button>
            <button
              className={`py-2 px-4 text-sm font-medium ${activeTab === 'logs' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('logs')}
            >
              System Logs
            </button>
            <button
              className={`py-2 px-4 text-sm font-medium ${activeTab === 'activity' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('activity')}
            >
              User Activity
            </button>
            <button
              className={`py-2 px-4 text-sm font-medium ${activeTab === 'performance' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('performance')}
            >
              Performance Metrics
            </button>
            <button
              className={`py-2 px-4 text-sm font-medium ${activeTab === 'user-management' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('user-management')}
            >
              User Management
            </button>
              <button
              className={`py-2 px-4 text-sm font-medium ${activeTab === 'analytics' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('analytics')}
            >
              Analytics
              </button>
            <button
              className={`py-2 px-4 text-sm font-medium ${activeTab === 'receipt-settings' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('receipt-settings')}
            >
              Cấu hình hóa đơn
            </button>
            <button
              className={`py-2 px-4 text-sm font-medium ${activeTab === 'tax-settings' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('tax-settings')}
            >
              Cấu hình thuế
            </button>
            <button
              className={`py-2 px-4 text-sm font-medium ${activeTab === 'vietqr-settings' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('vietqr-settings')}
            >
              Cấu hình VietQR
            </button>
            <button
              className={`py-2 px-4 text-sm font-medium ${activeTab === 'printer-settings' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
              onClick={() => setActiveTab('printer-settings')}
            >
              Cấu hình máy in
            </button>
          </div>
        </div>

        {/* System Health Tab */}
        {activeTab === 'health' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">System Health Overview</h2>
                <button
                  onClick={loadData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  disabled={loading}
                >
                  <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {loading ? 'Đang tải...' : 'Làm mới'}
                </button>
              </div>
            </div>
            <div className="p-6">
              {systemHealth ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-blue-50 p-4 rounded-lg flex items-center">
                    <svg className="w-8 h-8 text-blue-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.001 12.001 0 002.92 12c0 3.072 1.873 5.785 4.514 7.314a12.001 12.001 0 0013.592-8.618 12.001 12.001 0 00-3.04-8.618z" />
                    </svg>
                    <div>
                      <p className="text-sm text-gray-600">Status</p>
                      <p className="text-lg font-semibold text-blue-800">{systemHealth.status}</p>
                </div>
              </div>
                  <div className="bg-green-50 p-4 rounded-lg flex items-center">
                    <svg className="w-8 h-8 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-sm text-gray-600">Database</p>
                      <p className="text-lg font-semibold text-green-800">{systemHealth.database.status}</p>
                </div>
                </div>
                  <div className="bg-yellow-50 p-4 rounded-lg flex items-center">
                    <svg className="w-8 h-8 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <div>
                      <p className="text-sm text-gray-600">Total Users</p>
                      <p className="text-lg font-semibold text-yellow-800">{systemHealth.statistics.totalUsers}</p>
                </div>
              </div>
                  <div className="bg-purple-50 p-4 rounded-lg flex items-center">
                    <svg className="w-8 h-8 text-purple-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H2v-2a3 3 0 015.356-1.857M17 20v-2c0-.653-.146-1.283-.423-1.857M9 12v-2m0 0a3 3 0 11-6 0 3 3 0 016 0zm0 0V6m0 6a3 3 0 100 6 3 3 0 000-6zm0 0H9m12 0a3 3 0 100 6 3 3 0 000-6zm0 0H9" />
                    </svg>
                    <div>
                      <p className="text-sm text-gray-600">Total Orders</p>
                      <p className="text-lg font-semibold text-purple-800">{systemHealth.statistics.totalOrders}</p>
                  </div>
                </div>
              </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-lg font-medium mb-2">No system health data available</div>
                  <div className="text-sm">Please ensure the backend is running and data is present.</div>
                </div>
              )}
            </div>
          </div>
        )}

                {/* System Logs Tab */}
                {activeTab === 'logs' && (
                  <div className="space-y-6">
                    {/* Search and Filter Controls */}
                    <div className="bg-white rounded-lg shadow p-6">
                      <h3 className="text-lg font-semibold mb-4">Tìm kiếm và Lọc</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Tìm kiếm</label>
                          <input
                            type="text"
                            placeholder="Tìm theo message, user, entity ID..."
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={logSearchTerm}
                            onChange={(e) => setLogSearchTerm(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
                          <select
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={logLevelFilter}
                            onChange={(e) => setLogLevelFilter(e.target.value)}
                          >
                            <option value="">Tất cả</option>
                            <option value="INFO">INFO</option>
                            <option value="WARNING">WARNING</option>
                            <option value="ERROR">ERROR</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                          <select
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={logUserFilter}
                            onChange={(e) => setLogUserFilter(e.target.value)}
                          >
                            <option value="">Tất cả</option>
                            {Array.from(new Set(systemLogs.map(log => log.username).filter(Boolean))).map(username => (
                              <option key={username} value={username}>{username}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Ngày</label>
                          <input
                            type="date"
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            value={logDateFilter}
                            onChange={(e) => setLogDateFilter(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="mt-4 flex justify-between items-center">
                        <span className="text-sm text-gray-600">
                          Hiển thị {filteredSystemLogs.length} / {systemLogs.length} logs
                        </span>
                        <button
                          onClick={() => {
                            setLogSearchTerm('');
                            setLogLevelFilter('');
                            setLogUserFilter('');
                            setLogDateFilter('');
                          }}
                          className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm"
                        >
                          Xóa bộ lọc
                        </button>
                      </div>
                    </div>
                    
                    <div className="bg-white rounded-lg shadow">
                      <div className="p-6 border-b">
                        <h2 className="text-xl font-semibold">System Logs</h2>
                      </div>
            <div className="p-6">
              {filteredSystemLogs.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-lg font-medium mb-2">No system logs found</div>
                  <div className="text-sm">System logs will appear here when users perform actions</div>
                </div>
              ) : (
              <div className="space-y-3">
                            {filteredSystemLogs.map((log) => (
                              <div key={log.id} className={`p-4 rounded-lg ${getLogLevelColor(log.level).replace('text-', 'border-l-4 border-')}`}>
                                <div className="flex justify-between items-center text-sm">
                                  <div className="flex items-center space-x-2">
                                    <span className={`font-semibold ${getLogLevelColor(log.level)}`}>{log.level}</span>
                                    {log.username && (
                                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                        {log.username} ({log.userRole})
                                      </span>
                                    )}
                                  </div>
                                  <span className="text-gray-500">{new Date(log.timestamp).toLocaleString()}</span>
                                </div>
                                <p className="mt-1 text-gray-800">{log.message}</p>
                                
                                {/* Show details if available */}
                                {log.details && (
                                  <div className="mt-2 text-xs text-gray-600">
                                    {log.details.oldValues && (
                                      <p><strong>Trước:</strong> {JSON.stringify(log.details.oldValues)}</p>
                                    )}
                                    {log.details.newValues && (
                                      <p><strong>Sau:</strong> {JSON.stringify(log.details.newValues)}</p>
                                    )}
                                  </div>
                                )}
                                
                                <div className="mt-2 flex justify-between items-center text-xs text-gray-500">
                                  <div>
                                    {log.userId && <span>User ID: {log.userId}</span>}
                                    {log.ip && <span className="ml-2">IP: {log.ip}</span>}
                                  </div>
                                  <span>Entity: {log.details?.entity} - {log.details?.entityId}</span>
                                </div>
                              </div>
                            ))}
                </div>
              )}
              </div>
            </div>
          </div>
        )}

        {/* User Activity Tab */}
        {activeTab === 'activity' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">User Activity</h2>
            </div>
            <div className="p-6">
              {userActivity.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-lg font-medium mb-2">No users found</div>
                  <div className="text-sm">User activity will appear here when users perform actions</div>
                </div>
              ) : (
              <div className="space-y-4">
                {userActivity.map((user) => (
                    <div key={user.id} className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-lg text-gray-800">{user.username || user.email}</h3>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                        </div>
                      <p className="text-sm text-gray-600">Role: {user.role}</p>
                      <p className="text-sm text-gray-600">Email: {user.email}</p>
                      <p className="text-sm text-gray-600">Joined: {new Date(user.createdAt).toLocaleDateString()}</p>

                      {user.recentActivities && user.recentActivities.length > 0 && (
                      <div className="mt-3">
                          <p className="font-medium text-gray-700">Recent Activities:</p>
                          <ul className="list-disc list-inside text-sm text-gray-600">
                            {user.recentActivities.map((activity) => (
                              <li key={activity.id}>
                                {activity.action} on {activity.entity} at {new Date(activity.createdAt).toLocaleString()}
                              </li>
                            ))}
                          </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              )}
            </div>
          </div>
        )}

        {/* Performance Metrics Tab */}
        {activeTab === 'performance' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">Performance Metrics</h2>
            </div>
            <div className="p-6">
              {performanceMetrics ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Average Response Time</p>
                    <p className="text-lg font-semibold text-blue-800">{performanceMetrics.responseTime.average}</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Requests Per Second</p>
                    <p className="text-lg font-semibold text-green-800">{performanceMetrics.throughput.requestsPerSecond}</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Error Rate</p>
                    <p className="text-lg font-semibold text-red-800">{performanceMetrics.errors.errorRate}</p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Errors (24h)</p>
                    <p className="text-lg font-semibold text-yellow-800">{performanceMetrics.errors.totalErrors}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Users</p>
                    <p className="text-lg font-semibold text-purple-800">{performanceMetrics.businessMetrics?.totalUsers || 0}</p>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Total Orders</p>
                    <p className="text-lg font-semibold text-indigo-800">{performanceMetrics.businessMetrics?.totalOrders || 0}</p>
                  </div>
                  <div className="bg-pink-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Orders Last 24h</p>
                    <p className="text-lg font-semibold text-pink-800">{performanceMetrics.businessMetrics?.ordersLast24h || 0}</p>
                  </div>
                  <div className="bg-teal-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-600">Orders Per Hour</p>
                    <p className="text-lg font-semibold text-teal-800">{performanceMetrics.businessMetrics?.ordersPerHour || 0}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-lg font-medium mb-2">No performance metrics available</div>
                  <div className="text-sm">Please ensure the backend is running and data is present.</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* User Management Tab */}
        {activeTab === 'user-management' && (
          <div className="space-y-6">
            {/* Advanced Filter */}
            <AdvancedFilter 
              filterType="users"
              users={userActivity.map(u => ({ id: u.id, username: u.username || '', role: u.role || '' }))}
              onFilterChange={setUserFilters}
            />
            
            <div className="bg-white rounded-lg shadow">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">User Management</h2>
                  <button 
                    onClick={() => setShowAddUserModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                  >
                    Add User
                  </button>
                </div>
              </div>
              <div className="p-6">
              {/* Search and Filter */}
              <div className="mb-6 flex gap-4">
                <input
                  type="text"
                  placeholder="Search users..."
                  className="flex-grow p-2 border border-gray-300 rounded-lg"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                  className="p-2 border border-gray-300 rounded-lg"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                >
                  <option value="">All Roles</option>
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="CASHIER">Cashier</option>
                  <option value="WAITER">Waiter</option>
                  <option value="KITCHEN">Kitchen</option>
                </select>
              </div>

              {userActivity.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
                  <div className="text-lg font-medium mb-2">No users found</div>
                  <div className="text-sm">Create new users to manage them here.</div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full bg-white">
                    <thead>
                      <tr>
                        <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Username</th>
                        <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Email</th>
                        <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Role</th>
                        <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Status</th>
                        <th className="py-2 px-4 border-b text-left text-sm font-semibold text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="py-2 px-4 border-b text-sm text-gray-800">{user.username}</td>
                          <td className="py-2 px-4 border-b text-sm text-gray-800">{user.email}</td>
                          <td className="py-2 px-4 border-b text-sm text-gray-800">{user.role}</td>
                          <td className="py-2 px-4 border-b text-sm text-gray-800">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-2 px-4 border-b text-sm">
                            <button
                              onClick={() => { setSelectedUser(user); setShowEditUserModal(true); }}
                              className="text-blue-600 hover:text-blue-800 mr-3"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleToggleUserStatus(user.id, !user.isActive)}
                              className={`text-${user.isActive ? 'yellow' : 'green'}-600 hover:text-${user.isActive ? 'yellow' : 'green'}-800 mr-3`}
                            >
                              {user.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="space-y-6">
            {/* Header với nút refresh */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Analytics Dashboard</h2>
                <button
                  onClick={loadData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                  disabled={loading}
                >
                  <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {loading ? 'Đang tải...' : 'Làm mới'}
                </button>
              </div>
            </div>
            
            {/* Advanced Filter */}
            <AdvancedFilter 
              filterType="analytics"
              users={userActivity.map(u => ({ id: u.id, username: u.username || '', role: u.role || '' }))}
              onFilterChange={setAnalyticsFilters}
            />
            
            {/* Data Export */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <DataExport dataType="users" />
              <DataExport dataType="logs" />
              <DataExport dataType="analytics" />
            </div>
            
            {/* Báo cáo Excel */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-xl font-semibold mb-4">Xuất Báo Cáo Excel</h3>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <DataExport dataType="sales-report" />
                <DataExport dataType="inventory-report" />
                <DataExport dataType="revenue-report" />
              </div>
            </div>

            {/* Xuất chi tiết đơn hàng */}
            <ExportOrderDetails />
            
            {/* Overview Cards */}
            {analyticsData && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Users</p>
                      <p className="text-2xl font-semibold text-gray-900">{analyticsData.users?.totalUsers || 0}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M18 14h.01" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Orders</p>
                      <p className="text-2xl font-semibold text-gray-900">{analyticsData.orders?.totalOrders || 0}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                      <p className="text-2xl font-semibold text-gray-900">{analyticsData.revenue?.totalRevenue?.toLocaleString('vi-VN', { style: 'currency', currency: 'VND' }) || '0 ₫'}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-lg shadow">
                  <div className="flex items-center">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm font-medium text-gray-600">Error Logs (24h)</p>
                      <p className="text-2xl font-semibold text-gray-900">{analyticsData.system?.errorLogs || 0}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Advanced Charts */}
            <AnalyticsCharts analyticsData={analyticsData} />
          </div>
        )}

        {/* Receipt Settings Tab */}
        {activeTab === 'receipt-settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Cấu hình hóa đơn với QR Code</h2>
              <p className="text-gray-600 mb-6">
                Tùy chỉnh thông tin cửa hàng và cấu hình hóa đơn với QR code cho máy in XP-80C
              </p>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Thông tin cửa hàng */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Thông tin cửa hàng</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tên cửa hàng</label>
                      <input
                        type="text"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="NHÀ TÔI ERP"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phụ đề</label>
                      <input
                        type="text"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Hệ thống quản lý quán ăn"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                      <textarea
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                        placeholder="123 Đường ABC, Quận 1, TP.HCM"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Điện thoại</label>
                        <input
                          type="text"
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0123 456 789"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="info@nhatoi.com"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                        <input
                          type="text"
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="www.nhatoi.com"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mã số thuế</label>
                        <input
                          type="text"
                          className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="0123456789"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Cấu hình QR Code */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Cấu hình QR Code</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Bật QR Code</label>
                      <input type="checkbox" className="rounded" defaultChecked />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kích thước QR Code</label>
                      <input
                        type="number"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="200"
                        defaultValue="200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Margin QR Code</label>
                      <input
                        type="number"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="2"
                        defaultValue="2"
                      />
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-700">Tùy chọn hiển thị</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm text-gray-600">Hiển thị QR Code</label>
                          <input type="checkbox" className="rounded" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-sm text-gray-600">Hiển thị Website</label>
                          <input type="checkbox" className="rounded" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-sm text-gray-600">Hiển thị MST</label>
                          <input type="checkbox" className="rounded" defaultChecked />
                        </div>
                        <div className="flex items-center justify-between">
                          <label className="text-sm text-gray-600">Hiển thị "Cảm ơn"</label>
                          <input type="checkbox" className="rounded" defaultChecked />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tin nhắn tùy chỉnh</label>
                      <textarea
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="Cảm ơn quý khách đã sử dụng dịch vụ!"
                        defaultValue="Cảm ơn quý khách đã sử dụng dịch vụ!"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/printer/enhanced/test');
                      if (response.ok) {
                        const receiptText = await response.text();
                        const blob = new Blob([receiptText], { type: 'text/plain' });
                        const url = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'test-receipt.txt';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(url);
                        alert('File hóa đơn test đã được tải xuống!');
                      }
                    } catch (error) {
                      console.error('Error testing receipt:', error);
                      alert('Lỗi khi tạo hóa đơn test');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Test hóa đơn
                </button>
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/printer/enhanced/qr', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ orderId: 'test-order' }),
                      });
                      if (response.ok) {
                        const qrSvg = await response.text();
                        const newWindow = window.open('', '_blank');
                        if (newWindow) {
                          newWindow.document.write(`
                            <html>
                              <head><title>QR Code Test</title></head>
                              <body style="text-align: center; padding: 20px;">
                                <h2>QR Code Test</h2>
                                ${qrSvg}
                                <p>Quét mã QR này để xem thông tin hóa đơn</p>
                              </body>
                            </html>
                          `);
                        }
                        alert('QR Code đã được tạo!');
                      }
                    } catch (error) {
                      console.error('Error testing QR code:', error);
                      alert('Lỗi khi tạo QR code');
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  Test QR Code
                </button>
                <button
                  onClick={() => alert('Cấu hình đã được lưu!')}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Lưu cấu hình
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tax Settings Tab */}
        {activeTab === 'tax-settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Cấu hình thuế và phí</h2>
              <p className="text-gray-600 mb-6">
                Thiết lập thuế VAT, phí phục vụ và các loại thuế khác cho hệ thống
              </p>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Cấu hình thuế VAT */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Thuế VAT</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Bật thuế VAT</label>
                      <input 
                        type="checkbox" 
                        className="rounded" 
                        checked={taxConfig.vatEnabled}
                        onChange={(e) => setTaxConfig({ ...taxConfig, vatEnabled: e.target.checked })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tỷ lệ thuế VAT (%)</label>
                      <input
                        type="number"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="10"
                        value={taxConfig.vatRate}
                        onChange={(e) => setTaxConfig({ ...taxConfig, vatRate: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tên thuế</label>
                      <input
                        type="text"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="VAT"
                        value={taxConfig.vatName}
                        onChange={(e) => setTaxConfig({ ...taxConfig, vatName: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Thuế đã bao gồm trong giá</label>
                      <input 
                        type="checkbox" 
                        className="rounded"
                        checked={taxConfig.taxInclusive}
                        onChange={(e) => setTaxConfig({ ...taxConfig, taxInclusive: e.target.checked })}
                      />
                    </div>
                  </div>
                </div>

                {/* Cấu hình phí phục vụ */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Phí phục vụ</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Bật phí phục vụ</label>
                      <input 
                        type="checkbox" 
                        className="rounded"
                        checked={taxConfig.serviceChargeEnabled}
                        onChange={(e) => setTaxConfig({ ...taxConfig, serviceChargeEnabled: e.target.checked })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tỷ lệ phí phục vụ (%)</label>
                      <input
                        type="number"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="5"
                        value={taxConfig.serviceChargeRate}
                        onChange={(e) => setTaxConfig({ ...taxConfig, serviceChargeRate: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tên phí phục vụ</label>
                      <input
                        type="text"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Phí phục vụ"
                        value={taxConfig.serviceChargeName}
                        onChange={(e) => setTaxConfig({ ...taxConfig, serviceChargeName: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-medium mb-4">Cấu hình mặc định</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <button
                    onClick={() => alert('Đã áp dụng cấu hình: Không thuế')}
                    className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
                  >
                    <h4 className="font-medium">Không thuế</h4>
                    <p className="text-sm text-gray-600">VAT: 0%, Phí phục vụ: 0%</p>
                  </button>
                  <button
                    onClick={() => alert('Đã áp dụng cấu hình: VAT 10%')}
                    className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
                  >
                    <h4 className="font-medium">VAT 10%</h4>
                    <p className="text-sm text-gray-600">VAT: 10%, Phí phục vụ: 0%</p>
                  </button>
                  <button
                    onClick={() => alert('Đã áp dụng cấu hình: VAT 10% + Phí phục vụ 5%')}
                    className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
                  >
                    <h4 className="font-medium">VAT + Phí phục vụ</h4>
                    <p className="text-sm text-gray-600">VAT: 10%, Phí phục vụ: 5%</p>
                  </button>
                  <button
                    onClick={() => alert('Đã áp dụng cấu hình: Chỉ phí phục vụ 10%')}
                    className="p-4 border border-gray-300 rounded-lg hover:bg-gray-50 text-left"
                  >
                    <h4 className="font-medium">Chỉ phí phục vụ</h4>
                    <p className="text-sm text-gray-600">VAT: 0%, Phí phục vụ: 10%</p>
                  </button>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={async () => {
                    try {
                      const response = await api.post('/print/calculate-tax', { subtotal: 100000 });
                      if (response.data.success) {
                        alert(`Test tính thuế: ${JSON.stringify(response.data.taxCalculation, null, 2)}`);
                      }
                    } catch (error) {
                      console.error('Error testing tax calculation:', error);
                      alert('Lỗi khi test tính thuế');
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  Test tính thuế
                </button>
                <button
                  onClick={async () => {
                    try {
                      setTaxConfigLoading(true);
                      
                      const configToSave = {
                        vatEnabled: taxConfig.vatEnabled,
                        vatRate: taxConfig.vatRate,
                        taxName: taxConfig.vatName,
                        taxInclusive: taxConfig.taxInclusive,
                        serviceChargeEnabled: taxConfig.serviceChargeEnabled,
                        serviceChargeRate: taxConfig.serviceChargeRate,
                        serviceChargeName: taxConfig.serviceChargeName,
                        currency: 'VND',
                        currencySymbol: '₫',
                        roundingMethod: 'round'
                      };

                      const response = await api.post('/print/tax-config', configToSave);
                      
                      if (response.data.success) {
                        alert('✅ Cấu hình thuế đã được lưu thành công!');
                        // Reload để đảm bảo hiển thị đúng
                        await loadTaxConfig();
                      } else {
                        alert('❌ Lỗi khi lưu cấu hình thuế: ' + response.data.message);
                      }
                    } catch (error) {
                      console.error('Error saving tax config:', error);
                      alert('❌ Lỗi khi lưu cấu hình thuế: ' + (error instanceof Error ? error.message : String(error)));
                    } finally {
                      setTaxConfigLoading(false);
                    }
                  }}
                  disabled={taxConfigLoading}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {taxConfigLoading ? 'Đang lưu...' : 'Lưu cấu hình'}
                </button>
              </div>
            </div>

            {/* Cấu hình thông tin ngân hàng */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Cấu hình thông tin ngân hàng</h2>
              <p className="text-gray-600 mb-6">
                Thiết lập thông tin ngân hàng để tạo QR code thanh toán VietQR
              </p>
              
              <div className="max-w-md space-y-4">
                {/* VietQR Configuration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">VietQR</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Chọn ngân hàng</label>
                      <select 
                        id="bankSelect"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        onChange={(e) => {
                          const selectedBank = e.target.value;
                          const bankIdInput = document.getElementById('bankId') as HTMLInputElement;
                          const bankNameInput = document.getElementById('bankName') as HTMLInputElement;
                          if (bankIdInput && bankNameInput) {
                            bankIdInput.value = selectedBank;
                            bankNameInput.value = e.target.selectedOptions[0].text;
                          }
                        }}
                      >
                        <option value="970436">Vietcombank</option>
                        <option value="970407">Techcombank</option>
                        <option value="970418">BIDV</option>
                        <option value="970405">Agribank</option>
                        <option value="970422" selected>MB Bank</option>
                        <option value="970432">VPBank</option>
                        <option value="970416">ACB</option>
                        <option value="970415">VietinBank</option>
                        <option value="970409">Sacombank</option>
                        <option value="970428">HDBank</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bank ID</label>
                      <input
                        id="bankId"
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="970422"
                        defaultValue="970422"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tên ngân hàng</label>
                      <input
                        id="bankName"
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="MB Bank"
                        defaultValue="MB Bank"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Số tài khoản</label>
                      <input
                        id="accountNumber"
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nhập số tài khoản thật"
                        defaultValue=""
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tên chủ tài khoản</label>
                      <input
                        id="accountName"
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nhập tên thật của bạn"
                        defaultValue=""
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Template</label>
                      <select 
                        id="template"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="compact2" selected>Compact2 (Khuyến nghị)</option>
                        <option value="compact">Compact</option>
                        <option value="qr_only">QR Only</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={async () => {
                    try {
                      const response = await fetch('/api/printer/enhanced/bank-qr', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ amount: 100000, description: 'Test QR Bank' })
                      });
                      if (response.ok) {
                        const qrSvg = await response.text();
                        const newWindow = window.open('', '_blank');
                        if (newWindow) {
                          newWindow.document.write(`
                            <html>
                              <head><title>Test QR Bank</title></head>
                              <body style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
                                <h2>Test QR Bank</h2>
                                <p>Số tiền: 100,000 ₫</p>
                                ${qrSvg}
                                <p>Quét mã QR để thanh toán</p>
                              </body>
                            </html>
                          `);
                        }
                      }
                    } catch (error) {
                      alert('Lỗi khi test QR Bank: ' + (error instanceof Error ? error.message : String(error)));
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Test QR Bank
                </button>
                <button
                  onClick={async () => {
                    try {
                      const bankId = (document.getElementById('bankId') as HTMLInputElement)?.value || '970422';
                      const bankName = (document.getElementById('bankName') as HTMLInputElement)?.value || 'MB Bank';
                      const accountNumber = (document.getElementById('accountNumber') as HTMLInputElement)?.value || '';
                      const accountName = (document.getElementById('accountName') as HTMLInputElement)?.value || '';
                      const template = (document.getElementById('template') as HTMLSelectElement)?.value || 'compact2';

                      if (!accountNumber || !accountName) {
                        alert('Vui lòng nhập đầy đủ số tài khoản và tên chủ tài khoản!');
                        return;
                      }

                      const response = await fetch('/api/printer/enhanced/bank-config', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          bankId: bankId,
                          bankName: bankName,
                          accountNumber: accountNumber,
                          accountName: accountName,
                          template: template
                        })
                      });
                      if (response.ok) {
                        alert('Cấu hình ngân hàng đã được lưu thành công!');
                      } else {
                        alert('Lỗi khi lưu cấu hình ngân hàng!');
                      }
                    } catch (error) {
                      alert('Lỗi khi lưu cấu hình ngân hàng: ' + (error instanceof Error ? error.message : String(error)));
                    }
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Lưu cấu hình ngân hàng
                </button>
              </div>
            </div>
          </div>
        )}

        {/* VietQR Settings Tab */}
        {activeTab === 'vietqr-settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Cấu hình VietQR</h2>
              <p className="text-gray-600 mb-6">
                Thiết lập thông tin ngân hàng để tạo QR code thanh toán VietQR động
              </p>
              
              <div className="max-w-md space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã ngân hàng (AcqId)</label>
                  <select 
                    value={vietQRConfig.acqId}
                    onChange={(e) => {
                      const acqId = parseInt(e.target.value);
                      setVietQRConfig({ ...vietQRConfig, acqId });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="970436">970436 - Vietcombank</option>
                    <option value="970407">970407 - Techcombank</option>
                    <option value="970418">970418 - BIDV</option>
                    <option value="970405">970405 - Agribank</option>
                    <option value="970422">970422 - MB Bank</option>
                    <option value="970432">970432 - VPBank</option>
                    <option value="970416">970416 - ACB</option>
                    <option value="970415">970415 - VietinBank</option>
                    <option value="970409">970409 - Sacombank</option>
                    <option value="970428">970428 - HDBank</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số tài khoản</label>
                  <input
                    type="text"
                    value={vietQRConfig.accountNo}
                    onChange={(e) => setVietQRConfig({ ...vietQRConfig, accountNo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0123456789"
                  />
                  <p className="text-xs text-gray-500 mt-1">Nhập số tài khoản thật để tạo QR code thanh toán</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên chủ tài khoản</label>
                  <input
                    type="text"
                    value={vietQRConfig.accountName}
                    onChange={(e) => setVietQRConfig({ ...vietQRConfig, accountName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="LAU MAM NHA TOI"
                  />
                  <p className="text-xs text-gray-500 mt-1">Tên hiển thị trên QR code (tối đa 25 ký tự)</p>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={async () => {
                    try {
                      // Test QR bằng cách mở QR modal
                      const qrUrl = `https://img.vietqr.io/image/${vietQRConfig.acqId}-${vietQRConfig.accountNo}-compact2.png?amount=100000&addInfo=TEST&accountName=${encodeURIComponent(vietQRConfig.accountName)}`;
                      const newWindow = window.open('', '_blank');
                      if (newWindow) {
                        newWindow.document.write(`
                          <html>
                            <head><title>Test QR VietQR</title></head>
                            <body style="text-align: center; padding: 20px; font-family: Arial, sans-serif;">
                              <h2>Test QR VietQR</h2>
                              <p>Số tiền: 100,000 ₫</p>
                              <img src="${qrUrl}" alt="QR Code" style="width: 256px; height: 256px; border: 2px solid #ccc; border-radius: 8px;" />
                              <p>Quét mã QR để thanh toán</p>
                              <p style="font-size: 12px; color: #666;">Ngân hàng: ${vietQRConfig.acqId}</p>
                              <p style="font-size: 12px; color: #666;">STK: ${vietQRConfig.accountNo}</p>
                              <p style="font-size: 12px; color: #666;">Tên: ${vietQRConfig.accountName}</p>
                            </body>
                          </html>
                        `);
                      }
                    } catch (error) {
                      alert('Lỗi khi test QR: ' + (error instanceof Error ? error.message : String(error)));
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Test QR Code
                </button>
                <button
                  onClick={async () => {
                    try {
                      setVietQRConfigLoading(true);
                      
                      const response = await api.post('/print/vietqr-config', vietQRConfig);
                      
                      if (response.data.success) {
                        alert('✅ Cấu hình VietQR đã được lưu thành công!');
                        // Reload để đảm bảo hiển thị đúng
                        await loadVietQRConfig();
                      } else {
                        alert('❌ Lỗi khi lưu cấu hình VietQR: ' + response.data.message);
                      }
                    } catch (error) {
                      console.error('Error saving VietQR config:', error);
                      alert('❌ Lỗi khi lưu cấu hình VietQR: ' + (error instanceof Error ? error.message : String(error)));
                    } finally {
                      setVietQRConfigLoading(false);
                    }
                  }}
                  disabled={vietQRConfigLoading}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {vietQRConfigLoading ? 'Đang lưu...' : 'Lưu cấu hình'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Printer Settings Tab */}
        {activeTab === 'printer-settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Cấu hình máy in</h2>
              <p className="text-gray-600 mb-6">
                Kết nối máy in Xprinter qua cổng USB
              </p>
              
              <div className="max-w-md space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800 mb-3">
                    <strong>📌 Kết nối USB:</strong> Máy in Xprinter phải được kết nối trực tiếp vào máy tính/server qua cổng USB.
                  </p>
                  <div className="text-sm text-blue-700 space-y-2">
                    <p><strong>Hướng dẫn:</strong></p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Kết nối máy in vào cổng USB của máy tính/server</li>
                      <li>Đảm bảo máy in đã được cài driver trên máy tính/server</li>
                      <li>Hệ thống sẽ tự động tìm và kết nối máy in USB</li>
                      <li>Không cần cấu hình IP hay port cho USB</li>
                    </ul>
                  </div>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Trạng thái kết nối:</p>
                  <p className="text-xs text-gray-600">
                    Máy in sẽ được tự động phát hiện khi có kết nối USB. 
                    Nếu không thấy máy in, hãy kiểm tra lại cáp USB và driver.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={async () => {
                    try {
                      setPrinterConfigLoading(true);
                      
                      // Luôn dùng USB
                      const configToSave = {
                        type: 'usb',
                        ip: '192.168.1.100',
                        port: 9100
                      };
                      
                      const response = await api.post('/print/printer-config', configToSave);
                      
                      if (response.data.success) {
                        alert('✅ Cấu hình máy in USB đã được lưu thành công!\n\nĐảm bảo máy in đã được kết nối qua USB và có driver.');
                        // Reload để đảm bảo hiển thị đúng
                        await loadPrinterConfig();
                      } else {
                        alert('❌ Lỗi khi lưu cấu hình máy in: ' + response.data.message);
                      }
                    } catch (error) {
                      console.error('Error saving printer config:', error);
                      alert('❌ Lỗi khi lưu cấu hình máy in: ' + (error instanceof Error ? error.message : String(error)));
                    } finally {
                      setPrinterConfigLoading(false);
                    }
                  }}
                  disabled={printerConfigLoading}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  {printerConfigLoading ? 'Đang lưu...' : 'Lưu cấu hình'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Add New User</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const userData = {
                username: formData.get('username') as string,
                email: formData.get('email') as string,
                password: formData.get('password') as string,
                firstName: formData.get('firstName') as string,
                lastName: formData.get('lastName') as string,
                role: formData.get('role') as string,
                isActive: (formData.get('isActive') === 'on')
              };
              await handleAddUser(userData);
            }}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="firstName">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="lastName">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="role">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                >
                  <option value="WAITER">Waiter</option>
                  <option value="CASHIER">Cashier</option>
                  <option value="KITCHEN">Kitchen</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="mb-4 flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  name="isActive"
                  className="mr-2 leading-tight"
                  defaultChecked
                />
                <label className="text-gray-700 text-sm font-bold" htmlFor="isActive">
                  Is Active
                </label>
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Add User
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditUserModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-4">Edit User</h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const userData = {
                username: formData.get('username') as string,
                email: formData.get('email') as string,
                firstName: formData.get('firstName') as string,
                lastName: formData.get('lastName') as string,
                role: formData.get('role') as string,
                isActive: (formData.get('isActive') === 'on')
              };
              await handleEditUser(selectedUser.id, userData);
            }}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="edit-username">
                  Username
                </label>
                <input
                  type="text"
                  id="edit-username"
                  name="username"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  defaultValue={selectedUser.username}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="edit-email">
                  Email
                </label>
                <input
                  type="email"
                  id="edit-email"
                  name="email"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  defaultValue={selectedUser.email}
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="edit-firstName">
                  First Name
                </label>
                <input
                  type="text"
                  id="edit-firstName"
                  name="firstName"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  defaultValue={selectedUser.firstName}
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="edit-lastName">
                  Last Name
                </label>
                <input
                  type="text"
                  id="edit-lastName"
                  name="lastName"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  defaultValue={selectedUser.lastName}
                />
              </div>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="edit-role">
                  Role
                </label>
                <select
                  id="edit-role"
                  name="role"
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  defaultValue={selectedUser.role}
                  required
                >
                  <option value="WAITER">Waiter</option>
                  <option value="CASHIER">Cashier</option>
                  <option value="KITCHEN">Kitchen</option>
                  <option value="MANAGER">Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="mb-4 flex items-center">
                <input
                  type="checkbox"
                  id="edit-isActive"
                  name="isActive"
                  className="mr-2 leading-tight"
                  defaultChecked={selectedUser.isActive}
                />
                <label className="text-gray-700 text-sm font-bold" htmlFor="edit-isActive">
                  Is Active
                </label>
              </div>
              <div className="flex items-center justify-between">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Update User
                </button>
                <button
                  type="button"
                  onClick={() => { setShowEditUserModal(false); setSelectedUser(null); }}
                  className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
                >
                  Cancel
                </button>
              </div>
            </form>
            </div>
          </div>
        )}

        {/* Receipt Settings Tab */}
        {activeTab === 'receipt-settings' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Cấu hình thiết kế hóa đơn</h2>
              <p className="text-gray-600 mb-6">
                Tùy chỉnh giao diện và nội dung hóa đơn in trên máy Xprinter T80L
              </p>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Header Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Thông tin cửa hàng</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Logo/Icon</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="🍽️"
                        defaultValue="🍽️"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tên cửa hàng</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="NHÀ TÔI ERP"
                        defaultValue="NHÀ TÔI ERP"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Slogan</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Hệ thống quản lý quán ăn"
                        defaultValue="Hệ thống quản lý quán ăn"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="123 Đường ABC, Quận XYZ, TP.HCM"
                        defaultValue="123 Đường ABC, Quận XYZ, TP.HCM"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0123 456 789"
                        defaultValue="0123 456 789"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="info@nhatoi-erp.com"
                        defaultValue="info@nhatoi-erp.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="www.nhatoi-erp.com"
                        defaultValue="www.nhatoi-erp.com"
                      />
                    </div>
                  </div>
                </div>

                {/* Receipt Info Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Thông tin hóa đơn</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Hiển thị số hóa đơn</label>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Hiển thị bàn</label>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Hiển thị khách hàng</label>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Hiển thị ngày</label>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Hiển thị giờ</label>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Hiển thị thu ngân</label>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                  </div>
                </div>

                {/* Style Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Thiết kế</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Khổ giấy</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="58">58mm</option>
                        <option value="80" selected>80mm</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kích thước chữ</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="small">Nhỏ</option>
                        <option value="medium" selected>Vừa</option>
                        <option value="large">Lớn</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">In đậm tiêu đề</label>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">In đậm tổng cộng</label>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Hiển thị viền</label>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Hiển thị đường phân cách</label>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Chế độ compact (tiết kiệm giấy)</label>
                      <input type="checkbox" className="rounded" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tối đa ký tự tên món</label>
                      <input
                        type="number"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="20"
                        defaultValue="20"
                        min="10"
                        max="30"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Settings */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Chân trang</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Hiển thị thuế</label>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Hiển thị giảm giá</label>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Hiển thị tổng cộng</label>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Hiển thị QR code</label>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700">Hiển thị thông tin ngân hàng</label>
                      <input type="checkbox" defaultChecked className="rounded" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Lời nhắn tùy chỉnh</label>
                      <textarea
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                        placeholder="Cảm ơn quý khách đã sử dụng dịch vụ!"
                        defaultValue="Cảm ơn quý khách đã sử dụng dịch vụ!"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Lời cảm ơn</label>
                      <input
                        type="text"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Hẹn gặp lại!"
                        defaultValue="Hẹn gặp lại!"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <button
                  onClick={async () => {
                    try {
                      // TODO: Implement save receipt config
                      alert('Cấu hình hóa đơn đã được lưu!');
                    } catch (error) {
                      alert('Lỗi khi lưu cấu hình hóa đơn: ' + (error instanceof Error ? error.message : String(error)));
                    }
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Lưu cấu hình hóa đơn
                </button>
                <button
                  onClick={async () => {
                    try {
                      // TODO: Implement reset receipt config
                      alert('Cấu hình hóa đơn đã được reset về mặc định!');
                    } catch (error) {
                      alert('Lỗi khi reset cấu hình hóa đơn: ' + (error instanceof Error ? error.message : String(error)));
                    }
                  }}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Reset về mặc định
                </button>
                <button
                  onClick={async () => {
                    try {
                      // Test print receipt
                      const response = await fetch('/api/printer/xprinter/content/test-order', {
                        method: 'GET'
                      });
                      
                      if (response.ok) {
                        const receiptText = await response.text();
                        const newWindow = window.open('', '_blank');
                        if (newWindow) {
                          newWindow.document.write(`
                            <html>
                              <head>
                                <title>Xem trước hóa đơn</title>
                                <style>
                                  body { 
                                    font-family: 'Courier New', monospace; 
                                    font-size: 12px; 
                                    line-height: 1.2; 
                                    margin: 20px; 
                                    background: white;
                                  }
                                  pre { 
                                    white-space: pre-wrap; 
                                    word-wrap: break-word; 
                                    margin: 0;
                                  }
                                </style>
                              </head>
                              <body>
                                <h2>Xem trước hóa đơn</h2>
                                <div style="border: 1px solid #ccc; padding: 10px; background: #f9f9f9;">
                                  <pre>${receiptText}</pre>
                                </div>
                                <p><small>Đây là bản xem trước. Hóa đơn thực tế sẽ được in trên máy Xprinter T80L.</small></p>
                              </body>
                            </html>
                          `);
                        }
                      } else {
                        alert('Lỗi khi tạo hóa đơn mẫu');
                      }
                    } catch (error) {
                      alert('Lỗi khi tạo hóa đơn mẫu: ' + (error instanceof Error ? error.message : String(error)));
                    }
                  }}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Xem trước hóa đơn
                </button>
                <button
                  onClick={async () => {
                    try {
                      // Lấy thông tin kích thước hóa đơn
                      const response = await fetch('/api/printer/xprinter/size-info/test-order', {
                        method: 'GET'
                      });
                      
                      if (response.ok) {
                        const result = await response.json();
                        const sizeInfo = result;
                        alert(`📏 Thông tin kích thước hóa đơn:\n\n` +
                              `📐 Chiều rộng: ${sizeInfo.width}mm\n` +
                              `📏 Chiều dài ước tính: ${sizeInfo.estimatedLength}mm\n` +
                              `🍽️ Số món ăn: ${sizeInfo.itemCount}\n` +
                              `⚙️ Chế độ: ${sizeInfo.compactMode ? 'Compact' : 'Bình thường'}`);
                      } else {
                        alert('Lỗi khi lấy thông tin kích thước hóa đơn');
                      }
                    } catch (error) {
                      alert('Lỗi khi lấy thông tin kích thước: ' + (error instanceof Error ? error.message : String(error)));
                    }
                  }}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Thông tin kích thước
                </button>
              </div>
            </div>
          </div>
        )}

      {/* AI Chatbot */}
      {showChatbot && <AIChatbot onClose={() => setShowChatbot(false)} />}
      
      {/* Chatbot Toggle Button */}
      {!showChatbot && (
        <button
          onClick={() => setShowChatbot(true)}
          className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full p-4 shadow-lg hover:shadow-xl hover:from-blue-700 hover:to-blue-800 transition-all z-40"
          title="Mở AI Chatbot"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      )}
    </div>
  );
}