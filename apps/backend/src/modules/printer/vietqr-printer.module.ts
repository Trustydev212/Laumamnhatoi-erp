import { Module } from '@nestjs/common';
import { VietQRPrinterController } from './vietqr-printer.controller';
import { VietQRPrinterService } from '../../services/vietqr-printer.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { ReceiptConfigService } from '../../services/receipt-config.service';
import { TaxConfigService } from '../../services/tax-config.service';

@Module({
  imports: [PrismaModule],
  controllers: [VietQRPrinterController],
  providers: [
    VietQRPrinterService,
    ReceiptConfigService,
    TaxConfigService,
  ],
  exports: [VietQRPrinterService],
})
export class VietQRPrinterModule {}
