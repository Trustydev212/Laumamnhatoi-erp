import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditLoggerService {
  constructor(private prisma: PrismaService) {}

  async logAction(
    userId: string,
    action: string,
    entity: string,
    entityId: string,
    oldValues?: any,
    newValues?: any,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      await this.prisma.auditLog.create({
        data: {
          userId,
          action,
          entity,
          entityId,
          oldValues: oldValues ? JSON.stringify(oldValues) : null,
          newValues: newValues ? JSON.stringify(newValues) : null,
          ipAddress: ipAddress || '127.0.0.1',
          userAgent: userAgent || 'Unknown'
        }
      });
    } catch (error) {
      console.error('Error creating audit log:', error);
    }
  }

  async logLogin(userId: string, ipAddress?: string, userAgent?: string) {
    await this.logAction(
      userId,
      'LOGIN',
      'User',
      userId,
      null,
      { loginTime: new Date().toISOString() },
      ipAddress,
      userAgent
    );
  }

  async logOrderCreate(userId: string, orderId: string, orderData: any, ipAddress?: string, userAgent?: string) {
    await this.logAction(
      userId,
      'CREATE_ORDER',
      'Order',
      orderId,
      null,
      orderData,
      ipAddress,
      userAgent
    );
  }

  async logOrderUpdate(userId: string, orderId: string, oldData: any, newData: any, ipAddress?: string, userAgent?: string) {
    await this.logAction(
      userId,
      'UPDATE_ORDER',
      'Order',
      orderId,
      oldData,
      newData,
      ipAddress,
      userAgent
    );
  }
}
