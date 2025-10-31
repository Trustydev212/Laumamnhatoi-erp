import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserManagementController } from './user-management.controller';
import { UserManagementService } from './user-management.service';
import { BusinessIntelligenceController } from './business-intelligence.controller';
import { BusinessIntelligenceService } from './business-intelligence.service';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { RealtimeModule } from '../../common/realtime/realtime.module';

@Module({
  imports: [PrismaModule, RealtimeModule],
  controllers: [
    AdminController,
    UserManagementController,
    BusinessIntelligenceController,
    ExportController,
    ChatbotController
  ],
  providers: [
    AdminService,
    UserManagementService,
    BusinessIntelligenceService,
    ExportService,
    ChatbotService
  ],
  exports: [
    AdminService,
    UserManagementService,
    BusinessIntelligenceService,
    ExportService
  ],
})
export class AdminModule {}
