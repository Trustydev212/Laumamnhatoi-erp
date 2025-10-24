'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import AnalyticsCharts from '@/components/analytics-charts';
import NotificationSystem from '@/components/notification-system';
import DataExport from '@/components/data-export';
import AdvancedFilter from '@/components/advanced-filter';

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

    // Auto refresh data every 30 seconds
    const interval = setInterval(() => {
      loadData();
    }, 30000);

    return () => clearInterval(interval);
  }, [user, router]);

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
          </div>
        </div>

        {/* System Health Tab */}
        {activeTab === 'health' && (
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">System Health Overview</h2>
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
            {/* Advanced Filter */}
            <AdvancedFilter 
              filterType="analytics"
              users={userActivity.map(u => ({ id: u.id, username: u.username || '', role: u.role || '' }))}
              onFilterChange={setAnalyticsFilters}
            />
            
            {/* Data Export */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <DataExport dataType="users" />
              <DataExport dataType="logs" />
              <DataExport dataType="analytics" />
            </div>
            
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
    </div>
  );
}