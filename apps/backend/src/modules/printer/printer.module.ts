import { Module } from '@nestjs/common';
import { PrinterController } from './printer.controller';
import { EnhancedPrinterController } from './enhanced-printer.controller';
import { XprinterReceiptController } from './xprinter-receipt.controller';
import { ReceiptConfigController } from './receipt-config.controller';
import { PrinterService } from './printer.service';
import { EnhancedPrinterService } from '../../services/enhanced-printer.service';
import { XprinterReceiptService } from '../../services/xprinter-receipt.service';
import { ReceiptConfigService } from '../../services/receipt-config.service';
import { BankQRService } from '../../services/bank-qr.service';
import { TaxConfigService } from '../../services/tax-config.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PrinterController, EnhancedPrinterController, XprinterReceiptController, ReceiptConfigController],
  providers: [PrinterService, EnhancedPrinterService, XprinterReceiptService, ReceiptConfigService, BankQRService, TaxConfigService],
  exports: [PrinterService, EnhancedPrinterService, XprinterReceiptService, ReceiptConfigService, BankQRService, TaxConfigService]
})
export class PrinterModule {}
