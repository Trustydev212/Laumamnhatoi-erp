import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class CustomerService {
  constructor(private prisma: PrismaService) {}

  async findAll(search?: string) {
    return this.prisma.customer.findMany({
      where: {
        isActive: true,
        ...(search && {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
            { email: { contains: search } },
          ],
        }),
      },
      include: {
        pointTransactions: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.customer.findUnique({
      where: { id },
      include: {
        pointTransactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  }

  async getPointsHistory(customerId: string) {
    return this.prisma.pointTransaction.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderHistory(customerId: string) {
    const orders = await this.prisma.order.findMany({
      where: { 
        ...(customerId && { customerId: customerId }),
        isPaid: true, // Only paid orders
      },
      include: {
        orderItems: {
          include: {
            menu: true,
          },
        },
        table: true,
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calculate total spent
    const totalSpent = orders.reduce((sum, order) => {
      return sum + Number(order.subtotal);
    }, 0);

    // Get favorite items
    const itemStats = orders.reduce((acc, order) => {
      (order as any).orderItems.forEach((item: any) => {
        const menuName = item.menu.name;
        if (!acc[menuName]) {
          acc[menuName] = { quantity: 0, totalSpent: 0 };
        }
        acc[menuName].quantity += item.quantity;
        acc[menuName].totalSpent += Number(item.subtotal);
      });
      return acc;
    }, {});

    const favoriteItems = Object.entries(itemStats)
      .map(([name, stats]) => ({ 
        name, 
        quantity: (stats as any).quantity, 
        totalSpent: (stats as any).totalSpent 
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    return {
      orders,
      totalSpent,
      totalOrders: orders.length,
      favoriteItems,
    };
  }

  async create(data: {
    name: string;
    phone: string;
    email?: string;
    address?: string;
    birthday?: string;
  }) {
    return this.prisma.customer.create({
      data: {
        ...data,
        birthday: data.birthday ? new Date(data.birthday) : null,
        level: 'BRONZE',
        points: 0,
      },
    });
  }

  async update(id: string, data: any) {
    return this.prisma.customer.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    return this.prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async addPoints(customerId: string, points: number, description: string, orderId?: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    const newPoints = customer.points + points;
    
    // Update customer level based on points
    let newLevel = 'BRONZE';
    if (newPoints >= 1000) newLevel = 'GOLD';
    else if (newPoints >= 500) newLevel = 'SILVER';

    await this.prisma.customer.update({
      where: { id: customerId },
      data: { 
        points: newPoints,
        level: newLevel,
      },
    });

    return this.prisma.pointTransaction.create({
      data: {
        customerId,
        type: 'EARNED',
        points,
        description,
        orderId,
      },
    });
  }
}
