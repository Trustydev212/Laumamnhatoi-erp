import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateMenuIngredientDto } from '../dto/create-menu-ingredient.dto';
import { UpdateMenuIngredientDto } from '../dto/update-menu-ingredient.dto';

@Injectable()
export class MenuIngredientService {
  constructor(private prisma: PrismaService) {}

  async findByMenu(menuId: string) {
    return this.prisma.menuIngredient.findMany({
      where: { menuId },
      include: {
        ingredient: {
          include: {
            supplier: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  async findByIngredient(ingredientId: string) {
    return this.prisma.menuIngredient.findMany({
      where: { ingredientId },
      include: {
        menu: true
      },
      orderBy: { createdAt: 'asc' }
    });
  }

  async create(createMenuIngredientDto: CreateMenuIngredientDto) {
    const { menuId, ingredientId, quantity, unit } = createMenuIngredientDto;

    // Check if menu exists
    const menu = await this.prisma.menu.findUnique({
      where: { id: menuId }
    });
    if (!menu) {
      throw new NotFoundException('Menu not found');
    }

    // Check if ingredient exists
    const ingredient = await this.prisma.ingredient.findUnique({
      where: { id: ingredientId }
    });
    if (!ingredient) {
      throw new NotFoundException('Ingredient not found');
    }

    // Check if combination already exists
    const existing = await this.prisma.menuIngredient.findUnique({
      where: {
        menuId_ingredientId: {
          menuId,
          ingredientId
        }
      }
    });

    if (existing) {
      throw new BadRequestException('This ingredient is already added to the menu');
    }

    return this.prisma.menuIngredient.create({
      data: {
        menuId,
        ingredientId,
        quantity: Number(quantity),
        unit
      },
      include: {
        ingredient: {
          include: {
            supplier: true
          }
        }
      }
    });
  }

  async update(id: string, updateMenuIngredientDto: UpdateMenuIngredientDto) {
    const menuIngredient = await this.prisma.menuIngredient.findUnique({
      where: { id }
    });

    if (!menuIngredient) {
      throw new NotFoundException('Menu ingredient not found');
    }

    return this.prisma.menuIngredient.update({
      where: { id },
      data: {
        quantity: updateMenuIngredientDto.quantity !== undefined ? Number(updateMenuIngredientDto.quantity) : undefined,
        unit: updateMenuIngredientDto.unit
      },
      include: {
        ingredient: {
          include: {
            supplier: true
          }
        }
      }
    });
  }

  async remove(id: string) {
    const menuIngredient = await this.prisma.menuIngredient.findUnique({
      where: { id }
    });

    if (!menuIngredient) {
      throw new NotFoundException('Menu ingredient not found');
    }

    return this.prisma.menuIngredient.delete({
      where: { id }
    });
  }

  async calculateMenuCost(menuId: string) {
    const menuIngredients = await this.findByMenu(menuId);
    
    let totalCost = 0;
    const costBreakdown = [];

    for (const menuIngredient of menuIngredients) {
      // Smart cost calculation based on ingredient type
      const ingredientName = menuIngredient.ingredient.name.toLowerCase();
      let quantityForCost = Number(menuIngredient.quantity);
      
      // Smart conversion based on ingredient type and units
      const ingredientUnit = menuIngredient.ingredient.unit.toLowerCase();
      const menuUnit = menuIngredient.unit.toLowerCase();
      
      // Convert to same unit as costPrice for accurate calculation
      if (menuUnit === ingredientUnit) {
        // Same unit - no conversion needed
        quantityForCost = quantityForCost;
      } else {
        // Convert menuIngredient unit to ingredient unit
        if (menuUnit === 'g' && ingredientUnit === 'kg') {
          quantityForCost = quantityForCost / 1000; // g to kg
        } else if (menuUnit === 'kg' && ingredientUnit === 'g') {
          quantityForCost = quantityForCost * 1000; // kg to g
        } else if (menuUnit === 'ml' && ingredientUnit === 'l') {
          quantityForCost = quantityForCost / 1000; // ml to l
        } else if (menuUnit === 'l' && ingredientUnit === 'ml') {
          quantityForCost = quantityForCost * 1000; // l to ml
        } else if (menuUnit === 'g' && ingredientUnit === 'g') {
          quantityForCost = quantityForCost; // same unit
        } else if (menuUnit === 'kg' && ingredientUnit === 'kg') {
          quantityForCost = quantityForCost; // same unit
        } else if (menuUnit === 'ml' && ingredientUnit === 'ml') {
          quantityForCost = quantityForCost; // same unit
        } else if (menuUnit === 'l' && ingredientUnit === 'l') {
          quantityForCost = quantityForCost; // same unit
        } else if (menuUnit === 'bó' && ingredientUnit === 'bó') {
          quantityForCost = quantityForCost; // same unit
        } else if (menuUnit === 'cái' && ingredientUnit === 'cái') {
          quantityForCost = quantityForCost; // same unit
        } else {
          // Default: assume same unit
          quantityForCost = quantityForCost;
        }
      }
      
      const ingredientCost = Number(menuIngredient.ingredient.costPrice) * quantityForCost;
      totalCost += ingredientCost;
      
      // Debug log for cost calculation
      console.log(`Cost calculation: ${menuIngredient.ingredient.name}`);
      console.log(`  Menu quantity: ${menuIngredient.quantity} ${menuIngredient.unit}`);
      console.log(`  Ingredient unit: ${menuIngredient.ingredient.unit}`);
      console.log(`  Converted quantity: ${quantityForCost} ${menuIngredient.ingredient.unit}`);
      console.log(`  Cost per unit: ${menuIngredient.ingredient.costPrice} ${menuIngredient.ingredient.unit}`);
      console.log(`  Total cost: ${ingredientCost}`);
      
      costBreakdown.push({
        ingredient: menuIngredient.ingredient.name,
        quantity: menuIngredient.quantity,
        unit: menuIngredient.unit,
        quantityForCost: quantityForCost,
        costPerUnit: Number(menuIngredient.ingredient.costPrice),
        totalCost: ingredientCost
      });
    }

    return {
      totalCost,
      costBreakdown,
      ingredientCount: menuIngredients.length
    };
  }

  async deductStockForOrder(orderItems: any[]) {
    const stockMovements = [];

    for (const orderItem of orderItems) {
      const menuIngredients = await this.findByMenu(orderItem.menuId);
      
      for (const menuIngredient of menuIngredients) {
        const requiredQuantity = Number(menuIngredient.quantity) * orderItem.quantity;
        
        // Check if enough stock
        const ingredient = await this.prisma.ingredient.findUnique({
          where: { id: menuIngredient.ingredientId }
        });

        if (!ingredient) continue;

        // Convert required quantity to same unit as ingredient stock
        let requiredQuantityInStockUnit = requiredQuantity;
        
        // Smart unit conversion based on ingredient type and units
        if (menuIngredient.unit.toLowerCase() !== ingredient.unit.toLowerCase()) {
          // Get ingredient name for smart conversion
          const ingredientName = ingredient.name.toLowerCase();
          
          // Special handling for different ingredient types
          if (ingredientName.includes('rau') || ingredientName.includes('thơm') || 
              ingredientName.includes('tỏi') || ingredientName.includes('bó') || 
              ingredientName.includes('cây')) {
            // For herbs and small vegetables - usually counted by pieces/bunches
            if (menuIngredient.unit === 'bó' && ingredient.unit === 'bó') {
              requiredQuantityInStockUnit = requiredQuantity; // 1 bó = 1 bó
            } else if (menuIngredient.unit === 'cây' && ingredient.unit === 'cây') {
              requiredQuantityInStockUnit = requiredQuantity; // 1 cây = 1 cây
            } else if (menuIngredient.unit === 'cái' && ingredient.unit === 'cái') {
              requiredQuantityInStockUnit = requiredQuantity; // 1 cái = 1 cái
            } else {
              // Default: assume 1 unit = 1 unit for counting items
              requiredQuantityInStockUnit = requiredQuantity;
            }
          } else if (ingredientName.includes('hành') && !ingredientName.includes('lá')) {
            // For onions (hành tây) - usually by weight, not counting
            if (menuIngredient.unit === 'g' && ingredient.unit === 'kg') {
              requiredQuantityInStockUnit = requiredQuantity / 1000; // g to kg
            } else if (menuIngredient.unit === 'kg' && ingredient.unit === 'g') {
              requiredQuantityInStockUnit = requiredQuantity * 1000; // kg to g
            } else if (menuIngredient.unit === 'g' && ingredient.unit === 'g') {
              requiredQuantityInStockUnit = requiredQuantity; // same unit
            } else if (menuIngredient.unit === 'kg' && ingredient.unit === 'kg') {
              requiredQuantityInStockUnit = requiredQuantity; // same unit
            } else {
              requiredQuantityInStockUnit = requiredQuantity;
            }
          } else if (ingredientName.includes('nước') || ingredientName.includes('sauce') ||
                     ingredientName.includes('dầu') || ingredientName.includes('giấm')) {
            // For liquids - convert ml/l properly
            if (menuIngredient.unit === 'ml' && ingredient.unit === 'l') {
              requiredQuantityInStockUnit = requiredQuantity / 1000; // ml to l
            } else if (menuIngredient.unit === 'l' && ingredient.unit === 'ml') {
              requiredQuantityInStockUnit = requiredQuantity * 1000; // l to ml
            } else {
              requiredQuantityInStockUnit = requiredQuantity;
            }
          } else {
            // For solid ingredients (meat, vegetables by weight)
            if (menuIngredient.unit === 'g' && ingredient.unit === 'kg') {
              requiredQuantityInStockUnit = requiredQuantity / 1000; // g to kg
            } else if (menuIngredient.unit === 'kg' && ingredient.unit === 'g') {
              requiredQuantityInStockUnit = requiredQuantity * 1000; // kg to g
            } else if (menuIngredient.unit === 'g' && ingredient.unit === 'g') {
              requiredQuantityInStockUnit = requiredQuantity; // same unit
            } else if (menuIngredient.unit === 'kg' && ingredient.unit === 'kg') {
              requiredQuantityInStockUnit = requiredQuantity; // same unit
            } else {
              // Default: assume same unit
              requiredQuantityInStockUnit = requiredQuantity;
            }
          }
        }

        // Ensure we're comparing numbers
        const availableStock = Number(ingredient.currentStock);
        const requiredStock = Number(requiredQuantityInStockUnit);
        
        // Debug log
        console.log(`Stock check: ${ingredient.name}`);
        console.log(`  Required: ${requiredQuantity} ${menuIngredient.unit}`);
        console.log(`  Converted: ${requiredStock} ${ingredient.unit}`);
        console.log(`  Available: ${availableStock} ${ingredient.unit}`);
        console.log(`  Comparison: ${availableStock} < ${requiredStock} = ${availableStock < requiredStock}`);

        if (availableStock < requiredStock) {
          throw new BadRequestException(
            `Không đủ nguyên liệu: ${ingredient.name}. Cần: ${requiredQuantity} ${menuIngredient.unit} (${requiredStock} ${ingredient.unit}), Có: ${availableStock} ${ingredient.unit}`
          );
        }

        // Create stock movement
        const stockMovement = await this.prisma.stockMovement.create({
          data: {
            ingredientId: menuIngredient.ingredientId,
            type: 'OUT',
            quantity: requiredQuantityInStockUnit,
            reason: `Bán món: ${orderItem.menuName || 'Unknown'}`,
            referenceId: orderItem.orderId
          }
        });

        // Update ingredient stock with proper rounding
        const newStock = Math.round((availableStock - requiredStock) * 1000) / 1000; // Round to 3 decimal places
        
        await this.prisma.ingredient.update({
          where: { id: menuIngredient.ingredientId },
          data: {
            currentStock: newStock
          }
        });

        stockMovements.push(stockMovement);
      }
    }

    return stockMovements;
  }

  async refundStockForOrderItem(orderItem: any) {
    const stockMovements = [];
    
    try {
      const menuIngredients = await this.findByMenu(orderItem.menuId);
      
      for (const menuIngredient of menuIngredients) {
        const refundQuantity = Number(menuIngredient.quantity) * orderItem.quantity;
        
        // Check if ingredient exists
        const ingredient = await this.prisma.ingredient.findUnique({
          where: { id: menuIngredient.ingredientId }
        });

        if (!ingredient) continue;

        // Convert refund quantity to same unit as ingredient stock
        let refundQuantityInStockUnit = refundQuantity;
        
        // Smart unit conversion (same logic as deductStockForOrder)
        if (menuIngredient.unit.toLowerCase() !== ingredient.unit.toLowerCase()) {
          const ingredientName = ingredient.name.toLowerCase();
          
          if (ingredientName.includes('hành') && !ingredientName.includes('lá')) {
            // For onions - by weight
            if (menuIngredient.unit === 'g' && ingredient.unit === 'kg') {
              refundQuantityInStockUnit = refundQuantity / 1000; // g to kg
            } else if (menuIngredient.unit === 'kg' && ingredient.unit === 'g') {
              refundQuantityInStockUnit = refundQuantity * 1000; // kg to g
            }
          } else if (ingredientName.includes('nước') || ingredientName.includes('sauce') ||
                     ingredientName.includes('dầu') || ingredientName.includes('giấm')) {
            // For liquids
            if (menuIngredient.unit === 'ml' && ingredient.unit === 'l') {
              refundQuantityInStockUnit = refundQuantity / 1000; // ml to l
            } else if (menuIngredient.unit === 'l' && ingredient.unit === 'ml') {
              refundQuantityInStockUnit = refundQuantity * 1000; // l to ml
            }
          } else {
            // For solid ingredients
            if (menuIngredient.unit === 'g' && ingredient.unit === 'kg') {
              refundQuantityInStockUnit = refundQuantity / 1000; // g to kg
            } else if (menuIngredient.unit === 'kg' && ingredient.unit === 'g') {
              refundQuantityInStockUnit = refundQuantity * 1000; // kg to g
            }
          }
        }

        // Create stock movement for refund
        const stockMovement = await this.prisma.stockMovement.create({
          data: {
            ingredientId: menuIngredient.ingredientId,
            type: 'IN', // Refund is always IN
            quantity: refundQuantityInStockUnit,
            reason: `Hoàn trả: Hủy món ${orderItem.menuName || 'Unknown'}`,
            referenceId: orderItem.orderId
          }
        });

        // Update ingredient stock (add back)
        const currentStock = Number(ingredient.currentStock);
        const newStock = Math.round((currentStock + refundQuantityInStockUnit) * 1000) / 1000;
        
        await this.prisma.ingredient.update({
          where: { id: menuIngredient.ingredientId },
          data: { currentStock: newStock }
        });

        stockMovements.push(stockMovement);
      }
    } catch (error) {
      console.error('Failed to refund stock for order item:', error);
      throw error;
    }

    return stockMovements;
  }
}
