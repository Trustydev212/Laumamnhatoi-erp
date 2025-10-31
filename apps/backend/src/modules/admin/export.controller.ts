import { Controller, Post, Body, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { ExportService } from './export.service';
import { Response } from 'express';

@ApiTags('Admin - Data Export')
@Controller('admin/export')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post('users')
  @ApiOperation({ summary: 'Export users data' })
  @ApiResponse({ status: 200, description: 'Users data exported successfully' })
  async exportUsers(
    @Body() body: { format: 'excel' | 'pdf'; filters?: any },
    @Res() res: Response
  ) {
    try {
      const buffer = await this.exportService.exportUsers(body.format, body.filters);
      
      const contentType = body.format === 'excel' 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';
      
      const filename = `users_export_${new Date().toISOString().split('T')[0]}.${
        body.format === 'excel' ? 'xlsx' : 'pdf'
      }`;

      res.set({
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': Buffer.byteLength(buffer).toString()
      });

      res.send(buffer);
    } catch (error) {
      console.error('Export users error:', error);
      res.status(500).json({ message: 'Export failed' });
    }
  }

  @Post('logs')
  @ApiOperation({ summary: 'Export system logs data' })
  @ApiResponse({ status: 200, description: 'System logs data exported successfully' })
  async exportLogs(
    @Body() body: { format: 'excel' | 'pdf'; filters?: any },
    @Res() res: Response
  ) {
    try {
      const buffer = await this.exportService.exportLogs(body.format, body.filters);
      
      const contentType = body.format === 'excel' 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';
      
      const filename = `logs_export_${new Date().toISOString().split('T')[0]}.${
        body.format === 'excel' ? 'xlsx' : 'pdf'
      }`;

      res.set({
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': Buffer.byteLength(buffer).toString()
      });

      res.send(buffer);
    } catch (error) {
      console.error('Export logs error:', error);
      res.status(500).json({ message: 'Export failed' });
    }
  }

  @Post('analytics')
  @ApiOperation({ summary: 'Export analytics data' })
  @ApiResponse({ status: 200, description: 'Analytics data exported successfully' })
  async exportAnalytics(
    @Body() body: { format: 'excel' | 'pdf'; filters?: any },
    @Res() res: Response
  ) {
    try {
      const buffer = await this.exportService.exportAnalytics(body.format, body.filters);
      
      const contentType = body.format === 'excel' 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';
      
      const filename = `analytics_export_${new Date().toISOString().split('T')[0]}.${
        body.format === 'excel' ? 'xlsx' : 'pdf'
      }`;

      res.set({
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': Buffer.byteLength(buffer).toString()
      });

      res.send(buffer);
    } catch (error) {
      console.error('Export analytics error:', error);
      res.status(500).json({ message: 'Export failed' });
    }
  }

  @Post('sales-report')
  @ApiOperation({ summary: 'Export báo cáo tổng hợp bán hàng' })
  @ApiResponse({ status: 200, description: 'Sales report exported successfully' })
  async exportSalesReport(
    @Body() body: { format: 'excel' | 'pdf'; filters?: any },
    @Res() res: Response
  ) {
    try {
      const buffer = await this.exportService.exportSalesReport(body.format, body.filters);
      
      const contentType = body.format === 'excel' 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';
      
      const filename = `sales_report_${new Date().toISOString().split('T')[0]}.${
        body.format === 'excel' ? 'xlsx' : 'pdf'
      }`;

      res.set({
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': Buffer.byteLength(buffer).toString()
      });

      res.send(buffer);
    } catch (error) {
      console.error('Export sales report error:', error);
      res.status(500).json({ message: 'Export failed' });
    }
  }

  @Post('inventory-report')
  @ApiOperation({ summary: 'Export báo cáo tồn kho' })
  @ApiResponse({ status: 200, description: 'Inventory report exported successfully' })
  async exportInventoryReport(
    @Body() body: { format: 'excel' | 'pdf'; filters?: any },
    @Res() res: Response
  ) {
    try {
      const buffer = await this.exportService.exportInventoryReport(body.format, body.filters);
      
      const contentType = body.format === 'excel' 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';
      
      const filename = `inventory_report_${new Date().toISOString().split('T')[0]}.${
        body.format === 'excel' ? 'xlsx' : 'pdf'
      }`;

      res.set({
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': Buffer.byteLength(buffer).toString()
      });

      res.send(buffer);
    } catch (error) {
      console.error('Export inventory report error:', error);
      res.status(500).json({ message: 'Export failed' });
    }
  }

  @Post('revenue-report')
  @ApiOperation({ summary: 'Export báo cáo doanh thu' })
  @ApiResponse({ status: 200, description: 'Revenue report exported successfully' })
  async exportRevenueReport(
    @Body() body: { format: 'excel' | 'pdf'; filters?: any },
    @Res() res: Response
  ) {
    try {
      const buffer = await this.exportService.exportRevenueReport(body.format, body.filters);
      
      const contentType = body.format === 'excel' 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/pdf';
      
      const filename = `revenue_report_${new Date().toISOString().split('T')[0]}.${
        body.format === 'excel' ? 'xlsx' : 'pdf'
      }`;

      res.set({
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': Buffer.byteLength(buffer).toString()
      });

      res.send(buffer);
    } catch (error) {
      console.error('Export revenue report error:', error);
      res.status(500).json({ message: 'Export failed' });
    }
  }
}
