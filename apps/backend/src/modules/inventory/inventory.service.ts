import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getDashboard() {
    const [
      totalIngredients,
      lowStockIngredients,
      totalSuppliers,
      recentMovements
    ] = await Promise.all([
      this.prisma.ingredient.count({ where: { isActive: true } }),
      this.prisma.ingredient.count({
        where: {
          isActive: true,
          currentStock: { lte: this.prisma.ingredient.fields.minStock }
        }
      }),
      this.prisma.supplier.count({ where: { isActive: true } }),
      this.prisma.stockMovement.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          ingredient: true
        }
      })
    ]);

    return {
      totalIngredients,
      lowStockIngredients,
      totalSuppliers,
      recentMovements
    };
  }

  async getLowStockItems() {
    return this.prisma.ingredient.findMany({
      where: {
        isActive: true,
        currentStock: { lte: this.prisma.ingredient.fields.minStock }
      },
      include: {
        supplier: true
      },
      orderBy: { currentStock: 'asc' }
    });
  }

  async getExpiringItems(days = 7) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    return this.prisma.ingredient.findMany({
      where: {
        isActive: true,
        expiryDate: {
          lte: expiryDate,
          not: null
        }
      },
      include: {
        supplier: true
      },
      orderBy: { expiryDate: 'asc' }
    });
  }
}