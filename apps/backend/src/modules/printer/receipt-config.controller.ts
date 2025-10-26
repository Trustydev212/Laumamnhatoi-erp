import { Controller, Get, Post, Body, Res } from '@nestjs/common';
import { Response } from 'express';
import { ReceiptConfigService, ReceiptConfig } from '../../services/receipt-config.service';

@Controller('printer/receipt-config')
export class ReceiptConfigController {
  constructor(private receiptConfigService: ReceiptConfigService) {}

  // Lấy cấu hình hóa đơn
  @Get()
  async getConfig(@Res() res: Response) {
    try {
      const config = await this.receiptConfigService.getConfig();
      res.json({ success: true, config });
    } catch (error) {
      console.error('Error getting receipt config:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error getting receipt config: ' + error.message 
      });
    }
  }

  // Lưu cấu hình hóa đơn
  @Post()
  async saveConfig(@Body() config: ReceiptConfig, @Res() res: Response) {
    try {
      await this.receiptConfigService.saveConfig(config);
      res.json({ 
        success: true, 
        message: 'Receipt configuration saved successfully' 
      });
    } catch (error) {
      console.error('Error saving receipt config:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error saving receipt config: ' + error.message 
      });
    }
  }

  // Reset về cấu hình mặc định
  @Post('reset')
  async resetConfig(@Res() res: Response) {
    try {
      const defaultConfig = this.receiptConfigService.getDefaultConfig();
      await this.receiptConfigService.saveConfig(defaultConfig);
      res.json({ 
        success: true, 
        message: 'Receipt configuration reset to default',
        config: defaultConfig
      });
    } catch (error) {
      console.error('Error resetting receipt config:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Error resetting receipt config: ' + error.message 
      });
    }
  }
}
