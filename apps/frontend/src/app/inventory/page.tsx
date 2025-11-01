'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { usePermissions } from '@/hooks/usePermissions';
import ResponsiveTable from '@/components/responsive-table';
import { ChartBarIcon, BoxIcon, RestaurantIcon, ExclamationTriangleIcon, ArrowsUpDownIcon, ClipboardIcon, CurrencyDollarIcon, TrashIcon } from '@/components/icons';

// Interfaces
interface Ingredient {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  costPrice: number;
  supplierId?: string;
  supplier?: {
    id: string;
    name: string;
  };
  expiryDate?: string;
  isActive: boolean;
}

interface Supplier {
  id: string;
  name: string;
  contactName?: string;
  phone?: string;
  email?: string;
  address?: string;
  isActive: boolean;
}

interface DashboardData {
  totalIngredients: number;
  lowStockIngredients: number;
  totalSuppliers: number;
  recentMovements: any[];
}

interface StockMovement {
  id: string;
  ingredientId: string;
  ingredient?: {
    id: string;
    name: string;
    unit: string;
  };
  quantity: number;
  type: 'IN' | 'OUT' | 'ADJUSTMENT' | 'WASTE';
  reason?: string;
  createdAt: string;
}

interface Menu {
  id: string;
  name: string;
  description: string;
  price: number;
  isAvailable: boolean;
}

interface MenuIngredient {
  id: string;
  ingredientId: string;
  ingredient: {
    id: string;
    name: string;
    unit: string;
    costPrice: number;
  };
  quantity: number;
  unit: string;
}

interface MenuCost {
  totalCost: number;
  ingredientCount: number;
}

export default function InventoryPage() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const { hasPermission } = usePermissions();
  
  // Loading state
  const [loading, setLoading] = useState(true);
  
  // Active tab
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ingredients' | 'suppliers' | 'stock-movements' | 'recipes'>('dashboard');
  
  // Dashboard data
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [lowStockItems, setLowStockItems] = useState<Ingredient[]>([]);
  const [expiringItems, setExpiringItems] = useState<Ingredient[]>([]);
  
  // Ingredients
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [showIngredientModal, setShowIngredientModal] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [newIngredient, setNewIngredient] = useState({
    name: '',
    unit: 'kg',
    currentStock: 0,
    minStock: 0,
    maxStock: 0,
    costPrice: 0,
    supplierId: '',
    expiryDate: '',
    isActive: true
  });
  
  // Suppliers
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    contactName: '',
    phone: '',
    email: '',
    address: '',
    isActive: true
  });

  // Stock Movements
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [showAdjustStockModal, setShowAdjustStockModal] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<Ingredient | null>(null);
  const [adjustStockData, setAdjustStockData] = useState({
    quantity: 0,
    type: 'IN' as 'IN' | 'OUT' | 'ADJUSTMENT' | 'WASTE',
    reason: '',
    referenceId: ''
  });

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [stockStatusFilter, setStockStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Recipe Management
  const [menus, setMenus] = useState<Menu[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [menuIngredients, setMenuIngredients] = useState<MenuIngredient[]>([]);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [newMenuIngredient, setNewMenuIngredient] = useState({
    ingredientId: '',
    quantity: 0,
    unit: 'kg'
  });
  const [menuCost, setMenuCost] = useState<MenuCost | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Load data on component mount
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Data loading function
  const loadData = async () => {
    try {
      setLoading(true);
      const [dashboardRes, ingredientsRes, suppliersRes] = await Promise.all([
        api.get('/inventory/dashboard'),
        api.get('/inventory/ingredients'),
        api.get('/inventory/suppliers')
      ]);
      
      setDashboardData(dashboardRes.data);
      setIngredients(Array.isArray(ingredientsRes.data) ? ingredientsRes.data : []);
      setSuppliers(Array.isArray(suppliersRes.data) ? suppliersRes.data : []);
      
      // Load additional data
      const [lowStockRes, expiringRes, stockMovementsRes, menusRes] = await Promise.all([
        api.get('/inventory/low-stock'),
        api.get('/inventory/expiring'),
        api.get('/inventory/stock-movements'),
        api.get('/pos/menu')
      ]);
      
      // Ensure data is array before setting state
      setLowStockItems(Array.isArray(lowStockRes.data) ? lowStockRes.data : []);
      setExpiringItems(Array.isArray(expiringRes.data) ? expiringRes.data : []);
      setStockMovements(Array.isArray(stockMovementsRes.data) ? stockMovementsRes.data : []);
      setMenus(Array.isArray(menusRes.data) ? menusRes.data : []);
    } catch (error: any) {
      console.error('Error loading inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Ingredient CRUD functions
  const createIngredient = async () => {
    try {
      const ingredientData = {
        name: newIngredient.name,
        unit: newIngredient.unit,
        currentStock: Number(newIngredient.currentStock),
        minStock: Number(newIngredient.minStock),
        maxStock: Number(newIngredient.maxStock),
        costPrice: Number(newIngredient.costPrice),
        supplierId: newIngredient.supplierId || null,
        expiryDate: newIngredient.expiryDate || null,
        isActive: newIngredient.isActive
      };
      
      await api.post('/inventory/ingredients', ingredientData);
      alert('Đã thêm nguyên liệu thành công!');
      setShowIngredientModal(false);
      setNewIngredient({
        name: '',
        unit: 'kg',
        currentStock: 0,
        minStock: 0,
        maxStock: 0,
        costPrice: 0,
        supplierId: '',
        expiryDate: '',
        isActive: true
      });
      loadData();
    } catch (error: any) {
      console.error('Error creating ingredient:', error);
      alert(`Có lỗi khi thêm nguyên liệu: ${error.response?.data?.message || error.message}`);
    }
  };

  const updateIngredient = async () => {
    if (!editingIngredient) return;
    
    try {
      const updateData = {
        name: editingIngredient.name,
        unit: editingIngredient.unit,
        currentStock: Number(editingIngredient.currentStock),
        minStock: Number(editingIngredient.minStock),
        maxStock: Number(editingIngredient.maxStock),
        costPrice: Number(editingIngredient.costPrice),
        supplierId: editingIngredient.supplierId || null,
        expiryDate: editingIngredient.expiryDate || null,
        isActive: editingIngredient.isActive
      };
      
      await api.patch(`/inventory/ingredients/${editingIngredient.id}`, updateData);
      alert('Đã cập nhật nguyên liệu thành công!');
      setShowIngredientModal(false);
      setEditingIngredient(null);
      loadData();
    } catch (error: any) {
      console.error('Error updating ingredient:', error);
      alert(`Có lỗi khi cập nhật nguyên liệu: ${error.response?.data?.message || error.message}`);
    }
  };

  const deleteIngredient = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa nguyên liệu này?')) return;
    
    try {
      await api.delete(`/inventory/ingredients/${id}`);
      alert('Đã xóa nguyên liệu thành công!');
      loadData();
    } catch (error: any) {
      console.error('Error deleting ingredient:', error);
      alert(`Có lỗi khi xóa nguyên liệu: ${error.response?.data?.message || error.message}`);
    }
  };

  // Supplier CRUD functions
  const createSupplier = async () => {
    try {
      const supplierData = {
        name: newSupplier.name,
        contactName: newSupplier.contactName || null,
        phone: newSupplier.phone || null,
        email: newSupplier.email || null,
        address: newSupplier.address || null,
        isActive: newSupplier.isActive
      };
      
      await api.post('/inventory/suppliers', supplierData);
      alert('Đã thêm nhà cung cấp thành công!');
      setShowSupplierModal(false);
      setNewSupplier({
        name: '',
        contactName: '',
        phone: '',
        email: '',
        address: '',
        isActive: true
      });
      loadData();
    } catch (error: any) {
      console.error('Error creating supplier:', error);
      alert(`Có lỗi khi thêm nhà cung cấp: ${error.response?.data?.message || error.message}`);
    }
  };

  const updateSupplier = async () => {
    if (!editingSupplier) return;
    
    try {
      const updateData = {
        name: editingSupplier.name,
        contactName: editingSupplier.contactName || null,
        phone: editingSupplier.phone || null,
        email: editingSupplier.email || null,
        address: editingSupplier.address || null,
        isActive: editingSupplier.isActive
      };
      
      await api.patch(`/inventory/suppliers/${editingSupplier.id}`, updateData);
      alert('Đã cập nhật nhà cung cấp thành công!');
      setShowSupplierModal(false);
      setEditingSupplier(null);
      loadData();
    } catch (error: any) {
      console.error('Error updating supplier:', error);
      alert(`Có lỗi khi cập nhật nhà cung cấp: ${error.response?.data?.message || error.message}`);
    }
  };

  const deleteSupplier = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa nhà cung cấp này?')) return;
    
    try {
      await api.delete(`/inventory/suppliers/${id}`);
      alert('Đã xóa nhà cung cấp thành công!');
      loadData();
    } catch (error: any) {
      console.error('Error deleting supplier:', error);
      alert(`Có lỗi khi xóa nhà cung cấp: ${error.response?.data?.message || error.message}`);
    }
  };

  // Stock adjustment function
  const adjustStock = async () => {
    if (!selectedIngredient) return;
    
    try {
      const stockData = {
        quantity: adjustStockData.type === 'OUT' ? -Math.abs(adjustStockData.quantity) : Math.abs(adjustStockData.quantity),
        reason: adjustStockData.reason
      };
      
      await api.post(`/inventory/ingredients/${selectedIngredient.id}/adjust-stock`, stockData);
      alert('Đã điều chỉnh tồn kho thành công!');
      setShowAdjustStockModal(false);
      setSelectedIngredient(null);
      setAdjustStockData({
        quantity: 0,
        type: 'IN',
        reason: '',
        referenceId: ''
      });
      loadData();
    } catch (error: any) {
      console.error('Error adjusting stock:', error);
      alert(`Có lỗi khi điều chỉnh tồn kho: ${error.response?.data?.message || error.message}`);
    }
  };

  // Filter and sort ingredients
  const getFilteredIngredients = () => {
    let filtered = [...ingredients];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(ingredient =>
        ingredient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ingredient.unit.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Supplier filter
    if (supplierFilter) {
      filtered = filtered.filter(ingredient =>
        ingredient.supplierId === supplierFilter
      );
    }

    // Stock status filter
    if (stockStatusFilter) {
      filtered = filtered.filter(ingredient => {
        switch (stockStatusFilter) {
          case 'low':
            return ingredient.currentStock <= ingredient.minStock;
          case 'out':
            return ingredient.currentStock <= 0;
          case 'expiring':
            if (!ingredient.expiryDate) return false;
            const expiryDate = new Date(ingredient.expiryDate);
            const sevenDaysFromNow = new Date();
            sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
            return expiryDate <= sevenDaysFromNow;
          case 'normal':
            return ingredient.currentStock > ingredient.minStock && ingredient.currentStock > 0;
          default:
            return true;
        }
      });
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.name.toLowerCase();
          bValue = b.name.toLowerCase();
          break;
        case 'currentStock':
          aValue = Number(a.currentStock);
          bValue = Number(b.currentStock);
          break;
        case 'costPrice':
          aValue = Number(a.costPrice);
          bValue = Number(b.costPrice);
          break;
        case 'expiryDate':
          aValue = a.expiryDate ? new Date(a.expiryDate) : new Date('9999-12-31');
          bValue = b.expiryDate ? new Date(b.expiryDate) : new Date('9999-12-31');
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

  // Recipe Management Functions
  const loadMenuIngredients = async (menuId: string) => {
    try {
      const [ingredientsRes, costRes] = await Promise.all([
        api.get(`/pos/menu/${menuId}/ingredients`),
        api.get(`/pos/menu/${menuId}/cost`)
      ]);
      setMenuIngredients(Array.isArray(ingredientsRes.data) ? ingredientsRes.data : []);
      setMenuCost(costRes.data);
    } catch (error: any) {
      console.error('Error loading menu ingredients:', error);
      alert(`Có lỗi khi tải nguyên liệu món ăn: ${error.response?.data?.message || error.message}`);
    }
  };

  const addMenuIngredient = async () => {
    if (!selectedMenu || !newMenuIngredient.ingredientId) return;
    
    try {
      await api.post('/pos/menu-ingredients', {
        menuId: selectedMenu.id,
        ingredientId: newMenuIngredient.ingredientId,
        quantity: Number(newMenuIngredient.quantity),
        unit: newMenuIngredient.unit
      });
      alert('Đã thêm nguyên liệu vào món ăn!');
      setShowRecipeModal(false);
      setNewMenuIngredient({
        ingredientId: '',
        quantity: 0,
        unit: 'kg'
      });
      loadMenuIngredients(selectedMenu.id);
    } catch (error: any) {
      console.error('Error adding menu ingredient:', error);
      alert(`Có lỗi khi thêm nguyên liệu: ${error.response?.data?.message || error.message}`);
    }
  };

  const updateMenuIngredient = async (id: string, quantity: number) => {
    try {
      await api.patch(`/pos/menu-ingredients/${id}`, { quantity });
      alert('Đã cập nhật số lượng nguyên liệu!');
      if (selectedMenu) {
        loadMenuIngredients(selectedMenu.id);
      }
    } catch (error: any) {
      console.error('Error updating menu ingredient:', error);
      alert(`Có lỗi khi cập nhật nguyên liệu: ${error.response?.data?.message || error.message}`);
    }
  };

  const removeMenuIngredient = async (id: string) => {
    if (!confirm('Bạn có chắc muốn xóa nguyên liệu này khỏi món ăn?')) return;
    
    try {
      await api.delete(`/pos/menu-ingredients/${id}`);
      alert('Đã xóa nguyên liệu khỏi món ăn!');
      if (selectedMenu) {
        loadMenuIngredients(selectedMenu.id);
      }
    } catch (error: any) {
      console.error('Error removing menu ingredient:', error);
      alert(`Có lỗi khi xóa nguyên liệu: ${error.response?.data?.message || error.message}`);
    }
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

  // Loading component
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
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                Quản lý kho
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
              onClick={() => setActiveTab('ingredients')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center ${
                activeTab === 'ingredients'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BoxIcon className="w-4 h-4 mr-1" />
              Nguyên liệu
            </button>
            <button
              onClick={() => setActiveTab('suppliers')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'suppliers'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🏢 Nhà cung cấp
            </button>
            <button
              onClick={() => setActiveTab('stock-movements')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'stock-movements'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <BoxIcon className="w-4 h-4 inline mr-1" />
              Xuất nhập kho
            </button>
            <button
              onClick={() => setActiveTab('recipes')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors flex items-center justify-center ${
                activeTab === 'recipes'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <RestaurantIcon className="w-4 h-4 mr-1" />
              Công thức món ăn
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
                    <BoxIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Tổng nguyên liệu</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardData?.totalIngredients || 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Sắp hết hàng</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardData?.lowStockIngredients || 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <span className="text-green-600 text-xl">🏢</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Nhà cung cấp</p>
                    <p className="text-2xl font-bold text-gray-900">{dashboardData?.totalSuppliers || 0}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <span className="text-yellow-600 text-xl">⏰</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-600">Sắp hết hạn</p>
                    <p className="text-2xl font-bold text-gray-900">{expiringItems.length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Low Stock Items */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                Nguyên liệu sắp hết
              </h2>
              {lowStockItems.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Không có nguyên liệu nào sắp hết</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {lowStockItems.map((item) => (
                    <div key={item.id} className="border border-red-200 bg-red-50 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-sm sm:text-base text-red-800">{item.name}</h3>
                          <p className="text-xs sm:text-sm text-red-600">
                            Tồn kho: {item.currentStock} {item.unit}
                          </p>
                          <p className="text-xs sm:text-sm text-red-600">
                            Tối thiểu: {item.minStock} {item.unit}
                          </p>
                        </div>
                        <span className="text-xs bg-red-200 text-red-800 px-2 py-1 rounded">
                          Cần nhập
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expiring Items */}
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">⏰ Nguyên liệu sắp hết hạn</h2>
              {expiringItems.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Không có nguyên liệu nào sắp hết hạn</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {expiringItems.map((item) => (
                    <div key={item.id} className="border border-yellow-200 bg-yellow-50 rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-sm sm:text-base text-yellow-800">{item.name}</h3>
                          <p className="text-xs sm:text-sm text-yellow-600">
                            Hết hạn: {item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('vi-VN') : 'Không xác định'}
                          </p>
                          <p className="text-xs sm:text-sm text-yellow-600">
                            Tồn kho: {item.currentStock} {item.unit}
                          </p>
                        </div>
                        <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                          Sắp hết hạn
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Ingredients Tab */}
        {activeTab === 'ingredients' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h2 className="text-base sm:text-lg font-semibold">Quản lý nguyên liệu</h2>
              {hasPermission('inventory:create') && (
                <button
                  onClick={() => {
                    setEditingIngredient(null);
                    setNewIngredient({
                      name: '',
                      unit: 'kg',
                      currentStock: 0,
                      minStock: 0,
                      maxStock: 0,
                      costPrice: 0,
                      supplierId: '',
                      expiryDate: '',
                      isActive: true
                    });
                    setShowIngredientModal(true);
                  }}
                  className="px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm sm:text-base"
                >
                  + Thêm nguyên liệu
                </button>
              )}
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
                    placeholder="Tên nguyên liệu..."
                    className="w-full p-2 border rounded-lg text-sm"
                  />
                </div>

                {/* Supplier Filter */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">🏢 Nhà cung cấp</label>
                  <select
                    value={supplierFilter}
                    onChange={(e) => setSupplierFilter(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm"
                  >
                    <option value="">Tất cả</option>
                    {suppliers.map((supplier) => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Stock Status Filter */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1 flex items-center gap-1">
                    <ChartBarIcon className="w-4 h-4" />
                    Trạng thái
                  </label>
                  <select
                    value={stockStatusFilter}
                    onChange={(e) => setStockStatusFilter(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm"
                  >
                    <option value="">Tất cả</option>
                    <option value="normal">🟢 Bình thường</option>
                    <option value="low">🟡 Sắp hết</option>
                    <option value="out">🔴 Hết hàng</option>
                    <option value="expiring">⏰ Sắp hết hạn</option>
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
                      <option value="currentStock">Tồn kho</option>
                      <option value="costPrice">Giá</option>
                      <option value="expiryDate">Hết hạn</option>
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
              </div>
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="p-3 sm:p-4 border-b">
                <p className="text-sm text-gray-600">
                  Hiển thị {getFilteredIngredients().length} / {ingredients.length} nguyên liệu
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-6">
                {getFilteredIngredients().length === 0 ? (
                  <div className="col-span-full text-center py-8">
                    <p className="text-gray-500">Không tìm thấy nguyên liệu nào</p>
                  </div>
                ) : (
                  getFilteredIngredients().map((ingredient) => (
                    <div key={ingredient.id} className="border rounded-lg p-3 sm:p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-sm sm:text-base">{ingredient.name}</h3>
                        <div className="flex space-x-1">
                          {hasPermission('inventory:update') && (
                            <button
                              onClick={() => {
                                setEditingIngredient(ingredient);
                                setShowIngredientModal(true);
                              }}
                              className="text-blue-500 hover:text-blue-700 text-xs sm:text-sm"
                            >
                              Sửa
                            </button>
                          )}
                          {hasPermission('inventory:update') && (
                            <button
                              onClick={() => {
                                setSelectedIngredient(ingredient);
                                setShowAdjustStockModal(true);
                              }}
                              className="text-green-500 hover:text-green-700 text-xs sm:text-sm"
                            >
                              Điều chỉnh
                            </button>
                          )}
                          {hasPermission('inventory:delete') && (
                            <button
                              onClick={() => deleteIngredient(ingredient.id)}
                              className="text-red-500 hover:text-red-700 text-xs sm:text-sm"
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                        <p>Tồn kho: {ingredient.currentStock} {ingredient.unit}</p>
                        <p>Giá: {Number(ingredient.costPrice).toLocaleString('vi-VN')} ₫</p>
                        <p>Nhà cung cấp: {ingredient.supplier?.name || 'Chưa có'}</p>
                        {ingredient.expiryDate && (
                          <p>Hết hạn: {new Date(ingredient.expiryDate).toLocaleDateString('vi-VN')}</p>
                        )}
                        <div className={`inline-block px-2 py-1 rounded text-xs ${
                          ingredient.currentStock <= ingredient.minStock
                            ? 'bg-red-100 text-red-800'
                            : ingredient.currentStock <= ingredient.minStock * 1.5
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {ingredient.currentStock <= ingredient.minStock ? 'Sắp hết' : 
                           ingredient.currentStock <= ingredient.minStock * 1.5 ? 'Cần theo dõi' : 'Đủ hàng'}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Suppliers Tab */}
        {activeTab === 'suppliers' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h2 className="text-base sm:text-lg font-semibold">Quản lý nhà cung cấp</h2>
              {hasPermission('inventory:create') && (
                <button
                  onClick={() => {
                    setEditingSupplier(null);
                    setNewSupplier({
                      name: '',
                      contactName: '',
                      phone: '',
                      email: '',
                      address: '',
                      isActive: true
                    });
                    setShowSupplierModal(true);
                  }}
                  className="px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm sm:text-base"
                >
                  + Thêm nhà cung cấp
                </button>
              )}
            </div>

            <div className="bg-white rounded-lg shadow">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 p-3 sm:p-6">
                {suppliers.length === 0 ? (
                  <div className="col-span-full text-center py-8">
                    <p className="text-gray-500">Chưa có nhà cung cấp nào</p>
                  </div>
                ) : (
                  suppliers.map((supplier) => (
                    <div key={supplier.id} className="border rounded-lg p-3 sm:p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-sm sm:text-base">{supplier.name}</h3>
                        <div className="flex space-x-1">
                          {hasPermission('inventory:update') && (
                            <button
                              onClick={() => {
                                setEditingSupplier(supplier);
                                setShowSupplierModal(true);
                              }}
                              className="text-blue-500 hover:text-blue-700 text-xs sm:text-sm"
                            >
                              Sửa
                            </button>
                          )}
                          {hasPermission('inventory:delete') && (
                            <button
                              onClick={() => deleteSupplier(supplier.id)}
                              className="text-red-500 hover:text-red-700 text-xs sm:text-sm"
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                        {supplier.contactName && <p>Liên hệ: {supplier.contactName}</p>}
                        {supplier.phone && <p>Điện thoại: {supplier.phone}</p>}
                        {supplier.email && <p>Email: {supplier.email}</p>}
                        {supplier.address && <p>Địa chỉ: {supplier.address}</p>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stock Movements Tab */}
        {activeTab === 'stock-movements' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="bg-white rounded-lg shadow p-4 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
                <BoxIcon className="w-5 h-5 text-gray-600" />
                Lịch sử xuất nhập kho
              </h2>
              {stockMovements.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Chưa có lịch sử xuất nhập kho</p>
              ) : (
                <ResponsiveTable
                  columns={[
                    { key: 'ingredient', label: 'Nguyên liệu', render: (movement) => movement.ingredient?.name || 'N/A' },
                    { 
                      key: 'type', 
                      label: 'Loại', 
                      render: (movement) => (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          movement.type === 'IN' ? 'bg-green-100 text-green-800' :
                          movement.type === 'OUT' ? 'bg-red-100 text-red-800' :
                          movement.type === 'ADJUSTMENT' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {movement.type === 'IN' ? 'Nhập kho' :
                           movement.type === 'OUT' ? 'Xuất kho' :
                           movement.type === 'ADJUSTMENT' ? 'Điều chỉnh' :
                           'Hao hụt'}
                        </span>
                      )
                    },
                    { key: 'quantity', label: 'Số lượng', render: (movement) => `${movement.quantity} ${movement.ingredient?.unit || ''}` },
                    { key: 'reason', label: 'Lý do', render: (movement) => movement.reason || 'Không có', mobileHidden: true },
                    { key: 'createdAt', label: 'Thời gian', render: (movement) => new Date(movement.createdAt).toLocaleString('vi-VN'), mobileHidden: true, tabletHidden: true },
                  ]}
                  data={stockMovements}
                  keyField="id"
                  emptyMessage="Chưa có lịch sử xuất nhập kho"
                />
              )}
            </div>
          </div>
        )}

        {/* Recipes Tab */}
        {activeTab === 'recipes' && (
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
                <RestaurantIcon className="w-5 h-5 text-gray-600" />
                Quản lý công thức món ăn
              </h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Menu List */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b">
                  <h3 className="text-sm sm:text-base font-semibold flex items-center gap-1.5">
                    <ClipboardIcon className="w-4 h-4" />
                    Danh sách món ăn
                  </h3>
                </div>
                <div className="p-4">
                  {menus.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Chưa có món ăn nào</p>
                  ) : (
                    <div className="space-y-2">
                      {menus.map((menu) => (
                        <div
                          key={menu.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedMenu?.id === menu.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => {
                            setSelectedMenu(menu);
                            loadMenuIngredients(menu.id);
                          }}
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-semibold text-sm sm:text-base">{menu.name}</h4>
                              <p className="text-xs sm:text-sm text-gray-600">{menu.description}</p>
                              <p className="text-xs sm:text-sm text-green-600 font-semibold">
                                {Number(menu.price).toLocaleString('vi-VN')} ₫
                              </p>
                            </div>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              menu.isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {menu.isAvailable ? 'Có sẵn' : 'Hết món'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Recipe Details */}
              <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm sm:text-base font-semibold">
                      {selectedMenu ? `🧑‍🍳 Công thức: ${selectedMenu.name}` : 'Chọn món ăn để xem công thức'}
                    </h3>
                    {selectedMenu && hasPermission('inventory:create') && (
                      <button
                        onClick={() => setShowRecipeModal(true)}
                        className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-xs sm:text-sm"
                      >
                        + Thêm nguyên liệu
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="p-4">
                  {!selectedMenu ? (
                    <p className="text-gray-500 text-center py-8">Chọn món ăn để xem công thức</p>
                  ) : (
                    <div className="space-y-4">
                      {/* Cost Summary */}
                      {menuCost && (
                        <div className="bg-gray-50 rounded-lg p-3">
                          <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                            <CurrencyDollarIcon className="w-4 h-4" />
                            Chi phí nguyên liệu
                          </h4>
                          <div className="grid grid-cols-2 gap-2 text-xs sm:text-sm">
                            <div>
                              <span className="text-gray-600">Tổng chi phí:</span>
                              <span className="font-semibold text-red-600 ml-1">
                                {Number(menuCost.totalCost).toLocaleString('vi-VN')} ₫
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-600">Số nguyên liệu:</span>
                              <span className="font-semibold ml-1">{menuCost.ingredientCount}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Ingredients List */}
                      <div>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-1.5">
                          <BoxIcon className="w-4 h-4 text-gray-600" />
                          Nguyên liệu
                        </h4>
                        {menuIngredients.length === 0 ? (
                          <p className="text-gray-500 text-center py-4">Chưa có nguyên liệu nào</p>
                        ) : (
                          <div className="space-y-2">
                            {menuIngredients.map((ingredient) => (
                              <div key={ingredient.id} className="flex justify-between items-center p-2 border rounded-lg">
                                <div className="flex-1">
                                  <h5 className="font-medium text-sm">{ingredient.ingredient.name}</h5>
                                  <p className="text-xs text-gray-600">
                                    {ingredient.quantity} {ingredient.unit} • 
                                    {Number(ingredient.ingredient.costPrice).toLocaleString('vi-VN')} ₫/{ingredient.ingredient.unit}
                                  </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <input
                                    type="number"
                                    value={ingredient.quantity}
                                    onChange={(e) => {
                                      const newQuantity = parseFloat(e.target.value);
                                      if (!isNaN(newQuantity) && newQuantity >= 0) {
                                        updateMenuIngredient(ingredient.id, newQuantity);
                                      }
                                    }}
                                    className="w-16 px-2 py-1 border rounded text-xs"
                                    min="0"
                                    step="0.01"
                                  />
                                  <button
                                    onClick={() => removeMenuIngredient(ingredient.id)}
                                    className="text-red-500 hover:text-red-700 text-xs"
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Ingredient Modal */}
      {showIngredientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full mx-2 sm:mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-bold">
                {editingIngredient ? 'Sửa nguyên liệu' : 'Thêm nguyên liệu mới'}
              </h2>
              <button
                onClick={() => setShowIngredientModal(false)}
                className="text-gray-500 hover:text-gray-700 text-lg sm:text-xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Tên nguyên liệu</label>
                <input
                  type="text"
                  value={editingIngredient ? editingIngredient.name : newIngredient.name}
                  onChange={(e) => editingIngredient 
                    ? setEditingIngredient({...editingIngredient, name: e.target.value})
                    : setNewIngredient({...newIngredient, name: e.target.value})
                  }
                  className="w-full p-2 border rounded-lg text-sm"
                  placeholder="VD: Thịt bò"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Đơn vị</label>
                  <select
                    value={editingIngredient ? editingIngredient.unit : newIngredient.unit}
                    onChange={(e) => editingIngredient 
                      ? setEditingIngredient({...editingIngredient, unit: e.target.value})
                      : setNewIngredient({...newIngredient, unit: e.target.value})
                    }
                    className="w-full p-2 border rounded-lg text-sm"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="l">l</option>
                    <option value="ml">ml</option>
                    <option value="cái">cái</option>
                    <option value="hộp">hộp</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Giá nhập (₫)</label>
                  <input
                    type="number"
                    value={editingIngredient ? editingIngredient.costPrice : newIngredient.costPrice}
                    onChange={(e) => editingIngredient 
                      ? setEditingIngredient({...editingIngredient, costPrice: parseFloat(e.target.value) || 0})
                      : setNewIngredient({...newIngredient, costPrice: parseFloat(e.target.value) || 0})
                    }
                    className="w-full p-2 border rounded-lg text-sm"
                    min="0"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Tồn kho</label>
                  <input
                    type="number"
                    value={editingIngredient ? editingIngredient.currentStock : newIngredient.currentStock}
                    onChange={(e) => editingIngredient 
                      ? setEditingIngredient({...editingIngredient, currentStock: parseFloat(e.target.value) || 0})
                      : setNewIngredient({...newIngredient, currentStock: parseFloat(e.target.value) || 0})
                    }
                    className="w-full p-2 border rounded-lg text-sm"
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Tối thiểu</label>
                  <input
                    type="number"
                    value={editingIngredient ? editingIngredient.minStock : newIngredient.minStock}
                    onChange={(e) => editingIngredient 
                      ? setEditingIngredient({...editingIngredient, minStock: parseFloat(e.target.value) || 0})
                      : setNewIngredient({...newIngredient, minStock: parseFloat(e.target.value) || 0})
                    }
                    className="w-full p-2 border rounded-lg text-sm"
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Tối đa</label>
                  <input
                    type="number"
                    value={editingIngredient ? editingIngredient.maxStock : newIngredient.maxStock}
                    onChange={(e) => editingIngredient 
                      ? setEditingIngredient({...editingIngredient, maxStock: parseFloat(e.target.value) || 0})
                      : setNewIngredient({...newIngredient, maxStock: parseFloat(e.target.value) || 0})
                    }
                    className="w-full p-2 border rounded-lg text-sm"
                    min="0"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Nhà cung cấp</label>
                <select
                  value={editingIngredient ? editingIngredient.supplierId : newIngredient.supplierId}
                  onChange={(e) => editingIngredient 
                    ? setEditingIngredient({...editingIngredient, supplierId: e.target.value})
                    : setNewIngredient({...newIngredient, supplierId: e.target.value})
                  }
                  className="w-full p-2 border rounded-lg text-sm"
                >
                  <option value="">Chọn nhà cung cấp</option>
                  {suppliers.map((supplier) => (
                    <option key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Ngày hết hạn</label>
                <input
                  type="date"
                  value={editingIngredient ? editingIngredient.expiryDate?.split('T')[0] : newIngredient.expiryDate}
                  onChange={(e) => editingIngredient 
                    ? setEditingIngredient({...editingIngredient, expiryDate: e.target.value})
                    : setNewIngredient({...newIngredient, expiryDate: e.target.value})
                  }
                  className="w-full p-2 border rounded-lg text-sm"
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-4">
              <button
                onClick={editingIngredient ? updateIngredient : createIngredient}
                className="flex-1 px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm sm:text-base"
              >
                {editingIngredient ? 'Cập nhật' : 'Thêm mới'}
              </button>
              <button
                onClick={() => setShowIngredientModal(false)}
                className="flex-1 px-3 sm:px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm sm:text-base"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full mx-2 sm:mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-bold">
                {editingSupplier ? 'Sửa nhà cung cấp' : 'Thêm nhà cung cấp mới'}
              </h2>
              <button
                onClick={() => setShowSupplierModal(false)}
                className="text-gray-500 hover:text-gray-700 text-lg sm:text-xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Tên nhà cung cấp</label>
                <input
                  type="text"
                  value={editingSupplier ? editingSupplier.name : newSupplier.name}
                  onChange={(e) => editingSupplier 
                    ? setEditingSupplier({...editingSupplier, name: e.target.value})
                    : setNewSupplier({...newSupplier, name: e.target.value})
                  }
                  className="w-full p-2 border rounded-lg text-sm"
                  placeholder="VD: Công ty TNHH Thực phẩm ABC"
                />
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Người liên hệ</label>
                <input
                  type="text"
                  value={editingSupplier ? editingSupplier.contactName : newSupplier.contactName}
                  onChange={(e) => editingSupplier 
                    ? setEditingSupplier({...editingSupplier, contactName: e.target.value})
                    : setNewSupplier({...newSupplier, contactName: e.target.value})
                  }
                  className="w-full p-2 border rounded-lg text-sm"
                  placeholder="VD: Nguyễn Văn A"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Điện thoại</label>
                  <input
                    type="tel"
                    value={editingSupplier ? editingSupplier.phone : newSupplier.phone}
                    onChange={(e) => editingSupplier 
                      ? setEditingSupplier({...editingSupplier, phone: e.target.value})
                      : setNewSupplier({...newSupplier, phone: e.target.value})
                    }
                    className="w-full p-2 border rounded-lg text-sm"
                    placeholder="0123456789"
                  />
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={editingSupplier ? editingSupplier.email : newSupplier.email}
                    onChange={(e) => editingSupplier 
                      ? setEditingSupplier({...editingSupplier, email: e.target.value})
                      : setNewSupplier({...newSupplier, email: e.target.value})
                    }
                    className="w-full p-2 border rounded-lg text-sm"
                    placeholder="contact@abc.com"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Địa chỉ</label>
                <textarea
                  value={editingSupplier ? editingSupplier.address : newSupplier.address}
                  onChange={(e) => editingSupplier 
                    ? setEditingSupplier({...editingSupplier, address: e.target.value})
                    : setNewSupplier({...newSupplier, address: e.target.value})
                  }
                  className="w-full p-2 border rounded-lg text-sm"
                  rows={3}
                  placeholder="123 Đường ABC, Quận 1, TP.HCM"
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-4">
              <button
                onClick={editingSupplier ? updateSupplier : createSupplier}
                className="flex-1 px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm sm:text-base"
              >
                {editingSupplier ? 'Cập nhật' : 'Thêm mới'}
              </button>
              <button
                onClick={() => setShowSupplierModal(false)}
                className="flex-1 px-3 sm:px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm sm:text-base"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {showAdjustStockModal && selectedIngredient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full mx-2 sm:mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-bold">
                Điều chỉnh tồn kho - {selectedIngredient.name}
              </h2>
              <button
                onClick={() => setShowAdjustStockModal(false)}
                className="text-gray-500 hover:text-gray-700 text-lg sm:text-xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Tồn kho hiện tại: <span className="font-semibold">{selectedIngredient.currentStock} {selectedIngredient.unit}</span></p>
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Loại điều chỉnh</label>
                <select
                  value={adjustStockData.type}
                  onChange={(e) => setAdjustStockData({...adjustStockData, type: e.target.value as any})}
                  className="w-full p-2 border rounded-lg text-sm"
                >
                  <option value="IN">Nhập kho</option>
                  <option value="OUT">Xuất kho</option>
                  <option value="ADJUSTMENT">Điều chỉnh</option>
                  <option value="WASTE">Hao hụt</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Số lượng</label>
                <input
                  type="number"
                  value={adjustStockData.quantity}
                  onChange={(e) => setAdjustStockData({...adjustStockData, quantity: parseFloat(e.target.value) || 0})}
                  className="w-full p-2 border rounded-lg text-sm"
                  min="0"
                  step="0.01"
                  placeholder="Nhập số lượng"
                />
              </div>
              
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Lý do</label>
                <input
                  type="text"
                  value={adjustStockData.reason}
                  onChange={(e) => setAdjustStockData({...adjustStockData, reason: e.target.value})}
                  className="w-full p-2 border rounded-lg text-sm"
                  placeholder="VD: Nhập hàng từ nhà cung cấp, Xuất cho đơn hàng #123"
                />
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-4">
              <button
                onClick={adjustStock}
                className="flex-1 px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm sm:text-base"
              >
                Điều chỉnh
              </button>
              <button
                onClick={() => setShowAdjustStockModal(false)}
                className="flex-1 px-3 sm:px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm sm:text-base"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Recipe Modal */}
      {showRecipeModal && selectedMenu && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full mx-2 sm:mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-bold">
                Thêm nguyên liệu vào {selectedMenu.name}
              </h2>
              <button
                onClick={() => setShowRecipeModal(false)}
                className="text-gray-500 hover:text-gray-700 text-lg sm:text-xl"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-1">Nguyên liệu</label>
                <select
                  value={newMenuIngredient.ingredientId}
                  onChange={(e) => setNewMenuIngredient({...newMenuIngredient, ingredientId: e.target.value})}
                  className="w-full p-2 border rounded-lg text-sm"
                >
                  <option value="">Chọn nguyên liệu</option>
                  {ingredients.map((ingredient) => (
                    <option key={ingredient.id} value={ingredient.id}>
                      {ingredient.name} ({ingredient.unit})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Số lượng</label>
                  <input
                    type="number"
                    value={newMenuIngredient.quantity}
                    onChange={(e) => setNewMenuIngredient({...newMenuIngredient, quantity: parseFloat(e.target.value) || 0})}
                    className="w-full p-2 border rounded-lg text-sm"
                    min="0"
                    step="0.01"
                    placeholder="0.5"
                  />
                </div>
                
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Đơn vị</label>
                  <select
                    value={newMenuIngredient.unit}
                    onChange={(e) => setNewMenuIngredient({...newMenuIngredient, unit: e.target.value})}
                    className="w-full p-2 border rounded-lg text-sm"
                  >
                    <option value="kg">kg</option>
                    <option value="g">g</option>
                    <option value="l">l</option>
                    <option value="ml">ml</option>
                    <option value="cái">cái</option>
                    <option value="hộp">hộp</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-4">
              <button
                onClick={addMenuIngredient}
                className="flex-1 px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm sm:text-base"
              >
                Thêm nguyên liệu
              </button>
              <button
                onClick={() => setShowRecipeModal(false)}
                className="flex-1 px-3 sm:px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm sm:text-base"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
