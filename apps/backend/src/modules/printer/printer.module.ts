import { Module } from '@nestjs/common';
import { PrinterController } from './printer.controller';
import { ReceiptConfigController } from './receipt-config.controller';
import { PrinterService } from './printer.service';
import { ReceiptConfigService } from '../../services/receipt-config.service';
import { BankQRService } from '../../services/bank-qr.service';
import { TaxConfigService } from '../../services/tax-config.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PrinterController, ReceiptConfigController],
  providers: [PrinterService, ReceiptConfigService, BankQRService, TaxConfigService],
  exports: [PrinterService, ReceiptConfigService, BankQRService, TaxConfigService]
})
export class PrinterModule {}
