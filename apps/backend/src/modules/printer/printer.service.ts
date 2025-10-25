import { Injectable } from '@nestjs/common';

@Injectable()
export class PrinterService {
  getStatus() {
    return { status: 'Printer service is running' };
  }
}
