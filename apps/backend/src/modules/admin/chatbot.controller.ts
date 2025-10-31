import { Controller, Post, Body, Get, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from './guards/admin.guard';
import { ChatbotService } from './chatbot.service';

@ApiTags('Admin - Chatbot AI')
@Controller('admin/chatbot')
@UseGuards(JwtAuthGuard, AdminGuard)
@ApiBearerAuth()
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Chat with AI chatbot for data analysis' })
  @ApiResponse({ status: 200, description: 'Chat response received successfully' })
  async chat(
    @Body() body: { message: string },
    @Request() req: any
  ) {
    try {
      const userId = req.user?.id || 'system';
      const response = await this.chatbotService.chat(body.message, userId);
      return {
        success: true,
        response,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('Chatbot controller error:', error);
      return {
        success: false,
        response: `Xin lỗi, đã xảy ra lỗi: ${error?.message || 'Unknown error'}`,
        timestamp: new Date().toISOString()
      };
    }
  }

  @Get('insights')
  @ApiOperation({ summary: 'Get quick business insights' })
  @ApiResponse({ status: 200, description: 'Insights retrieved successfully' })
  async getInsights() {
    try {
      const insights = await this.chatbotService.getQuickInsights();
      return {
        success: true,
        insights,
        timestamp: new Date().toISOString()
      };
    } catch (error: any) {
      console.error('Insights error:', error);
      return {
        success: false,
        insights: null,
        error: error?.message || 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  @Get('status')
  @ApiOperation({ summary: 'Check chatbot configuration status' })
  @ApiResponse({ status: 200, description: 'Status retrieved successfully' })
  async getStatus() {
    const status = this.chatbotService.getStatus();
    return {
      success: true,
      configured: status.configured,
      message: status.message,
      timestamp: new Date().toISOString()
    };
  }
}
