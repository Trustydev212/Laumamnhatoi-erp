'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

interface DashboardStats {
  todayRevenue: number;
  todayOrders: number;
  totalOrders: number;
  totalCustomers: number;
  totalTables: number;
  totalMenuItems: number;
  recentOrders: any[];
}

export default function DashboardPage() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Load dashboard stats
  useEffect(() => {
    if (user) {
      loadDashboardStats();
    }
  }, [user]);

  const loadDashboardStats = async () => {
    try {
      setLoadingStats(true);
      const response = await api.get('/reports/dashboard');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Show loading or nothing while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (redirecting)
  if (!user) {
    return null;
  }

  const handleModuleClick = (module: string) => {
    switch (module) {
      case 'pos':
        router.push('/pos');
        break;
      case 'inventory':
        router.push('/inventory');
        break;
      case 'customers':
        router.push('/customers');
        break;
      case 'reports':
        router.push('/reports');
        break;
      case 'admin':
        router.push('/admin');
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                Nhà Tôi ERP
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                Xin chào, {user?.firstName} {user?.lastName}
              </span>
              <button
                onClick={logout}
                className="btn btn-outline"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 flex flex-col">
        {/* Welcome Section */}
        <div className="text-center mb-8 order-1">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
            Chào mừng đến với Nhà Tôi ERP! 🍽️
          </h2>
          <p className="text-gray-600 text-sm sm:text-base">
            Hệ thống quản lý quán ăn đã sẵn sàng hoạt động
          </p>
        </div>

        {/* Main Modules Grid - Order 2 on mobile/tablet, Order 3 on desktop */}
        <div className="order-2 lg:order-3">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Các module</h3>
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${
            user?.role === 'ADMIN' 
              ? 'lg:grid-cols-3 xl:grid-cols-5' 
              : 'lg:grid-cols-2 xl:grid-cols-4'
          } gap-4 sm:gap-6`}>
            <div 
              className="card p-4 sm:p-6 text-center cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
              onClick={() => handleModuleClick('pos')}
            >
              <div className="text-2xl sm:text-3xl mb-2">🛒</div>
              <h3 className="font-semibold text-sm sm:text-base">POS</h3>
              <p className="text-xs sm:text-sm text-gray-600">Bán hàng</p>
            </div>
            <div 
              className="card p-4 sm:p-6 text-center cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
              onClick={() => handleModuleClick('inventory')}
            >
              <div className="text-2xl sm:text-3xl mb-2">📦</div>
              <h3 className="font-semibold text-sm sm:text-base">Kho</h3>
              <p className="text-xs sm:text-sm text-gray-600">Quản lý nguyên liệu</p>
            </div>
            <div 
              className="card p-4 sm:p-6 text-center cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
              onClick={() => handleModuleClick('customers')}
            >
              <div className="text-2xl sm:text-3xl mb-2">👥</div>
              <h3 className="font-semibold text-sm sm:text-base">Khách hàng</h3>
              <p className="text-xs sm:text-sm text-gray-600">CRM</p>
            </div>
            <div 
              className="card p-4 sm:p-6 text-center cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
              onClick={() => handleModuleClick('reports')}
            >
              <div className="text-2xl sm:text-3xl mb-2">📊</div>
              <h3 className="font-semibold text-sm sm:text-base">Báo cáo</h3>
              <p className="text-xs sm:text-sm text-gray-600">Thống kê</p>
            </div>
            {user?.role === 'ADMIN' && (
              <div 
                className="card p-4 sm:p-6 text-center cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
                onClick={() => handleModuleClick('admin')}
              >
                <div className="text-2xl sm:text-3xl mb-2">⚙️</div>
                <h3 className="font-semibold text-sm sm:text-base">Admin</h3>
                <p className="text-xs sm:text-sm text-gray-600">Quản trị hệ thống</p>
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards - Order 3 on mobile/tablet, Order 2 on desktop */}
        <div className="order-3 lg:order-2">
          {loadingStats ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="card p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card p-6 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-700">Doanh thu hôm nay</span>
                  <div className="text-2xl">💰</div>
                </div>
                <p className="text-2xl font-bold text-blue-900">
                  {formatCurrency(stats.todayRevenue)}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {stats.todayOrders} đơn hàng
                </p>
              </div>

              <div className="card p-6 bg-gradient-to-br from-green-50 to-green-100 border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-700">Đơn hàng hôm nay</span>
                  <div className="text-2xl">📋</div>
                </div>
                <p className="text-2xl font-bold text-green-900">
                  {stats.todayOrders.toLocaleString('vi-VN')}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Đã thanh toán
                </p>
              </div>

              <div className="card p-6 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-purple-700">Khách hàng</span>
                  <div className="text-2xl">👥</div>
                </div>
                <p className="text-2xl font-bold text-purple-900">
                  {stats.totalCustomers.toLocaleString('vi-VN')}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  Đang hoạt động
                </p>
              </div>

              <div className="card p-6 bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-orange-700">Món ăn</span>
                  <div className="text-2xl">🍽️</div>
                </div>
                <p className="text-2xl font-bold text-orange-900">
                  {stats.totalMenuItems.toLocaleString('vi-VN')}
                </p>
                <p className="text-xs text-orange-600 mt-1">
                  {stats.totalTables} bàn
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Recent Orders Section */}
        {stats && stats.recentOrders && stats.recentOrders.length > 0 && (
          <div className="card p-6 order-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">📋 Đơn hàng gần đây</h3>
              <button
                onClick={() => router.push('/reports')}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                Xem tất cả →
              </button>
            </div>
            <div className="space-y-3">
              {stats.recentOrders.slice(0, 5).map((order: any) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                  onClick={() => router.push('/reports')}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">
                        {order.orderNumber}
                      </span>
                      {order.status === 'COMPLETED' && (
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded-full">
                          Hoàn thành
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      Bàn: {order.table?.name || 'N/A'} • 
                      {order.user && ` NV: ${order.user.firstName} ${order.user.lastName}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatCurrency(Number(order.total || order.subtotal || 0))}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Tips Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 order-5">
          <div className="card p-6 bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200">
            <h3 className="text-lg font-semibold text-indigo-900 mb-3 flex items-center gap-2">
              💡 Mẹo nhanh
            </h3>
            <ul className="space-y-2 text-sm text-indigo-800">
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>Sử dụng POS để tạo đơn hàng nhanh chóng</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>Kiểm tra kho định kỳ để tránh hết nguyên liệu</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">•</span>
                <span>Xem báo cáo để theo dõi doanh thu và xu hướng</span>
              </li>
            </ul>
          </div>

          <div className="card p-6 bg-gradient-to-br from-pink-50 to-pink-100 border border-pink-200">
            <h3 className="text-lg font-semibold text-pink-900 mb-3 flex items-center gap-2">
              ⚡ Thao tác nhanh
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => router.push('/pos')}
                className="w-full text-left px-4 py-2 bg-white rounded-lg hover:bg-pink-50 transition-colors text-sm font-medium text-pink-900"
              >
                ➕ Tạo đơn hàng mới
              </button>
              <button
                onClick={() => router.push('/reports')}
                className="w-full text-left px-4 py-2 bg-white rounded-lg hover:bg-pink-50 transition-colors text-sm font-medium text-pink-900"
              >
                📊 Xem báo cáo doanh thu
              </button>
              <button
                onClick={() => router.push('/inventory')}
                className="w-full text-left px-4 py-2 bg-white rounded-lg hover:bg-pink-50 transition-colors text-sm font-medium text-pink-900"
              >
                📦 Kiểm tra tồn kho
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
