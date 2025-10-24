'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import CustomerHistory from '@/components/CustomerHistory';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  points: number;
  level: string;
  isActive: boolean;
}

export default function CustomerDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    loadCustomer();
  }, [user, params.id]);

  const loadCustomer = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/customers/${params.id}`);
      setCustomer(response.data);
    } catch (error) {
      console.error('Error loading customer:', error);
      router.push('/customers');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">Khách hàng không tồn tại</h1>
          <button
            onClick={() => router.push('/customers')}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Quay lại danh sách
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="mb-4 text-blue-600 hover:text-blue-800 flex items-center"
          >
            ← Quay lại
          </button>
          <h1 className="text-3xl font-bold text-gray-800">Chi tiết khách hàng</h1>
        </div>

        {/* Customer Info Card */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold text-gray-800">{customer.name}</h2>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                customer.level === 'GOLD' ? 'bg-yellow-100 text-yellow-800' :
                customer.level === 'SILVER' ? 'bg-gray-100 text-gray-800' :
                'bg-orange-100 text-orange-800'
              }`}>
                {customer.level}
              </span>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                {customer.points} điểm
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-600">Số điện thoại</label>
              <p className="text-lg">{customer.phone}</p>
            </div>
            {customer.email && (
              <div>
                <label className="text-sm font-medium text-gray-600">Email</label>
                <p className="text-lg">{customer.email}</p>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-gray-600">Trạng thái</label>
              <p className={`text-lg ${customer.isActive ? 'text-green-600' : 'text-red-600'}`}>
                {customer.isActive ? 'Hoạt động' : 'Không hoạt động'}
              </p>
            </div>
          </div>
        </div>

        {/* Customer History */}
        <CustomerHistory 
          customerId={customer.id} 
          customerName={customer.name} 
        />
      </div>
    </div>
  );
}
