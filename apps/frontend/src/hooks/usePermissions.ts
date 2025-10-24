import { useAuth } from '@/lib/auth-context';

export const usePermissions = () => {
  const { user } = useAuth();

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;

    const rolePermissions = {
      ADMIN: [
        'table:view', 'table:create', 'table:update', 'table:delete',
        'menu:view', 'menu:create', 'menu:update', 'menu:delete',
        'order:view', 'order:create', 'order:update', 'order:delete',
        'inventory:view', 'inventory:create', 'inventory:update', 'inventory:delete',
        'reports:view',
        'user:view', 'user:create', 'user:update', 'user:delete',
      ],
      MANAGER: [
        'table:view', 'table:create', 'table:update', 'table:delete',
        'menu:view', 'menu:create', 'menu:update', 'menu:delete',
        'order:view', 'order:create', 'order:update', 'order:delete',
        'inventory:view', 'inventory:create', 'inventory:update', 'inventory:delete',
        'reports:view',
        'user:view', 'user:create', 'user:update',
      ],
      CASHIER: [
        'table:view', 'table:update',
        'menu:view',
        'order:view', 'order:create', 'order:update',
        'reports:view',
      ],
      KITCHEN: [
        'menu:view', 'menu:update',
        'order:view', 'order:update',
        'inventory:view', 'inventory:create', 'inventory:update', 'inventory:delete',
      ],
      WAITER: [
        'table:view', 'table:update',
        'menu:view',
        'order:view', 'order:create', 'order:update',
      ],
      STAFF: [
        'table:view',
        'menu:view',
        'order:view',
      ],
    };

    const userPermissions = rolePermissions[user.role as keyof typeof rolePermissions] || [];
    return userPermissions.includes(permission);
  };

  const canManageTables = () => {
    return hasPermission('table:create') || hasPermission('table:update') || hasPermission('table:delete');
  };

  const canManageMenu = () => {
    return hasPermission('menu:create') || hasPermission('menu:update') || hasPermission('menu:delete');
  };

  const canManageOrders = () => {
    return hasPermission('order:create') || hasPermission('order:update') || hasPermission('order:delete');
  };

  const canManageInventory = () => {
    return hasPermission('inventory:create') || hasPermission('inventory:update') || hasPermission('inventory:delete');
  };

  return {
    hasPermission,
    canManageTables,
    canManageMenu,
    canManageOrders,
    canManageInventory,
  };
};
