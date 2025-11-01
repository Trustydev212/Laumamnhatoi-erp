'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import ResponsiveTable from '@/components/responsive-table';

interface SalesReportData {
  totalRevenue: number;
  totalOrders: number;
  orders: any[];
  menuStats: any;
  dailyRevenue?: Array<{
    date: string;
    revenue: number;
    orderCount: number;
  }>;
}

interface DailyRevenueData {
  dailyRevenue: Array<{
    date: string;
    revenue: number;
    orderCount: number;
  }>;
  totalRevenue: number;
  totalOrders: number;
  period: {
    startDate: string;
    endDate: string;
  };
}

interface InventoryReportData {
  totalIngredients: number;
  lowStockItems: number;
  totalValue: number;
  ingredients: any[];
}

interface CustomerReportData {
  totalCustomers: number;
  totalPoints: number;
  levelStats: any;
  customers: any[];
}

interface DashboardData {
  todayRevenue: number;
  todayOrders: number;
  totalOrders: number;
  totalCustomers: number;
  totalTables: number;
  totalMenuItems: number;
  recentOrders: any[];
}

export default function ReportsPage() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'inventory' | 'customers'>('overview');
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [salesData, setSalesData] = useState<SalesReportData | null>(null);
  const [dailyRevenueData, setDailyRevenueData] = useState<DailyRevenueData | null>(null);
  const [inventoryData, setInventoryData] = useState<InventoryReportData | null>(null);
  const [customerData, setCustomerData] = useState<CustomerReportData | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: '', // No start date filter by default
    endDate: '' // No end date filter by default
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      loadReportData();
    }
  }, [dateRange, activeTab, user]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Loading report data for tab:', activeTab);
      
      // Load dashboard data for overview
      if (activeTab === 'overview') {
        console.log('📊 Fetching dashboard data...');
        const dashboardResponse = await api.get('/reports/dashboard');
        console.log('✅ Dashboard data received:', dashboardResponse.data);
        setDashboardData(dashboardResponse.data);

        // Load daily revenue for overview chart (last 14 days)
        const endDate = new Date().toISOString().split('T')[0];
        const startDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        try {
          const dailyResponse = await api.get(`/reports/revenue-daily?startDate=${startDate}&endDate=${endDate}`);
          setDailyRevenueData(dailyResponse.data);
        } catch (error) {
          console.error('Failed to load daily revenue for overview:', error);
        }
      }
      
      // Load sales data
      if (activeTab === 'sales') {
        console.log('💰 Fetching sales data...');
        let url = '/reports/sales';
        if (dateRange.startDate && dateRange.endDate) {
          url += `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
        }
        const salesResponse = await api.get(url);
        console.log('✅ Sales data received:', salesResponse.data);
        setSalesData(salesResponse.data);

        // Load daily revenue for chart
        let dailyUrl = '/reports/revenue-daily';
        if (dateRange.startDate && dateRange.endDate) {
          dailyUrl += `?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`;
        }
        const dailyResponse = await api.get(dailyUrl);
        console.log('✅ Daily revenue data received:', dailyResponse.data);
        setDailyRevenueData(dailyResponse.data);
      }
      
      // Load inventory data
      if (activeTab === 'inventory') {
        console.log('📦 Fetching inventory data...');
        const inventoryResponse = await api.get('/reports/inventory');
        console.log('✅ Inventory data received:', inventoryResponse.data);
        setInventoryData(inventoryResponse.data);
      }
      
      // Load customer data
      if (activeTab === 'customers') {
        console.log('👥 Fetching customer data...');
        const customerResponse = await api.get('/reports/customers');
        console.log('✅ Customer data received:', customerResponse.data);
        setCustomerData(customerResponse.data);
      }
      
    } catch (error: any) {
      console.error('❌ Error loading report data:', error);
      console.error('❌ Error details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      alert(`Có lỗi khi tải dữ liệu báo cáo: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang kiểm tra...</p>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (redirecting)
  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải dữ liệu báo cáo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-2 sm:py-0 sm:h-16 gap-2">
            <div className="flex items-center w-full sm:w-auto">
              <button
                onClick={() => router.back()}
                className="mr-2 sm:mr-4 text-gray-600 hover:text-gray-900 text-sm sm:text-base"
              >
                ← Quay lại
              </button>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                📊 Báo cáo & Thống kê
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <span className="text-xs sm:text-sm text-gray-700 hidden sm:block">
                Xin chào, {user?.firstName} {user?.lastName}
              </span>
              <button
                onClick={logout}
                className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-xs sm:text-sm"
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-3 sm:py-6 px-2 sm:px-6 lg:px-8">
        {/* Date Range Filter */}
        <div className="mb-4 sm:mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700">📅 Khoảng thời gian:</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
                  className="px-3 py-1 border rounded-lg text-sm"
                />
                <span className="text-gray-500">đến</span>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
                  className="px-3 py-1 border rounded-lg text-sm"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setDateRange({
                    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    endDate: new Date().toISOString().split('T')[0]
                  })}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs hover:bg-blue-200"
                >
                  7 ngày
                </button>
                <button
                  onClick={() => setDateRange({
                    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    endDate: new Date().toISOString().split('T')[0]
                  })}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs hover:bg-blue-200"
                >
                  30 ngày
                </button>
                <button
                  onClick={() => setDateRange({
                    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    endDate: new Date().toISOString().split('T')[0]
                  })}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs hover:bg-blue-200"
                >
                  90 ngày
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 sm:mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'overview'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📊 Tổng quan
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'sales'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              💰 Doanh thu
            </button>
            <button
              onClick={() => setActiveTab('inventory')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'inventory'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              📦 Tồn kho
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'customers'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              👥 Khách hàng
            </button>
          </div>
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && dashboardData && (
          <div className="space-y-4 sm:space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Doanh thu hôm nay</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(dashboardData.todayRevenue)}</p>
                    <p className="text-xs text-green-600">{dashboardData.todayOrders} đơn hàng</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Tổng đơn hàng</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardData.totalOrders}</p>
                    <p className="text-xs text-blue-600">Tất cả thời gian</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.146-1.263-.4-1.823M7 20v-2a3 3 0 015.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M12 18v-2.333A4.872 4.872 0 0014.85 10.5M12 18v-2.333A4.872 4.872 0 009.15 10.5m0 0A4.872 4.872 0 0112 5.25c2.433 0 4.416 1.31 5.356 3.25M12 8V6m0 0V4m0 0H9m3 0h3" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Khách hàng</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardData.totalCustomers}</p>
                    <p className="text-xs text-purple-600">Đã đăng ký</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2H7a2 2 0 00-2 2v2m7-7h.01M7 16h.01" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Món ăn</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardData.totalMenuItems}</p>
                    <p className="text-xs text-orange-600">Đang kinh doanh</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Revenue Trend Chart (Last 14 days) */}
            {dailyRevenueData && dailyRevenueData.dailyRevenue.length > 0 && (
              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <h2 className="text-base sm:text-lg font-semibold mb-4">📈 Xu hướng doanh thu (14 ngày gần nhất)</h2>
                <div className="overflow-x-auto">
                  <div className="relative" style={{ height: '250px' }}>
                    <svg className="w-full h-full" viewBox="0 0 700 250" preserveAspectRatio="xMidYMid meet">
                      {/* Y-axis labels */}
                      {(() => {
                        const maxRevenue = Math.max(...dailyRevenueData.dailyRevenue.map(d => d.revenue));
                        const yAxisSteps = 4;
                        const stepValue = maxRevenue / yAxisSteps;
                        
                        return Array.from({ length: yAxisSteps + 1 }, (_, i) => {
                          const value = stepValue * (yAxisSteps - i);
                          const y = (i / yAxisSteps) * 220 + 15;
                          return (
                            <g key={i}>
                              <line x1="50" y1={y} x2="680" y2={y} stroke="#e5e7eb" strokeWidth="1" />
                              <text x="45" y={y + 4} textAnchor="end" fontSize="11" fill="#6b7280">
                                {value > 1000 ? `${(value / 1000).toFixed(0)}k` : Math.round(value)}
                              </text>
                            </g>
                          );
                        });
                      })()}

                      {/* Bars */}
                      {dailyRevenueData.dailyRevenue.map((day, index) => {
                        const maxRevenue = Math.max(...dailyRevenueData.dailyRevenue.map(d => d.revenue));
                        const barHeight = maxRevenue > 0 ? (day.revenue / maxRevenue) * 200 : 0;
                        const barWidth = 630 / dailyRevenueData.dailyRevenue.length;
                        const x = 60 + (index * barWidth) + (barWidth - Math.min(barWidth - 4, 25)) / 2;
                        const y = 225 - barHeight;
                        const width = Math.min(barWidth - 4, 25);
                        
                        const date = new Date(day.date);
                        const dateStr = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                        
                        return (
                          <g key={day.date}>
                            <rect
                              x={x}
                              y={y}
                              width={width}
                              height={barHeight}
                              fill="#10b981"
                              className="hover:fill-green-600 transition-colors"
                            />
                            <text
                              x={x + width / 2}
                              y="245"
                              textAnchor="middle"
                              fontSize="9"
                              fill="#6b7280"
                              transform={`rotate(-45 ${x + width / 2} 245)`}
                            >
                              {dateStr}
                            </text>
                            <title>{dateStr}: {formatCurrency(day.revenue)} ({day.orderCount} đơn)</title>
                          </g>
                        );
                      })}

                      {/* Axes */}
                      <line x1="50" y1="225" x2="680" y2="225" stroke="#374151" strokeWidth="2" />
                      <line x1="50" y1="15" x2="50" y2="225" stroke="#374151" strokeWidth="2" />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {/* Recent Orders */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">📋 Đơn hàng gần đây</h2>
              <ResponsiveTable
                columns={[
                  { key: 'orderNumber', label: 'Mã đơn' },
                  { key: 'table', label: 'Bàn', render: (order) => order.table?.name || 'N/A', mobileHidden: true },
                  { key: 'user', label: 'Nhân viên', render: (order) => `${order.user?.firstName || ''} ${order.user?.lastName || ''}`.trim() || 'N/A', mobileHidden: true },
                  { key: 'total', label: 'Tổng tiền', render: (order) => formatCurrency(Number(order.total)) },
                  { 
                    key: 'status', 
                    label: 'Trạng thái', 
                    render: (order) => (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        order.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        order.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status === 'COMPLETED' ? 'Hoàn thành' :
                         order.status === 'PENDING' ? 'Đang xử lý' : order.status}
                      </span>
                    )
                  },
                  { key: 'createdAt', label: 'Ngày tạo', render: (order) => formatDate(order.createdAt), mobileHidden: true, tabletHidden: true },
                ]}
                data={dashboardData.recentOrders}
                keyField="id"
                emptyMessage="Chưa có đơn hàng nào"
              />
            </div>
          </div>
        )}

        {/* Sales Tab */}
        {activeTab === 'sales' && salesData && (
          <div className="space-y-4 sm:space-y-6">
            {/* Sales Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Tổng doanh thu</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(salesData.totalRevenue)}</p>
                    {dailyRevenueData && (
                      <p className="text-xs text-gray-500">
                        {dailyRevenueData.period.startDate} - {dailyRevenueData.period.endDate}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Tổng đơn hàng</p>
                    <p className="text-2xl font-bold text-gray-900">{salesData.totalOrders}</p>
                    {dailyRevenueData && (
                      <p className="text-xs text-gray-500">
                        Trung bình: {dailyRevenueData.dailyRevenue.length > 0 
                          ? Math.round(salesData.totalOrders / dailyRevenueData.dailyRevenue.length)
                          : 0} đơn/ngày
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Revenue Chart */}
            {dailyRevenueData && dailyRevenueData.dailyRevenue.length > 0 && (
              <div className="bg-white rounded-lg shadow p-4 sm:p-6">
                <h2 className="text-base sm:text-lg font-semibold mb-4">📈 Doanh thu theo thời gian</h2>
                <div className="overflow-x-auto">
                  <div className="min-w-full">
                    {/* Simple bar chart using SVG */}
                    <div className="relative" style={{ height: '300px' }}>
                      <svg className="w-full h-full" viewBox="0 0 800 300" preserveAspectRatio="xMidYMid meet">
                        {/* Y-axis labels */}
                        {(() => {
                          const maxRevenue = Math.max(...dailyRevenueData.dailyRevenue.map(d => d.revenue));
                          const yAxisSteps = 5;
                          const stepValue = maxRevenue / yAxisSteps;
                          
                          return Array.from({ length: yAxisSteps + 1 }, (_, i) => {
                            const value = stepValue * (yAxisSteps - i);
                            const y = (i / yAxisSteps) * 250 + 20;
                            return (
                              <g key={i}>
                                <line x1="60" y1={y} x2="760" y2={y} stroke="#e5e7eb" strokeWidth="1" />
                                <text x="55" y={y + 5} textAnchor="end" fontSize="12" fill="#6b7280">
                                  {value > 0 ? formatCurrency(value).replace('₫', '').replace(/\./g, '') : '0'}
                                </text>
                              </g>
                            );
                          });
                        })()}

                        {/* Bars */}
                        {dailyRevenueData.dailyRevenue.map((day, index) => {
                          const maxRevenue = Math.max(...dailyRevenueData.dailyRevenue.map(d => d.revenue));
                          const barHeight = maxRevenue > 0 ? (day.revenue / maxRevenue) * 250 : 0;
                          const barWidth = 700 / dailyRevenueData.dailyRevenue.length;
                          const x = 70 + (index * barWidth) + (barWidth - Math.min(barWidth - 4, 30)) / 2;
                          const y = 270 - barHeight;
                          const width = Math.min(barWidth - 4, 30);
                          
                          // Format date for display
                          const date = new Date(day.date);
                          const dateStr = date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
                          
                          return (
                            <g key={day.date}>
                              <rect
                                x={x}
                                y={y}
                                width={width}
                                height={barHeight}
                                fill="#3b82f6"
                                className="hover:fill-blue-600 transition-colors"
                              />
                              <text
                                x={x + width / 2}
                                y="285"
                                textAnchor="middle"
                                fontSize="10"
                                fill="#6b7280"
                                transform={`rotate(-45 ${x + width / 2} 285)`}
                              >
                                {dateStr}
                              </text>
                              <title>{dateStr}: {formatCurrency(day.revenue)} ({day.orderCount} đơn)</title>
                            </g>
                          );
                        })}

                        {/* X-axis line */}
                        <line x1="60" y1="270" x2="760" y2="270" stroke="#374151" strokeWidth="2" />
                        
                        {/* Y-axis line */}
                        <line x1="60" y1="20" x2="60" y2="270" stroke="#374151" strokeWidth="2" />
                      </svg>
                    </div>

                    {/* Legend */}
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 bg-blue-500 rounded"></div>
                        <span className="text-gray-600">Doanh thu (VND)</span>
                      </div>
                      {dailyRevenueData.dailyRevenue.length > 0 && (
                        <>
                          <div className="text-gray-600">
                            Ngày cao nhất: {(() => {
                              const maxDay = dailyRevenueData.dailyRevenue.reduce((max, day) => 
                                day.revenue > max.revenue ? day : max
                              );
                              const date = new Date(maxDay.date);
                              return date.toLocaleDateString('vi-VN');
                            })()}
                          </div>
                          <div className="text-gray-600">
                            Cao nhất: {formatCurrency(Math.max(...dailyRevenueData.dailyRevenue.map(d => d.revenue)))}
                          </div>
                          <div className="text-gray-600">
                            Trung bình: {formatCurrency(
                              dailyRevenueData.dailyRevenue.reduce((sum, d) => sum + d.revenue, 0) / dailyRevenueData.dailyRevenue.length
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Top Selling Items */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">🏆 Món bán chạy nhất</h2>
              <ResponsiveTable
                columns={[
                  { key: 'name', label: 'Món ăn' },
                  { key: 'quantity', label: 'Số lượng', mobileHidden: true },
                  { key: 'revenue', label: 'Doanh thu', render: (item) => formatCurrency(item.revenue) },
                ]}
                data={Object.entries(salesData.menuStats).map(([menuName, stats]: [string, any]) => ({
                  id: menuName,
                  name: menuName,
                  quantity: stats.quantity,
                  revenue: stats.revenue
                }))}
                keyField="id"
                emptyMessage="Chưa có dữ liệu món bán chạy"
              />
            </div>
          </div>
        )}

        {/* Inventory Tab */}
        {activeTab === 'inventory' && inventoryData && (
          <div className="space-y-4 sm:space-y-6">
            {/* Inventory Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2H7a2 2 0 00-2 2v2m7-7h.01M7 16h.01" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Tổng nguyên liệu</p>
                    <p className="text-2xl font-bold text-gray-900">{inventoryData.totalIngredients}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Sắp hết hàng</p>
                    <p className="text-2xl font-bold text-gray-900">{inventoryData.lowStockItems}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Giá trị tồn kho</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(inventoryData.totalValue)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Inventory Details */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">📦 Chi tiết tồn kho</h2>
              <ResponsiveTable
                columns={[
                  { key: 'name', label: 'Nguyên liệu' },
                  { key: 'currentStock', label: 'Tồn kho', render: (item) => Number(item.currentStock) },
                  { key: 'minStock', label: 'Tối thiểu', render: (item) => Number(item.minStock), mobileHidden: true },
                  { key: 'unit', label: 'Đơn vị', mobileHidden: true },
                  { key: 'costPrice', label: 'Giá', render: (item) => formatCurrency(Number(item.costPrice)), mobileHidden: true, tabletHidden: true },
                  { 
                    key: 'status', 
                    label: 'Trạng thái', 
                    render: (item) => (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        Number(item.currentStock) <= Number(item.minStock)
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {Number(item.currentStock) <= Number(item.minStock) ? 'Sắp hết' : 'Đủ hàng'}
                      </span>
                    )
                  },
                ]}
                data={inventoryData.ingredients}
                keyField="id"
                emptyMessage="Không có nguyên liệu nào"
              />
            </div>
          </div>
        )}

        {/* Customer Tab */}
        {activeTab === 'customers' && customerData && (
          <div className="space-y-4 sm:space-y-6">
            {/* Customer Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.146-1.263-.4-1.823M7 20v-2a3 3 0 015.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M12 18v-2.333A4.872 4.872 0 0014.85 10.5M12 18v-2.333A4.872 4.872 0 009.15 10.5m0 0A4.872 4.872 0 0112 5.25c2.433 0 4.416 1.31 5.356 3.25M12 8V6m0 0V4m0 0H9m3 0h3" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Tổng khách hàng</p>
                    <p className="text-2xl font-bold text-gray-900">{customerData.totalCustomers}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Tổng điểm</p>
                    <p className="text-2xl font-bold text-gray-900">{customerData.totalPoints}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Customer Level Stats */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">📊 Phân bố cấp độ khách hàng</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {Object.entries(customerData.levelStats).map(([level, count]: [string, any]) => (
                  <div key={level} className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-600">
                        {level === 'BRONZE' ? '🥉 Đồng' :
                         level === 'SILVER' ? '🥈 Bạc' :
                         level === 'GOLD' ? '🥇 Vàng' :
                         level === 'PLATINUM' ? '💎 Bạch kim' : level}
                      </span>
                      <span className="text-2xl font-bold text-gray-900">{count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Customers */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">👑 Khách hàng hàng đầu</h2>
              <ResponsiveTable
                columns={[
                  { key: 'name', label: 'Tên' },
                  { key: 'phone', label: 'Số điện thoại', mobileHidden: true },
                  { key: 'points', label: 'Điểm' },
                  { 
                    key: 'level', 
                    label: 'Cấp độ', 
                    render: (customer) => (
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        customer.level === 'PLATINUM' ? 'bg-purple-100 text-purple-800' :
                        customer.level === 'GOLD' ? 'bg-yellow-100 text-yellow-800' :
                        customer.level === 'SILVER' ? 'bg-gray-100 text-gray-800' :
                        'bg-orange-100 text-orange-800'
                      }`}>
                        {customer.level === 'BRONZE' ? '🥉 Đồng' :
                         customer.level === 'SILVER' ? '🥈 Bạc' :
                         customer.level === 'GOLD' ? '🥇 Vàng' :
                         customer.level === 'PLATINUM' ? '💎 Bạch kim' : customer.level}
                      </span>
                    )
                  },
                  { key: 'createdAt', label: 'Ngày đăng ký', render: (customer) => formatDate(customer.createdAt), mobileHidden: true, tabletHidden: true },
                ]}
                data={customerData.customers}
                keyField="id"
                emptyMessage="Chưa có khách hàng nào"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}