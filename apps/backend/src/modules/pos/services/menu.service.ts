import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.menu.findMany({
      include: {
        category: true,
        orderItems: true,
      },
      where: {
        isActive: true,
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.menu.findUnique({
      where: { id },
      include: {
        category: true,
        orderItems: true,
      },
    });
  }

  async findByCategory(categoryId: string) {
    return this.prisma.menu.findMany({
      where: {
        categoryId,
        isActive: true,
      },
      include: {
        category: true,
      },
    });
  }

  async create(createMenuDto: any) {
    return this.prisma.menu.create({
      data: createMenuDto,
      include: {
        category: true,
      },
    });
  }

  async update(id: string, updateMenuDto: any) {
    return this.prisma.menu.update({
      where: { id },
      data: updateMenuDto,
      include: {
        category: true,
      },
    });
  }

  async remove(id: string) {
    const menu = await this.findOne(id);
    
    if (!menu) {
      throw new NotFoundException('Menu not found');
    }
    
    // Check if menu has any order items
    const orderItemsCount = await this.prisma.orderItem.count({
      where: { menuId: id }
    });
    
    if (orderItemsCount > 0) {
      throw new BadRequestException('Cannot delete menu with existing order items. Please delete all related orders first.');
    }
    
    return this.prisma.menu.delete({
      where: { id },
    });
  }

  async removeWithOrders(id: string) {
    const menu = await this.findOne(id);
    
    if (!menu) {
      throw new NotFoundException('Menu not found');
    }
    
    // Delete all order items for this menu first
    await this.prisma.orderItem.deleteMany({
      where: { menuId: id }
    });
    
    // Then delete the menu
    return this.prisma.menu.delete({
      where: { id },
    });
  }
}
