'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { UsersIcon, ChartBarIcon, ArrowsUpDownIcon, CalendarIcon, PlusIcon, CurrencyDollarIcon, PhoneIcon, EnvelopeIcon, MapPinIcon, CakeIcon } from '@/components/icons';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  birthday?: string;
  points: number;
  level: 'BRONZE' | 'SILVER' | 'GOLD';
  isActive: boolean;
  createdAt: string;
}

interface DashboardData {
  totalCustomers: number;
  newCustomersThisMonth: number;
  totalPoints: number;
  topCustomers: Customer[];
}

export default function CustomersPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'customers' | 'points'>('dashboard');
  
  // Dashboard data
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  
  // Customers
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [newCustomer, setNewCustomer] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    birthday: '',
  });
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Points Management
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [pointsData, setPointsData] = useState({
    points: 0,
    description: '',
    type: 'EARNED' as 'EARNED' | 'SPENT'
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [customersRes] = await Promise.all([
        api.get('/customers')
      ]);
      
      console.log('📊 Customers API Response:', customersRes.data);
      
      // Handle customers data - ensure it's an array
      const customersData = customersRes.data;
      if (!Array.isArray(customersData)) {
        console.error('❌ Customers data is not an array:', customersData);
        setCustomers([]);
        setDashboardData({
          totalCustomers: 0,
          newCustomersThisMonth: 0,
          totalPoints: 0,
          topCustomers: []
        });
        return;
      }
      
      setCustomers(customersData);
      
      // Calculate dashboard data
      const totalCustomers = customersData.length;
      const newCustomersThisMonth = customersData.filter((c: Customer) => {
        const createdDate = new Date(c.createdAt);
        const now = new Date();
        return createdDate.getMonth() === now.getMonth() && createdDate.getFullYear() === now.getFullYear();
      }).length;
      const totalPoints = customersData.reduce((sum: number, c: Customer) => sum + c.points, 0);
      const topCustomers = customersData
        .sort((a: Customer, b: Customer) => b.points - a.points)
        .slice(0, 5);

      setDashboardData({
        totalCustomers,
        newCustomersThisMonth,
        totalPoints,
        topCustomers
      });
    } catch (error: any) {
      console.error('Error loading customer data:', error);
      alert(`Có lỗi khi tải dữ liệu khách hàng: ${error.response?.data?.message || error.message}`);
      // Set empty data on error
      setCustomers([]);
      setDashboardData({
        totalCustomers: 0,
        newCustomersThisMonth: 0,
        totalPoints: 0,
        topCustomers: []
      });
    } finally {
      setLoading(false);
    }
  };

  const createCustomer = async () => {
    try {
      const customerData = {
        name: newCustomer.name,
        phone: newCustomer.phone,
        email: newCustomer.email || null,
        address: newCustomer.address || null,
        birthday: newCustomer.birthday || null,
      };
      
      await api.post('/customers', customerData);
      alert('Đã thêm khách hàng thành công!');
      setShowCustomerModal(false);
      setNewCustomer({
        name: '',
        phone: '',
        email: '',
        address: '',
        birthday: '',
      });
      loadData();
    } catch (error: any) {
      console.error('Error creating customer:', error);
      alert(`Có lỗi khi thêm khách hàng: ${error.response?.data?.message || error.message}`);
    }
  };

  const updateCustomer = async () => {
    if (!editingCustomer) return;
    
    try {
      const updateData = {
        name: editingCustomer.name,
        phone: editingCustomer.phone,
        email: editingCustomer.email || null,
        address: editingCustomer.address || null,
        birthday: editingCustomer.birthday || null,
      };
      
      await api.patch(`/customers/${editingCustomer.id}`, updateData);
      alert('Đã cập nhật khách hàng thành công!');
      setShowCustomerModal(false);
      setEditingCustomer(null);
      loadData();
    } catch (error: any) {
      console.error('Error updating customer:', error);
      alert(`Có lỗi khi cập nhật khách hàng: ${error.response?.data?.message || error.message}`);
    }
  };

  const deleteCustomer = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa khách hàng này?')) return;
    
    try {
      await api.delete(`/customers/${id}`);
      alert('Đã xóa khách hàng thành công!');
      loadData();
    } catch (error: any) {
      console.error('Error deleting customer:', error);
      alert(`Có lỗi khi xóa khách hàng: ${error.response?.data?.message || error.message}`);
    }
  };

  const addPoints = async () => {
    if (!selectedCustomer) return;
    
    try {
      const points = pointsData.type === 'SPENT' ? -Math.abs(pointsData.points) : Math.abs(pointsData.points);
      
      await api.post(`/customers/${selectedCustomer.id}/points`, {
        points,
        description: pointsData.description,
        type: pointsData.type
      });
      alert('Đã cập nhật điểm thành công!');
      setShowPointsModal(false);
      setSelectedCustomer(null);
      setPointsData({
        points: 0,
        description: '',
        type: 'EARNED'
      });
      loadData();
    } catch (error: any) {
      console.error('Error adding points:', error);
      alert(`Có lỗi khi cập nhật điểm: ${error.response?.data?.message || error.message}`);
    }
  };

  // Filter and sort customers
  const getFilteredCustomers = () => {
    let filtered = [...customers];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Level filter
    if (levelFilter) {
      filtered = filtered.filter(customer => customer.level === levelFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'points':
          aValue = a.points;
          bValue = b.points;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt);
          bValue = new Date(b.createdAt);
          break;
        default:
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'GOLD': return 'bg-yellow-100 text-yellow-800';
      case 'SILVER': return 'bg-gray-100 text-gray-800';
      case 'BRONZE': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'GOLD': return '🥇';
      case 'SILVER': return '🥈';
      case 'BRONZE': return '🥉';
      default: return '👤';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
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
                className="mr-2 sm:mr-4 flex items-center gap-1.5 text-gray-600 hover:text-gray-900 text-sm sm:text-base font-medium transition-colors"
              >
                <span>←</span>
                <span>Quay lại</span>
              </button>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900 flex items-center gap-2">
                <UsersIcon className="w-5 h-5 text-gray-600" />
                Quản lý khách hàng
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-3 sm:py-6 px-2 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="mb-4 sm:mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'dashboard'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ChartBarIcon className="w-4 h-4 inline mr-1" />
              Tổng quan
            </button>
            <button
              onClick={() => setActiveTab('customers')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'customers'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <UsersIcon className="w-4 h-4 inline mr-1" />
              Khách hàng
            </button>
            <button
              onClick={() => setActiveTab('points')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'points'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CurrencyDollarIcon className="w-4 h-4 inline mr-1" />
              Tích điểm
            </button>
          </div>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-4 sm:space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.653-.146-1.263-.4-1.823M7 20v-2a3 3 0 015.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M12 18v-2.333A4.872 4.872 0 0014.85 10.5M12 18v-2.333A4.872 4.872 0 019.15 10.5m0 0A4.872 4.872 0 0112 5.25c2.433 0 4.416 1.31 5.356 3.25M12 8V6m0 0V4m0 0H9m3 0h3" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Tổng khách hàng</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardData?.totalCustomers}</p>
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
                    <p className="text-sm font-medium text-gray-500">Khách mới tháng này</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardData?.newCustomersThisMonth}</p>
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
                    <p className="text-sm font-medium text-gray-500">Tổng điểm tích lũy</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardData?.totalPoints.toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-500">Khách VIP</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {dashboardData?.topCustomers.filter(c => c.level === 'GOLD').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Customers */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">🏆 Khách hàng VIP</h2>
              {dashboardData?.topCustomers.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Chưa có khách hàng nào</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {dashboardData?.topCustomers.map((customer, index) => (
                    <div key={customer.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-sm sm:text-base">{customer.name}</h3>
                          <p className="text-xs sm:text-sm text-gray-600">{customer.phone}</p>
                          <p className="text-xs sm:text-sm text-gray-600">{customer.points} điểm</p>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`text-xs px-2 py-1 rounded-full text-xs ${getLevelColor(customer.level)}`}>
                            {getLevelIcon(customer.level)} {customer.level}
                          </span>
                          <span className="text-xs text-gray-500 mt-1">#{index + 1}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Customers Tab */}
        {activeTab === 'customers' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h2 className="text-base sm:text-lg font-semibold">Quản lý khách hàng</h2>
              <button
                onClick={() => {
                  setEditingCustomer(null);
                  setNewCustomer({
                    name: '',
                    phone: '',
                    email: '',
                    address: '',
                    birthday: '',
                  });
                  setShowCustomerModal(true);
                }}
                className="px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm sm:text-base"
              >
                + Thêm khách hàng
              </button>
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-white rounded-lg shadow p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                {/* Search */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">🔍 Tìm kiếm</label>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Tên, SĐT, Email..."
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>

                {/* Level Filter */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">🏆 Cấp độ</label>
                  <select
                    value={levelFilter}
                    onChange={(e) => setLevelFilter(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm"
                  >
                    <option value="">Tất cả</option>
                    <option value="GOLD">🥇 Vàng</option>
                    <option value="SILVER">🥈 Bạc</option>
                    <option value="BRONZE">🥉 Đồng</option>
                  </select>
                </div>

                {/* Sort */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1 flex items-center gap-1.5">
                    <ArrowsUpDownIcon className="w-4 h-4" />
                    Sắp xếp
                  </label>
                  <div className="flex gap-1">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="flex-1 p-2 border rounded-lg text-sm"
                    >
                      <option value="name">Tên</option>
                      <option value="points">Điểm</option>
                      <option value="createdAt">Ngày tạo</option>
                    </select>
                    <button
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="px-2 py-2 border rounded-lg text-sm hover:bg-gray-50"
                      title={sortOrder === 'asc' ? 'Tăng dần' : 'Giảm dần'}
                    >
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1 flex items-center gap-1.5">
                    <ChartBarIcon className="w-4 h-4" />
                    Thống kê
                  </label>
                  <div className="text-xs text-gray-600">
                    Hiển thị {getFilteredCustomers().length} / {customers.length} khách hàng
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-6">
                {getFilteredCustomers().length === 0 ? (
                  <div className="col-span-full text-center py-8">
                    <p className="text-gray-500">Không tìm thấy khách hàng nào</p>
                  </div>
                ) : (
                  getFilteredCustomers().map((customer) => (
                    <div key={customer.id} className="border rounded-lg p-3 sm:p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-sm sm:text-base">{customer.name}</h3>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => router.push(`/customers/${customer.id}`)}
                            className="text-purple-500 hover:text-purple-700 text-xs sm:text-sm"
                          >
                            Chi tiết
                          </button>
                          <button
                            onClick={() => {
                              setEditingCustomer(customer);
                              setShowCustomerModal(true);
                            }}
                            className="text-blue-500 hover:text-blue-700 text-xs sm:text-sm"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setShowPointsModal(true);
                            }}
                            className="text-green-500 hover:text-green-700 text-xs sm:text-sm"
                          >
                            Điểm
                          </button>
                          <button
                            onClick={() => deleteCustomer(customer.id)}
                            className="text-red-500 hover:text-red-700 text-xs sm:text-sm"
                          >
                            Xóa
                          </button>
                        </div>
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                        <p className="flex items-center gap-1">
                          <PhoneIcon className="w-3 h-3" />
                          {customer.phone}
                        </p>
                        {customer.email && (
                          <p className="flex items-center gap-1">
                            <EnvelopeIcon className="w-3 h-3" />
                            {customer.email}
                          </p>
                        )}
                        {customer.address && (
                          <p className="flex items-center gap-1">
                            <MapPinIcon className="w-3 h-3" />
                            {customer.address}
                          </p>
                        )}
                        {customer.birthday && (
                          <p className="flex items-center gap-1">
                            <CakeIcon className="w-3 h-3" />
                            {new Date(customer.birthday).toLocaleDateString('vi-VN')}
                          </p>
                        )}
                        <p className="flex items-center gap-1">
                          <CurrencyDollarIcon className="w-3 h-3" />
                          {customer.points} điểm
                        </p>
                        <p className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          Tham gia: {new Date(customer.createdAt).toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                      <div className={`mt-2 text-xs font-semibold px-2 py-1 rounded-full text-center ${getLevelColor(customer.level)}`}>
                        {getLevelIcon(customer.level)} {customer.level}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Points Tab */}
        {activeTab === 'points' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                <CurrencyDollarIcon className="w-5 h-5 text-gray-600" />
                Quản lý điểm tích lũy
              </h2>
              <div className="text-center py-8">
                <div className="flex justify-center mb-4">
                  <div className="p-4 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-full">
                    <CurrencyDollarIcon className="w-16 h-16 text-yellow-600" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Hệ thống tích điểm</h3>
                <p className="text-gray-600 mb-4">
                  Quản lý điểm tích lũy và cấp độ khách hàng
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
                  <div className="bg-orange-50 p-4 rounded-lg">
                    <div className="text-2xl mb-2">🥉</div>
                    <h4 className="font-semibold text-orange-800">Đồng</h4>
                    <p className="text-sm text-orange-600">0-499 điểm</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="text-2xl mb-2">🥈</div>
                    <h4 className="font-semibold text-gray-800">Bạc</h4>
                    <p className="text-sm text-gray-600">500-999 điểm</p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="text-2xl mb-2">🥇</div>
                    <h4 className="font-semibold text-yellow-800">Vàng</h4>
                    <p className="text-sm text-yellow-600">1000+ điểm</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Customer Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full mx-2 sm:mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-bold">
                {editingCustomer ? 'Sửa khách hàng' : 'Thêm khách hàng mới'}
              </h2>
              <button
                onClick={() => setShowCustomerModal(false)}
                className="text-gray-500 hover:text-gray-700 text-lg sm:text-xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Tên khách hàng</label>
                <input
                  type="text"
                  value={editingCustomer ? editingCustomer.name : newCustomer.name}
                  onChange={(e) => editingCustomer 
                    ? setEditingCustomer({...editingCustomer, name: e.target.value})
                    : setNewCustomer({...newCustomer, name: e.target.value})
                  }
                  className="w-full p-2 border rounded-lg text-sm"
                  placeholder="VD: Nguyễn Văn A"
                />
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Số điện thoại</label>
                <input
                  type="tel"
                  value={editingCustomer ? editingCustomer.phone : newCustomer.phone}
                  onChange={(e) => editingCustomer 
                    ? setEditingCustomer({...editingCustomer, phone: e.target.value})
                    : setNewCustomer({...newCustomer, phone: e.target.value})
                  }
                  className="w-full p-2 border rounded-lg text-sm"
                  placeholder="VD: 0123456789"
                />
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Email (tùy chọn)</label>
                <input
                  type="email"
                  value={editingCustomer ? editingCustomer.email || '' : newCustomer.email}
                  onChange={(e) => editingCustomer 
                    ? setEditingCustomer({...editingCustomer, email: e.target.value})
                    : setNewCustomer({...newCustomer, email: e.target.value})
                  }
                  className="w-full p-2 border rounded-lg text-sm"
                  placeholder="VD: customer@email.com"
                />
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Địa chỉ (tùy chọn)</label>
                <textarea
                  value={editingCustomer ? editingCustomer.address || '' : newCustomer.address}
                  onChange={(e) => editingCustomer 
                    ? setEditingCustomer({...editingCustomer, address: e.target.value})
                    : setNewCustomer({...newCustomer, address: e.target.value})
                  }
                  className="w-full p-2 border rounded-lg text-sm"
                  rows={2}
                  placeholder="Địa chỉ khách hàng"
                />
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Ngày sinh (tùy chọn)</label>
                <input
                  type="date"
                  value={editingCustomer ? (editingCustomer.birthday ? editingCustomer.birthday.split('T')[0] : '') : newCustomer.birthday}
                  onChange={(e) => editingCustomer 
                    ? setEditingCustomer({...editingCustomer, birthday: e.target.value})
                    : setNewCustomer({...newCustomer, birthday: e.target.value})
                  }
                  className="w-full p-2 border rounded-lg text-sm"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4 sm:mt-6">
              <button
                onClick={() => setShowCustomerModal(false)}
                className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-sm sm:text-base hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={editingCustomer ? updateCustomer : createCustomer}
                className="px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm sm:text-base"
              >
                {editingCustomer ? 'Cập nhật' : 'Thêm mới'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Points Modal */}
      {showPointsModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full mx-2 sm:mx-4">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-bold">
                <span className="flex items-center gap-1.5">
                  <CurrencyDollarIcon className="w-4 h-4" />
                  Quản lý điểm - {selectedCustomer.name}
                </span>
              </h2>
              <button
                onClick={() => setShowPointsModal(false)}
                className="text-gray-500 hover:text-gray-700 text-lg sm:text-xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-sm text-gray-600">Điểm hiện tại</div>
                <div className="text-2xl font-bold text-blue-600">{selectedCustomer.points}</div>
                <div className={`text-xs px-2 py-1 rounded-full inline-block mt-1 ${getLevelColor(selectedCustomer.level)}`}>
                  {getLevelIcon(selectedCustomer.level)} {selectedCustomer.level}
                </div>
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Loại thao tác</label>
                <select
                  value={pointsData.type}
                  onChange={(e) => setPointsData({...pointsData, type: e.target.value as 'EARNED' | 'SPENT'})}
                  className="w-full p-2 border rounded-lg text-sm"
                >
                  <option value="EARNED">Cộng điểm</option>
                  <option value="SPENT">Trừ điểm</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Số điểm</label>
                <input
                  type="number"
                  value={pointsData.points}
                  onChange={(e) => setPointsData({...pointsData, points: parseInt(e.target.value) || 0})}
                  className="w-full p-2 border rounded-lg text-sm"
                  min="0"
                />
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Lý do</label>
                <input
                  type="text"
                  value={pointsData.description}
                  onChange={(e) => setPointsData({...pointsData, description: e.target.value})}
                  className="w-full p-2 border rounded-lg text-sm"
                  placeholder="VD: Mua hàng, ưu đãi đặc biệt..."
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 mt-4 sm:mt-6">
              <button
                onClick={() => setShowPointsModal(false)}
                className="px-3 sm:px-4 py-2 border border-gray-300 rounded-lg text-sm sm:text-base hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={addPoints}
                className="px-3 sm:px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm sm:text-base"
              >
                Cập nhật điểm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
