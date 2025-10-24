import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateIngredientDto } from '../dto/create-ingredient.dto';
import { UpdateIngredientDto } from '../dto/update-ingredient.dto';

@Injectable()
export class IngredientService {
  constructor(private prisma: PrismaService) {}

  async create(createIngredientDto: CreateIngredientDto) {
    const { supplierId, ...data } = createIngredientDto;

    // Check if supplier exists
    if (supplierId) {
      const supplier = await this.prisma.supplier.findUnique({
        where: { id: supplierId }
      });
      if (!supplier) {
        throw new NotFoundException('Supplier not found');
      }
    }

    return this.prisma.ingredient.create({
      data: {
        name: data.name,
        unit: data.unit,
        currentStock: Number(data.currentStock),
        minStock: Number(data.minStock),
        maxStock: Number(data.maxStock),
        costPrice: Number(data.costPrice),
        supplierId: supplierId || null,
        expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
        isActive: data.isActive
      },
      include: {
        supplier: true
      }
    });
  }

  async findAll() {
    return this.prisma.ingredient.findMany({
      where: { isActive: true },
      include: {
        supplier: true
      },
      orderBy: { name: 'asc' }
    });
  }

  async findOne(id: string) {
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id },
      include: {
        supplier: true,
        stockMovements: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!ingredient) {
      throw new NotFoundException('Ingredient not found');
    }

    return ingredient;
  }

  async update(id: string, updateIngredientDto: UpdateIngredientDto) {
    const ingredient = await this.findOne(id);

    // Check if supplier exists
    if (updateIngredientDto.supplierId && updateIngredientDto.supplierId !== null) {
      const supplier = await this.prisma.supplier.findUnique({
        where: { id: updateIngredientDto.supplierId }
      });
      if (!supplier) {
        throw new NotFoundException('Supplier not found');
      }
    }

    return this.prisma.ingredient.update({
      where: { id },
      data: {
        name: updateIngredientDto.name,
        unit: updateIngredientDto.unit,
        currentStock: updateIngredientDto.currentStock !== undefined ? Number(updateIngredientDto.currentStock) : undefined,
        minStock: updateIngredientDto.minStock !== undefined ? Number(updateIngredientDto.minStock) : undefined,
        maxStock: updateIngredientDto.maxStock !== undefined ? Number(updateIngredientDto.maxStock) : undefined,
        costPrice: updateIngredientDto.costPrice !== undefined ? Number(updateIngredientDto.costPrice) : undefined,
        supplierId: updateIngredientDto.supplierId !== undefined ? (updateIngredientDto.supplierId || null) : undefined,
        expiryDate: updateIngredientDto.expiryDate !== undefined ? (updateIngredientDto.expiryDate ? new Date(updateIngredientDto.expiryDate) : null) : undefined,
        isActive: updateIngredientDto.isActive,
      },
      include: {
        supplier: true
      }
    });
  }

  async remove(id: string) {
    const ingredient = await this.findOne(id);

    // Check if ingredient is used in any menu
    const menuCount = await this.prisma.menuIngredient.count({
      where: { ingredientId: id }
    });

    if (menuCount > 0) {
      throw new BadRequestException('Cannot delete ingredient that is used in menu items');
    }

    return this.prisma.ingredient.update({
      where: { id },
      data: { isActive: false }
    });
  }

  async adjustStock(id: string, adjustStockDto: any) {
    const ingredient = await this.findOne(id);
    const { quantity, reason } = adjustStockDto;
    
    const newStock = Math.round((Number(ingredient.currentStock) + quantity) * 1000) / 1000; // Round to 3 decimal places
    
    if (newStock < 0) {
      throw new BadRequestException('Stock cannot be negative');
    }

    // Create stock movement record
    await this.prisma.stockMovement.create({
      data: {
        ingredientId: id,
        type: quantity > 0 ? 'IN' : 'OUT',
        quantity: Math.abs(quantity),
        reason: reason || 'Manual adjustment'
      }
    });

    return this.prisma.ingredient.update({
      where: { id },
      data: { currentStock: newStock },
      include: {
        supplier: true
      }
    });
  }
}