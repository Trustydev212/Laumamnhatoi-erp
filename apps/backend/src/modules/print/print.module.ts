import { Module } from '@nestjs/common';
import { PrintController } from './print.controller';
import { PrintService } from './print.service';
import { TaxConfigService } from '../../services/tax-config.service';
import { PrismaModule } from '../../common/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PrintController],
  providers: [PrintService, TaxConfigService],
  exports: [PrintService],
})
export class PrintModule {}
