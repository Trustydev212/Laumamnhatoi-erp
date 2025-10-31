import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import * as ExcelJS from 'exceljs';
import * as PDFDocument from 'pdfkit';

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  async exportUsers(format: 'excel' | 'pdf', filters: any = {}) {
    const users = await this.prisma.user.findMany({
      where: {
        ...(filters.role && { role: filters.role }),
        ...(filters.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters.search && {
          OR: [
            { username: { contains: filters.search, mode: 'insensitive' } },
            { email: { contains: filters.search, mode: 'insensitive' } },
            { firstName: { contains: filters.search, mode: 'insensitive' } },
            { lastName: { contains: filters.search, mode: 'insensitive' } }
          ]
        })
      },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (format === 'excel') {
      return this.exportUsersToExcel(users);
    } else {
      return this.exportUsersToPDF(users);
    }
  }

  async exportLogs(format: 'excel' | 'pdf', filters: any = {}) {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        ...(filters.level && { action: { contains: filters.level } }),
        ...(filters.userId && { userId: filters.userId }),
        ...(filters.startDate && filters.endDate && {
          createdAt: {
            gte: new Date(filters.startDate),
            lte: new Date(filters.endDate)
          }
        })
      },
      include: {
        user: {
          select: {
            username: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: filters.limit || 1000
    });

    if (format === 'excel') {
      return this.exportLogsToExcel(logs);
    } else {
      return this.exportLogsToPDF(logs);
    }
  }

  async exportAnalytics(format: 'excel' | 'pdf', filters: any = {}) {
    // Get analytics data
    const [
      totalUsers,
      totalOrders,
      totalCustomers,
      recentOrders,
      usersByRole,
      revenueData
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.order.count(),
      this.prisma.customer.count(),
      this.prisma.order.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      }),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: { role: true }
      }),
      this.prisma.order.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
          }
        },
        select: {
          total: true,
          createdAt: true
        }
      })
    ]);

    const analyticsData = {
      summary: {
        totalUsers,
        totalOrders,
        totalCustomers,
        recentOrders
      },
      usersByRole,
      revenueData
    };

    if (format === 'excel') {
      return this.exportAnalyticsToExcel(analyticsData);
    } else {
      return this.exportAnalyticsToPDF(analyticsData);
    }
  }

  private async exportUsersToExcel(users: any[]) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Users');

    // Add headers
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Username', key: 'username', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'First Name', key: 'firstName', width: 15 },
      { header: 'Last Name', key: 'lastName', width: 15 },
      { header: 'Role', key: 'role', width: 10 },
      { header: 'Active', key: 'isActive', width: 10 },
      { header: 'Created At', key: 'createdAt', width: 20 },
      { header: 'Updated At', key: 'updatedAt', width: 20 }
    ];

    // Add data
    users.forEach(user => {
      worksheet.addRow({
        ...user,
        isActive: user.isActive ? 'Yes' : 'No',
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      });
    });

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    return workbook.xlsx.writeBuffer();
  }

  private async exportUsersToPDF(users: any[]) {
    const doc = new PDFDocument();
    const buffers: Buffer[] = [];
    
    doc.on('data', buffers.push.bind(buffers));
    
    return new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      // Add title
      doc.fontSize(20).text('Users Export', 50, 50);
      doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, 50, 80);
      doc.moveDown();

      // Add table headers
      let y = 120;
      doc.fontSize(10).text('Username', 50, y);
      doc.text('Email', 150, y);
      doc.text('Role', 300, y);
      doc.text('Active', 350, y);
      doc.text('Created', 400, y);
      
      // Add line
      doc.moveTo(50, y + 15).lineTo(500, y + 15).stroke();
      y += 25;

      // Add data rows
      users.forEach((user, index) => {
        if (y > 750) { // New page
          doc.addPage();
          y = 50;
        }
        
        doc.text(user.username, 50, y);
        doc.text(user.email, 150, y);
        doc.text(user.role, 300, y);
        doc.text(user.isActive ? 'Yes' : 'No', 350, y);
        doc.text(user.createdAt.toLocaleDateString(), 400, y);
        
        y += 20;
      });

      doc.end();
    });
  }

  private async exportLogsToExcel(logs: any[]) {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('System Logs');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Action', key: 'action', width: 20 },
      { header: 'Entity', key: 'entity', width: 15 },
      { header: 'User', key: 'user', width: 20 },
      { header: 'IP Address', key: 'ipAddress', width: 15 },
      { header: 'Created At', key: 'createdAt', width: 20 }
    ];

    logs.forEach(log => {
      worksheet.addRow({
        id: log.id,
        action: log.action,
        entity: log.entity,
        user: log.user ? `${log.user.username} (${log.user.email})` : 'System',
        ipAddress: log.ipAddress,
        createdAt: log.createdAt.toISOString()
      });
    });

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    return workbook.xlsx.writeBuffer();
  }

  private async exportLogsToPDF(logs: any[]) {
    const doc = new PDFDocument();
    const buffers: Buffer[] = [];
    
    doc.on('data', buffers.push.bind(buffers));
    
    return new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      doc.fontSize(20).text('System Logs Export', 50, 50);
      doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, 50, 80);
      doc.moveDown();

      let y = 120;
      doc.fontSize(10).text('Action', 50, y);
      doc.text('Entity', 150, y);
      doc.text('User', 250, y);
      doc.text('IP', 350, y);
      doc.text('Date', 400, y);
      
      doc.moveTo(50, y + 15).lineTo(500, y + 15).stroke();
      y += 25;

      logs.forEach((log, index) => {
        if (y > 750) {
          doc.addPage();
          y = 50;
        }
        
        doc.text(log.action, 50, y);
        doc.text(log.entity, 150, y);
        doc.text(log.user ? log.user.username : 'System', 250, y);
        doc.text(log.ipAddress, 350, y);
        doc.text(log.createdAt.toLocaleDateString(), 400, y);
        
        y += 20;
      });

      doc.end();
    });
  }

  private async exportAnalyticsToExcel(data: any) {
    const workbook = new ExcelJS.Workbook();
    
    // Summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 20 },
      { header: 'Value', key: 'value', width: 15 }
    ];

    summarySheet.addRow({ metric: 'Total Users', value: data.summary.totalUsers });
    summarySheet.addRow({ metric: 'Total Orders', value: data.summary.totalOrders });
    summarySheet.addRow({ metric: 'Total Customers', value: data.summary.totalCustomers });
    summarySheet.addRow({ metric: 'Recent Orders (30d)', value: data.summary.recentOrders });

    // Users by Role sheet
    const roleSheet = workbook.addWorksheet('Users by Role');
    roleSheet.columns = [
      { header: 'Role', key: 'role', width: 15 },
      { header: 'Count', key: 'count', width: 10 }
    ];

    data.usersByRole.forEach((item: any) => {
      roleSheet.addRow({ role: item.role, count: item._count.role });
    });

    return workbook.xlsx.writeBuffer();
  }

  private async exportAnalyticsToPDF(data: any) {
    const doc = new PDFDocument();
    const buffers: Buffer[] = [];
    
    doc.on('data', buffers.push.bind(buffers));
    
    return new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      doc.fontSize(20).text('Analytics Export', 50, 50);
      doc.fontSize(12).text(`Generated on: ${new Date().toLocaleString()}`, 50, 80);
      doc.moveDown();

      let y = 120;
      doc.fontSize(14).text('Summary', 50, y);
      y += 30;

      doc.fontSize(12).text(`Total Users: ${data.summary.totalUsers}`, 50, y);
      y += 20;
      doc.text(`Total Orders: ${data.summary.totalOrders}`, 50, y);
      y += 20;
      doc.text(`Total Customers: ${data.summary.totalCustomers}`, 50, y);
      y += 20;
      doc.text(`Recent Orders (30d): ${data.summary.recentOrders}`, 50, y);
      y += 40;

      doc.fontSize(14).text('Users by Role', 50, y);
      y += 30;

      data.usersByRole.forEach((item: any) => {
        doc.fontSize(12).text(`${item.role}: ${item._count.role}`, 50, y);
        y += 20;
      });

      doc.end();
    });
  }

  /**
   * Export báo cáo tổng hợp bán hàng
   */
  async exportSalesReport(format: 'excel' | 'pdf', filters: any = {}) {
    const startDate = filters.startDate ? new Date(filters.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();

    const orders = await this.prisma.order.findMany({
      where: {
        ...(filters.status && { status: filters.status }),
        ...(filters.isPaid !== undefined && { isPaid: filters.isPaid }),
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        orderItems: {
          include: {
            menu: {
              select: {
                name: true,
                category: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        },
        table: {
          select: {
            name: true
          }
        },
        user: {
          select: {
            username: true,
            firstName: true,
            lastName: true
          }
        },
        customer: {
          select: {
            name: true,
            phone: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (format === 'excel') {
      return this.exportSalesReportToExcel(orders, startDate, endDate);
    } else {
      return this.exportSalesReportToPDF(orders, startDate, endDate);
    }
  }

  /**
   * Export báo cáo tồn kho
   */
  async exportInventoryReport(format: 'excel' | 'pdf', filters: any = {}) {
    // Build where clause for low stock filter
    const whereClause: any = {
      ...(filters.isActive !== undefined && { isActive: filters.isActive }),
      ...(filters.supplierId && { supplierId: filters.supplierId })
    };

    // Low stock filter: items where currentStock <= minStock or currentStock <= 0
    if (filters.lowStock) {
      whereClause.OR = [
        { currentStock: { lte: 0 } }
      ];
      // Note: Prisma doesn't support comparing columns directly in where clause
      // So we'll filter in memory after fetching
    }

    const allIngredients = await this.prisma.ingredient.findMany({
      where: whereClause,
      include: {
        supplier: {
          select: {
            name: true,
            phone: true
          }
        },
        stockMovements: {
          take: 10,
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Filter low stock items if needed (after fetching due to Prisma limitation)
    let ingredients = allIngredients;
    if (filters.lowStock) {
      ingredients = allIngredients.filter(ing => 
        Number(ing.currentStock) <= Number(ing.minStock) || Number(ing.currentStock) <= 0
      );
    }

    // Tính toán tổng giá trị tồn kho
    const totalInventoryValue = ingredients.reduce((sum, ing) => {
      return sum + (Number(ing.currentStock) * Number(ing.costPrice));
    }, 0);

    if (format === 'excel') {
      return this.exportInventoryReportToExcel(ingredients, totalInventoryValue);
    } else {
      return this.exportInventoryReportToPDF(ingredients, totalInventoryValue);
    }
  }

  /**
   * Export báo cáo doanh thu
   */
  async exportRevenueReport(format: 'excel' | 'pdf', filters: any = {}) {
    const startDate = filters.startDate ? new Date(filters.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();

    const orders = await this.prisma.order.findMany({
      where: {
        isPaid: true,
        paidAt: {
          gte: startDate,
          lte: endDate
        },
        ...(filters.tableId && { tableId: filters.tableId })
      },
      include: {
        payments: true,
        table: {
          select: {
            name: true
          }
        },
        user: {
          select: {
            username: true
          }
        },
        customer: {
          select: {
            name: true
          }
        },
        orderItems: {
          include: {
            menu: {
              select: {
                name: true,
                category: {
                  select: {
                    name: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: { paidAt: 'desc' }
    });

    // Tính tổng doanh thu theo ngày
    const dailyRevenue = orders.reduce((acc: any, order) => {
      const date = order.paidAt?.toISOString().split('T')[0] || order.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { date, revenue: 0, orders: 0 };
      }
      acc[date].revenue += Number(order.total);
      acc[date].orders += 1;
      return acc;
    }, {});

    // Tính tổng doanh thu theo phương thức thanh toán
    const revenueByPaymentMethod = orders.reduce((acc: any, order) => {
      order.payments.forEach((payment: any) => {
        if (!acc[payment.method]) {
          acc[payment.method] = 0;
        }
        acc[payment.method] += Number(payment.amount);
      });
      return acc;
    }, {});

    // Tính tổng doanh thu theo danh mục món ăn
    const revenueByCategory = orders.reduce((acc: any, order) => {
      order.orderItems.forEach((item: any) => {
        const categoryName = item.menu.category.name;
        if (!acc[categoryName]) {
          acc[categoryName] = { revenue: 0, quantity: 0 };
        }
        acc[categoryName].revenue += Number(item.subtotal);
        acc[categoryName].quantity += item.quantity;
      });
      return acc;
    }, {});

    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.total), 0);
    const totalOrders = orders.length;

    const revenueData = {
      orders,
      dailyRevenue: Object.values(dailyRevenue),
      revenueByPaymentMethod,
      revenueByCategory,
      summary: {
        totalRevenue,
        totalOrders,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
        startDate,
        endDate
      }
    };

    if (format === 'excel') {
      return this.exportRevenueReportToExcel(revenueData);
    } else {
      return this.exportRevenueReportToPDF(revenueData);
    }
  }

  private async exportSalesReportToExcel(orders: any[], startDate: Date, endDate: Date) {
    const workbook = new ExcelJS.Workbook();
    
    // Sheet 1: Tổng quan
    const summarySheet = workbook.addWorksheet('Tổng quan');
    summarySheet.columns = [
      { header: 'Chỉ tiêu', key: 'metric', width: 30 },
      { header: 'Giá trị', key: 'value', width: 20 }
    ];

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const totalItems = orders.reduce((sum, o) => sum + o.orderItems.length, 0);
    const paidOrders = orders.filter(o => o.isPaid).length;

    summarySheet.addRow({ metric: 'Tổng số đơn hàng', value: totalOrders });
    summarySheet.addRow({ metric: 'Đơn hàng đã thanh toán', value: paidOrders });
    summarySheet.addRow({ metric: 'Tổng doanh thu', value: totalRevenue.toLocaleString('vi-VN') + ' đ' });
    summarySheet.addRow({ metric: 'Tổng số món đã bán', value: totalItems });
    summarySheet.addRow({ metric: 'Từ ngày', value: startDate.toLocaleDateString('vi-VN') });
    summarySheet.addRow({ metric: 'Đến ngày', value: endDate.toLocaleDateString('vi-VN') });

    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Sheet 2: Chi tiết đơn hàng
    const ordersSheet = workbook.addWorksheet('Chi tiết đơn hàng');
    ordersSheet.columns = [
      { header: 'Mã đơn', key: 'orderNumber', width: 15 },
      { header: 'Bàn', key: 'table', width: 15 },
      { header: 'Nhân viên', key: 'staff', width: 20 },
      { header: 'Khách hàng', key: 'customer', width: 20 },
      { header: 'Trạng thái', key: 'status', width: 15 },
      { header: 'Tạm tính', key: 'subtotal', width: 15 },
      { header: 'Thuế', key: 'tax', width: 15 },
      { header: 'Tổng tiền', key: 'total', width: 15 },
      { header: 'Đã thanh toán', key: 'isPaid', width: 12 },
      { header: 'Ngày tạo', key: 'createdAt', width: 20 }
    ];

    orders.forEach(order => {
      ordersSheet.addRow({
        orderNumber: order.orderNumber,
        table: order.table.name,
        staff: `${order.user.firstName} ${order.user.lastName} (${order.user.username})`,
        customer: order.customer ? `${order.customer.name} (${order.customer.phone})` : '-',
        status: order.status,
        subtotal: Number(order.subtotal).toLocaleString('vi-VN'),
        tax: Number(order.tax).toLocaleString('vi-VN'),
        total: Number(order.total).toLocaleString('vi-VN'),
        isPaid: order.isPaid ? 'Có' : 'Không',
        createdAt: order.createdAt.toLocaleString('vi-VN')
      });
    });

    ordersSheet.getRow(1).font = { bold: true };
    ordersSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Sheet 3: Top món ăn
    const topItems = orders.reduce((acc: any, order) => {
      order.orderItems.forEach((item: any) => {
        const menuName = item.menu.name;
        if (!acc[menuName]) {
          acc[menuName] = { quantity: 0, revenue: 0 };
        }
        acc[menuName].quantity += item.quantity;
        acc[menuName].revenue += Number(item.subtotal);
      });
      return acc;
    }, {});

    const topItemsSheet = workbook.addWorksheet('Top món ăn');
    topItemsSheet.columns = [
      { header: 'Tên món', key: 'name', width: 30 },
      { header: 'Số lượng', key: 'quantity', width: 15 },
      { header: 'Doanh thu', key: 'revenue', width: 20 }
    ];

    Object.entries(topItems)
      .sort(([, a]: any, [, b]: any) => b.quantity - a.quantity)
      .forEach(([name, data]: [string, any]) => {
        topItemsSheet.addRow({
          name,
          quantity: data.quantity,
          revenue: data.revenue.toLocaleString('vi-VN') + ' đ'
        });
      });

    topItemsSheet.getRow(1).font = { bold: true };
    topItemsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    return workbook.xlsx.writeBuffer();
  }

  private async exportSalesReportToPDF(orders: any[], startDate: Date, endDate: Date) {
    const doc = new PDFDocument();
    const buffers: Buffer[] = [];
    
    doc.on('data', buffers.push.bind(buffers));
    
    return new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      doc.fontSize(20).text('Báo Cáo Tổng Hợp Bán Hàng', 50, 50);
      doc.fontSize(12).text(`Từ ${startDate.toLocaleDateString('vi-VN')} đến ${endDate.toLocaleDateString('vi-VN')}`, 50, 80);
      doc.moveDown();

      const totalOrders = orders.length;
      const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);

      let y = 120;
      doc.fontSize(14).text('Tổng quan', 50, y);
      y += 30;
      doc.fontSize(12).text(`Tổng số đơn hàng: ${totalOrders}`, 50, y);
      y += 20;
      doc.text(`Tổng doanh thu: ${totalRevenue.toLocaleString('vi-VN')} đ`, 50, y);
      
      doc.end();
    });
  }

  private async exportInventoryReportToExcel(ingredients: any[], totalValue: number) {
    const workbook = new ExcelJS.Workbook();
    
    // Sheet 1: Tổng quan
    const summarySheet = workbook.addWorksheet('Tổng quan');
    summarySheet.columns = [
      { header: 'Chỉ tiêu', key: 'metric', width: 30 },
      { header: 'Giá trị', key: 'value', width: 20 }
    ];

    const totalItems = ingredients.length;
    const lowStockItems = ingredients.filter(i => Number(i.currentStock) <= Number(i.minStock)).length;
    const outOfStockItems = ingredients.filter(i => Number(i.currentStock) <= 0).length;

    summarySheet.addRow({ metric: 'Tổng số nguyên liệu', value: totalItems });
    summarySheet.addRow({ metric: 'Nguyên liệu sắp hết', value: lowStockItems });
    summarySheet.addRow({ metric: 'Nguyên liệu hết hàng', value: outOfStockItems });
    summarySheet.addRow({ metric: 'Tổng giá trị tồn kho', value: totalValue.toLocaleString('vi-VN') + ' đ' });

    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Sheet 2: Chi tiết tồn kho
    const inventorySheet = workbook.addWorksheet('Chi tiết tồn kho');
    inventorySheet.columns = [
      { header: 'Tên nguyên liệu', key: 'name', width: 30 },
      { header: 'Đơn vị', key: 'unit', width: 10 },
      { header: 'Tồn kho hiện tại', key: 'currentStock', width: 15 },
      { header: 'Tồn tối thiểu', key: 'minStock', width: 15 },
      { header: 'Tồn tối đa', key: 'maxStock', width: 15 },
      { header: 'Giá nhập', key: 'costPrice', width: 15 },
      { header: 'Giá trị tồn kho', key: 'value', width: 20 },
      { header: 'Nhà cung cấp', key: 'supplier', width: 20 },
      { header: 'Hạn sử dụng', key: 'expiryDate', width: 15 },
      { header: 'Trạng thái', key: 'status', width: 15 }
    ];

    ingredients.forEach(ing => {
      const stockValue = Number(ing.currentStock) * Number(ing.costPrice);
      let status = 'Bình thường';
      if (Number(ing.currentStock) <= 0) {
        status = 'Hết hàng';
      } else if (Number(ing.currentStock) <= Number(ing.minStock)) {
        status = 'Sắp hết';
      }

      inventorySheet.addRow({
        name: ing.name,
        unit: ing.unit,
        currentStock: Number(ing.currentStock).toLocaleString('vi-VN'),
        minStock: Number(ing.minStock).toLocaleString('vi-VN'),
        maxStock: Number(ing.maxStock).toLocaleString('vi-VN'),
        costPrice: Number(ing.costPrice).toLocaleString('vi-VN') + ' đ',
        value: stockValue.toLocaleString('vi-VN') + ' đ',
        supplier: ing.supplier ? `${ing.supplier.name} (${ing.supplier.phone})` : '-',
        expiryDate: ing.expiryDate ? ing.expiryDate.toLocaleDateString('vi-VN') : '-',
        status
      });
    });

    inventorySheet.getRow(1).font = { bold: true };
    inventorySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    return workbook.xlsx.writeBuffer();
  }

  private async exportInventoryReportToPDF(ingredients: any[], totalValue: number) {
    const doc = new PDFDocument();
    const buffers: Buffer[] = [];
    
    doc.on('data', buffers.push.bind(buffers));
    
    return new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      doc.fontSize(20).text('Báo Cáo Tồn Kho', 50, 50);
      doc.fontSize(12).text(`Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}`, 50, 80);
      doc.moveDown();

      const totalItems = ingredients.length;
      let y = 120;
      doc.fontSize(14).text('Tổng quan', 50, y);
      y += 30;
      doc.fontSize(12).text(`Tổng số nguyên liệu: ${totalItems}`, 50, y);
      y += 20;
      doc.text(`Tổng giá trị tồn kho: ${totalValue.toLocaleString('vi-VN')} đ`, 50, y);
      
      doc.end();
    });
  }

  private async exportRevenueReportToExcel(revenueData: any) {
    const workbook = new ExcelJS.Workbook();
    
    // Sheet 1: Tổng quan
    const summarySheet = workbook.addWorksheet('Tổng quan');
    summarySheet.columns = [
      { header: 'Chỉ tiêu', key: 'metric', width: 30 },
      { header: 'Giá trị', key: 'value', width: 25 }
    ];

    const { summary } = revenueData;
    summarySheet.addRow({ metric: 'Tổng doanh thu', value: summary.totalRevenue.toLocaleString('vi-VN') + ' đ' });
    summarySheet.addRow({ metric: 'Tổng số đơn hàng', value: summary.totalOrders });
    summarySheet.addRow({ metric: 'Giá trị đơn hàng trung bình', value: summary.averageOrderValue.toLocaleString('vi-VN') + ' đ' });
    summarySheet.addRow({ metric: 'Từ ngày', value: summary.startDate.toLocaleDateString('vi-VN') });
    summarySheet.addRow({ metric: 'Đến ngày', value: summary.endDate.toLocaleDateString('vi-VN') });

    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Sheet 2: Doanh thu theo ngày
    const dailySheet = workbook.addWorksheet('Doanh thu theo ngày');
    dailySheet.columns = [
      { header: 'Ngày', key: 'date', width: 15 },
      { header: 'Số đơn', key: 'orders', width: 12 },
      { header: 'Doanh thu', key: 'revenue', width: 20 }
    ];

    revenueData.dailyRevenue.forEach((day: any) => {
      dailySheet.addRow({
        date: new Date(day.date).toLocaleDateString('vi-VN'),
        orders: day.orders,
        revenue: day.revenue.toLocaleString('vi-VN') + ' đ'
      });
    });

    dailySheet.getRow(1).font = { bold: true };
    dailySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Sheet 3: Doanh thu theo phương thức thanh toán
    const paymentSheet = workbook.addWorksheet('Doanh thu theo phương thức');
    paymentSheet.columns = [
      { header: 'Phương thức', key: 'method', width: 25 },
      { header: 'Doanh thu', key: 'revenue', width: 20 }
    ];

    Object.entries(revenueData.revenueByPaymentMethod).forEach(([method, revenue]: [string, any]) => {
      paymentSheet.addRow({
        method,
        revenue: revenue.toLocaleString('vi-VN') + ' đ'
      });
    });

    paymentSheet.getRow(1).font = { bold: true };
    paymentSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Sheet 4: Doanh thu theo danh mục
    const categorySheet = workbook.addWorksheet('Doanh thu theo danh mục');
    categorySheet.columns = [
      { header: 'Danh mục', key: 'category', width: 25 },
      { header: 'Số lượng', key: 'quantity', width: 15 },
      { header: 'Doanh thu', key: 'revenue', width: 20 }
    ];

    Object.entries(revenueData.revenueByCategory).forEach(([category, data]: [string, any]) => {
      categorySheet.addRow({
        category,
        quantity: data.quantity,
        revenue: data.revenue.toLocaleString('vi-VN') + ' đ'
      });
    });

    categorySheet.getRow(1).font = { bold: true };
    categorySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    return workbook.xlsx.writeBuffer();
  }

  private async exportRevenueReportToPDF(revenueData: any) {
    const doc = new PDFDocument();
    const buffers: Buffer[] = [];
    
    doc.on('data', buffers.push.bind(buffers));
    
    return new Promise<Buffer>((resolve) => {
      doc.on('end', () => {
        resolve(Buffer.concat(buffers));
      });

      const { summary } = revenueData;
      doc.fontSize(20).text('Báo Cáo Doanh Thu', 50, 50);
      doc.fontSize(12).text(`Từ ${summary.startDate.toLocaleDateString('vi-VN')} đến ${summary.endDate.toLocaleDateString('vi-VN')}`, 50, 80);
      doc.moveDown();

      let y = 120;
      doc.fontSize(14).text('Tổng quan', 50, y);
      y += 30;
      doc.fontSize(12).text(`Tổng doanh thu: ${summary.totalRevenue.toLocaleString('vi-VN')} đ`, 50, y);
      y += 20;
      doc.text(`Tổng số đơn hàng: ${summary.totalOrders}`, 50, y);
      y += 20;
      doc.text(`Giá trị đơn hàng trung bình: ${summary.averageOrderValue.toLocaleString('vi-VN')} đ`, 50, y);
      
      doc.end();
    });
  }
}
