import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user) {
      throw new ForbiddenException('User not authenticated');
    }

    // Get user permissions based on role
    const userPermissions = this.getUserPermissions(user.role);
    
    const hasPermission = requiredPermissions.some((permission) => 
      userPermissions.includes(permission)
    );
    
    if (!hasPermission) {
      throw new ForbiddenException(`Access denied. Required permissions: ${requiredPermissions.join(', ')}`);
    }

    return true;
  }

  private getUserPermissions(role: string): string[] {
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

    return rolePermissions[role] || [];
  }
}
