import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class StockMovementService {
  constructor(private prisma: PrismaService) {}

  async findAll(ingredientId?: string, type?: string, limit = 50) {
    const where: any = {};
    
    if (ingredientId) {
      where.ingredientId = ingredientId;
    }
    
    if (type) {
      where.type = type;
    }

    return this.prisma.stockMovement.findMany({
      where,
      include: {
        ingredient: {
          include: {
            supplier: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  async findByDateRange(startDate: Date, endDate: Date) {
    return this.prisma.stockMovement.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        ingredient: {
          include: {
            supplier: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async getMovementSummary(ingredientId: string, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const movements = await this.prisma.stockMovement.findMany({
      where: {
        ingredientId,
        createdAt: { gte: startDate }
      },
      orderBy: { createdAt: 'asc' }
    });

    const summary = {
      totalIn: 0,
      totalOut: 0,
      netChange: 0,
      movementCount: movements.length
    };

    movements.forEach(movement => {
      if (movement.type === 'IN') {
        summary.totalIn += Number(movement.quantity);
      } else {
        summary.totalOut += Number(movement.quantity);
      }
    });

    summary.netChange = summary.totalIn - summary.totalOut;

    return summary;
  }
}