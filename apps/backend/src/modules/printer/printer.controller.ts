import { Controller, Get } from '@nestjs/common';

@Controller('printer')
export class PrinterController {
  @Get()
  getPrinterStatus() {
    return { status: 'Printer service is running' };
  }
}
