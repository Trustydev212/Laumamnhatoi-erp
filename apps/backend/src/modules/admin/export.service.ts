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
}
