import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ShiftService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.shift.findMany({
      include: {
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.shift.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });
  }

  async startShift(data: {
    userId: string;
    cashStart: number;
  }) {
    return this.prisma.shift.create({
      data: {
        ...data,
        startTime: new Date(),
        status: 'ACTIVE',
      },
      include: {
        user: true,
      },
    });
  }

  async endShift(id: string, data: {
    cashEnd: number;
  }) {
    return this.prisma.shift.update({
      where: { id },
      data: {
        ...data,
        endTime: new Date(),
        status: 'CLOSED',
      },
      include: {
        user: true,
      },
    });
  }
}
