'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { ShoppingCartIcon, BoxIcon, UsersIcon, ChartBarIcon, CogIcon, CurrencyDollarIcon, ClipboardIcon, RestaurantIcon, PlusIcon } from '@/components/icons';

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
        <div className="text-center mb-6 sm:mb-8 order-1">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
            Chào mừng đến với Nhà Tôi ERP
          </h2>
          <p className="text-gray-500 text-sm sm:text-base">
            Hệ thống quản lý quán ăn đã sẵn sàng hoạt động
          </p>
        </div>

        {/* Main Modules Grid - Order 2 on mobile/tablet, Order 3 on desktop */}
        <div className="order-2 lg:order-3">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Các module</h3>
          <div className={`grid grid-cols-1 sm:grid-cols-2 ${
            user?.role === 'ADMIN' 
              ? 'lg:grid-cols-3 xl:grid-cols-5' 
              : 'lg:grid-cols-2 xl:grid-cols-4'
          } gap-4 sm:gap-6`}>
            <div 
              className="card p-5 sm:p-6 text-center cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border-transparent hover:border-blue-200"
              onClick={() => handleModuleClick('pos')}
            >
              <div className="flex justify-center mb-3">
                <div className="p-3 bg-blue-50 rounded-lg">
                  <ShoppingCartIcon className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" />
                </div>
              </div>
              <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1">POS</h3>
              <p className="text-xs sm:text-sm text-gray-500">Bán hàng</p>
            </div>
            <div 
              className="card p-5 sm:p-6 text-center cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border-transparent hover:border-orange-200"
              onClick={() => handleModuleClick('inventory')}
            >
              <div className="flex justify-center mb-3">
                <div className="p-3 bg-orange-50 rounded-lg">
                  <BoxIcon className="w-8 h-8 sm:w-10 sm:h-10 text-orange-600" />
                </div>
              </div>
              <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1">Kho</h3>
              <p className="text-xs sm:text-sm text-gray-500">Quản lý nguyên liệu</p>
            </div>
            <div 
              className="card p-5 sm:p-6 text-center cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border-transparent hover:border-purple-200"
              onClick={() => handleModuleClick('customers')}
            >
              <div className="flex justify-center mb-3">
                <div className="p-3 bg-purple-50 rounded-lg">
                  <UsersIcon className="w-8 h-8 sm:w-10 sm:h-10 text-purple-600" />
                </div>
              </div>
              <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1">Khách hàng</h3>
              <p className="text-xs sm:text-sm text-gray-500">CRM</p>
            </div>
            <div 
              className="card p-5 sm:p-6 text-center cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border-transparent hover:border-green-200"
              onClick={() => handleModuleClick('reports')}
            >
              <div className="flex justify-center mb-3">
                <div className="p-3 bg-green-50 rounded-lg">
                  <ChartBarIcon className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
                </div>
              </div>
              <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1">Báo cáo</h3>
              <p className="text-xs sm:text-sm text-gray-500">Thống kê</p>
            </div>
            {user?.role === 'ADMIN' && (
              <div 
                className="card p-5 sm:p-6 text-center cursor-pointer hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 border-transparent hover:border-gray-300"
                onClick={() => handleModuleClick('admin')}
              >
                <div className="flex justify-center mb-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <CogIcon className="w-8 h-8 sm:w-10 sm:h-10 text-gray-600" />
                  </div>
                </div>
                <h3 className="font-semibold text-sm sm:text-base text-gray-900 mb-1">Admin</h3>
                <p className="text-xs sm:text-sm text-gray-500">Quản trị hệ thống</p>
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
              <div className="card p-5 sm:p-6 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-medium text-blue-700">Doanh thu hôm nay</span>
                <CurrencyDollarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
                <p className="text-xl sm:text-2xl font-bold text-blue-900 mb-1">
                  {formatCurrency(stats.todayRevenue)}
                </p>
                <p className="text-xs text-blue-600/80">
                  {stats.todayOrders} đơn hàng
                </p>
              </div>

              <div className="card p-5 sm:p-6 bg-gradient-to-br from-green-50 to-green-100 border border-green-200/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-medium text-green-700">Đơn hàng hôm nay</span>
                <ClipboardIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
                <p className="text-xl sm:text-2xl font-bold text-green-900 mb-1">
                  {stats.todayOrders.toLocaleString('vi-VN')}
                </p>
                <p className="text-xs text-green-600/80">
                  Đã thanh toán
                </p>
              </div>

              <div className="card p-5 sm:p-6 bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-medium text-purple-700">Khách hàng</span>
                <UsersIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
                <p className="text-xl sm:text-2xl font-bold text-purple-900 mb-1">
                  {stats.totalCustomers.toLocaleString('vi-VN')}
                </p>
                <p className="text-xs text-purple-600/80">
                  Đang hoạt động
                </p>
              </div>

              <div className="card p-5 sm:p-6 bg-gradient-to-br from-orange-50 to-orange-100 border border-orange-200/50">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-medium text-orange-700">Món ăn</span>
                <RestaurantIcon className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
              </div>
                <p className="text-xl sm:text-2xl font-bold text-orange-900 mb-1">
                  {stats.totalMenuItems.toLocaleString('vi-VN')}
                </p>
                <p className="text-xs text-orange-600/80">
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
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <ClipboardIcon className="w-5 h-5 text-gray-600" />
                Đơn hàng gần đây
              </h3>
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
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-gray-900">
                        {order.orderNumber}
                      </span>
                      {order.status === 'COMPLETED' && (
                        <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full font-medium">
                          Hoàn thành
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1.5">
                      Bàn: {order.table?.name || 'N/A'}
                      {order.user && ` • NV: ${order.user.firstName} ${order.user.lastName}`}
                    </div>
                  </div>
                  <div className="text-right ml-4 flex-shrink-0">
                    <p className="text-sm font-bold text-gray-900">
                      {formatCurrency(Number(order.total || order.subtotal || 0))}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatDate(order.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Tips Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 order-5">
          <div className="card p-5 sm:p-6 bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-200/50">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">
              Mẹo nhanh
            </h3>
            <ul className="space-y-2.5 text-sm text-gray-700">
              <li className="flex items-start gap-2.5">
                <span className="text-indigo-600 mt-0.5">•</span>
                <span>Sử dụng POS để tạo đơn hàng nhanh chóng</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-indigo-600 mt-0.5">•</span>
                <span>Kiểm tra kho định kỳ để tránh hết nguyên liệu</span>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="text-indigo-600 mt-0.5">•</span>
                <span>Xem báo cáo để theo dõi doanh thu và xu hướng</span>
              </li>
            </ul>
          </div>

          <div className="card p-5 sm:p-6 bg-gradient-to-br from-pink-50 to-pink-100/50 border border-pink-200/50">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">
              Thao tác nhanh
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => router.push('/pos')}
                className="w-full text-left px-4 py-2.5 bg-white rounded-lg hover:bg-pink-50 hover:shadow-sm transition-all text-sm font-medium text-gray-700 border border-gray-100"
              >
                <PlusIcon className="w-4 h-4 inline mr-2 text-pink-600" />
                Tạo đơn hàng mới
              </button>
              <button
                onClick={() => router.push('/reports')}
                className="w-full text-left px-4 py-2.5 bg-white rounded-lg hover:bg-pink-50 hover:shadow-sm transition-all text-sm font-medium text-gray-700 border border-gray-100"
              >
                <ChartBarIcon className="w-4 h-4 inline mr-2 text-pink-600" />
                Xem báo cáo doanh thu
              </button>
              <button
                onClick={() => router.push('/inventory')}
                className="w-full text-left px-4 py-2.5 bg-white rounded-lg hover:bg-pink-50 hover:shadow-sm transition-all text-sm font-medium text-gray-700 border border-gray-100 flex items-center"
              >
                <BoxIcon className="w-4 h-4 mr-2 text-pink-600" />
                Kiểm tra tồn kho
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
