import { Controller, Get, Param } from '@nestjs/common';
import { HtmlReceiptService } from '../services/html-receipt.service';

@Controller('printer/html')
export class HtmlReceiptController {
  constructor(private htmlReceiptService: HtmlReceiptService) {}

  @Get('receipt/:orderId')
  async getHtmlReceipt(@Param('orderId') orderId: string) {
    try {
      const html = await this.htmlReceiptService.generateHtmlReceipt(orderId);
      
      return {
        success: true,
        html: html,
        message: 'HTML receipt generated successfully'
      };
    } catch (error) {
      console.error('Error generating HTML receipt:', error);
      return {
        success: false,
        message: 'Error generating HTML receipt: ' + (error instanceof Error ? error.message : String(error))
      };
    }
  }
}
