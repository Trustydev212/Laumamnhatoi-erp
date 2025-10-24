import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('health')
  @ApiOperation({ summary: 'Get system health status' })
  @ApiResponse({ status: 200, description: 'System health retrieved successfully' })
  async getSystemHealth() {
    return this.adminService.getSystemHealth();
  }

  @Get('logs')
  @ApiOperation({ summary: 'Get system logs' })
  @ApiResponse({ status: 200, description: 'System logs retrieved successfully' })
  async getSystemLogs(
    @Query('limit') limit?: number,
    @Query('level') level?: string
  ) {
    return this.adminService.getSystemLogs(limit, level);
  }

  @Get('users/activity')
  @ApiOperation({ summary: 'Get user activity' })
  @ApiResponse({ status: 200, description: 'User activity retrieved successfully' })
  async getUserActivity(@Query('limit') limit?: number) {
    return this.adminService.getUserActivity(limit);
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get performance metrics' })
  @ApiResponse({ status: 200, description: 'Performance metrics retrieved successfully' })
  async getPerformanceMetrics() {
    return this.adminService.getPerformanceMetrics();
  }

  @Get('database/stats')
  @ApiOperation({ summary: 'Get database statistics' })
  @ApiResponse({ status: 200, description: 'Database statistics retrieved successfully' })
  async getDatabaseStats() {
    return this.adminService.getDatabaseStats();
  }
}
