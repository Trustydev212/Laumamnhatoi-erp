import { Module } from '@nestjs/common';
import { PrinterController } from './printer.controller';
import { EnhancedPrinterController } from './enhanced-printer.controller';
import { PrinterService } from './printer.service';
import { EnhancedPrinterService } from '../../services/enhanced-printer.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PrinterController, EnhancedPrinterController],
  providers: [PrinterService, EnhancedPrinterService],
  exports: [PrinterService, EnhancedPrinterService]
})
export class PrinterModule {}
