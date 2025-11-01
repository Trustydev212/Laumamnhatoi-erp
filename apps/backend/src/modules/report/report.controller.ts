import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportService } from './report.service';

@ApiTags('Reports')
@Controller('reports')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  @Get('sales')
  @ApiOperation({ summary: 'Get sales report' })
  @ApiResponse({ status: 200, description: 'Sales report retrieved successfully' })
  async getSalesReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportService.getSalesReport(startDate, endDate);
  }

  @Get('inventory')
  @ApiOperation({ summary: 'Get inventory report' })
  @ApiResponse({ status: 200, description: 'Inventory report retrieved successfully' })
  async getInventoryReport() {
    return this.reportService.getInventoryReport();
  }

  @Get('customers')
  @ApiOperation({ summary: 'Get customer report' })
  @ApiResponse({ status: 200, description: 'Customer report retrieved successfully' })
  async getCustomerReport() {
    return this.reportService.getCustomerReport();
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard data' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDashboard() {
    return this.reportService.getDashboard();
  }

  @Get('revenue-daily')
  @ApiOperation({ summary: 'Get daily revenue data for chart' })
  @ApiResponse({ status: 200, description: 'Daily revenue data retrieved successfully' })
  async getDailyRevenue(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.reportService.getDailyRevenue(startDate, endDate);
  }
}
