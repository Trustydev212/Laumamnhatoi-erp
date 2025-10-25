import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { PosModule } from './modules/pos/pos.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { CustomerModule } from './modules/customer/customer.module';
import { ReportModule } from './modules/report/report.module';
import { PaymentModule } from './modules/payment/payment.module';
import { ShiftModule } from './modules/shift/shift.module';
import { AdminModule } from './modules/admin/admin.module';
import { PrinterModule } from './modules/printer/printer.module';
import { RealtimeModule } from './common/realtime/realtime.module';
import { AuditModule } from './common/audit/audit.module';
import { BackupModule } from './common/backup/backup.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    
    // Scheduling
    ScheduleModule.forRoot(),
    
    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),
    
    // Database
    PrismaModule,
    
    // Common modules
    RealtimeModule,
    AuditModule,
    BackupModule,
    
    // Feature modules
    AuthModule,
    PosModule,
    InventoryModule,
    CustomerModule,
    ReportModule,
    PaymentModule,
    ShiftModule,
    AdminModule,
    PrinterModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
