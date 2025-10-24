'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';

export default function InventoryPage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [lowStockItems, setLowStockItems] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadData();
  }, [user, router]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [ingredientsRes, suppliersRes, lowStockRes] = await Promise.all([
        api.get('/inventory/ingredients'),
        api.get('/inventory/suppliers'),
        api.get('/inventory/low-stock')
      ]);
      
      // Ensure data is array before setting state
      setIngredients(Array.isArray(ingredientsRes.data) ? ingredientsRes.data : []);
      setSuppliers(Array.isArray(suppliersRes.data) ? suppliersRes.data : []);
      setLowStockItems(Array.isArray(lowStockRes.data) ? lowStockRes.data : []);
      
    } catch (error: any) {
      console.error('Error loading inventory data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Quản lý kho</h1>
          <p className="text-gray-600">Quản lý nguyên liệu và nhà cung cấp</p>
        </div>

        {/* Low Stock Items */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">⚠️ Nguyên liệu sắp hết</h2>
          {lowStockItems.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Không có nguyên liệu nào sắp hết</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {lowStockItems.map((item) => (
                <div key={item.id} className="border border-red-200 bg-red-50 rounded-lg p-3">
                  <h3 className="font-semibold text-red-800">{item.name}</h3>
                  <p className="text-sm text-red-600">
                    Tồn kho: {item.currentStock} {item.unit}
                  </p>
                  <p className="text-sm text-red-600">
                    Tối thiểu: {item.minStock} {item.unit}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ingredients */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">🥬 Nguyên liệu</h2>
          {ingredients.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Chưa có nguyên liệu nào</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {ingredients.map((ingredient) => (
                <div key={ingredient.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold">{ingredient.name}</h3>
                  <p className="text-sm text-gray-600">
                    Tồn kho: {ingredient.currentStock} {ingredient.unit}
                  </p>
                  <p className="text-sm text-gray-600">
                    Giá: {ingredient.costPrice?.toLocaleString()} VNĐ
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Suppliers */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">🏢 Nhà cung cấp</h2>
          {suppliers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Chưa có nhà cung cấp nào</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {suppliers.map((supplier) => (
                <div key={supplier.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold">{supplier.name}</h3>
                  {supplier.contactName && <p className="text-sm text-gray-600">Liên hệ: {supplier.contactName}</p>}
                  {supplier.phone && <p className="text-sm text-gray-600">Điện thoại: {supplier.phone}</p>}
                  {supplier.email && <p className="text-sm text-gray-600">Email: {supplier.email}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
