import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { RealtimeGateway } from '../../../common/realtime/realtime.gateway';
import { AuditLoggerService } from '../../../common/audit/audit-logger.service';
import { CreateOrderDto } from '../dto/create-order.dto';
import { UpdateOrderDto } from '../dto/update-order.dto';
import { MenuIngredientService } from './menu-ingredient.service';
// OrderStatus is now a string type

@Injectable()
export class OrderService {
  constructor(
    private prisma: PrismaService,
    private realtimeGateway: RealtimeGateway,
    private menuIngredientService: MenuIngredientService,
    private auditLogger: AuditLoggerService,
  ) {}

  async create(createOrderDto: CreateOrderDto, userId: string) {
    const { tableId, orderItems, ...orderData } = createOrderDto;

    // Check if table exists and is available
    const table = await this.prisma.table.findUnique({
      where: { id: tableId },
    });

    if (!table) {
      throw new NotFoundException('Table not found');
    }

    // Allow creating orders for both AVAILABLE and OCCUPIED tables
    // AVAILABLE: First order for the table
    // OCCUPIED: Additional orders for the same table
    if (table.status !== 'AVAILABLE' && table.status !== 'OCCUPIED') {
      throw new BadRequestException('Table is not available for orders');
    }

    // Generate order number
    const orderNumber = await this.generateOrderNumber();

    // Calculate totals
    let subtotal = 0;
    const orderItemsData = [];

    for (const item of orderItems) {
      const menu = await this.prisma.menu.findUnique({
        where: { id: item.menuId },
      });

      if (!menu) {
        throw new NotFoundException(`Menu item not found: ${item.menuId}`);
      }

      if (!menu.isAvailable) {
        throw new BadRequestException(`Menu item is not available: ${menu.name}`);
      }

      const itemSubtotal = Number(menu.price) * item.quantity;
      subtotal += itemSubtotal;

      orderItemsData.push({
        menuId: item.menuId,
        quantity: item.quantity,
        price: menu.price,
        subtotal: itemSubtotal,
        notes: item.notes,
      });
    }

    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax - (orderData.discount || 0); // Total includes tax

    // Create order
    const order = await this.prisma.order.create({
      data: {
        orderNumber,
        tableId,
        userId,
        ...((orderData as any).customerId && { customerId: (orderData as any).customerId }),
        subtotal,
        tax,
        discount: orderData.discount || 0,
        total,
        notes: orderData.notes,
        orderItems: {
          create: orderItemsData,
        },
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
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Auto-deduct stock for ingredients
    try {
      const orderItemsForDeduct = orderItemsData.map(item => ({
        menuId: item.menuId,
        quantity: item.quantity,
        orderId: order.id,
        menuName: 'Menu Item' // We'll get the actual name from the menu service if needed
      }));
      
      await this.menuIngredientService.deductStockForOrder(orderItemsForDeduct);
    } catch (error) {
      // If stock deduction fails, we should probably rollback the order
      // For now, just log the error
      console.error('Failed to deduct stock for order:', error);
      // TODO: Implement rollback mechanism
    }

    // Update table status to OCCUPIED only if it was AVAILABLE
    if (table.status === 'AVAILABLE') {
      await this.prisma.table.update({
        where: { id: tableId },
        data: { status: 'OCCUPIED' },
      });
    }

    // Emit realtime event
    this.realtimeGateway.emitOrderCreated(order);

    // Log audit event
    await this.auditLogger.logAction(
      userId,
      'CREATE_ORDER',
      'Order',
      order.id,
      null,
      {
        orderNumber: order.orderNumber,
        tableId: order.tableId,
        total: order.total,
        itemCount: orderItems.length
      }
    );

    return order;
  }

  async findAll() {
    return this.prisma.order.findMany({
      include: {
        orderItems: {
          include: {
            menu: true,
          },
        },
        table: true,
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: {
            menu: true,
          },
        },
        table: true,
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        payments: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  async removeOrderItem(orderId: string, itemId: string) {
    // Get order item details before deletion
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: itemId },
      include: {
        menu: true,
        order: true
      }
    });

    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }

    if (orderItem.orderId !== orderId) {
      throw new BadRequestException('Order item does not belong to this order');
    }

    // Check if order can be modified
    if (orderItem.order.status === 'COMPLETED' || orderItem.order.status === 'CANCELLED') {
      throw new BadRequestException('Cannot modify completed or cancelled orders');
    }

    // Refund stock for the removed item
    try {
      const orderItemForRefund = {
        menuId: orderItem.menuId,
        quantity: orderItem.quantity,
        orderId: orderId,
        menuName: orderItem.menu.name
      };
      
      await this.menuIngredientService.refundStockForOrderItem(orderItemForRefund);
    } catch (error) {
      console.error('Failed to refund stock for removed order item:', error);
      // Continue with deletion even if stock refund fails
    }

    // Delete the order item
    await this.prisma.orderItem.delete({
      where: { id: itemId }
    });

    // Recalculate order totals
    const remainingItems = await this.prisma.orderItem.findMany({
      where: { orderId },
      include: { menu: true }
    });

    let subtotal = 0;
    for (const item of remainingItems) {
      subtotal += Number(item.subtotal);
    }

    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax; // Total includes tax

    // Update order totals
    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        subtotal,
        tax,
        total
      },
      include: {
        orderItems: {
          include: {
            menu: true
          }
        },
        table: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    // Emit realtime update
    this.realtimeGateway.emitOrderUpdated(updatedOrder);

    return {
      message: 'Order item removed and stock refunded successfully',
      order: updatedOrder
    };
  }

  async update(id: string, updateOrderDto: UpdateOrderDto, userId?: string) {
    const order = await this.findOne(id);
    
    // Remove tableId and orderItems from update data as they're not allowed to change directly
    const { tableId, orderItems, ...updateData } = updateOrderDto;
    
    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        orderItems: {
          include: {
            menu: true,
          },
        },
        table: true,
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    // Emit realtime event
    this.realtimeGateway.emitOrderUpdated(updatedOrder);

    // Log audit event
    if (userId) {
      await this.auditLogger.logAction(
        userId,
        'UPDATE_ORDER',
        'Order',
        order.id,
        null,
        {
          orderNumber: order.orderNumber,
          changes: Object.keys(updateData)
        }
      );
    }

    return updatedOrder;
  }

  async updateStatus(id: string, status: string, userId?: string, paymentMethod?: string) {
    const order = await this.findOne(id);
    
    // Prepare update data
    const updateData: any = { status };
    
    // If status is COMPLETED, mark as paid and set paidAt
    if (status === 'COMPLETED') {
      updateData.isPaid = true;
      updateData.paidAt = new Date();
    }
    
    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: updateData,
      include: {
        orderItems: {
          include: {
            menu: true,
          },
        },
        table: true,
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
        payments: true, // Include payments to check payment method
      },
    });

    // If status is COMPLETED, create a payment record
    if (status === 'COMPLETED') {
      // Use provided payment method or default to CASH
      const method = paymentMethod || 'CASH';
      await this.prisma.payment.create({
        data: {
          orderId: id,
          method: method, // BANK_TRANSFER for QR payment, CASH for cash payment
          amount: Number(order.total),
          status: 'SUCCESS',
          processedAt: new Date(),
        },
      });

      // Fetch order again with payments after creating payment
      const orderWithPayment = await this.prisma.order.findUnique({
        where: { id },
        include: {
          orderItems: {
            include: {
              menu: true,
            },
          },
          table: true,
          user: {
            select: {
              id: true,
              username: true,
              firstName: true,
              lastName: true,
            },
          },
          payments: {
            orderBy: {
              processedAt: 'desc',
            },
          },
        },
      });

      // Emit realtime event
      this.realtimeGateway.emitOrderStatusChanged(id, status);

      // Log audit event
      if (userId) {
        await this.auditLogger.logAction(
          userId,
          'UPDATE_ORDER_STATUS',
          'Order',
          order.id,
          { status: order.status },
          {
            orderNumber: order.orderNumber,
            newStatus: status
          }
        );
      }

      return orderWithPayment;
    }

    // Emit realtime event
    this.realtimeGateway.emitOrderStatusChanged(id, status);

    // Log audit event
    if (userId) {
      await this.auditLogger.logAction(
        userId,
        'UPDATE_ORDER_STATUS',
        'Order',
        order.id,
        { status: order.status },
        {
          orderNumber: order.orderNumber,
          newStatus: status
        }
      );
    }

    return updatedOrder;
  }

  async remove(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: {
            menu: {
              include: {
                ingredients: {
                  include: {
                    ingredient: true,
                  },
                },
              },
            },
          },
        },
        table: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Refund stock if order is completed (stock was already deducted)
    // Only refund if order was completed and paid (stock was deducted when order was completed)
    if (order.status === 'COMPLETED' && order.isPaid) {
      try {
        for (const item of order.orderItems) {
          if (item.menuId) {
            // Use menuIngredientService to refund stock properly
            const orderItemForRefund = {
              menuId: item.menuId,
              quantity: item.quantity,
              orderId: order.id,
              menuName: item.menu?.name || 'Unknown menu'
            };
            
            try {
              await this.menuIngredientService.refundStockForOrderItem(orderItemForRefund);
            } catch (itemError) {
              console.error(`Error refunding stock for order item ${item.menuId}:`, itemError);
              // Continue with other items
            }
          }
        }
      } catch (stockError) {
        console.error('Error refunding stock when deleting order:', stockError);
        // Continue with deletion even if stock refund fails
      }
    }

    // Update table status to available if order exists and table exists
    // Only update for pending/confirmed orders (not completed ones)
    if (order.tableId && (order.status === 'PENDING' || order.status === 'CONFIRMED')) {
      try {
        // Check if there are other pending/active orders for this table
        const otherOrders = await this.prisma.order.findMany({
          where: {
            tableId: order.tableId,
            id: { not: id },
            status: { in: ['PENDING', 'CONFIRMED'] },
          },
        });

        // Only update table status if no other active orders exist
        if (otherOrders.length === 0) {
          await this.prisma.table.update({
            where: { id: order.tableId },
            data: { status: 'AVAILABLE' },
          });
        }
      } catch (tableError) {
        console.error('Error updating table status:', tableError);
        // Continue with deletion even if table update fails
      }
    }

    // Delete payments first (before deleting order due to foreign key constraint)
    try {
      await this.prisma.payment.deleteMany({
        where: { orderId: id },
      });
    } catch (paymentError) {
      console.error('Error deleting payments:', paymentError);
      // Continue with order deletion even if payment deletion fails
    }

    // Delete order (orderItems will be cascade deleted due to onDelete: Cascade)
    try {
      return await this.prisma.order.delete({
        where: { id },
      });
    } catch (deleteError) {
      console.error('Error deleting order:', deleteError);
      throw new BadRequestException(
        `Không thể xóa đơn hàng: ${deleteError instanceof Error ? deleteError.message : 'Lỗi không xác định'}`
      );
    }
  }

  async getOrdersByTable(tableId: string) {
    return this.prisma.order.findMany({
      where: { tableId },
      include: {
        orderItems: {
          include: {
            menu: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrdersByStatus(status: string) {
    return this.prisma.order.findMany({
      where: { status },
      include: {
        orderItems: {
          include: {
            menu: true,
          },
        },
        table: true,
        user: {
          select: {
            id: true,
            username: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async generateOrderNumber(): Promise<string> {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    
    const lastOrder = await this.prisma.order.findFirst({
      where: {
        orderNumber: {
          startsWith: dateStr,
        },
      },
      orderBy: {
        orderNumber: 'desc',
      },
    });

    let sequence = 1;
    if (lastOrder) {
      const lastSequence = parseInt(lastOrder.orderNumber.slice(-4));
      sequence = lastSequence + 1;
    }

    return `${dateStr}${sequence.toString().padStart(4, '0')}`;
  }
}
