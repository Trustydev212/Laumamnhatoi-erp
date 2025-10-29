import { Controller, Get, Param } from '@nestjs/common';
import { EscposPrinterService } from '../../services/escpos-printer.service';

@Controller('printer/escpos')
export class EscposPrinterController {
  constructor(private escposPrinterService: EscposPrinterService) {}

  @Get('print/:orderId')
  async printReceiptWithQR(@Param('orderId') orderId: string) {
    try {
      const result = await this.escposPrinterService.printReceiptWithQR(orderId);
      return result;
    } catch (error) {
      console.error('Error printing receipt with ESC/POS:', error);
      return {
        success: false,
        message: 'Error printing receipt: ' + (error instanceof Error ? error.message : String(error))
      };
    }
  }
}
