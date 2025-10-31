'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { usePermissions } from '@/hooks/usePermissions';

interface Table {
  id: string;
  name: string;
  capacity: number;
  status: string;
  location?: string;
  description?: string;
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  description?: string;
  image?: string;
  isAvailable: boolean;
  category: {
    id: string;
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
  description?: string;
}

interface OrderItem {
  menuId: string;
  quantity: number;
  notes?: string;
}

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  points: number;
  level: string;
}

export default function PosPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { hasPermission, canManageTables, canManageMenu, canManageOrders } = usePermissions();
  
  const [tables, setTables] = useState<Table[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentOrder, setCurrentOrder] = useState<any>(null);
  const [clearedTables, setClearedTables] = useState<Set<string>>(new Set());
  const [showBill, setShowBill] = useState(false);
  const [billData, setBillData] = useState<any>(null);
  const [taxInfo, setTaxInfo] = useState<any>(null); // Thông tin thuế từ backend
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showTableModal, setShowTableModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [editingTable, setEditingTable] = useState<any>(null);
  
  // Customer states
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [editingMenu, setEditingMenu] = useState<any>(null);
  const [newTable, setNewTable] = useState({ name: '', capacity: 4, status: 'AVAILABLE' });
  const [newMenu, setNewMenu] = useState({ name: '', description: '', price: 0, categoryId: '', isAvailable: true });

  useEffect(() => {
    loadData();
  }, []);

  // Tính thuế khi billData thay đổi
  useEffect(() => {
    const calculateTax = async () => {
      if (billData && billData.subtotal && showBill) {
        try {
          const response = await fetch('/api/print/calculate-tax', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ subtotal: Number(billData.subtotal) })
          });

          if (response.ok) {
            const result = await response.json();
            if (result.success) {
              setTaxInfo(result.taxCalculation);
              // Cập nhật billData với thông tin thuế mới
              setBillData((prev: any) => ({
                ...prev,
                tax: result.taxCalculation.vatAmount,
                serviceCharge: result.taxCalculation.serviceChargeAmount,
                total: result.taxCalculation.total
              }));
            }
          }
        } catch (error) {
          console.error('❌ Lỗi khi tính thuế:', error);
        }
      }
    };

    calculateTax();
  }, [billData?.subtotal, showBill]); // Tính lại khi subtotal thay đổi hoặc mở bill modal

  const loadData = async () => {
    try {
      setLoading(true);
      const [tablesRes, menuRes, categoriesRes, customersRes] = await Promise.all([
        api.get('/pos/tables'),
        api.get('/pos/menu'),
        api.get('/pos/categories'),
        api.get('/customers')
      ]);
      
      console.log('📊 API Responses:', {
        tables: tablesRes.data,
        menu: menuRes.data,
        categories: categoriesRes.data,
        customers: customersRes.data
      });
      
      setTables(tablesRes.data);
      setMenu(menuRes.data);
      setCategories(categoriesRes.data);
      
      // Handle customers data - ensure it's an array
      const customersData = customersRes.data;
      if (Array.isArray(customersData)) {
        setCustomers(customersData);
      } else {
        console.error('❌ Customers data is not an array:', customersData);
        setCustomers([]);
      }
    } catch (error: any) {
      console.error('Error loading data:', error);
      // Set empty arrays on error
      setTables([]);
      setMenu([]);
      setCategories([]);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const loadTableOrders = async (tableId: string) => {
    // Don't load if cart was cleared for this table
    if (clearedTables.has(tableId)) {
      setCurrentOrder(null);
      setCart([]);
      return;
    }
    
    try {
      const response = await api.get(`/pos/orders?tableId=${tableId}`);
      const orders = response.data;
      if (orders && orders.length > 0) {
        // Only load orders that are not completed
        const activeOrders = orders.filter((order: any) => order.status !== 'COMPLETED');
        if (activeOrders.length > 0) {
          setCurrentOrder(activeOrders[0]); // Get the latest active order
          // Convert order items to cart format
          const orderItems = activeOrders[0]?.orderItems || [];
          const cartItems = Array.isArray(orderItems) ? orderItems.map((item: any) => ({
            menuId: item.menuId,
            quantity: item.quantity,
            notes: item.notes
          })) : [];
          setCart(cartItems);
        } else {
          setCurrentOrder(null);
          setCart([]);
        }
      } else {
        setCurrentOrder(null);
        setCart([]);
      }
    } catch (error: any) {
      console.error('Error loading table orders:', error);
      setCurrentOrder(null);
      setCart([]);
    }
  };

  const filteredMenu = selectedCategory === 'all' 
    ? menu 
    : menu.filter(item => item.category.id === selectedCategory);

  const addToCart = (menuItem: MenuItem) => {
    const existingItem = cart.find(item => item.menuId === menuItem.id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.menuId === menuItem.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { menuId: menuItem.id, quantity: 1 }]);
    }
  };

  const updateCartItem = (menuId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(cart.filter(item => item.menuId !== menuId));
    } else {
      setCart(cart.map(item => 
        item.menuId === menuId ? { ...item, quantity } : item
      ));
    }
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => {
      const menuItem = menu.find(m => m.id === item.menuId);
      return total + (menuItem ? Number(menuItem.price) * item.quantity : 0);
    }, 0);
  };

  const createOrder = async () => {
    if (!selectedTable || cart.length === 0) return;

    try {
      // Check if table is available for new orders
      if (selectedTable.status !== 'AVAILABLE' && !currentOrder && !clearedTables.has(selectedTable.id)) {
        alert('Bàn này đã có đơn hàng. Vui lòng chọn bàn khác hoặc thêm món vào đơn hàng hiện tại.');
        return;
      }

      const orderData = {
        tableId: selectedTable.id,
        orderItems: cart,
        notes: '',
        customerId: selectedCustomer?.id || null
      };
      
      console.log('Creating order with data:', orderData);
      console.log('🔑 Current token:', localStorage.getItem('accessToken'));
      console.log('👤 Current user:', user);
      console.log('🔐 User role:', user?.role);
      // console.log('🛡️ User permissions:', user?.permissions);
      
      const response = await api.post('/pos/orders', orderData);
      const orderId = response.data.id;
      
      // Tính thuế sẽ được tính khi in hóa đơn, không cần tính trước
      
      alert('Đơn hàng đã được tạo thành công!');

      // Clear cart after successful order
      setCart([]);
      setCurrentOrder(null);
      
      // Remove table from cleared tables when creating new order
      if (selectedTable) {
        setClearedTables(prev => {
          const newSet = new Set(prev);
          newSet.delete(selectedTable.id);
          return newSet;
        });
      }

      // Reload data to refresh everything
      loadData();
    } catch (error: any) {
      console.error('Error creating order:', error);
      console.error('Error details:', error.response?.data);
      console.error('Error status:', error.response?.status);
      
      if (error.response?.status === 401) {
        alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
        logout();
        router.push('/login');
      } else if (error.response?.status === 403) {
        alert('Bạn không có quyền tạo đơn hàng. Vui lòng liên hệ quản trị viên.');
      } else {
        alert(`Có lỗi khi tạo đơn hàng: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  const addToExistingOrder = async () => {
    if (!selectedTable || cart.length === 0 || !currentOrder) return;
    
    try {
      // Create new order with additional items for the same table
      const orderData = {
        tableId: selectedTable.id,
        orderItems: cart,
        notes: `Thêm món vào đơn hàng ${currentOrder.orderNumber}`
      };
      
      console.log('Adding to existing order with data:', orderData);
      
      await api.post('/pos/orders', orderData);
      alert('Đã cập nhật đơn hàng thành công!');
      
      // Clear cart and reload
      setCart([]);
      
      // Remove table from cleared tables when adding to existing order
      if (selectedTable) {
        setClearedTables(prev => {
          const newSet = new Set(prev);
          newSet.delete(selectedTable.id);
          return newSet;
        });
      }
      
      loadData();
      loadTableOrders(selectedTable.id);
    } catch (error: any) {
      console.error('Error adding to order:', error);
      console.error('Error details:', error.response?.data);
      alert(`Có lỗi khi cập nhật đơn hàng: ${error.response?.data?.message || error.message}`);
    }
  };

  const completeOrder = async () => {
    if (!currentOrder) return;
    
    try {
      // Update order status to COMPLETED using the new endpoint
      const updatedOrder = await api.patch(`/pos/orders/${currentOrder.id}/status`, {
        status: 'COMPLETED'
      });
      
      // Update table status to AVAILABLE when order is completed
      if (selectedTable) {
        await api.patch(`/pos/tables/${selectedTable.id}`, {
          status: 'AVAILABLE'
        });
      }
      
      // Show success message
      alert('Thanh toán thành công!');
      
      // Show bill with order data
      setBillData(updatedOrder.data);
      setShowBill(true);
      
      // Clear everything and reload
      setCart([]);
      setCurrentOrder(null);
      loadData();
    } catch (error: any) {
      console.error('Error completing order:', error);
      alert(`Có lỗi khi hoàn thành đơn hàng: ${error.response?.data?.message || error.message}`);
    }
  };

  const transferTable = async (newTableId: string) => {
    if (!currentOrder || !selectedTable) return;
    
    try {
      // Update order table
      await api.patch(`/pos/orders/${currentOrder.id}`, {
        tableId: newTableId
      });
      
      // Update old table status to AVAILABLE
      await api.patch(`/pos/tables/${selectedTable.id}`, {
        status: 'AVAILABLE'
      });
      
      // Update new table status to OCCUPIED
      await api.patch(`/pos/tables/${newTableId}`, {
        status: 'OCCUPIED'
      });
      
      alert('Đã chuyển bàn thành công!');
      
      // Close modal and reload data
      setShowTransferModal(false);
      loadData();
      
      // Select new table and load its orders
      const newTable = tables.find(t => t.id === newTableId);
      if (newTable) {
        setSelectedTable(newTable);
        loadTableOrders(newTableId);
      }
    } catch (error: any) {
      console.error('Error transferring table:', error);
      alert(`Có lỗi khi chuyển bàn: ${error.response?.data?.message || error.message}`);
    }
  };

  // Table management functions
  const createTable = async () => {
    try {
      await api.post('/pos/tables', newTable);
      alert('Đã thêm bàn thành công!');
      setNewTable({ name: '', capacity: 4, status: 'AVAILABLE' });
      setShowTableModal(false);
      loadData();
    } catch (error: any) {
      console.error('Error creating table:', error);
      alert(`Có lỗi khi thêm bàn: ${error.response?.data?.message || error.message}`);
    }
  };

  const updateTable = async () => {
    if (!editingTable) return;
    
    try {
      // Only send allowed fields for update
      const updateData = {
        name: editingTable.name,
        capacity: editingTable.capacity,
        status: editingTable.status,
        location: editingTable.location,
        description: editingTable.description,
      };
      
      await api.patch(`/pos/tables/${editingTable.id}`, updateData);
      alert('Đã cập nhật bàn thành công!');
      setEditingTable(null);
      setShowTableModal(false);
      loadData();
    } catch (error: any) {
      console.error('Error updating table:', error);
      alert(`Có lỗi khi cập nhật bàn: ${error.response?.data?.message || error.message}`);
    }
  };

  const deleteTable = async (tableId: string) => {
    if (!confirm('Bạn có chắc muốn xóa bàn này?')) return;
    
    try {
      await api.delete(`/pos/tables/${tableId}`);
      alert('Đã xóa bàn thành công!');
      loadData();
    } catch (error: any) {
      console.error('Error deleting table:', error);
      const errorMessage = error.response?.data?.message || error.message;
      
      if (errorMessage.includes('existing orders')) {
        const forceDelete = confirm('Bàn này đang có đơn hàng. Bạn có muốn xóa bàn và tất cả đơn hàng liên quan?');
        if (forceDelete) {
          try {
            await api.delete(`/pos/tables/${tableId}/force`);
            alert('Đã xóa bàn và tất cả đơn hàng liên quan thành công!');
            loadData();
          } catch (forceError: any) {
            console.error('Error force deleting table:', forceError);
            alert(`Có lỗi khi xóa bàn: ${forceError.response?.data?.message || forceError.message}`);
          }
        }
      } else {
        alert(`Có lỗi khi xóa bàn: ${errorMessage}`);
      }
    }
  };

  // Menu management functions
  const createMenu = async () => {
    try {
      // Ensure price is a number
      const menuData = {
        ...newMenu,
        price: Number(newMenu.price)
      };
      
      await api.post('/pos/menu', menuData);
      alert('Đã thêm món thành công!');
      setNewMenu({ name: '', description: '', price: 0, categoryId: '', isAvailable: true });
      setShowMenuModal(false);
      loadData();
    } catch (error: any) {
      console.error('Error creating menu:', error);
      alert(`Có lỗi khi thêm món: ${error.response?.data?.message || error.message}`);
    }
  };

  const updateMenu = async () => {
    if (!editingMenu) return;
    
    try {
      // Only send allowed fields for update
      const updateData = {
        name: editingMenu.name,
        description: editingMenu.description,
        price: Number(editingMenu.price), // Ensure price is a number
        categoryId: editingMenu.categoryId,
        image: editingMenu.image,
        isActive: editingMenu.isActive,
        isAvailable: editingMenu.isAvailable,
      };
      
      await api.patch(`/pos/menu/${editingMenu.id}`, updateData);
      alert('Đã cập nhật món thành công!');
      setEditingMenu(null);
      setShowMenuModal(false);
      loadData();
    } catch (error: any) {
      console.error('Error updating menu:', error);
      alert(`Có lỗi khi cập nhật món: ${error.response?.data?.message || error.message}`);
    }
  };

  const deleteMenu = async (menuId: string) => {
    if (!confirm('Bạn có chắc muốn xóa món này?')) return;
    
    try {
      await api.delete(`/pos/menu/${menuId}`);
      alert('Đã xóa món thành công!');
      loadData();
    } catch (error: any) {
      console.error('Error deleting menu:', error);
      const errorMessage = error.response?.data?.message || error.message;
      
      if (errorMessage.includes('existing order items')) {
        const forceDelete = confirm('Món này đang có trong đơn hàng. Bạn có muốn xóa món và tất cả đơn hàng liên quan?');
        if (forceDelete) {
          try {
            await api.delete(`/pos/menu/${menuId}/force`);
            alert('Đã xóa món và tất cả đơn hàng liên quan thành công!');
            loadData();
          } catch (forceError: any) {
            console.error('Error force deleting menu:', forceError);
            alert(`Có lỗi khi xóa món: ${forceError.response?.data?.message || forceError.message}`);
          }
        }
      } else {
        alert(`Có lỗi khi xóa món: ${errorMessage}`);
      }
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
                className="mr-2 sm:mr-4 text-gray-600 hover:text-gray-900 text-sm sm:text-base"
              >
                ← Quay lại
              </button>
              <h1 className="text-lg sm:text-xl font-semibold text-gray-900">
                POS - Bán hàng
              </h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              {canManageTables() && (
                <>
                  <button
                    onClick={async () => {
                      try {
                        await api.post('/pos/tables', { name: '', capacity: 4, status: 'AVAILABLE' });
                        alert('Đã thêm bàn mới thành công!');
                        loadData();
                      } catch (error: any) {
                        console.error('Error creating table:', error);
                        alert(`Có lỗi khi thêm bàn: ${error.response?.data?.message || error.message}`);
                      }
                    }}
                    className="px-2 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 text-xs sm:text-sm"
                  >
                    + Bàn
                  </button>
                  <button
                    onClick={() => {
                      setEditingTable(null);
                      setNewTable({ name: '', capacity: 4, status: 'AVAILABLE' });
                      setShowTableModal(true);
                    }}
                    className="px-2 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-xs sm:text-sm"
                  >
                    Bàn
                  </button>
                </>
              )}
              {canManageMenu() && (
                <button
                  onClick={() => {
                    setEditingMenu(null);
                    setNewMenu({ name: '', description: '', price: 0, categoryId: categories[0]?.id || '', isAvailable: true });
                    setShowMenuModal(true);
                  }}
                  className="px-2 py-1 bg-green-500 text-white rounded-lg hover:bg-green-600 text-xs sm:text-sm"
                >
                  Món
                </button>
              )}
              <span className="text-xs sm:text-sm text-gray-700 hidden sm:block">
                Xin chào, {user?.firstName} {user?.lastName}
              </span>
              <button
                onClick={logout}
                className="px-2 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 text-xs sm:text-sm"
              >
                Thoát
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-3 sm:py-6 px-2 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 sm:gap-6">
          {/* Tables Section */}
          <div className="xl:col-span-1">
            <div className="bg-white rounded-lg shadow p-3 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Bàn</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2 sm:gap-3">
                {tables.map((table) => (
                  <button
                    key={table.id}
                  onClick={() => {
                    setSelectedTable(table);
                    if (table.status === 'OCCUPIED' && !clearedTables.has(table.id)) {
                      loadTableOrders(table.id);
                    } else {
                      setCart([]);
                      setCurrentOrder(null);
                    }
                  }}
                    className={`p-2 sm:p-3 rounded-lg border-2 transition-colors text-xs sm:text-sm ${
                      selectedTable?.id === table.id
                        ? 'border-blue-500 bg-blue-50'
                        : (table.status === 'AVAILABLE' || clearedTables.has(table.id))
                        ? 'border-green-300 bg-green-50 hover:bg-green-100'
                        : 'border-red-300 bg-red-50'
                    }`}
                  >
                    <div className="text-center">
                      <div className="font-semibold">{table.name}</div>
                      <div className="text-sm text-gray-600">
                        {table.capacity} người
                      </div>
                      <div className={`text-xs mt-1 ${
                        (table.status === 'AVAILABLE' || clearedTables.has(table.id)) ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {(table.status === 'AVAILABLE' || clearedTables.has(table.id)) ? 'Trống' : 'Có khách'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Menu Section */}
          <div className="xl:col-span-2">
            <div className="bg-white rounded-lg shadow p-3 sm:p-6">
              <h2 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Thực đơn</h2>
              
              {/* Category Filter */}
              <div className="flex flex-wrap gap-1 sm:gap-2 mb-3 sm:mb-4">
                <button
                  onClick={() => setSelectedCategory('all')}
                  className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm ${
                    selectedCategory === 'all'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Tất cả
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => setSelectedCategory(category.id)}
                    className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm ${
                      selectedCategory === category.id
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 text-gray-700'
                    }`}
                  >
                    {category.name}
                  </button>
                ))}
              </div>

              {/* Menu Items */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 gap-2 sm:gap-4 max-h-80 sm:max-h-96 overflow-y-auto">
                {filteredMenu.map((item) => (
                  <div
                    key={item.id}
                    className={`border rounded-lg p-2 sm:p-4 cursor-pointer transition-colors ${
                      item.isAvailable
                        ? 'hover:bg-gray-50 border-gray-200'
                        : 'opacity-50 cursor-not-allowed border-gray-100'
                    }`}
                    onClick={() => item.isAvailable && addToCart(item)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm sm:text-base">{item.name}</h3>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1 line-clamp-2">
                          {item.description}
                        </p>
                        <div className="text-sm sm:text-lg font-bold text-green-600 mt-1 sm:mt-2">
                          {Number(item.price).toLocaleString('vi-VN')} ₫
                        </div>
                      </div>
                      {!item.isAvailable && (
                        <span className="text-xs bg-red-100 text-red-600 px-1 sm:px-2 py-1 rounded">
                          Hết
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Cart Section */}
        {selectedTable && (
          <div className="mt-3 sm:mt-6 bg-white rounded-lg shadow p-3 sm:p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-4 gap-2">
              <h2 className="text-base sm:text-lg font-semibold">
                Giỏ hàng - Bàn {selectedTable.name}
              </h2>
              {currentOrder && (
                <div className="text-xs sm:text-sm text-gray-600">
                  Đơn hàng: {currentOrder.orderNumber}
                </div>
              )}
            </div>
            
            {/* Customer Selection */}
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700">
                  Khách hàng (tùy chọn)
                </label>
                <button
                  onClick={() => setShowCustomerModal(true)}
                  className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                >
                  {selectedCustomer ? 'Đổi khách' : 'Chọn khách'}
                </button>
              </div>
              
              {selectedCustomer ? (
                <div className="flex items-center justify-between bg-white p-2 rounded border">
                  <div>
                    <div className="font-medium text-sm">{selectedCustomer.name}</div>
                    <div className="text-xs text-gray-600">
                      {selectedCustomer.phone} • {selectedCustomer.points} điểm • {selectedCustomer.level}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="text-red-500 hover:text-red-700 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  Chưa chọn khách hàng
                </div>
              )}
            </div>
            
            {cart.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Chưa có món nào trong giỏ hàng
              </p>
            ) : (
              <div className="space-y-2 sm:space-y-3">
                {cart.map((item) => {
                  const menuItem = menu.find(m => m.id === item.menuId);
                  if (!menuItem) return null;
                  
                  return (
                    <div key={item.menuId} className="flex items-center justify-between border-b pb-2 sm:pb-3">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-sm sm:text-base truncate">{menuItem.name}</h4>
                        <p className="text-xs sm:text-sm text-gray-600">
                          {Number(menuItem.price).toLocaleString('vi-VN')} ₫
                        </p>
                      </div>
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <button
                          onClick={() => updateCartItem(item.menuId, item.quantity - 1)}
                          className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs sm:text-sm"
                        >
                          -
                        </button>
                        <span className="w-6 sm:w-8 text-center text-xs sm:text-sm">{item.quantity}</span>
                        <button
                          onClick={() => updateCartItem(item.menuId, item.quantity + 1)}
                          className="w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs sm:text-sm"
                        >
                          +
                        </button>
                        <div className="w-16 sm:w-20 text-right font-semibold text-xs sm:text-sm">
                          {(Number(menuItem.price) * item.quantity).toLocaleString('vi-VN')} ₫
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                <div className="border-t pt-3 sm:pt-4">
                  <div className="flex justify-between items-center text-base sm:text-lg font-bold">
                    <span>Tổng cộng:</span>
                    <span className="text-green-600">
                      {getCartTotal().toLocaleString('vi-VN')} ₫
                    </span>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-3 sm:mt-4">
                    <button
                      onClick={async () => {
                        setCart([]);
                        setCurrentOrder(null);
                        if (selectedTable) {
                          setClearedTables(prev => new Set([...Array.from(prev), selectedTable.id]));
                          
                          // Update table status to AVAILABLE when clearing cart
                          try {
                            await api.patch(`/pos/tables/${selectedTable.id}`, {
                              status: 'AVAILABLE'
                            });
                            
                            // Reload data to refresh table status
                            loadData();
                          } catch (error: any) {
                            console.error('Error updating table status:', error);
                          }
                        }
                      }}
                      className="flex-1 bg-gray-500 text-white py-2 px-3 sm:px-4 rounded-lg hover:bg-gray-600 text-sm sm:text-base"
                    >
                      Xóa giỏ hàng
                    </button>
                    <button
                      onClick={currentOrder ? addToExistingOrder : createOrder}
                      className="flex-1 bg-blue-500 text-white py-2 px-3 sm:px-4 rounded-lg hover:bg-blue-600 text-sm sm:text-base"
                    >
                      {currentOrder ? 'Cập nhật đơn hàng' : 'Tạo đơn hàng'}
                    </button>
                    {currentOrder && (
                      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                        <button
                          onClick={completeOrder}
                          className="flex-1 bg-green-500 text-white py-2 px-3 sm:px-4 rounded-lg hover:bg-green-600 text-sm sm:text-base"
                        >
                          Thanh toán & In hóa đơn
                        </button>
                        <button
                          onClick={() => {
                            setBillData(currentOrder);
                            setShowBill(true);
                          }}
                          className="px-3 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 text-xs sm:text-sm"
                          title="Xem hóa đơn trước khi thanh toán"
                        >
                          Xem
                        </button>
                      </div>
                    )}
                    {currentOrder && (
                      <button
                        onClick={() => setShowTransferModal(true)}
                        className="flex-1 bg-orange-500 text-white py-2 px-3 sm:px-4 rounded-lg hover:bg-orange-600 text-sm sm:text-base"
                      >
                        Chuyển bàn
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bill Modal */}
      {showBill && billData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 print:fixed print:inset-0 print:bg-white print:p-0 print:m-0 bill-print-content">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full mx-2 sm:mx-4 print:shadow-none print:border-0 print:w-full print:max-w-none print:m-0 print:p-4">
            <div className="text-center mb-4">
              <h2 className="text-xl font-bold">HÓA ĐƠN THANH TOÁN</h2>
              <p className="text-sm text-gray-600">Nhà Tôi Restaurant</p>
              <p className="text-xs text-gray-500">Cảm ơn quý khách!</p>
            </div>
            
            <div className="border-t border-b py-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Số đơn:</span>
                <span className="font-semibold">{billData.orderNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Bàn:</span>
                <span>{billData.table?.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Thời gian:</span>
                <span>{new Date(billData.createdAt).toLocaleString('vi-VN')}</span>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="font-semibold mb-2">Chi tiết món ăn:</h3>
              {billData.orderItems && Array.isArray(billData.orderItems) && billData.orderItems.length > 0 ? (
                billData.orderItems.map((item: any, index: number) => (
                  <div key={index} className="flex justify-between text-sm mb-1">
                    <span>{item.menu?.name} x{item.quantity}</span>
                    <span>{Number(item.subtotal).toLocaleString('vi-VN')} ₫</span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">Không có món ăn</p>
              )}
            </div>

            <div className="border-t pt-2 mb-4">
              <div className="flex justify-between text-sm">
                <span>Tạm tính:</span>
                <span>{Number(billData.subtotal || 0).toLocaleString('vi-VN')} ₫</span>
              </div>
              
              {/* Hiển thị VAT nếu có */}
              {taxInfo?.vatEnabled && taxInfo.vatAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>{taxInfo.taxName || 'VAT'} ({taxInfo.vatRate}%):</span>
                  <span>{taxInfo.vatAmount.toLocaleString('vi-VN')} ₫</span>
                </div>
              )}
              
              {/* Hiển thị Phí phục vụ nếu có */}
              {taxInfo?.serviceChargeEnabled && taxInfo.serviceChargeAmount > 0 && (
                <div className="flex justify-between text-sm">
                  <span>{taxInfo.serviceChargeName || 'Phí phục vụ'} ({taxInfo.serviceChargeRate}%):</span>
                  <span>{taxInfo.serviceChargeAmount.toLocaleString('vi-VN')} ₫</span>
                </div>
              )}
              
              {/* Fallback hiển thị thuế cũ nếu chưa có taxInfo (backward compatibility) */}
              {!taxInfo && billData.tax && Number(billData.tax) > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Thuế:</span>
                  <span>{Number(billData.tax).toLocaleString('vi-VN')} ₫</span>
                </div>
              )}
              
              {billData.discount && billData.discount > 0 && (
                <div className="flex justify-between text-sm text-red-600">
                  <span>Giảm giá:</span>
                  <span>-{Number(billData.discount).toLocaleString('vi-VN')} ₫</span>
                </div>
              )}
              
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>TỔNG CỘNG:</span>
                <span className="text-green-600">
                  {taxInfo?.total 
                    ? taxInfo.total.toLocaleString('vi-VN')
                    : Number(billData.total || 0).toLocaleString('vi-VN')
                  } ₫
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 no-print">
              <button
                onClick={async () => {
                  try {
                    // Gọi API in QR VietQR mới
                    const qrData = {
                      amount: Number(billData.total) || 0,
                      billId: billData.id || billData.orderNumber || 'UNKNOWN'
                    };

                    const response = await fetch('/api/print/print-qr', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(qrData)
                    });
                    
                    if (response.ok) {
                      const result = await response.json();
                      if (result.success) {
                        alert('✅ QR thanh toán đã được in thành công!');
                      } else {
                        alert('❌ Lỗi khi in QR: ' + result.message);
                      }
                    } else {
                      alert('❌ Lỗi khi gọi API in QR');
                    }
                  } catch (error) {
                    console.error('❌ Error printing QR:', error);
                    alert('❌ Lỗi khi in QR: ' + (error instanceof Error ? error.message : String(error)));
                  }
                }}
                className="flex-1 bg-green-500 text-white py-2 px-3 sm:px-4 rounded-lg hover:bg-green-600 text-sm sm:text-base"
              >
                💳 In QR thanh toán
              </button>
              <button
                onClick={async () => {
                  try {
                    // Chuẩn bị dữ liệu hóa đơn
                    // Backend sẽ tự tính thuế từ cấu hình admin
                    
                    // Lấy items từ billData (có thể là items hoặc orderItems)
                    const orderItems = billData.items || billData.orderItems || [];
                    
                    // Validate items
                    if (!Array.isArray(orderItems) || orderItems.length === 0) {
                      alert('❌ Không có món ăn nào trong hóa đơn. Vui lòng kiểm tra lại!');
                      return;
                    }
                    
                    const printBillData = {
                      id: billData.id || billData.orderNumber || 'UNKNOWN',
                      table: selectedTable?.name || billData.table?.name || 'Tại quầy',
                      time: new Date().toLocaleTimeString('vi-VN'),
                      items: orderItems.map((item: any) => ({
                        name: item.menu?.name || item.name || 'Món ăn',
                        qty: item.quantity || item.qty || 1,
                        price: item.price || item.subtotal || 0
                      }))
                      // Backend sẽ tự tính subtotal, thuế, và total từ items
                    };

                    console.log('📋 Dữ liệu hóa đơn:', printBillData);

                    // Gọi API in hóa đơn
                    // Backend sẽ tự tính thuế từ cấu hình admin
                    const response = await fetch('/api/print/print-bill', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(printBillData)
                    });
                    
                    if (response.ok) {
                      const result = await response.json();
                      
                      if (result.success) {
                        alert('✅ Hóa đơn đã được in thành công!\n\n🧾 Layout đẹp, rõ ràng\n🖨️ In qua máy Xprinter T80L');
                      } else {
                        alert('❌ Lỗi khi in hóa đơn: ' + result.message);
                      }
                    } else {
                      alert('❌ Lỗi khi gọi API in hóa đơn. Vui lòng thử lại.');
                    }
                  } catch (error) {
                    console.error('❌ Error printing receipt:', error);
                    alert('❌ Lỗi khi in hóa đơn: ' + (error instanceof Error ? error.message : String(error)));
                  }
                }}
                className="flex-1 bg-blue-500 text-white py-2 px-3 sm:px-4 rounded-lg hover:bg-blue-600 text-sm sm:text-base"
                title="In trực tiếp qua máy in ESC/POS (USB/LAN)"
              >
                🖨️ In máy Xprinter
              </button>
              
              {/* Nút in qua hộp thoại in của browser */}
              <button
                onClick={() => {
                  // In qua hộp thoại print dialog của browser
                  window.print();
                }}
                className="flex-1 bg-indigo-500 text-white py-2 px-3 sm:px-4 rounded-lg hover:bg-indigo-600 text-sm sm:text-base"
                title="In qua hộp thoại in của máy tính (PDF hoặc máy in hệ thống)"
              >
                🖨️ In qua máy tính
              </button>
              <button
                onClick={async () => {
                  try {
                    // Chuẩn bị dữ liệu QR
                    const qrData = {
                      amount: billData.total || 0,
                      billId: billData.id
                    };

                    console.log('💳 Dữ liệu QR:', qrData);

                    // Gọi API in QR
                    const response = await fetch('/api/print/print-qr', {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                      },
                      body: JSON.stringify(qrData)
                    });
                    
                    if (response.ok) {
                      const result = await response.json();
                      
                      if (result.success) {
                        alert('✅ QR thanh toán đã được in thành công!\n\n💳 QR VietQR động\n📱 Khách có thể quét để chuyển khoản\n🖨️ In riêng biệt');
                      } else {
                        alert('❌ Lỗi khi in QR: ' + result.message);
                      }
                    } else {
                      alert('❌ Lỗi khi gọi API in QR. Vui lòng thử lại.');
                    }
                  } catch (error) {
                    console.error('❌ Error printing QR:', error);
                    alert('❌ Lỗi khi in QR: ' + (error instanceof Error ? error.message : String(error)));
                  }
                }}
                className="flex-1 bg-green-500 text-white py-2 px-3 sm:px-4 rounded-lg hover:bg-green-600 text-sm sm:text-base"
              >
                💳 In QR thanh toán
              </button>
              <button
                onClick={() => {
                  setShowBill(false);
                  setTaxInfo(null); // Reset tax info khi đóng
                }}
                className="flex-1 bg-gray-500 text-white py-2 px-3 sm:px-4 rounded-lg hover:bg-gray-600 text-sm sm:text-base"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Table Modal */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full mx-2 sm:mx-4">
            <div className="text-center mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-bold">Chuyển bàn</h2>
              <p className="text-xs sm:text-sm text-gray-600">
                Chọn bàn mới cho đơn hàng {currentOrder?.orderNumber}
              </p>
            </div>
            
            <div className="mb-3 sm:mb-4">
              <h3 className="font-semibold mb-2 text-sm sm:text-base">Bàn hiện tại: {selectedTable?.name}</h3>
              <h3 className="font-semibold mb-3 text-sm sm:text-base">Chọn bàn mới:</h3>
              <div className="grid grid-cols-2 gap-2 sm:gap-3 max-h-60 overflow-y-auto">
                {tables
                  .filter(table => table.id !== selectedTable?.id && table.status === 'AVAILABLE')
                  .map((table) => (
                    <button
                      key={table.id}
                      onClick={() => transferTable(table.id)}
                      className="p-2 sm:p-3 rounded-lg border-2 border-green-300 bg-green-50 hover:bg-green-100 transition-colors"
                    >
                      <div className="text-center">
                        <div className="font-semibold text-sm sm:text-base">{table.name}</div>
                        <div className="text-xs sm:text-sm text-gray-600">
                          {table.capacity} người
                        </div>
                        <div className="text-xs text-green-600 mt-1">
                          Trống
                        </div>
                      </div>
                    </button>
                  ))}
              </div>
              
              {tables.filter(table => table.id !== selectedTable?.id && table.status === 'AVAILABLE').length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  Không có bàn trống nào để chuyển
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowTransferModal(false)}
                className="flex-1 bg-gray-500 text-white py-2 px-3 sm:px-4 rounded-lg hover:bg-gray-600 text-sm sm:text-base"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Table Management Modal */}
      {showTableModal && canManageTables() && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-4xl w-full mx-2 sm:mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 sm:mb-4 gap-2">
              <h2 className="text-lg sm:text-xl font-bold">Quản lý bàn</h2>
              <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={async () => {
                      if (confirm('Bạn có chắc muốn đánh số lại tất cả bàn theo thứ tự?')) {
                        try {
                          const response = await api.post('/pos/tables/renumber');
                          console.log('Renumber response:', response.data);
                          alert('Đã đánh số lại bàn thành công!');
                          loadData();
                        } catch (error: any) {
                          console.error('Error renumbering tables:', error);
                          console.error('Error details:', error.response?.data);
                          
                          if (error.response?.status === 404) {
                            alert('Endpoint chưa được khởi tạo. Vui lòng restart backend server.');
                          } else {
                            alert(`Có lỗi khi đánh số lại bàn: ${error.response?.data?.message || error.message}`);
                          }
                        }
                      }
                    }}
                    className="px-2 sm:px-3 py-1 bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-xs sm:text-sm"
                  >
                    🔢 Đánh số lại
                  </button>
                <button
                  onClick={() => setShowTableModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-lg sm:text-xl"
                >
                  ✕
                </button>
              </div>
            </div>
            
            {/* Add/Edit Table Form */}
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 border rounded-lg">
              <h3 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">
                {editingTable ? 'Sửa bàn' : 'Thêm bàn mới'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Tên bàn</label>
                  <input
                    type="text"
                    value={editingTable ? editingTable.name : newTable.name}
                    onChange={(e) => editingTable 
                      ? setEditingTable({...editingTable, name: e.target.value})
                      : setNewTable({...newTable, name: e.target.value})
                    }
                    className="w-full p-2 border rounded-lg text-sm"
                    placeholder="VD: Bàn 1"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Số chỗ ngồi</label>
                  <input
                    type="number"
                    value={editingTable ? editingTable.capacity : newTable.capacity}
                    onChange={(e) => editingTable 
                      ? setEditingTable({...editingTable, capacity: parseInt(e.target.value)})
                      : setNewTable({...newTable, capacity: parseInt(e.target.value)})
                    }
                    className="w-full p-2 border rounded-lg text-sm"
                    min="1"
                    max="20"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Trạng thái</label>
                  <select
                    value={editingTable ? editingTable.status : newTable.status}
                    onChange={(e) => editingTable 
                      ? setEditingTable({...editingTable, status: e.target.value})
                      : setNewTable({...newTable, status: e.target.value})
                    }
                    className="w-full p-2 border rounded-lg text-sm"
                  >
                    <option value="AVAILABLE">Trống</option>
                    <option value="OCCUPIED">Có khách</option>
                    <option value="RESERVED">Đã đặt</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-3 sm:mt-4">
                {(hasPermission('table:create') || hasPermission('table:update')) && (
                  <button
                    onClick={editingTable ? updateTable : createTable}
                    className="px-3 sm:px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm sm:text-base"
                  >
                    {editingTable ? 'Cập nhật' : 'Thêm bàn'}
                  </button>
                )}
                {editingTable && (
                  <button
                    onClick={() => setEditingTable(null)}
                    className="px-3 sm:px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm sm:text-base"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </div>

            {/* Tables List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {tables.map((table, index) => (
                <div key={table.id} className="border rounded-lg p-3 sm:p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
                        #{index + 1}
                      </span>
                      <h4 className="font-semibold text-sm sm:text-base">{table.name}</h4>
                    </div>
                    <div className="flex space-x-1 sm:space-x-2">
                      {hasPermission('table:update') && (
                        <button
                          onClick={() => setEditingTable(table)}
                          className="text-blue-500 hover:text-blue-700 text-xs sm:text-sm"
                        >
                          Sửa
                        </button>
                      )}
                      {hasPermission('table:delete') && (
                        <button
                          onClick={() => deleteTable(table.id)}
                          className="text-red-500 hover:text-red-700 text-xs sm:text-sm"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">
                    <p>Số chỗ: {table.capacity}</p>
                    <p className={`${
                      table.status === 'AVAILABLE' ? 'text-green-600' : 
                      table.status === 'OCCUPIED' ? 'text-red-600' : 'text-yellow-600'
                    }`}>
                      {table.status === 'AVAILABLE' ? 'Trống' : 
                       table.status === 'OCCUPIED' ? 'Có khách' : 'Đã đặt'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Menu Management Modal */}
      {showMenuModal && canManageMenu() && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
          <div className="bg-white rounded-lg p-4 sm:p-6 max-w-4xl w-full mx-2 sm:mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-bold">Quản lý thực đơn</h2>
              <button
                onClick={() => setShowMenuModal(false)}
                className="text-gray-500 hover:text-gray-700 text-lg sm:text-xl"
              >
                ✕
              </button>
            </div>
            
            {/* Add/Edit Menu Form */}
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 border rounded-lg">
              <h3 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base">
                {editingMenu ? 'Sửa món' : 'Thêm món mới'}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Tên món</label>
                  <input
                    type="text"
                    value={editingMenu ? editingMenu.name : newMenu.name}
                    onChange={(e) => editingMenu 
                      ? setEditingMenu({...editingMenu, name: e.target.value})
                      : setNewMenu({...newMenu, name: e.target.value})
                    }
                    className="w-full p-2 border rounded-lg text-sm"
                    placeholder="VD: Phở bò"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Giá (₫)</label>
                  <input
                    type="number"
                    value={editingMenu ? editingMenu.price : newMenu.price}
                    onChange={(e) => {
                      const price = parseFloat(e.target.value) || 0;
                      editingMenu 
                        ? setEditingMenu({...editingMenu, price})
                        : setNewMenu({...newMenu, price})
                    }}
                    className="w-full p-2 border rounded-lg text-sm"
                    min="0"
                    step="1000"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-1">Danh mục</label>
                  <select
                    value={editingMenu ? editingMenu.categoryId : newMenu.categoryId}
                    onChange={(e) => editingMenu 
                      ? setEditingMenu({...editingMenu, categoryId: e.target.value})
                      : setNewMenu({...newMenu, categoryId: e.target.value})
                    }
                    className="w-full p-2 border rounded-lg text-sm"
                  >
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={editingMenu ? editingMenu.isAvailable : newMenu.isAvailable}
                    onChange={(e) => editingMenu 
                      ? setEditingMenu({...editingMenu, isAvailable: e.target.checked})
                      : setNewMenu({...newMenu, isAvailable: e.target.checked})
                    }
                    className="mr-2"
                  />
                  <label className="text-sm font-medium">Có sẵn</label>
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium mb-1">Mô tả</label>
                <textarea
                  value={editingMenu ? editingMenu.description : newMenu.description}
                  onChange={(e) => editingMenu 
                    ? setEditingMenu({...editingMenu, description: e.target.value})
                    : setNewMenu({...newMenu, description: e.target.value})
                  }
                  className="w-full p-2 border rounded-lg"
                  rows={3}
                  placeholder="Mô tả món ăn..."
                />
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-3 sm:mt-4">
                {(hasPermission('menu:create') || hasPermission('menu:update')) && (
                  <button
                    onClick={editingMenu ? updateMenu : createMenu}
                    className="px-3 sm:px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 text-sm sm:text-base"
                  >
                    {editingMenu ? 'Cập nhật' : 'Thêm món'}
                  </button>
                )}
                {editingMenu && (
                  <button
                    onClick={() => setEditingMenu(null)}
                    className="px-3 sm:px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-sm sm:text-base"
                  >
                    Hủy
                  </button>
                )}
              </div>
            </div>

            {/* Menu List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {menu.map((item) => (
                <div key={item.id} className="border rounded-lg p-3 sm:p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-sm sm:text-base">{item.name}</h4>
                    <div className="flex space-x-1 sm:space-x-2">
                      {hasPermission('menu:update') && (
                        <button
                          onClick={() => setEditingMenu(item)}
                          className="text-blue-500 hover:text-blue-700 text-xs sm:text-sm"
                        >
                          Sửa
                        </button>
                      )}
                      {hasPermission('menu:delete') && (
                        <button
                          onClick={() => deleteMenu(item.id)}
                          className="text-red-500 hover:text-red-700 text-xs sm:text-sm"
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600">
                    <p>Giá: {Number(item.price).toLocaleString('vi-VN')} ₫</p>
                    <p>Danh mục: {item.category?.name}</p>
                    <p className={`${item.isAvailable ? 'text-green-600' : 'text-red-600'}`}>
                      {item.isAvailable ? 'Có sẵn' : 'Hết món'}
                    </p>
                    {item.description && (
                      <p className="mt-1 text-xs line-clamp-2">{item.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Customer Selection Modal */}
      {showCustomerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Chọn khách hàng</h3>
            </div>
            
            <div className="p-4">
              <div className="mb-4">
                <input
                  type="text"
                  placeholder="Tìm kiếm khách hàng..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
              
              <div className="max-h-60 overflow-y-auto space-y-2">
                {customers
                  .filter(customer => 
                    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                    customer.phone.includes(customerSearch)
                  )
                  .map((customer) => (
                    <div
                      key={customer.id}
                      onClick={() => {
                        setSelectedCustomer(customer);
                        setShowCustomerModal(false);
                      }}
                      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-gray-600">
                        {customer.phone} • {customer.points} điểm • {customer.level}
                      </div>
                    </div>
                  ))}
              </div>
              
              {customers.filter(customer => 
                customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
                customer.phone.includes(customerSearch)
              ).length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  Không tìm thấy khách hàng
                </div>
              )}
            </div>
            
            <div className="p-4 border-t">
              <button
                onClick={() => setShowCustomerModal(false)}
                className="w-full px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
