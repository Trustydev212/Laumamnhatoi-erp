import { Module } from '@nestjs/common';
import { PrinterController } from './printer.controller';
import { EnhancedPrinterController } from './enhanced-printer.controller';
import { XprinterReceiptController } from './xprinter-receipt.controller';
import { ReceiptConfigController } from './receipt-config.controller';
import { HtmlReceiptController } from './html-receipt.controller';
import { EscposPrinterController } from './escpos-printer.controller';
import { PrinterService } from './printer.service';
import { EnhancedPrinterService } from '../../services/enhanced-printer.service';
import { XprinterReceiptService } from '../../services/xprinter-receipt.service';
import { ReceiptConfigService } from '../../services/receipt-config.service';
import { HtmlReceiptService } from '../../services/html-receipt.service';
import { EscposPrinterService } from '../../services/escpos-printer.service';
import { BankQRService } from '../../services/bank-qr.service';
import { TaxConfigService } from '../../services/tax-config.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PrinterController, EnhancedPrinterController, XprinterReceiptController, ReceiptConfigController, HtmlReceiptController, EscposPrinterController],
  providers: [PrinterService, EnhancedPrinterService, XprinterReceiptService, ReceiptConfigService, HtmlReceiptService, EscposPrinterService, BankQRService, TaxConfigService],
  exports: [PrinterService, EnhancedPrinterService, XprinterReceiptService, ReceiptConfigService, HtmlReceiptService, EscposPrinterService, BankQRService, TaxConfigService]
})
export class PrinterModule {}
