import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { BusinessIntelligenceService } from './business-intelligence.service';

@ApiTags('Business Intelligence')
@Controller('admin/analytics')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class BusinessIntelligenceController {
  constructor(private readonly businessIntelligenceService: BusinessIntelligenceService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get dashboard overview' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDashboardOverview() {
    return this.businessIntelligenceService.getDashboardOverview();
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue analytics' })
  @ApiResponse({ status: 200, description: 'Revenue analytics retrieved successfully' })
  async getRevenueAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.businessIntelligenceService.getRevenueAnalytics(start, end);
  }

  @Get('users')
  @ApiOperation({ summary: 'Get user analytics' })
  @ApiResponse({ status: 200, description: 'User analytics retrieved successfully' })
  async getUserAnalytics() {
    return this.businessIntelligenceService.getUserAnalytics();
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get order analytics' })
  @ApiResponse({ status: 200, description: 'Order analytics retrieved successfully' })
  async getOrderAnalytics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.businessIntelligenceService.getOrderAnalytics(start, end);
  }

  @Get('system')
  @ApiOperation({ summary: 'Get system performance analytics' })
  @ApiResponse({ status: 200, description: 'System analytics retrieved successfully' })
  async getSystemPerformanceAnalytics() {
    return this.businessIntelligenceService.getSystemPerformanceAnalytics();
  }
}
