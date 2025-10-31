import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class BusinessIntelligenceService {
  constructor(private prisma: PrismaService) {}

  // Revenue Analytics
  async getRevenueAnalytics(startDate?: Date, endDate?: Date) {
    const where = {
      ...(startDate && endDate && {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      })
    };

    const [
      totalRevenue,
      totalOrders,
      averageOrderValue,
      revenueByDay,
      topProducts
    ] = await Promise.all([
      this.prisma.order.aggregate({
        where: { ...where, status: 'COMPLETED' },
        _sum: { subtotal: true } // Doanh thu = subtotal (trước thuế)
      }),
      this.prisma.order.count({
        where: { ...where, status: 'COMPLETED' }
      }),
      this.prisma.order.aggregate({
        where: { ...where, status: 'COMPLETED' },
        _avg: { subtotal: true } // Giá trị đơn trung bình = subtotal (trước thuế)
      }),
      this.getRevenueByDay(startDate, endDate),
      this.getTopProducts(startDate, endDate)
    ]);

    return {
      totalRevenue: Number(totalRevenue._sum.subtotal || 0), // Doanh thu = subtotal (trước thuế)
      totalOrders,
      averageOrderValue: Number(averageOrderValue._avg.subtotal || 0), // Giá trị đơn trung bình = subtotal
      revenueByDay,
      topProducts
    };
  }

  // User Analytics
  async getUserAnalytics() {
    const [
      totalUsers,
      newUsersThisMonth,
      activeUsers,
      usersByRole,
      userActivityTrend
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({
        where: {
          createdAt: {
            gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
          }
        }
      }),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { role: true }
      }),
      this.getUserActivityTrend()
    ]);

    return {
      totalUsers,
      newUsersThisMonth,
      activeUsers,
      inactiveUsers: totalUsers - activeUsers,
      usersByRole: usersByRole.map(item => ({
        role: item.role,
        count: item._count.role
      })),
      userActivityTrend
    };
  }

  // Order Analytics
  async getOrderAnalytics(startDate?: Date, endDate?: Date) {
    const where = {
      ...(startDate && endDate && {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      })
    };

    const [
      totalOrders,
      completedOrders,
      pendingOrders,
      cancelledOrders,
      ordersByStatus,
      ordersByDay,
      averageOrderValue
    ] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.count({ where: { ...where, status: 'COMPLETED' } }),
      this.prisma.order.count({ where: { ...where, status: 'PENDING' } }),
      this.prisma.order.count({ where: { ...where, status: 'CANCELLED' } }),
      this.prisma.order.groupBy({
        by: ['status'],
        _count: { status: true },
        where
      }),
      this.getOrdersByDay(startDate, endDate),
      this.prisma.order.aggregate({
        where: { ...where, status: 'COMPLETED' },
        _avg: { total: true }
      })
    ]);

    return {
      totalOrders,
      completedOrders,
      pendingOrders,
      cancelledOrders,
      completionRate: totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0,
      ordersByStatus: ordersByStatus.map(item => ({
        status: item.status,
        count: item._count.status
      })),
      ordersByDay,
      averageOrderValue: averageOrderValue._avg.total || 0
    };
  }

  // System Performance Analytics
  async getSystemPerformanceAnalytics() {
    const [
      totalAuditLogs,
      errorLogs,
      loginLogs,
      activityByHour,
      topActions
    ] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.count({
        where: { action: { contains: 'ERROR' } }
      }),
      this.prisma.auditLog.count({
        where: { action: 'LOGIN' }
      }),
      this.getActivityByHour(),
      this.getTopActions()
    ]);

    return {
      totalAuditLogs,
      errorLogs,
      loginLogs,
      errorRate: totalAuditLogs > 0 ? (errorLogs / totalAuditLogs) * 100 : 0,
      activityByHour,
      topActions
    };
  }

  // Dashboard Overview
  async getDashboardOverview() {
    const [
      revenue,
      users,
      orders,
      system
    ] = await Promise.all([
      this.getRevenueAnalytics(),
      this.getUserAnalytics(),
      this.getOrderAnalytics(),
      this.getSystemPerformanceAnalytics()
    ]);

    return {
      revenue,
      users,
      orders,
      system,
      lastUpdated: new Date().toISOString()
    };
  }

  // Helper methods
  private async getRevenueByDay(startDate?: Date, endDate?: Date) {
    const where = {
      status: 'COMPLETED',
      ...(startDate && endDate && {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      })
    };

    const orders = await this.prisma.order.findMany({
      where,
      select: {
        subtotal: true, // Doanh thu = subtotal (trước thuế)
        createdAt: true
      }
    });

    // Group by day
    const revenueByDay = orders.reduce((acc, order) => {
      const date = order.createdAt.toISOString().split('T')[0];
      // Doanh thu = subtotal (trước thuế)
      acc[date] = (acc[date] || 0) + Number(order.subtotal);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(revenueByDay).map(([date, revenue]) => ({
      date,
      revenue
    }));
  }

  private async getTopProducts(startDate?: Date, endDate?: Date) {
    // This would require order items table - simplified for now
    return [
      { name: 'Phở Bò', orders: 45, revenue: 2025000 },
      { name: 'Bún Bò', orders: 32, revenue: 1280000 },
      { name: 'Cơm Tấm', orders: 28, revenue: 840000 }
    ];
  }

  private async getUserActivityTrend() {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    });

    const activities = await this.prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        }
      },
      select: {
        createdAt: true
      }
    });

    const trend = last7Days.map(date => ({
      date,
      activities: activities.filter(activity => 
        activity.createdAt.toISOString().split('T')[0] === date
      ).length
    }));

    return trend.reverse();
  }

  private async getOrdersByDay(startDate?: Date, endDate?: Date) {
    const where = {
      ...(startDate && endDate && {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      })
    };

    const orders = await this.prisma.order.findMany({
      where,
      select: {
        createdAt: true,
        status: true
      }
    });

    const ordersByDay = orders.reduce((acc, order) => {
      const date = order.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { total: 0, completed: 0, pending: 0 };
      }
      acc[date].total++;
      if (order.status === 'COMPLETED') acc[date].completed++;
      if (order.status === 'PENDING') acc[date].pending++;
      return acc;
    }, {} as Record<string, any>);

    return Object.entries(ordersByDay).map(([date, data]) => ({
      date,
      ...(data as object)
    }));
  }

  private async getActivityByHour() {
    const activities = await this.prisma.auditLog.findMany({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      },
      select: {
        createdAt: true
      }
    });

    const hourlyActivity = Array.from({ length: 24 }, (_, i) => ({
      hour: i,
      activities: activities.filter(activity => 
        activity.createdAt.getHours() === i
      ).length
    }));

    return hourlyActivity;
  }

  private async getTopActions() {
    const actions = await this.prisma.auditLog.groupBy({
      by: ['action'],
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } },
      take: 10
    });

    return actions.map(action => ({
      action: action.action,
      count: action._count.action
    }));
  }
}
