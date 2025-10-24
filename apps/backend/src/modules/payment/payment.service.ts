import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PaymentService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.payment.findMany({
      include: {
        order: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.payment.findUnique({
      where: { id },
      include: {
        order: true,
      },
    });
  }

  async create(data: {
    orderId: string;
    method: string;
    amount: number;
    reference?: string;
  }) {
    return this.prisma.payment.create({
      data,
      include: {
        order: true,
      },
    });
  }
}
