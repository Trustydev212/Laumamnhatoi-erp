'use client';

import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
            Chào mừng đến với Nhà Tôi ERP! 🍽️
          </h2>
          <p className="text-gray-600 text-sm sm:text-base">
            Hệ thống quản lý quán ăn đã sẵn sàng hoạt động
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6">
                <div 
                  className="card p-4 sm:p-6 text-center cursor-pointer hover:shadow-lg transition-shadow duration-200"
                  onClick={() => handleModuleClick('pos')}
                >
                  <div className="text-2xl sm:text-3xl mb-2">🛒</div>
                  <h3 className="font-semibold text-sm sm:text-base">POS</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Bán hàng</p>
                </div>
                <div 
                  className="card p-4 sm:p-6 text-center cursor-pointer hover:shadow-lg transition-shadow duration-200"
                  onClick={() => handleModuleClick('inventory')}
                >
                  <div className="text-2xl sm:text-3xl mb-2">📦</div>
                  <h3 className="font-semibold text-sm sm:text-base">Kho</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Quản lý nguyên liệu</p>
                </div>
                <div 
                  className="card p-4 sm:p-6 text-center cursor-pointer hover:shadow-lg transition-shadow duration-200"
                  onClick={() => handleModuleClick('customers')}
                >
                  <div className="text-2xl sm:text-3xl mb-2">👥</div>
                  <h3 className="font-semibold text-sm sm:text-base">Khách hàng</h3>
                  <p className="text-xs sm:text-sm text-gray-600">CRM</p>
                </div>
                <div 
                  className="card p-4 sm:p-6 text-center cursor-pointer hover:shadow-lg transition-shadow duration-200"
                  onClick={() => handleModuleClick('reports')}
                >
                  <div className="text-2xl sm:text-3xl mb-2">📊</div>
                  <h3 className="font-semibold text-sm sm:text-base">Báo cáo</h3>
                  <p className="text-xs sm:text-sm text-gray-600">Thống kê</p>
                </div>
                {user?.role === 'ADMIN' && (
                  <div 
                    className="card p-4 sm:p-6 text-center cursor-pointer hover:shadow-lg transition-shadow duration-200"
                    onClick={() => handleModuleClick('admin')}
                  >
                    <div className="text-2xl sm:text-3xl mb-2">⚙️</div>
                    <h3 className="font-semibold text-sm sm:text-base">Admin</h3>
                    <p className="text-xs sm:text-sm text-gray-600">Quản trị hệ thống</p>
                  </div>
                )}
        </div>
      </div>
    </div>
  );
}
