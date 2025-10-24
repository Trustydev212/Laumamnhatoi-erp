import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateSupplierDto } from '../dto/create-supplier.dto';
import { UpdateSupplierDto } from '../dto/update-supplier.dto';

@Injectable()
export class SupplierService {
  constructor(private prisma: PrismaService) {}

  async create(createSupplierDto: CreateSupplierDto) {
    return this.prisma.supplier.create({
      data: createSupplierDto
    });
  }

  async findAll() {
    return this.prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' }
    });
  }

  async findOne(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        ingredients: {
          where: { isActive: true },
          orderBy: { name: 'asc' }
        }
      }
    });

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return supplier;
  }

  async update(id: string, updateSupplierDto: UpdateSupplierDto) {
    const supplier = await this.findOne(id);

    return this.prisma.supplier.update({
      where: { id },
      data: updateSupplierDto
    });
  }

  async remove(id: string) {
    const supplier = await this.findOne(id);

    // Check if supplier has ingredients
    const ingredientCount = await this.prisma.ingredient.count({
      where: { supplierId: id, isActive: true }
    });

    if (ingredientCount > 0) {
      throw new BadRequestException('Cannot delete supplier that has ingredients');
    }

    return this.prisma.supplier.update({
      where: { id },
      data: { isActive: false }
    });
  }
}