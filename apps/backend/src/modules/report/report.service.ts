import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ReportService {
  constructor(private prisma: PrismaService) {}

  async getSalesReport(startDate?: string, endDate?: string) {
    const whereClause: any = {
      isPaid: true,
    };

    // Apply date filter if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0); // Start of day
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // End of day
      
      whereClause.paidAt = {
        gte: start,
        lte: end,
      };
    } else if (startDate || endDate) {
      // If only one date provided, still apply filter
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        whereClause.paidAt = {
          ...whereClause.paidAt,
          gte: start,
        };
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        whereClause.paidAt = {
          ...whereClause.paidAt,
          lte: end,
        };
      }
    }

    const orders = await this.prisma.order.findMany({
      where: whereClause,
      include: {
        orderItems: {
          include: {
            menu: true,
          },
        },
        table: true,
        user: true,
      },
    });

    const totalRevenue = orders.reduce((sum, order) => {
      // Revenue is the subtotal (before tax)
      const revenue = Number(order.subtotal);
      return sum + revenue;
    }, 0);
    const totalOrders = orders.length;

    // Group by menu items
    const menuStats = orders.reduce((acc, order) => {
      order.orderItems.forEach(item => {
        const menuName = item.menu.name;
        if (!acc[menuName]) {
          acc[menuName] = { quantity: 0, revenue: 0 };
        }
        acc[menuName].quantity += item.quantity;
        // Revenue is the subtotal (before tax)
        acc[menuName].revenue += Number(item.subtotal);
      });
      return acc;
    }, {});

    return {
      totalRevenue,
      totalOrders,
      orders,
      menuStats,
    };
  }

  async getInventoryReport() {
    const ingredients = await this.prisma.ingredient.findMany({
      where: { isActive: true },
      include: {
        supplier: true,
        stockMovements: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    const lowStockItems = ingredients.filter(
      ingredient => Number(ingredient.currentStock) <= Number(ingredient.minStock)
    );

    const totalValue = ingredients.reduce(
      (sum, ingredient) => sum + (Number(ingredient.currentStock) * Number(ingredient.costPrice)),
      0
    );

    return {
      totalIngredients: ingredients.length,
      lowStockItems: lowStockItems.length,
      totalValue,
      ingredients,
    };
  }

  async getCustomerReport() {
    const customers = await this.prisma.customer.findMany({
      where: { isActive: true },
      include: {
        pointTransactions: true,
      },
    });

    const totalCustomers = customers.length;
    const totalPoints = customers.reduce((sum, customer) => sum + customer.points, 0);

    // Group by level
    const levelStats = customers.reduce((acc, customer) => {
      acc[customer.level] = (acc[customer.level] || 0) + 1;
      return acc;
    }, {});

    return {
      totalCustomers,
      totalPoints,
      levelStats,
      customers: customers.slice(0, 10), // Top 10 customers
    };
  }

  async getDashboard() {
    // Fix: Create new Date objects to avoid mutating
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);

    // Today's sales
    const todayOrders = await this.prisma.order.findMany({
      where: {
        isPaid: true,
        paidAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    const todayRevenue = todayOrders.reduce((sum, order) => {
      // Revenue is the subtotal (before tax)
      const revenue = Number(order.subtotal);
      return sum + revenue;
    }, 0);

    // Total stats
    const totalOrders = await this.prisma.order.count();
    const totalCustomers = await this.prisma.customer.count({ where: { isActive: true } });
    const totalTables = await this.prisma.table.count();
    const totalMenuItems = await this.prisma.menu.count({ where: { isActive: true } });

    // Recent orders
    const recentOrders = await this.prisma.order.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        table: true,
        user: true,
      },
    });

    return {
      todayRevenue,
      todayOrders: todayOrders.length,
      totalOrders,
      totalCustomers,
      totalTables,
      totalMenuItems,
      recentOrders,
    };
  }
}
